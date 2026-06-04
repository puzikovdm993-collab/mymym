/**
 * SyncManager - Клиентский модуль синхронизации с IndexedDB и сервером
 * 
 * Обеспечивает:
 * - Локальное хранение данных в IndexedDB при отсутствии подключения
 * - Автоматическую синхронизацию с сервером при восстановлении подключения
 * - Визуальный статус подключения
 * - Периодическую фоновую синхронизацию
 */

class ClientSyncManager {
    constructor(options = {}) {
        this.dbName = options.dbName || 'WTIS_SyncDB';
        this.dbVersion = options.dbVersion || 1;
        this.storeName = options.storeName || 'syncQueue';
        this.serverBaseUrl = options.serverBaseUrl || '';
        this.syncInterval = options.syncInterval || 30000; // 30 секунд
        this.statusElementId = options.statusElementId || null;
        
        this.db = null;
        this.isConnected = false;
        this.isSyncing = false;
        this.syncTimer = null;
        this.listeners = {
            statusChange: [],
            syncComplete: [],
            error: []
        };
        
        this.init();
    }
    
    /**
     * Инициализация менеджера синхронизации
     */
    async init() {
        try {
            await this.openDatabase();
            await this.checkConnection();
            this.startPeriodicSync();
            this.setupEventListeners();
            this.updateStatusUI();
            
            console.log('[SyncManager] Инициализирован успешно');
        } catch (error) {
            console.error('[SyncManager] Ошибка инициализации:', error);
            this.emit('error', error);
        }
    }
    
