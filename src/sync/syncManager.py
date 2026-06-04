"""
SyncManager - Модуль управления синхронизацией с MinIO и IndexedDB

Обеспечивает:
- Проверку доступности MinIO
- Очередь синхронизации для офлайн-работы
- Статусы подключения
- Универсальные методы сохранения/загрузки
"""

import json
import os
import io
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from minio import Minio
from minio.error import S3Error


class SyncStatus:
    """Статусы синхронизации"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    SYNCING = "syncing"
    QUEUE_PENDING = "queue_pending"
    ERROR = "error"


class SyncQueueItem:
    """Элемент очереди синхронизации"""
    def __init__(self, object_name: str, data: Dict, operation: str = "save", timestamp: str = None):
        self.object_name = object_name
        self.data = data
        self.operation = operation  # "save" или "delete"
        self.timestamp = timestamp or datetime.now().isoformat()
        self.retry_count = 0
        self.max_retries = 3
    
    def to_dict(self) -> Dict:
        return {
            "object_name": self.object_name,
            "data": self.data,
            "operation": self.operation,
            "timestamp": self.timestamp,
            "retry_count": self.retry_count,
            "max_retries": self.max_retries
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'SyncQueueItem':
        item = cls(
            object_name=data["object_name"],
            data=data["data"],
            operation=data.get("operation", "save"),
            timestamp=data.get("timestamp")
        )
        item.retry_count = data.get("retry_count", 0)
        item.max_retries = data.get("max_retries", 3)
        return item


class SyncManager:
    """
    Менеджер синхронизации с поддержкой офлайн-режима
    
    Атрибуты:
        minio_client: Клиент MinIO
        bucket_name: Имя бакета
        logger: Логгер
        queue: Очередь операций для синхронизации
        status: Текущий статус подключения
        last_sync: Время последней успешной синхронизации
    """
    
    def __init__(self, minio_client: Minio, bucket_name: str, logger: logging.Logger = None):
        self.minio_client = minio_client
        self.bucket_name = bucket_name
        self.logger = logger or logging.getLogger(__name__)
        self.queue: List[SyncQueueItem] = []
        self._status = SyncStatus.DISCONNECTED
        self.last_sync: Optional[str] = None
        self._minio_available: Optional[bool] = None
    
    @property
    def status(self) -> str:
        """Получить текущий статус синхронизации"""
        return self._status
    
    @status.setter
    def status(self, value: str):
        """Установить статус и залогировать изменение"""
        if self._status != value:
            old_status = self._status
            self._status = value
            self.logger.info(f"Статус синхронизации изменён: {old_status} -> {value}")
    
    def check_minio_availability(self) -> bool:
        """
        Проверить доступность MinIO
        
        Returns:
            bool: True если MinIO доступен, False иначе
        """
        try:
            # Проверяем существование бакета
            exists = self.minio_client.bucket_exists(self.bucket_name)
            self._minio_available = True
            
            if not exists:
                self.logger.warning(f"Бакет {self.bucket_name} не существует")
            
            return True
            
        except S3Error as e:
            self._minio_available = False
            self.logger.error(f"MinIO недоступен (S3Error): {e}")
            return False
        except Exception as e:
            self._minio_available = False
            self.logger.error(f"MinIO недоступен (Exception): {e}")
            return False
    
    def update_status(self) -> str:
        """
        Обновить статус синхронизации на основе доступности MinIO и состояния очереди
        
        Returns:
            str: Актуальный статус
        """
        is_available = self.check_minio_availability()
        
        if is_available:
            if self.queue:
                self.status = SyncStatus.QUEUE_PENDING
            else:
                self.status = SyncStatus.CONNECTED
                self.last_sync = datetime.now().isoformat()
        else:
            if self.queue:
                self.status = SyncStatus.DISCONNECTED
            else:
                self.status = SyncStatus.DISCONNECTED
        
        return self.status
    
    def get_status_info(self) -> Dict:
        """
        Получить подробную информацию о статусе синхронизации
        
        Returns:
            Dict: Информация о статусе
        """
        self.update_status()
        
        return {
            "status": self.status,
            "minio_available": self._minio_available,
            "queue_size": len(self.queue),
            "last_sync": self.last_sync,
            "bucket": self.bucket_name
        }
    
    def add_to_queue(self, object_name: str, data: Dict, operation: str = "save") -> bool:
        """
        Добавить операцию в очередь синхронизации
        
        Args:
            object_name: Имя объекта в MinIO
            data: Данные для сохранения
            operation: Тип операции ("save" или "delete")
        
        Returns:
            bool: True если операция добавлена успешно
        """
        item = SyncQueueItem(object_name, data, operation)
        self.queue.append(item)
        self.logger.debug(f"Добавлено в очередь: {object_name} ({operation})")
        self.update_status()
        return True
    
    def process_queue(self) -> Dict:
        """
        Обработать очередь синхронизации
        
        Returns:
            Dict: Результат обработки (успешные/неуспешные операции)
        """
        if not self.queue:
            return {"processed": 0, "success": [], "failed": []}
        
        if not self.check_minio_availability():
            self.logger.warning("Невозможно обработать очередь: MinIO недоступен")
            return {
                "processed": 0,
                "success": [],
                "failed": [{"reason": "MinIO unavailable", "items": len(self.queue)}]
            }
        
        self.status = SyncStatus.SYNCING
        results = {"processed": 0, "success": [], "failed": []}
        remaining_queue = []
        
        for item in self.queue:
            try:
                if item.operation == "save":
                    self._save_to_minio(item.object_name, item.data)
                elif item.operation == "delete":
                    self._delete_from_minio(item.object_name)
                
                results["success"].append({
                    "object_name": item.object_name,
                    "operation": item.operation,
                    "timestamp": item.timestamp
                })
                results["processed"] += 1
                self.logger.debug(f"Успешно обработано: {item.object_name}")
                
            except Exception as e:
                self.logger.error(f"Ошибка обработки {item.object_name}: {e}")
                
                if item.retry_count < item.max_retries:
                    item.retry_count += 1
                    remaining_queue.append(item)
                else:
                    results["failed"].append({
                        "object_name": item.object_name,
                        "operation": item.operation,
                        "error": str(e),
                        "retry_count": item.retry_count
                    })
        
        self.queue = remaining_queue
        self.status = SyncStatus.CONNECTED if not self.queue else SyncStatus.QUEUE_PENDING
        
        if self.status == SyncStatus.CONNECTED:
            self.last_sync = datetime.now().isoformat()
        
        return results
    
    def _save_to_minio(self, object_name: str, data: Dict) -> bool:
        """
        Сохранить данные в MinIO
        
        Args:
            object_name: Имя объекта
            data: Данные для сохранения
        
        Returns:
            bool: True если сохранение успешно
        """
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        
        self.minio_client.put_object(
            bucket_name=self.bucket_name,
            object_name=object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        
        self.logger.debug(f"Сохранено в MinIO: {object_name} ({len(json_bytes)} байт)")
        return True
    
    def _delete_from_minio(self, object_name: str) -> bool:
        """
        Удалить объект из MinIO
        
        Args:
            object_name: Имя объекта
        
        Returns:
            bool: True если удаление успешно
        """
        self.minio_client.remove_object(self.bucket_name, object_name)
        self.logger.debug(f"Удалено из MinIO: {object_name}")
        return True
    
    def load_from_minio(self, object_name: str) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Загрузить данные из MinIO
        
        Args:
            object_name: Имя объекта
        
        Returns:
            Tuple[Optional[Dict], Optional[str]]: (данные, ошибка) или (None, ошибка)
        """
        try:
            response = self.minio_client.get_object(self.bucket_name, object_name)
            json_str = response.read().decode('utf-8')
            response.close()
            response.release_conn()
            
            data = json.loads(json_str)
            self.logger.debug(f"Загружено из MinIO: {object_name}")
            return data, None
            
        except S3Error as e:
            if e.code == 'NoSuchKey':
                self.logger.debug(f"Объект не найден: {object_name}")
                return None, f"Object not found: {object_name}"
            error_msg = f"Ошибка загрузки {object_name}: {e}"
            self.logger.error(error_msg)
            return None, error_msg
            
        except Exception as e:
            error_msg = f"Ошибка загрузки {object_name}: {e}"
            self.logger.error(error_msg)
            return None, error_msg
    
    def save_to_minio(self, object_name: str, data: Dict, use_queue: bool = True) -> Dict:
        """
        Универсальный метод сохранения с поддержкой очереди
        
        Args:
            object_name: Имя объекта
            data: Данные для сохранения
            use_queue: Использовать очередь при ошибке
        
        Returns:
            Dict: Результат сохранения
        """
        # Проверяем доступность MinIO
        is_available = self.check_minio_availability()
        
        if is_available:
            try:
                self._save_to_minio(object_name, data)
                self.last_sync = datetime.now().isoformat()
                return {
                    "success": True,
                    "saved_to_minio": True,
                    "queued": False,
                    "message": "Data saved to MinIO"
                }
            except Exception as e:
                self.logger.error(f"Ошибка сохранения в MinIO: {e}")
                if not use_queue:
                    return {
                        "success": False,
                        "saved_to_minio": False,
                        "queued": False,
                        "error": str(e)
                    }
        
        # Если MinIO недоступен или ошибка сохранения - добавляем в очередь
        if use_queue:
            self.add_to_queue(object_name, data, "save")
            return {
                "success": True,
                "saved_to_minio": False,
                "queued": True,
                "queue_position": len(self.queue),
                "message": "Data queued for sync (MinIO unavailable)"
            }
        
        return {
            "success": False,
            "saved_to_minio": False,
            "queued": False,
            "error": "MinIO unavailable and queue disabled"
        }
    
    def delete_from_minio(self, object_name: str, use_queue: bool = True) -> Dict:
        """
        Универсальный метод удаления с поддержкой очереди
        
        Args:
            object_name: Имя объекта
            use_queue: Использовать очередь при ошибке
        
        Returns:
            Dict: Результат удаления
        """
        is_available = self.check_minio_availability()
        
        if is_available:
            try:
                self._delete_from_minio(object_name)
                return {
                    "success": True,
                    "deleted_from_minio": True,
                    "queued": False,
                    "message": "Object deleted from MinIO"
                }
            except Exception as e:
                self.logger.error(f"Ошибка удаления из MinIO: {e}")
                if not use_queue:
                    return {
                        "success": False,
                        "deleted_from_minio": False,
                        "queued": False,
                        "error": str(e)
                    }
        
        if use_queue:
            self.add_to_queue(object_name, {}, "delete")
            return {
                "success": True,
                "deleted_from_minio": False,
                "queued": True,
                "queue_position": len(self.queue),
                "message": "Delete operation queued (MinIO unavailable)"
            }
        
        return {
            "success": False,
            "deleted_from_minio": False,
            "queued": False,
            "error": "MinIO unavailable and queue disabled"
        }
    
    def get_queue(self) -> List[Dict]:
        """
        Получить текущую очередь синхронизации
        
        Returns:
            List[Dict]: Список элементов очереди
        """
        return [item.to_dict() for item in self.queue]
    
    def clear_queue(self) -> int:
        """
        Очистить очередь синхронизации
        
        Returns:
            int: Количество очищенных элементов
        """
        count = len(self.queue)
        self.queue = []
        self.logger.info(f"Очередь синхронизации очищена ({count} элементов)")
        self.update_status()
        return count
