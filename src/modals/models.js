// modals.js – окончательная версия с поддержкой поднятия окон
(function() {
    'use strict';

    // const MIN_WIDTH = 300;
    // const MIN_HEIGHT = 200;

    const MODAL_MIN_SIZES = {
        graphModal: { width: 400, height: 300 },  // Минимальные размеры для graphModal
        default: { width: 300, height: 200 }      // Общие значения по умолчанию
    };
    const STORAGE_PREFIX = 'modal_';

    // Функция поднятия окна на передний план
    function bringToFront(modal) {
        const activeModals = Array.from(document.querySelectorAll('.modal.active'));
        const maxZ = activeModals.reduce((max, m) => {
            const z = parseInt(window.getComputedStyle(m).zIndex) || 0;
            return Math.max(max, z);
        }, 0);
        modal.style.zIndex = maxZ + 1;
    }

    function initModal(modal) {
        const content = modal.querySelector('.modal-content');
        const title = modal.querySelector('.modal-title');
        const resizeHandle = modal.querySelector('.modal-resize-handle');
        const closeBtn = modal.querySelector('.modal-title button');

        if (!content || !title) return;

        // ---- Сохранение состояния ----
        function saveModalState() {
            if (!modal.id) return;
            const left = content.style.left ? parseInt(content.style.left) : null;
            const top = content.style.top ? parseInt(content.style.top) : null;
            const width = content.style.width ? parseInt(content.style.width) : null;
            const height = content.style.height ? parseInt(content.style.height) : null;
            if (left !== null && top !== null && width !== null && height !== null) {
                const state = { left, top, width, height };
                localStorage.setItem(STORAGE_PREFIX + modal.id, JSON.stringify(state));
            }
        }

        // ---- Восстановление состояния (синхронно) ----
        function restoreModalState() {
            if (!modal.id) return;
            const saved = localStorage.getItem(STORAGE_PREFIX + modal.id);
            if (!saved) return;
            try {
                const state = JSON.parse(saved);

                // Применяем размеры

                if (state.width){ 
                    content.style.width = Math.max(
                        MODAL_MIN_SIZES[modal.id]?.width || MODAL_MIN_SIZES.default.width,
                        content.offsetWidth 
                    );
                }
                if (state.height) {
                    content.style.height = Math.max(
                        MODAL_MIN_SIZES[modal.id]?.height || MODAL_MIN_SIZES.default.height,
                        content.offsetHeight 
                    );
                }

                // Принудительный reflow, чтобы браузер сразу пересчитал размеры
                content.offsetHeight;

                const currentWidth = content.offsetWidth;
                const currentHeight = content.offsetHeight;
                const maxX = window.innerWidth - currentWidth;
                const maxY = window.innerHeight - currentHeight;

                let newLeft = state.left;
                let newTop = state.top;
                if (newLeft !== undefined) newLeft = Math.max(0, Math.min(newLeft, maxX));
                if (newTop !== undefined) newTop = Math.max(0, Math.min(newTop, maxY));

                content.style.left = newLeft + 'px';
                content.style.top = newTop + 'px';

                // Для окна с графиком обновляем Plotly
                if (modal.id === 'graphModal') {
                    resizePlotlyGraph();
                }
            } catch (e) {
                console.warn('Ошибка восстановления модального окна', e);
            }
        }

        // Наблюдатель за появлением класса active
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'class') {
                    if (modal.classList.contains('active')) {
                        restoreModalState();
                        // Поднимаем окно при активации
                        bringToFront(modal);
                    }
                }
            });
        });
        observer.observe(modal, { attributes: true });

        // Если окно уже активно при загрузке (маловероятно)
        if (modal.classList.contains('active')) {
            restoreModalState();
            bringToFront(modal);
        }

        // Закрытие по крестику
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.classList.remove('active');
            });
        }

        // Поднятие окна при клике на него (если активно)
        modal.addEventListener('mousedown', () => {
            if (modal.classList.contains('active')) {
                bringToFront(modal);
            }
        });

        // ---- Перетаскивание ----
        let isDragging = false;
        let dragOffsetX, dragOffsetY;

        title.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            dragOffsetX = e.clientX - content.offsetLeft;
            dragOffsetY = e.clientY - content.offsetTop;
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const newX = e.clientX - dragOffsetX;
            const newY = e.clientY - dragOffsetY;

            const maxX = window.innerWidth - content.offsetWidth;
            const maxY = window.innerHeight - content.offsetHeight;
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));

            content.style.left = clampedX + 'px';
            content.style.top = clampedY + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                saveModalState();
            }
        });

        // ---- Изменение размера (если есть ручка) ----
        if (resizeHandle) {
            let isResizing = false;
            let startWidth, startHeight, startX, startY;

            resizeHandle.addEventListener('mousedown', (e) => {
                isResizing = true;
                startWidth = content.offsetWidth;
                startHeight = content.offsetHeight;
                startX = e.clientX;
                startY = e.clientY;
                e.preventDefault();
            });

            window.addEventListener('mousemove', (e) => {
                if (!isResizing) return;

                const dx = e.clientX - startX;
                const dy = e.clientY - startY;



                // Получаем текущие startWidth/startHeight (из кода, который запускает resize)
                const newWidth = Math.max(
                    MODAL_MIN_SIZES[modal.id]?.width || MODAL_MIN_SIZES.default.width,
                    startWidth + dx
                );
                const newHeight = Math.max(
                    MODAL_MIN_SIZES[modal.id]?.height || MODAL_MIN_SIZES.default.height,
                    startHeight + dy
                );

                // const newWidth = Math.max(MIN_WIDTH, startWidth + dx);
                // const newHeight = Math.max(MIN_HEIGHT, startHeight + dy);

                content.style.width = newWidth + 'px';
                content.style.height = newHeight + 'px';

                if (modal.id === 'graphModal') {
                    throttleResizePlotly();
                }
            });

            window.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    if (modal.id === 'graphModal') {
                        resizePlotlyGraph();
                    }
                    saveModalState();
                }
            });
        }
    }

    // Инициализация всех модальных окон
    document.querySelectorAll('.modal').forEach(initModal);

    // ---- Логика для графика Plotly ----
    const graphContainer = document.querySelector('#graphCanvas')?.parentNode;

    function resizePlotlyGraph() {
        if (!graphContainer || typeof Plotly === 'undefined') return;
        const rect = graphContainer.getBoundingClientRect();
        const style = window.getComputedStyle(graphContainer);
        const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
        const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        const borderX = parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth);
        const borderY = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);

        const width = Math.max(100, rect.width - padX - borderX);
        const height = Math.max(100, rect.height - padY - borderY);

        Plotly.relayout('graphCanvas', { width, height });
    }

    let throttleTimer = null;
    function throttleResizePlotly() {
        if (throttleTimer) return;
        throttleTimer = setTimeout(() => {
            resizePlotlyGraph();
            throttleTimer = null;
        }, 100);
    }

    // Наблюдатель за изменениями размеров контейнера графика
    if (graphContainer && window.ResizeObserver) {
        const observer = new ResizeObserver(() => resizePlotlyGraph());
        observer.observe(graphContainer);
    }

    window.addEventListener('load', () => {
        if (graphContainer) resizePlotlyGraph();
    });

    console.log('✅ modals.js загружен (финальная версия с поднятием окон)');

    // ====================== ИСТОРИЯ ИЗМЕНЕНИЙ (глобальные функции) ======================

    let selectedHistoryIndex = -1;
    let restoreTimer = null;
    let originalHistoryIndex = -1;

    // Показать окно истории
    window.showHistoryModal = function() {
        const modal = document.getElementById('historyModal');
        if (!modal) return console.error('historyModal не найден');

        const file = getActiveFile();
        if (file) originalHistoryIndex = file.historyIndex;

        modal.classList.add('active');
        updateHistoryModal();
    };

    // Закрыть окно
    window.closeHistoryModal = function() {
        const modal = document.getElementById('historyModal');
        if (modal) modal.classList.remove('active');

        // Возвращаем оригинальное состояние при закрытии
        const file = getActiveFile();
        if (file && originalHistoryIndex !== -1 && originalHistoryIndex !== file.historyIndex) {
            jumpToHistoryState(originalHistoryIndex, false);
        }
        originalHistoryIndex = -1;
        selectedHistoryIndex = -1;
    };

    // Обновление всего окна
    function updateHistoryModal() {
        const file = getActiveFile();
        if (!file) return;

        // Статистика
        document.getElementById('totalActionsCount').textContent = file.history.length;
        document.getElementById('currentActionPosition').textContent = file.historyIndex + 1;

        // Слайдер
        const slider = document.getElementById('historySlider');
        if (slider) {
            slider.max = Math.max(0, file.history.length - 1);
            slider.value = file.historyIndex;
        }

        updateHistoryList();
        updateHistoryMarkers();
    }

    // Список действий
    function updateHistoryList() {
        const file = getActiveFile();
        if (!file) return;
        const ul = document.getElementById('historyListBody');
        if (!ul) return;

        ul.innerHTML = '';

        if (file.history.length === 0) {
            const li = document.createElement('li');
            li.style.cssText = 'padding:15px;text-align:center;color:#666';
            li.textContent = 'Нет действий в истории';
            ul.appendChild(li);
            return;
        }

        for (let i = 0; i < file.history.length; i++) {
            const state = file.history[i];
            const isCurrent = i === file.historyIndex;
            const name = (typeof getActionName === 'function' ? getActionName(state) : null) || `Действие ${i+1}`;

            const li = document.createElement('li');
            li.style.cssText = `
                display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee;
                cursor:pointer; transition:background .2s;
                ${isCurrent ? 'background:#e3f2fd;font-weight:bold' : ''}
            `;
            li.innerHTML = `
                <span style="width:30px;text-align:center">${i+1}</span>
                <span style="flex:1;display:flex;align-items:center;gap:6px">
                    <span>${(typeof getActionIcon === 'function' ? getActionIcon(state) : '📄')}</span>
                    ${name}
                </span>
                <span style="color:#666;font-size:0.9em">
                    ${state.timestamp ? (typeof formatTimestamp === 'function' ? formatTimestamp(state.timestamp) : new Date(state.timestamp).toLocaleTimeString('ru-RU')) : '—'}
                </span>
            `;

            li.onclick = () => {
                temporaryRestore(i);
                selectedHistoryIndex = i;
                // подсветка
                Array.from(ul.children).forEach((el, idx) => {
                    el.style.background = idx === i ? '#f0f8ff' : '';
                    el.style.fontWeight = idx === i ? 'bold' : '';
                });
                const s = document.getElementById('historySlider');
                if (s) s.value = i;
            };

            li.ondblclick = () => jumpToHistoryState(i);
            ul.appendChild(li);
        }
    }

    // Маркеры на слайдере
    function updateHistoryMarkers() {
        const file = getActiveFile();
        if (!file || file.history.length <= 1) return;
        const cont = document.querySelector('.history-markers');
        if (!cont) return;
        cont.innerHTML = '';
        for (let i = 0; i < file.history.length; i++) {
            const m = document.createElement('div');
            m.style.cssText = `position:absolute;width:2px;height:8px;background:${i===file.historyIndex?'#4CAF50':'#999'};
                left:${(i/(file.history.length-1))*100}%;bottom:0;transform:translateX(-50%)`;
            cont.appendChild(m);
        }
    }

    // Временный предпросмотр (oninput слайдера)
    function temporaryRestore(index) {
        const file = getActiveFile();
        if (!file || !file.history[index]) return;
        restoreState(file, file.history[index]);   // функция уже есть в index.js
    }

    window.debounceTemporaryRestore = function(value) {
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
            temporaryRestore(parseInt(value));
            selectedHistoryIndex = parseInt(value);
            const ul = document.getElementById('historyListBody');
            if (ul) {
                Array.from(ul.children).forEach((li, i) => {
                    li.style.background = i === selectedHistoryIndex ? '#f0f8ff' : '';
                    li.style.fontWeight = i === selectedHistoryIndex ? 'bold' : '';
                });
            }
        }, 80);
    };

    window.jumpToHistoryState = function(index, notify = true) {
        const file = getActiveFile();
        if (!file || !file.history[index]) return;

        if (index !== file.historyIndex) {
            file.historyIndex = index;
            restoreState(file, file.history[index]);
            if (document.getElementById('historyModal').classList.contains('active')) {
                updateHistoryModal();
            }
            if (notify) console.log(`✅ Переход к состоянию #${index + 1}`);
        }
    };

    window.jumpToSelectedState = function() {
        if (selectedHistoryIndex !== -1) jumpToHistoryState(selectedHistoryIndex);
    };

    window.clearHistory = function() {   // кнопка "Очистить"
        const file = getActiveFile();
        if (!file || !confirm('Очистить всю историю?')) return;

        const cur = captureState(file);
        file.history = [cur];
        file.historyIndex = 0;
        if (document.getElementById('historyModal').classList.contains('active')) updateHistoryModal();
    };

    // Заглушки, если функций ещё нет
    // ==================== УЛУЧШЕННОЕ ОПРЕДЕЛЕНИЕ НАЗВАНИЯ ДЕЙСТВИЯ ====================
    function getActionName(state) {
        if (!state || !state.action) return 'Изменение';

        const map = {
            'Рисование кистью': 'Рисование кистью',
            'Рисование карандашом': 'Рисование карандашом',
            'Стирание': 'Стирание ластиком',
            'Заливка': 'Заливка',
            'Добавление текста': 'Добавление текста',
            'Линия': 'Линия',
            'Прямоугольник': 'Прямоугольник',
            'Эллипс': 'Эллипс',
            'Выделение лассо': 'Выделение лассо',
            'Обрезка': 'Обрезка',
            'Поворот': 'Поворот',
            'Отражение': 'Отражение',
            'Медианный фильтр': 'Медианный фильтр',
            'Пороговая обработка': 'Порог',
            'Нормализация': 'Нормализация',
            'Аппроксимация поверхностью': 'Аппроксимация',
            'Изменение размера': 'Изменение размера',
            'Инверсия цветов': 'Инверсия',
            'Оттенки серого': 'Оттенки серого'
        };

        return map[state.action] || state.action;
    }
    if (typeof getActionIcon !== 'function') window.getActionIcon = () => '📄';
    if (typeof formatTimestamp !== 'function') {
        window.formatTimestamp = ts => new Date(ts).toLocaleTimeString('ru-RU', {hour:'2-digit', minute:'2-digit'});
    }

    // ====================== ГЛОБАЛЬНЫЕ ФУНКЦИИ ИСТОРИИ ======================

    // Проверка, открыто ли окно истории (используется в pushState)
    window.isHistoryModalOpen = function() {
        const modal = document.getElementById('historyModal');
        return modal && modal.classList.contains('active');
    };

    // Обновление модального окна истории
    window.updateHistoryModal = updateHistoryModal;   // если уже есть — просто сделаем глобальной

    // Временное восстановление состояния
    window.temporaryRestore = function(index) {
        const file = getActiveFile();
        if (!file || !file.history[index]) return;
        restoreState(file, file.history[index]);
    };

    // Дебounce для слайдера
    window.debounceTemporaryRestore = function(value) {
        if (restoreTimer) clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
            temporaryRestore(parseInt(value));
            selectedHistoryIndex = parseInt(value);
            
            const ul = document.getElementById('historyListBody');
            if (ul) {
                Array.from(ul.children).forEach((li, i) => {
                    li.style.background = (i === selectedHistoryIndex) ? '#f0f8ff' : '';
                    li.style.fontWeight = (i === selectedHistoryIndex) ? 'bold' : '';
                });
            }
        }, 80);
    };

    // Переход к состоянию
    window.jumpToHistoryState = function(index, notify = true) {
        const file = getActiveFile();
        if (!file || !file.history[index]) return;

        if (index !== file.historyIndex) {
            file.historyIndex = index;
            restoreState(file, file.history[index]);
            if (isHistoryModalOpen()) updateHistoryModal();
            if (notify) console.log(`Переход к состоянию #${index + 1}`);
        }
    };

    window.jumpToSelectedState = function() {
        if (selectedHistoryIndex !== -1) jumpToHistoryState(selectedHistoryIndex);
    };

    window.clearHistory = function() {
        const file = getActiveFile();
        if (!file || !confirm('Очистить всю историю?')) return;

        const currentState = captureState(file);
        file.history = [currentState];
        file.historyIndex = 0;
        if (isHistoryModalOpen()) updateHistoryModal();
        console.log('История очищена');
    };


        // ====================== МОДАЛЬНОЕ ОКНО ПОМОЩИ ======================
    
    // Показать окно помощи
    window.showHelpModal = function() {
        const modal = document.getElementById('helpModal');
        if (!modal) return console.error('helpModal не найден');
        modal.classList.add('active');
    };

    // Закрыть окно помощи
    window.closeHelpModal = function() {
        const modal = document.getElementById('helpModal');
        if (modal) modal.classList.remove('active');
    };

    console.log('✅ Функции окна помощи добавлены');
    
    // ====================== МОДАЛЬНОЕ ОКНО ГОРЯЧИХ КЛАВИШ ======================
    
    // Список горячих клавиш по умолчанию
    const defaultHotkeys = {
        'undo': { key: 'z', ctrl: true, shift: false, alt: false, description: 'Отменить действие' },
        'redo': { key: 'y', ctrl: true, shift: false, alt: false, description: 'Повторить действие' },
        'save': { key: 's', ctrl: true, shift: false, alt: false, description: 'Сохранить' },
        'open': { key: 'o', ctrl: true, shift: false, alt: false, description: 'Открыть файл' },
        'loadFromServer': { key: 'l', ctrl: true, shift: false, alt: false, description: 'Загрузить с сервера' },
        'newFile': { key: 'n', ctrl: true, shift: false, alt: false, description: 'Новый файл' },
        'cycleFiles': { key: 'tab', ctrl: true, shift: false, alt: false, description: 'Переключение файлов' },
        'rotate': { key: 'r', ctrl: false, shift: false, alt: true, description: 'Поворот на 90°' },
        'recentFiles': { key: 'r', ctrl: true, shift: true, alt: false, description: 'Недавние файлы' }
    };
    
    // Загрузка горячих клавиш из localStorage или использование значений по умолчанию
    function loadHotkeys() {
        const saved = localStorage.getItem('userHotkeys');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Ошибка загрузки горячих клавиш:', e);
            }
        }
        return { ...defaultHotkeys };
    }
    
    // Сохранение горячих клавиш в localStorage
    function saveHotkeysToStorage(hotkeys) {
        localStorage.setItem('userHotkeys', JSON.stringify(hotkeys));
    }
    
    // Форматирование комбинации клавиш для отображения
    function formatHotkey(hotkey) {
        const parts = [];
        if (hotkey.ctrl) parts.push('Ctrl');
        if (hotkey.shift) parts.push('Shift');
        if (hotkey.alt) parts.push('Alt');
        parts.push(hotkey.key.toUpperCase());
        return parts.join('+');
    }
    
    // Показать окно настройки горячих клавиш
    window.showHotkeysModal = function() {
        const modal = document.getElementById('hotkeysModal');
        if (!modal) return console.error('hotkeysModal не найден');
        
        renderHotkeysList();
        modal.classList.add('active');
    };
    
    // Закрыть окно горячих клавиш
    window.closeHotkeysModal = function() {
        const modal = document.getElementById('hotkeysModal');
        if (modal) modal.classList.remove('active');
    };
    
    // Отрисовка списка горячих клавиш
    function renderHotkeysList() {
        const container = document.getElementById('hotkeysList');
        if (!container) return;
        
        const hotkeys = loadHotkeys();
        container.innerHTML = '';
        
        for (const [action, config] of Object.entries(hotkeys)) {
            const row = document.createElement('div');
            row.className = 'hotkey-row';
            row.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color);
                gap: 16px;
            `;
            
            const desc = document.createElement('span');
            desc.textContent = config.description;
            desc.style.cssText = 'flex: 1; font-size: 14px; color: var(--text-secondary);';
            
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            const modifiersContainer = document.createElement('div');
            modifiersContainer.style.cssText = 'display: flex; gap: 4px; margin-right: 8px;';
            
            const modifiers = [
                { key: 'ctrl', label: 'Ctrl' },
                { key: 'shift', label: 'Shift' },
                { key: 'alt', label: 'Alt' }
            ];
            
            modifiers.forEach(mod => {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `${action}-${mod.key}`;
                checkbox.checked = config[mod.key];
                checkbox.dataset.action = action;
                checkbox.dataset.modifier = mod.key;
                checkbox.style.cssText = 'cursor: pointer;';
                
                const label = document.createElement('label');
                label.htmlFor = checkbox.id;
                label.textContent = mod.label;
                label.style.cssText = 'font-size: 12px; cursor: pointer; color: var(--text-secondary);';
                
                checkbox.addEventListener('change', () => updateHotkeyDisplay(action));
                
                modifiersContainer.appendChild(checkbox);
                modifiersContainer.appendChild(label);
            });
            
            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.id = `hotkey-input-${action}`;
            keyInput.value = config.key.toUpperCase();
            keyInput.readOnly = true;
            keyInput.dataset.action = action;
            keyInput.style.cssText = `
                width: 80px;
                padding: 6px 10px;
                font-size: 13px;
                border: 1px solid var(--border-color);
                background: var(--background-primary);
                color: var(--text-secondary);
                border-radius: var(--radius-md);
                text-align: center;
                cursor: pointer;
            `;
            keyInput.title = 'Нажмите для изменения';
            
            keyInput.addEventListener('click', () => {
                keyInput.value = '...';
                keyInput.style.borderColor = 'var(--primary-color)';
                
                const captureHandler = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    let keyValue = e.key.toLowerCase();
                    
                    // Игнорируем модификаторы
                    if (['control', 'shift', 'alt', 'meta'].includes(keyValue)) {
                        return;
                    }
                    
                    // Обновляем состояние модификаторов
                    const checkboxes = modifiersContainer.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        if (cb.dataset.modifier === 'ctrl') cb.checked = e.ctrlKey;
                        if (cb.dataset.modifier === 'shift') cb.checked = e.shiftKey;
                        if (cb.dataset.modifier === 'alt') cb.checked = e.altKey;
                    });
                    
                    keyInput.value = keyValue.toUpperCase();
                    keyInput.style.borderColor = '';
                    
                    window.removeEventListener('keydown', captureHandler);
                };
                
                setTimeout(() => window.addEventListener('keydown', captureHandler), 10);
            });
            
            inputContainer.appendChild(modifiersContainer);
            inputContainer.appendChild(keyInput);
            
            row.appendChild(desc);
            row.appendChild(inputContainer);
            container.appendChild(row);
        }
    }
    
    // Обновление отображения горячей клавиши (вспомогательная функция)
    function updateHotkeyDisplay(action) {
        // Просто сохраняем текущее состояние -实际ное сохранение происходит при нажатии "Сохранить"
    }
    
    // Сохранение настроек горячих клавиш
    window.saveHotkeys = function() {
        const hotkeys = {};
        const rows = document.querySelectorAll('#hotkeysList .hotkey-row');
        
        rows.forEach(row => {
            const checkboxes = row.querySelectorAll('input[type="checkbox"]');
            const keyInput = row.querySelector('input[type="text"]');
            
            if (!keyInput || !keyInput.dataset.action) return;
            
            const action = keyInput.dataset.action;
            const key = keyInput.value.toLowerCase();
            
            let ctrl = false, shift = false, alt = false;
            checkboxes.forEach(cb => {
                if (cb.dataset.modifier === 'ctrl') ctrl = cb.checked;
                if (cb.dataset.modifier === 'shift') shift = cb.checked;
                if (cb.dataset.modifier === 'alt') alt = cb.checked;
            });
            
            hotkeys[action] = {
                key,
                ctrl,
                shift,
                alt,
                description: defaultHotkeys[action]?.description || action
            };
        });
        
        saveHotkeysToStorage(hotkeys);
        console.log('✅ Горячие клавиши сохранены:', hotkeys);
        closeHotkeysModal();
    };
    
    // Сброс к значениям по умолчанию
    window.resetHotkeysToDefault = function() {
        localStorage.removeItem('userHotkeys');
        renderHotkeysList();
        console.log('✅ Горячие клавиши сброшены к значениям по умолчанию');
    };
    
    console.log('✅ Функции окна горячих клавиш добавлены');
    
    console.log('✅ Глобальные функции истории добавлены');

    console.log('✅ История изменений загружена (showHistoryModal глобальная)');

})();