    /**
     * Открытие IndexedDB
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Не удалось открыть IndexedDB'));
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('objectName', 'objectName', { unique: false });
                    store.createIndex('operation', 'operation', { unique: false });
                }
            };
        });
    }
    
    /**
     * Проверка подключения к серверу
     */
    async checkConnection() {
        try {
            const response = await fetch(`${this.serverBaseUrl}/api/sync/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.isConnected = data.minio_available !== false;
            } else {
                this.isConnected = false;
            }
        } catch (error) {
            this.isConnected = false;
        }
        
        this.emit('statusChange', this.isConnected);
        this.updateStatusUI();
        
        return this.isConnected;
    }
    
    /**
     * Запуск периодической синхронизации
     */
    startPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        
        this.syncTimer = setInterval(async () => {
            if (!this.isSyncing) {
                await this.checkConnection();
                if (this.isConnected) {
                    await this.processQueue();
                }
            }
        }, this.syncInterval);
        
        console.log(`[SyncManager] Периодическая синхронизация запущена (интервал: ${this.syncInterval}мс)`);
    }
    
    /**
     * Остановка периодической синхронизации
     */
    stopPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
            console.log('[SyncManager] Периодическая синхронизация остановлена');
        }
    }
    
    /**
     * Настройка слушателей событий браузера
     */
    setupEventListeners() {
        // Слушаем изменения онлайн/офлайн статуса
        window.addEventListener('online', async () => {
            console.log('[SyncManager] Сеть доступна, проверка подключения...');
            await this.checkConnection();
            if (this.isConnected) {
                await this.processQueue();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('[SyncManager] Сеть недоступна, работа в офлайн-режиме');
            this.isConnected = false;
            this.emit('statusChange', false);
            this.updateStatusUI();
        });
    }
    
    /**
     * Сохранение данных с поддержкой очереди
     * @param {string} objectName - Имя объекта на сервере
     * @param {Object} data - Данные для сохранения
     * @returns {Promise<Object>} Результат сохранения
     */
    async save(objectName, data) {
        const queueItem = {
            objectName,
            data,
            operation: 'save',
            timestamp: Date.now(),
            retryCount: 0
        };
        
        // Если есть подключение - пытаемся сохранить сразу на сервер
        if (this.isConnected && !this.isSyncing) {
            try {
                const result = await this.saveToServer(objectName, data);
                
                if (result.success && result.saved_to_minio) {
                    console.log(`[SyncManager] Данные сохранены на сервер: ${objectName}`);
                    return result;
                }
            } catch (error) {
                console.warn(`[SyncManager] Ошибка сохранения на сервер, добавляем в очередь: ${error.message}`);
            }
        }
        
        // Добавляем в локальную очередь
        await this.addToQueue(queueItem);
        console.log(`[SyncManager] Данные добавлены в очередь: ${objectName}`);
        
        return {
            success: true,
            saved_to_minio: false,
            queued: true,
            message: 'Data queued for sync'
        };
    }
    
    /**
     * Загрузка данных
     * @param {string} objectName - Имя объекта
     * @returns {Promise<Object>} Загруженные данные
     */
    async load(objectName) {
        // Пробуем загрузить с сервера
        if (this.isConnected) {
            try {
                const result = await this.loadFromServer(objectName);
                if (result.success) {
                    return result.data;
                }
            } catch (error) {
                console.warn(`[SyncManager] Ошибка загрузки с сервера: ${error.message}`);
            }
        }
        
        // Если не удалось - пробуем найти в локальной очереди последние данные
        const localData = await this.getLastQueuedData(objectName);
        if (localData) {
            console.log(`[SyncManager] Данные загружены из локальной очереди: ${objectName}`);
            return localData;
        }
        
        throw new Error(`Data not found: ${objectName}`);
    }
    
    /**
     * Сохранение на сервер
     */
    async saveToServer(objectName, data) {
        const response = await fetch(`${this.serverBaseUrl}/api/sync/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                object_name: objectName,
                data: data,
                use_queue: true
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Загрузка с сервера
     */
    async loadFromServer(objectName) {
        const response = await fetch(`${this.serverBaseUrl}/api/sync/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                object_name: objectName
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
        
        return await response.json();
    }
    
    /**
     * Добавление элемента в очередь IndexedDB
     */
    addToQueue(item) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.add(item);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to add to queue'));
            };
        });
    }
    
    /**
     * Получение последнихqueued данных для объекта
     */
    async getLastQueuedData(objectName) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(null);
                return;
            }
            
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const index = store.index('objectName');
            
            const request = index.getAll(objectName);
            
            request.onsuccess = () => {
                const items = request.result || [];
                if (items.length > 0) {
                    // Возвращаем последний элемент
                    const lastItem = items[items.length - 1];
                    resolve(lastItem.data);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                resolve(null);
            };
        });
    }
    
    /**
     * Обработка очереди синхронизации
     */
    async processQueue() {
        if (this.isSyncing) {
            console.log('[SyncManager] Синхронизация уже выполняется');
            return { processed: 0, success: [], failed: [] };
        }
        
        this.isSyncing = true;
        console.log('[SyncManager] Начало обработки очереди...');
        
        try {
            const response = await fetch(`${this.serverBaseUrl}/api/sync/process_queue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log(`[SyncManager] Обработка завершена: ${result.processed} элементов обработано`);
            
            if (result.processed > 0) {
                this.emit('syncComplete', result);
            }
            
            return result;
            
        } catch (error) {
            console.error('[SyncManager] Ошибка обработки очереди:', error);
            this.emit('error', error);
            return { processed: 0, success: [], failed: [], error: error.message };
            
        } finally {
            this.isSyncing = false;
            this.updateStatusUI();
        }
    }
    
    /**
     * Получение статуса синхронизации
     */
    async getStatus() {
        try {
            const response = await fetch(`${this.serverBaseUrl}/api/sync/status`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            return {
                status: 'disconnected',
                minio_available: false,
                queue_size: 0,
                error: error.message
            };
        }
    }
    
    /**
     * Подписка на события
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }
    
    /**
     * Отписка от событий
     */
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }
    
    /**
     * Эмиссия событий
     */
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[SyncManager] Ошибка в обработчике события ${event}:`, error);
                }
            });
        }
    }
    
    /**
     * Обновление UI статуса
     */
    updateStatusUI() {
        if (!this.statusElementId) return;
        
        const element = document.getElementById(this.statusElementId);
        if (!element) return;
        
        let statusText = '';
        let statusClass = '';
        
        if (this.isConnected) {
            statusText = '● Онлайн';
            statusClass = 'sync-status-connected';
        } else {
            statusText = '○ Офлайн';
            statusClass = 'sync-status-disconnected';
        }
        
        element.textContent = statusText;
        element.className = `sync-status ${statusClass}`;
    }
    
    /**
     * Принудительная синхронизация
     */
    async forceSync() {
        console.log('[SyncManager] Принудительная синхронизация...');
        await this.checkConnection();
        
        if (this.isConnected) {
            return await this.processQueue();
        } else {
            console.warn('[SyncManager] Нет подключения к серверу');
            return { processed: 0, success: [], failed: [], message: 'No connection' };
        }
    }
    
    /**
     * Очистка ресурсов
     */
    destroy() {
        this.stopPeriodicSync();
        this.listeners = { statusChange: [], syncComplete: [], error: [] };
        
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        console.log('[SyncManager] Ресурсы очищены');
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClientSyncManager;
}

// Глобальная переменная для доступа из консоли
window.ClientSyncManager = ClientSyncManager;
