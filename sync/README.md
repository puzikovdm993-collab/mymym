# JSON Редактор с синхронизацией MinIO и IndexedDB

## Описание

Приложение для ввода и редактирования JSON данных с синхронизацией между:
- **IndexedDB** (локальное хранилище браузера)
- **MinIO** (объектное хранилище S3)
- **Flask** (сервер синхронизации)

## Структура проекта

```
app/
├── app.py                 # Flask сервер
├── requirements.txt       # Зависимости Python
├── Dockerfile            # Docker образ для Flask
├── docker-compose.yml    # Docker Compose конфигурация
└── templates/
    └── index.html        # Клиентская страница
```

## Возможности

- ✅ Визуальный редактор JSON
- ✅ Древовидное отображение структуры данных
- ✅ Добавление/удаление полей
- ✅ Сохранение в IndexedDB (автономная работа)
- ✅ Синхронизация с MinIO
- ✅ Статус подключения в реальном времени
- ✅ Уведомления о действиях

## Запуск

### Вариант 1: Docker Compose (рекомендуется)

```bash
cd app
docker-compose up -d
```

После запуска:
- Веб-интерфейс: http://localhost:5000
- MinIO Console: http://localhost:9001 (логин/пароль: minioadmin/minioadmin)

### Вариант 2: Локальный запуск

1. Установите зависимости:
```bash
pip install -r requirements.txt
```

2. Запустите MinIO (отдельно):
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

3. Запустите Flask приложение:
```bash
python app.py
```

4. Откройте браузер: http://localhost:5000

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| MINIO_ENDPOINT | Адрес MinIO сервера | localhost:9000 |
| MINIO_ACCESS_KEY | Access key MinIO | minioadmin |
| MINIO_SECRET_KEY | Secret key MinIO | minioadmin |
| MINIO_BUCKET | Имя бакета | json-data |

## API Endpoints

### GET /api/data
Получить данные из MinIO

**Ответ:**
```json
{
  "key": "value",
  "nested": {
    "field": "data"
  }
}
```

### POST /api/data
Сохранить данные в MinIO

**Тело запроса:**
```json
{
  "key": "value"
}
```

**Ответ:**
```json
{
  "status": "success",
  "message": "Data saved successfully"
}
```

## Работа с приложением

1. **Добавление поля:**
   - Введите ключ и значение в форме
   - Выберите тип данных (строка, число, булево)
   - Нажмите "Добавить"

2. **Редактирование JSON:**
   - Изменяйте данные прямо в текстовом редакторе
   - Структура обновляется автоматически

3. **Сохранение:**
   - "Сохранить в MinIO" - синхронизация с сервером
   - Данные автоматически сохраняются в IndexedDB

4. **Загрузка:**
   - "Загрузить из MinIO" - получить данные с сервера
   - "Загрузить из IndexedDB" - восстановить локальную копию

## Индикаторы статуса

- 🟢 **Зеленый** - Подключено и готово к работе
- 🔵 **Синий** - Идет синхронизация
- 🔴 **Красный** - Ошибка подключения
