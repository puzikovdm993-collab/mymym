import os
import sys
import copy
import numpy as np
from io import BytesIO
from datetime import datetime
from werkzeug.utils import secure_filename
from minio import Minio
from minio.error import S3Error
from minio.commonconfig import CopySource
import base64
import json
import io
import logging
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file, abort, send_from_directory,render_template, session, make_response




# ------------------- Настройка логирования -------------------
def setup_logging(app):  # Теперь функция принимает app как аргумент

    # #Для продакшена (минимум информации)
    # app_logger_Level = logging.WARNING          # Логгер игнорирует DEBUG и INFO
    # console_handler_Level = logging.WARNING     # Только WARNING, ERROR, CRITICAL в консоль
    # file_handler_Level = logging.INFO           # В файл записываются INFO и выше
    # request_logger_Level = logging.INFO     # Логируем запросы 

    # Для разработки (максимум деталей)
    app_logger_Level = logging.DEBUG     # Логгер собирает все уровни
    console_handler_Level = logging.CRITICAL # Всё выводится в консоль
    file_handler_Level = logging.DEBUG     # Всё записывается в файл
    request_logger_Level = logging.DEBUG     # Логируем запросы 


    # Проверка и создание папки для логов (если её нет)
    if not os.path.exists('logs'):
        os.makedirs('logs')


    # Создаем логгер для основного приложения
    app_logger = logging.getLogger('FlaskAppLogger')
    app_logger.setLevel(app_logger_Level)

    # Создаем отдельный логгер для запросов
    request_logger = logging.getLogger('FlaskAppLogger.requests')
    request_logger.propagate = False  # Отключаем передачу логов родительскому логгеру
    request_logger.setLevel(request_logger_Level)

    


    # Формат логов
    app_formatter = logging.Formatter(
        # #[25.02.2026 13:27:06] DEBUG в app.log_response: Ответ: 200 OK для /scripts/index.js
        # '[%(asctime)s] %(levelname)s в %(module)s.%(funcName)s: %(message)s',
        # datefmt='%d.%m.%Y %H:%M:%S'

        # [25.02.2026 13:27:06] DEBUG : Ответ: 200 OK для /scripts/index.js
        '[%(asctime)s] %(levelname)s : %(message)s',
        datefmt='%d.%m.%Y %H:%M:%S'
    )

    # Формат для логов запросов (более детализированный)
    request_formatter = logging.Formatter(
        '[%(asctime)s] [REQUEST] %(levelname)s : %(message)s - %(module)s:%(funcName)s:%(lineno)d',
        datefmt='%d.%m.%Y %H:%M:%S'
    )




    # Создаем обработчик для обычных логов приложения
    app_file_handler = logging.FileHandler('logs/app.log')
    app_file_handler.setFormatter(app_formatter)
    app_file_handler.setLevel(app_logger_Level)
    app_logger.addHandler(app_file_handler)

    # Создаем отдельный обработчик для логов запросов

    request_file_handler = logging.FileHandler('logs/requests.log')
    request_file_handler.setFormatter(request_formatter)
    request_file_handler.setLevel(request_logger_Level)
    request_logger.addHandler(request_file_handler)
    
    # Добавляем обработчики
    # app_logger.addHandler(console_handler)
    # app_logger.addHandler(file_handler)
    # app_logger.addHandler(request_file_handler)
    
    # Логирование запросов через Flask-хуки
    @app.before_request
    def log_request():
       
        request_logger.info(f"Запрос: {request.method} {request.path} от {request.remote_addr}")
    
    @app.after_request
    def log_response(response):
        request_logger.debug(f"Ответ: {response.status} для {request.path}")
        return response
    
    return app_logger

# Инициализация Flask и логгера
app = Flask(__name__, static_folder='')
app_logger = setup_logging(app)  # Передаем app в функцию
app_logger.info("Инициализировано Flask-приложение")






minio_client = None  # Глобальная переменная (изначально None)

# Глобальные переменные для MinIO (будут загружены из .env при инициализации)
MINIO_ENDPOINT = None
MINIO_ACCESS_KEY = None
MINIO_SECRET_KEY = None
MINIO_REGION = None
MINIO_SECURE = None
MINIO_BUCKET = 'wtis'
MINIO_PROJECTS_PREFIX = 'projects/'  # Префикс для хранения проектов

def get_minio_client():
    global minio_client
    if minio_client is None:
        minio_client = Minio(
            MINIO_ENDPOINT,
            access_key=MINIO_ACCESS_KEY,
            secret_key=MINIO_SECRET_KEY,
            region = MINIO_REGION,
            secure=MINIO_SECURE
        )
    return minio_client

def set_minio_client():
    """
    Инициализирует или переинициализирует MinIO-клиент, используя параметры из `.env` файла.
    Если `.env` не содержит необходимых переменных, применяются значения по умолчанию.
    
    Возвращает:
        Minio: клиент MinIO с параметрами из окружения
    
    Исключения:
        ValueError: если не найдены обязательные параметры
        ConnectionError: если подключение к MinIO не удалось
    """
    global minio_client, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_REGION, MINIO_SECURE
    
    # Загружаем переменные окружения из .env (если он есть)
    load_dotenv()

    # Получаем параметры из окружения (с дефолтами)
    endpoint = os.getenv("MINIO_ENDPOINT", "localhost:9000")
    access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
    bucket = os.getenv("MINIO_BUCKET", "wtis")
    region = os.getenv("MINIO_REGION", "us-east-1")
    secure = os.getenv("MINIO_SECURE", "False").lower() == "true"
    
    # Проверяем обязательные параметры
    if not endpoint or not access_key or not secret_key:
        raise ValueError(
            "Необходимые параметры MinIO не найдены в окружении! "
            "Проверьте файл .env (MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY)."
        )
    
    # Сохраняем в глобальные переменные
    MINIO_ENDPOINT = endpoint
    MINIO_ACCESS_KEY = access_key
    MINIO_SECRET_KEY = secret_key
    MINIO_REGION = region
    MINIO_SECURE = secure
    MINIO_BUCKET = bucket
    
    # Создаём новый клиент
    minio_client = Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        region=region,
        secure=secure
    )
    
    # Проверяем подключение
    try:
        minio_client.list_buckets()
        print("✅ MinIO клиент успешно инициализирован из .env!")
    except Exception as e:
        raise ConnectionError(f"❌ Ошибка подключения к MinIO: {e}") from e
    
    return minio_client



# ------------------- Декоратор для обработки ошибок MinIO -------------------
def handle_minio_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            app_logger.debug(f"Вызов функции {f.__name__} с аргументами: {args}, {kwargs}")
            result = f(*args, **kwargs)
            app_logger.debug(f"Функция {f.__name__} завершена успешно")
            return result
        except S3Error as e:
            error_msg = f"Ошибка MinIO в {f.__name__}: {e}"
            app_logger.error(error_msg, exc_info=True)
            return jsonify({'error': str(e)}), getattr(e, 'code', 500) or 500
        except Exception as e:
            error_msg = f"Внутренняя ошибка в {f.__name__}: {e}"
            app_logger.error(error_msg, exc_info=True)
            return jsonify({'error': 'Internal server error'}), 500
    return decorated_function


def ensure_bucket(client, bucket_name):
    try:
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
            app_logger.info(f"Создан бакет {bucket_name} в MinIO")
    except S3Error as e:
        error_msg = f"Ошибка при создании бакета {bucket_name}: {e}"
        app_logger.error(error_msg)
        raise e











# Получаем путь к директории, где находится скрипт
if getattr(sys, 'frozen', False):
    # Если приложение упаковано в exe (PyInstaller)
    script_dir = os.path.dirname(sys.executable)
else:
    # Обычный режим выполнения
    script_dir = os.path.dirname(os.path.abspath(__file__))
    app_logger.debug(f"Приложение запущено в обычном режиме из директории: {script_dir}")

# Конфигурация
UPLOAD_FOLDER = os.path.join(script_dir, 'uploads')
ALLOWED_EXTENSIONS = {'tpt'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 16MB max-limit

# Создаем папку для загрузок, если она не существует
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app_logger.info(f"Папка для загрузок: {UPLOAD_FOLDER}")


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_image_info(filename):
    """Получаем информацию об изображении"""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return None
    
    stat = os.stat(filepath)
    created = datetime.fromtimestamp(stat.st_ctime).isoformat()
    modified = datetime.fromtimestamp(stat.st_mtime).strftime('%d.%m.%Y %H:%M')
    size = stat.st_size
    
    # Определяем тип файла
    file_type = 'unknown'
    if '.' in filename:
        file_type = filename.rsplit('.', 1)[1].lower()
    
    app_logger.debug(f"Информация о файле {filename}: размер={size}, тип={file_type}")
    return {
        'filename': filename,
        'original_filename': filename,
        'created': created,
        'modified': modified,
        'size': size,
        'type': file_type
    }

# @app.route('/')
# def index():
#     # app_logger.info("Доступ к главной странице")
#     # headers = dict(request.headers)
    
#     # # Проверка наличия заголовка Authorization
#     # auth_header = headers.get('Authorization')
#     # if not auth_header:
#     #     # Если заголовка нет, просто отдаем страницу (авторизация будет проверяться при действиях)
#     #     if not os.path.exists('index.html'):
#     #         app_logger.error("Файл index.html не найден")
#     #         abort(404)
#     #     return send_from_directory('.', 'index.html')
    
#     # try:
#     #     aut = base64.b64decode(auth_header.split()[1]).decode('utf-8')
#     #     login = aut.split(":")[0]
#     #     password = aut.split(":")[1]
#     #     app_logger.debug(f"login: {login}")
#     #     app_logger.debug(f"password: {password}")
#     # except Exception as e:
#     #     app_logger.error(f"Ошибка декодирования авторизации: {e}")
#     #     # Продолжаем без авторизации или можно вернуть 401
#     #     # abort(401)

#     login = "TEST_USER"

#     if not os.path.exists('wtis-projects.html'):
#         app_logger.error("Файл index.html не найден")
#         abort(404)
#     # return send_from_directory('.', 'wtis-projects.html')
#     return render_template('wtis-projects.html', login=login)

@app.route('/')
def projects():
    if not os.path.exists('wtis_projects.html'):
        app_logger.error("Файл wtis_projects.html не найден")
        abort(404)
    return send_from_directory('.', 'wtis_projects.html')

@app.route('/workspace')
def index():
    if not os.path.exists('wtis_workspace.html'):
        app_logger.error("Файл wtis_workspace.html не найден")
        abort(404)
    return send_from_directory('.', 'wtis_workspace.html')
    # return render_template('wtis_workspace.html', login=login)


@app.route('/workflow')
def workflow():
    if not os.path.exists('wtis_workflow.html'):
        app_logger.error("Файл wtis_workflow.html не найден")
        abort(404)
    return send_from_directory('.', 'wtis_workflow.html')

@app.route('/api/user', methods=['GET'])
def get_user_info():
    """
    Возвращает информацию о пользователе, извлечённую из заголовка Authorization.
    Формат ответа: JSON с полем "login" (или "error" в случае ошибки).
    """
    headers = dict(request.headers)
    auth_header = headers.get('Authorization')

    if not auth_header:
        app_logger.error("Отсутствует заголовок Authorization")
        return jsonify({"error": "Неавторизованный запрос"}), 401

    try:
        # Извлекаем base64-кодированную часть (после "Basic ")
        auth_data = auth_header.split()[1]
        decoded_auth = base64.b64decode(auth_data).decode('utf-8')
        aut_login = decoded_auth.split(":")[0]  # Берём только логин (без пароля)

 
    except (IndexError, UnicodeDecodeError, base64.binascii.Error) as e:
        app_logger.error(f"Ошибка декодирования Authorization: {e}")
        return jsonify({"error": "Неверный формат заголовка Authorization"}), 400

    # Словарь для маппинга логинов (можно заменить на запрос к БД)
    login_translations = {
        "ganeevam": "Ганеев А.М.",
        "galinovivik": "Галинов И.В.",
        "pavloviv": "Павлов И.В.",
        "PavlovIV": "Павлов И.В.",
        "user2": "Пользователь2"
    }

    # Формируем ответ
    user_login = login_translations.get(aut_login, aut_login)
    return jsonify({
        "login": user_login,
        "original_login": aut_login,
        "authenticated": True
    }), 200



@app.route('/list_local')
def list_images():
    """Получить список всех изображений"""
    app_logger.info("Запрос списка изображений")
    try:
        images = []
        upload_folder = app.config['UPLOAD_FOLDER']
        
        # Проверяем существование папки
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder, exist_ok=True)
            app_logger.warning(f"Папка {upload_folder} не существовала, создана автоматически")
        
        # Получаем список файлов
        for filename in os.listdir(upload_folder):
            if allowed_file(filename):
                info = get_image_info(filename)
                if info:
                    images.append(info)
        
        # Сортируем по дате создания (новые сначала)
        images.sort(key=lambda x: x['created'], reverse=True)
        app_logger.debug(f"Найдено {len(images)} изображений для отображения")
        
        return jsonify({
            'success': True,
            'images': images,
            'count': len(images)
        })
    except Exception as e:
        error_msg = f"Ошибка при получении списка изображений: {e}"
        app_logger.error(error_msg, exc_info=True)
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

# curl  http://localhost:15404/list_minio
@app.route('/list_minio')
@handle_minio_errors
def list_objects():
    """Получить список объектов в бакете"""
    
    # Логируем входящий запрос
    app_logger.info(f"Запрос списка объектов в бакете '{MINIO_BUCKET}' MinIO")
    
    # Проверяем существование бакета
    try:
        bucket_exists = minio_client.bucket_exists(MINIO_BUCKET)
        app_logger.debug(f"Проверка бакета '{MINIO_BUCKET}': существует={bucket_exists}")
        
        if not bucket_exists:
            app_logger.warning(f"Бакет '{MINIO_BUCKET}' не существует.")
            return jsonify({'error': f'Bucket "{MINIO_BUCKET}" does not exist'}), 404
    except S3Error as e:
        app_logger.error(f"Ошибка проверки бакета: {e}", exc_info=True)
        raise
    
    # Получаем список объектов
    try:
        objects = minio_client.list_objects(MINIO_BUCKET, recursive=True)
        result = [
            {
                'name': obj.object_name,
                'size': obj.size,
                'last_modified': obj.last_modified.strftime('%Y-%m-%d %H:%M:%S'),
                'etag': obj.etag
            }
            for obj in objects
        ]
        app_logger.debug(f"Успешно получено {len(result)} объектов из бакета '{MINIO_BUCKET}'")
        
        # Логируем детали каждого объекта (уровень DEBUG)
        for obj in result:
            app_logger.debug(
                f"Объект: {obj['name']}, "
                f"Размер={obj['size']} байт, "
                f"Изменён={obj['last_modified']}"
            )
    except S3Error as e:
        app_logger.error(f"Ошибка получения списка объектов: {e}", exc_info=True)
        raise

    app_logger.info(f"Успешное получение списка объектов в бакете '{MINIO_BUCKET}' MinIO")
    return jsonify(result)


# curl -X POST  http://localhost:15404/upload_minio/test_tpt.json 
@app.route('/upload_minio', methods=['POST'])
@handle_minio_errors
def upload_minio():
    """Загрузить файл в MinIO, преобразовав его в JSON с base64-кодированием"""

    # Логируем входящий запрос с параметрами
    app_logger.info(f"Запрос загрузки файла в бакет '{MINIO_BUCKET}' MinIO")
    app_logger.debug(f"Получены параметры: filename={request.form.get('filename')}, "
                     f"autoscale={request.form.get('autoscale')}, "
                     f"colormap={request.form.get('colormap')}, "
                     f"width={request.form.get('width')}, "
                     f"height={request.form.get('height')}, "
                     f"minValue={request.form.get('minValue')}, "
                     f"maxValue={request.form.get('maxValue')}")

    # Получаем и проверяем параметры
    try:

        filename = request.form.get('filename', 'UnnamedFile')
        autoscale = request.form.get('autoscale') == 'true'
        colormap = request.form.get('colormap', 'gray')
        width = int(request.form.get('width', 1))
        height = int(request.form.get('height', 1))
        min_value = float(request.form.get('minValue', 0))
        max_value = float(request.form.get('maxValue', 1))

        # Логируем извлечённые параметры - уровень DEBUG
        app_logger.debug(
            f"Разобраны параметры: "
            f"filename={filename}, "
            f"autoscale={autoscale}, "
            f"colormap={colormap}, "
            f"width={width}, "
            f"height={height}, "
            f"min_value={min_value}, "
            f"max_value={max_value}"
        )
    except (ValueError, TypeError) as e:
        app_logger.error(f"Ошибка парсинга параметров: {e}", exc_info=True)
        return jsonify({"error": "Некорректные параметры запроса"}), 400

    # Проверяем наличие данных
    matrix_file = request.files.get('matrix')
    if not matrix_file:
        app_logger.warning("Файл матрицы не передан в запросе")
        return jsonify({"error": "Файл матрицы не найден"}), 400

    # Читаем содержимое файла
    try:
        file_content = matrix_file.read().decode('utf-8')  # Читаем и декодируем в строку
        app_logger.debug(f"Файл '{filename}' успешно прочитан (длина={len(file_content)} символов)")
    except UnicodeDecodeError as e:
        app_logger.error(f"Ошибка декодирования файла: {e}", exc_info=True)
        return jsonify({"error": "Файл должен быть в формате UTF-8"}), 400

    # Проверка параметров
    if width <= 0 or height <= 0:
        app_logger.warning(f"Некорректные размеры: width={width}, height={height}")
        return jsonify({"error": "Width and height must be positive numbers"}), 400

    # Кодируем содержимое в base64
    try:
        b64_content = base64.b64encode(file_content.encode('utf-8')).decode('utf-8')
        app_logger.debug(f"Файл '{filename}' успешно преобразован в base64")
    except Exception as e:
        app_logger.error(f"Ошибка base64-кодирования: {e}", exc_info=True)
        return jsonify({"error": "Ошибка обработки файла"}), 500

    # Формируем JSON-объект
    try:
        json_payload = {
            'filename': filename,
            'autoscale': autoscale,
            'colormap': colormap,
            'width': width,
            'height': height,
            'min_value': min_value,
            'max_value': max_value,
            'b64_content': b64_content
        }
        
        json_str = json.dumps(json_payload, indent=2)
        json_bytes = json_str.encode('utf-8')
        app_logger.debug(f"Создан JSON-объект для файла {filename}")
    except Exception as e:
        app_logger.error(f"Ошибка создания JSON-объекта: {e}", exc_info=True)
        return jsonify({"error": "Ошибка формирования JSON"}), 500


    # Получаем клиент MinIO и проверяем бакет
    try:
        client = get_minio_client()
        ensure_bucket(client, MINIO_BUCKET)
        app_logger.debug(f"Подключён клиент MinIO, бакет '{MINIO_BUCKET}' существует")
    except S3Error as e:
        app_logger.error(f"Ошибка подключения к MinIO или проверки бакета: {e}", exc_info=True)
        raise


    # Имя объекта в MinIO (меняем расширение на .json)
    object_name = f"{filename}.json"
    app_logger.debug(f"Подготовлено имя объекта в MinIO: {object_name}")


    try:
        # Загружаем в MinIO как JSON
        data_stream = io.BytesIO(json_bytes)
        client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=data_stream,
            length=len(json_bytes),
            content_type='application/json'
        )

        app_logger.info(f"Файл '{filename}' успешно загружен как {object_name}")

        return jsonify({
            'success': True,
            'message': 'File uploaded, converted to base64 and saved as JSON',
            'bucket': MINIO_BUCKET,
            'object': object_name
        }), 200

    except S3Error as e:
        app_logger.error(f"Ошибка загрузки в MinIO: {e}", exc_info=True)
        return jsonify({'error': f"MinIO storage error: {e}"}), 500
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка при загрузке: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500



# curl -X GET  http://localhost:15404/download_minio/test_tpt.json 
@app.route('/download_minio/<object_name>', methods=['GET'])
@handle_minio_errors
def download_file_minio(object_name):
    """
    Скачивает файл из MinIO по имени JSON-объекта.
    """
    # Логируем входящий запрос
    app_logger.info(f"Запрос скачивания объекта '{object_name}' из бакета '{MINIO_BUCKET}' MinIO")
    app_logger.debug(f"Запрошено скачивание объекта: {object_name}")

    # Проверяем существование бакета
    try:
        bucket_exists = minio_client.bucket_exists(MINIO_BUCKET)
        app_logger.debug(f"Проверка бакета '{MINIO_BUCKET}': существует={bucket_exists}")
        
        if not bucket_exists:
            app_logger.warning(f"Бакет '{MINIO_BUCKET}' не существует.")
            return jsonify({'error': f'Bucket "{MINIO_BUCKET}" does not exist'}), 404
    except S3Error as e:
        app_logger.error(f"Ошибка проверки бакета: {e}", exc_info=True)
        raise


    try:
        # Получаем объект как поток
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        app_logger.debug(f"Объект '{object_name}' загружен")
    
        # Декодируем и парсим JSON
        json_data = json.loads(response.read().decode('utf-8'))
        app_logger.debug(f"Успешный парсинг JSON. Ключи: {list(json_data.keys())}")

        matrix = base64.b64decode(json_data['b64_content']).decode('utf-8')
        app_logger.debug( f"Декодирована base64-матрица из объекта '{object_name}' " )

        app_logger.info(f"Файл '{json_data['filename']}' успешно скачан из объекта '{object_name}' " )

        # Возвращаем имя файла в JSON (или другом формате)
        return jsonify({
            "status": "success",
            "filename": json_data['filename'],
            "autoscale": json_data['autoscale'],
            "colormap": json_data['colormap'],
            "width": json_data['width'],
            "height": json_data['height'],
            "min_value": json_data['min_value'],
            "max_value": json_data['max_value'],
            "matrix": matrix
        })
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Объект '{object_name}' не найден в бакете '{MINIO_BUCKET}'")
            return jsonify({'error': f'Object "{object_name}" not found'}), 404
        else:
            app_logger.error(f"Ошибка доступа к объекту в MinIO: {e}", exc_info=True)
            return jsonify({'error': f"MinIO storage error: {e}"}), 500
    
    except UnicodeDecodeError as e:
        app_logger.error(f"Ошибка декодирования JSON или base64: {e}", exc_info=True)
        return jsonify({'error': "Не удалось декодировать данные объекта"}), 500
    
    except json.JSONDecodeError as e:
        app_logger.error(f"Ошибка парсинга JSON: {e}", exc_info=True)
        return jsonify({'error': "Некорректный формат JSON в объекте"}), 500
    
    except KeyError as e:
        app_logger.error(f"Отсутствует обязательный ключ в JSON: {e}", exc_info=True)
        return jsonify({'error': f"Отсутствует обязательное поле: {e}"}), 400
    
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка при скачивании: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500




@app.route('/image/<filename>')
def get_image(filename):
    """Получить изображение"""
    try:
        # Защищаем от path traversal атак
        filename = secure_filename(filename)
        upload_folder = app.config['UPLOAD_FOLDER']
        filepath = os.path.join(upload_folder, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return send_file(filepath)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/upload', methods=['POST'])
def upload_image():
    """Загрузить изображение на сервер"""
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file part'
            }), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No selected file'
            }), 400
        
        if file and allowed_file(file.filename):
            # Защищаем имя файла
            original_filename = secure_filename(file.filename)
            
            # Добавляем timestamp, чтобы избежать конфликтов имен
            name, ext = os.path.splitext(original_filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{name}_{timestamp}{ext}"
            
            # Сохраняем файл
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            
            return jsonify({
                'success': True,
                'filename': unique_filename,
                'original_filename': original_filename,
                'message': 'File uploaded successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'File type not allowed. Allowed types: {", ".join(ALLOWED_EXTENSIONS)}'
            }), 400
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/upload_test', methods=['POST'])
def upload_file_test():
    try:
       
        id = request.form.get('id')
        filename = request.form.get('filename', 'UnnamedFile')
        autoscale = request.form.get('autoscale') == 'true'
        colormap = request.form.get('colormap', 'gray')
        width = int(request.form.get('width', 1))
        height = int(request.form.get('height', 1))
        min_value = float(request.form.get('minValue', 0))
        max_value = float(request.form.get('maxValue', 1))

        # Проверка параметров
        if width <= 0 or height <= 0:
            return jsonify({"error": "Width and height must be positive numbers"}), 400
        if not allowed_file(filename):
            return jsonify({"error": "Недопустимое расширение файла"}), 400
        
        matrix_file = request.files.get('matrix')
        if not matrix_file:
            return jsonify({"error": "Файл матрицы не найден"}), 400

        original_filename = matrix_file.filename
        # matrix_filename = secure_filename(filename)
        matrix_filename = filename
        upload_folder = app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        matrix_path = os.path.join(upload_folder, matrix_filename)
        matrix_file.save(matrix_path)


      
        print(f"Получены данные:")
        print(f"ID: {id}")
        print(f"Файл: {filename}")
        print(f"Автоподстройка: {autoscale}")
        print(f"Колор-форма: {colormap}")
        print(f"Размер: [{width}, {height}]")
        print(f"Диапазон: [{min_value}, {max_value}]")
        print(f"matrix_path+matrix_filename: [{matrix_path}]")


     
        with open(matrix_path, 'r', encoding='utf-8') as file:
            data = file.read().strip().split(',')
            numbers = [float(x.strip()) for x in data]



     
        lines = [numbers[i:i+int(width)] for i in range(0, len(numbers), int(width))]

       
        with open(matrix_path, 'w', encoding='utf-8') as out_file:
            
            out_file.write(f"{int(width)}\n")  
            out_file.write(f"{int(height)}\n") 
            
            
            for line in lines:
                formatted_line = ' '.join(format(num, '.5f') for num in line) 
                out_file.write(formatted_line + '\n')


        return jsonify({
            'success': True,
            'filename': filename, 
            'original_filename': filename, 
            'message': 'File uploaded successfully'
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/delete/<filename>', methods=['DELETE'])
def delete_image(filename):
    """Удалить изображение"""
    try:
        filename = secure_filename(filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        os.remove(filepath)
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/clear_all', methods=['DELETE'])
def clear_all_images():
    """Удалить все изображения"""
    try:
        count = 0
        upload_folder = app.config['UPLOAD_FOLDER']
        
        # Проверяем существование папки
        if not os.path.exists(upload_folder):
            return jsonify({
                'success': True,
                'message': 'No images to delete',
                'count': 0
            })
        
        for filename in os.listdir(upload_folder):
            if allowed_file(filename):
                filepath = os.path.join(upload_folder, filename)
                os.remove(filepath)
                count += 1
        
        return jsonify({
            'success': True,
            'message': f'Deleted {count} images',
            'count': count
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



@app.route('/move', methods=['POST'])
@handle_minio_errors
def move_object():
    data = request.get_json()
    if not data or 'source' not in data or 'destination' not in data:
        return jsonify({'error': 'Отсутствие источника или адресата'}), 400

    source = data['source']
    destination = data['destination']

    app_logger.info(f"Попытка перемещения {source} -> {destination}")

    # Проверка существования исходного объекта
    try:
        minio_client.stat_object(MINIO_BUCKET, source)
    except Exception as e:
        app_logger.error(f"Исходный объект не найден.: {source} - {e}")
        return jsonify({'error': f'Исходный объект не найден.: {str(e)}'}), 404

    # Копирование с использованием CopySource
    try:


        # copy_source = {'Bucket': MINIO_BUCKET, 'Object': source}   # для версий ≤6.x
        copy_source = CopySource(
            bucket_name=MINIO_BUCKET,  # Бакет исходного объекта
            object_name=source  # Ключ исходного объекта
        )
        print(f"MINIO_BUCKET: {MINIO_BUCKET}")
        print(f"destination: {destination}")
        print(f"copy_source: {copy_source}")
        minio_client.copy_object(MINIO_BUCKET, destination, copy_source)
        app_logger.info(f"Успешное выполнение: Объект скопирован. {source} в {destination}")
    except Exception as e:
        app_logger.error(f"Ошибка копирования: {source} -> {destination} - {e}")
        return jsonify({'error': f'Ошибка копирования: {str(e)}'}), 500

    # Удаление исходного объекта
    try:
        minio_client.remove_object(MINIO_BUCKET, source)
        app_logger.info(f"Исходный объект удалён {source}")
    except Exception as e:
        app_logger.error(f"Не удалось удалить исходный объект {source} после копирования: {e}")
        return jsonify({
            'error': f'Copy succeeded but failed to remove original: {str(e)}',
            'warning': 'Original file still exists, please check manually'
        }), 500

    return jsonify({'success': True, 'source': source, 'destination': destination})

@app.route('/mkdir_minio', methods=['POST'])
@handle_minio_errors
def mkdir_minio():
    """
    Создаёт пустой объект-маркер, имитирующий папку.
    Ожидает JSON: { "prefix": "newfolder/" }
    """
    data = request.get_json()
    if not data or 'prefix' not in data:
        return jsonify({'error': 'Missing prefix'}), 400

    prefix = data['prefix'].strip()
    # Убедимся, что префикс оканчивается на '/'
    if not prefix.endswith('/'):
        prefix += '/'

    # Проверка на допустимость (запрещаем '..')
    if '..' in prefix or prefix.startswith('/'):
        return jsonify({'error': 'Invalid folder name'}), 400

    try:
        # Создаём пустой объект
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=prefix,
            data=io.BytesIO(b''),
            length=0,
            content_type='application/x-directory'  # опционально
        )
        return jsonify({'success': True, 'prefix': prefix}), 201
    except S3Error as e:
        app.logger.error(f"Error creating folder {prefix}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/delete_minio', methods=['DELETE'])
@handle_minio_errors
def delete_minio():
    """
    Удаляет объект или все объекты с указанным префиксом.
    Параметры: ?path=some/path   (если оканчивается на '/', удаляется папка)
    """
    path = request.args.get('path')
    if not path:
        return jsonify({'error': 'Missing path parameter'}), 400

    # Базовая защита
    if '..' in path or path.startswith('/'):
        return jsonify({'error': 'Invalid path'}), 400

    try:
        if path.endswith('/'):
            # Удаление папки (все объекты с префиксом)
            objects_to_delete = list(minio_client.list_objects(
                MINIO_BUCKET, prefix=path, recursive=True
            ))
            if not objects_to_delete:
                return jsonify({'error': 'Folder not found or empty'}), 404

            # Формируем список имён для массового удаления
            delete_object_list = [obj.object_name for obj in objects_to_delete]
            errors = minio_client.remove_objects(
                MINIO_BUCKET,
                delete_object_list,
                bypass_governance_mode=True
            )
            # Проверим, были ли ошибки
            failed = list(errors)
            if failed:
                app.logger.error(f"Errors while deleting folder {path}: {failed}")
                return jsonify({
                    'success': False,
                    'error': 'Some objects could not be deleted',
                    'details': failed
                }), 500

            return jsonify({
                'success': True,
                'deleted_count': len(delete_object_list),
                'message': f'Folder {path} deleted'
            })
        else:
            # Удаление одного файла
            minio_client.remove_object(MINIO_BUCKET, path)
            return jsonify({
                'success': True,
                'deleted_count': 1,
                'message': f'File {path} deleted'
            })
    except S3Error as e:
        app.logger.error(f"Error deleting {path}: {e}")
        return jsonify({'error': str(e)}), 500









@app.route('/workflow')
def panel():
    # Отдаём workflow.html из корня проекта
    if not os.path.exists('workflow.html'):
        abort(404)
    return send_from_directory('.', 'workflow.html')

@app.route('/viewIcons')
def viewIcons():
    # Отдаём incon из корня проекта
    if not os.path.exists('icons-preview.html'):
        abort(404)
    return send_from_directory('.', 'icons-preview.html')

@app.route('/new_int')
def viewNewInterface():
    # Отдаём incon из корня проекта
    if not os.path.exists('test2_0.html'):
        abort(404)
    return send_from_directory('.', 'test2_0.html')


def is_prefix_explicitly_created(minio_client, bucket_name, prefix):
    try:
        minio_client.stat_object(bucket_name, prefix.strip('/') + '/')
        return True  # Папка существует как отдельный объект
    except S3Error as e:
        if e.code == "NoSuchKey":
            return False  # Папка не создана явно
        else:
            print(f"Ошибка: {e}")
            return False

# curl  http://localhost:15404/endpointtest
@app.route('/endpointtest')
def endpointtest():
    bucket_name = "wtis"
    prefix = "123/123"

    try:
        # Проверяем, есть ли объекты с этим префиксом (или сам префикс)
        if is_prefix_explicitly_created(minio_client,bucket_name,prefix):
            print(f"Префикс '{prefix}' существует и не пуст.")
        else:
            print(f"нет Префикс '{prefix}' .")
        # /objects = minio_client.list_objects(bucket_name, prefix=prefix, recursive=True)

        


    except S3Error as e:
        print(f"Ошибка: {e}")

    return "Тестовый ответ", 200  # или просто return "OK"


# ==================== Project Management Endpoints ====================
# Проекты (/api/v1/projects)
#     Метод	    Маршрут	            Описание	                        Тело запроса
#     GET	    /api/v1/projects	    Список всех проектов	            Нет
#     POST	    /api/v1/projects	    Создание нового проекта	            JSON: { "name": "...", "description": "..." }
#     GET	    /api/v1/projects/{id}	Получение метаданных проекта	    Нет
#     PUT	    /api/v1/projects/{id}	Полное обновление проекта	        JSON: { "name": "...", "description": "..." }
#     PATCH	    /api/v1/projects/{id}	Частичное обновление проекта	    JSON: { "description": "..." }
#     DELETE	/api/v1/projects/{id}	Удаление проекта и всех файлов	    Нет

# Файлы (/api/v1/projects/{projectId}/files)
#     Метод	    Маршрут	                                        Описание	                                                                    Тело запроса
#     GET	    /api/v1/projects/{projectId}/files	            Список файлов проекта	                                                        Нет
#     GET	    /api/v1/projects/{projectId}/files/{fileId}	    Получение конкретного файла          	                                        Нет
#     POST	    /api/v1/projects/{projectId}/files/{fileId}     Загрузка нового файла (обновление существующего)          	                    multipart/form-data (файл)
#     PUT	    /api/v1/projects/{projectId}/files/{fileId}	    Замена актуального файла (или создание версии, если сервер поддерживает)	    multipart/form-data (файл)
#     DELETE	/api/v1/projects/{projectId}/files/{fileId}	    Удаление файла          	                                                    Нет

# Версии файлов (/api/v1/projects/{projectId}/files/{fileId}/versions)
#     Метод	    Маршрут	                                                        Описание	                        Тело запроса 
#     GET	    /api/v1/projects/{projectId}/files/{fileId}/history 	        Список всех версий файла	        Нет
#     POST	    /api/v1/projects/{projectId}/files/{fileId}/history	            Скачивание конкретной версии	    Нет



# # object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
# curl -X GET http://localhost:15404/api/v1/projects
@app.route('/api/v1/projects', methods=['GET'])
@handle_minio_errors
def list_projects_api():
    """
    Возвращает список всех проектов из MinIO.
    Ожидаемая структура: {MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json
    """
    app_logger.info("Запрос списка проектов из MinIO")
    
    projects = []
    
    try:
        # Получаем список всех объектов с префиксом проектов
        # recursive=True необходим, так как файлы находятся в подпапках
        objects = minio_client.list_objects(MINIO_BUCKET, prefix=MINIO_PROJECTS_PREFIX, recursive=True)
        
        for obj in objects:
            # Пропускаем "папки" (объекты, заканчивающиеся на /)
            if obj.object_name.endswith('/'):
                continue
            
            # Проверяем, что это JSON-файл
            if not obj.object_name.endswith('.json'):
                continue
            
            # Извлекаем project_id из пути
            # Структура: prefix/{project_id}/{project_id}.json
            # split('/') даст: ['', 'prefix', 'project_id', 'project_id.json']
            # или если prefix пустой или содержит слеши, нужно быть осторожным.
            # Безопаснее использовать rsplit для получения последних частей.
            
            parts = obj.object_name.split('/')
            
            # Предполагаем, что prefix не содержит слеши, иначе логика сложнее.
            # Если prefix есть, то:
            # parts[0] - пустой (если путь начинается с /) или часть prefix
            # parts[1] - проект_id (если prefix без слешей и один уровень глубины)
            
            # Более надежный способ для структуры {prefix}{id}/{id}.json:
            # Убираем префикс из имени файла
            if obj.object_name.startswith(MINIO_PROJECTS_PREFIX):
                relative_path = obj.object_name[len(MINIO_PROJECTS_PREFIX):]
            else:
                continue # Не относится к нашим проектам
            
            # relative_path теперь: "{project_id}/{project_id}.json"
            relative_parts = relative_path.split('/')
            
            if len(relative_parts) < 2:
                app_logger.warning(f"Некорректный путь проекта: {obj.object_name}")
                continue
                
            project_id = relative_parts[0]
            
            # Дополнительная проверка: имя файла должно совпадать с id (опционально, но надежно)
            expected_filename = f"{project_id}.json"
            actual_filename = relative_parts[1]
            
            if actual_filename != expected_filename:
                app_logger.warning(f"Имя файла не совпадает с ID в пути: {obj.object_name}")
                # Можно либо пропустить, либо использовать как есть, если логика допускает расхождения
                continue

            # Загружаем данные
            try:
                response = minio_client.get_object(MINIO_BUCKET, obj.object_name)
                json_data = response.read().decode('utf-8')
                project_data = json.loads(json_data)
                
                # Извлекаем данные проекта
                # Если в JSON есть вложенность 'project', используем её, иначе весь объект
                if isinstance(project_data, dict) and 'project' in project_data:
                    project_info = project_data['project']
                else:
                    project_info = project_data
                                
                projects.append(project_info)
                
            except (json.JSONDecodeError, UnicodeDecodeError) as e:
                app_logger.error(f"Ошибка парсинга JSON для {project_id}: {e}")
            except Exception as e:
                app_logger.warning(f"Не удалось загрузить данные проекта {project_id}: {e}")
                
    except S3Error as e:
        app_logger.error(f"Ошибка получения списка объектов из MinIO: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
    
    app_logger.info(f"Найдено {len(projects)} проектов в MinIO")
    
    return jsonify({
        'success': True,
        'projects': projects,
        'count': len(projects)
    }), 200

@app.route('/api/v1/projects', methods=['POST'])
@handle_minio_errors
def save_project():
    """
    Сохраняет проект в MinIO в формате JSON.
    Ожидает JSON с структурой проекта.
    """
    app_logger.info("Запрос на сохранение проекта в MinIO")
    
    # Получаем данные проекта из запроса
    data = request.get_json()
    if not data:
        app_logger.error(f"error: No JSON data provided  400")
        return jsonify({'error': 'No JSON data provided'}), 400

    # Проверяем наличие обязательных полей
    if 'project' not in data:
        app_logger.error(f"error: Missing 'project' field  400 ")
        return jsonify({'error': 'Missing "project" field'}), 400
    

    project_id = data['project'].get('id')
    if not project_id:
        app_logger.error(f"error': 'Missing project id,  400")
        return jsonify({'error': 'Missing project id'}), 400
    
    # Формируем имя объекта в MinIO
    object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
    # print(object_name)

    # Преобразуем данные в JSON
    try:
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        app_logger.debug(f"Проект {project_id} сериализован в JSON (размер={len(json_bytes)} байт)")
    except Exception as e:
        app_logger.error(f"Ошибка сериализации проекта: {e}", exc_info=True)
        return jsonify({'error': 'Failed to serialize project data'}), 500
    
    # Гарантируем существование бакета
    try:
        ensure_bucket(minio_client, MINIO_BUCKET)
    except Exception as e:
        app_logger.error(f"Ошибка создания бакета: {e}", exc_info=True)
        return jsonify({'error': 'Failed to ensure bucket exists'}), 500
    
    # Загружаем в MinIO
    try:
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        app_logger.info(f"Проект {project_id} успешно сохранён в MinIO: {object_name}")
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'object_name': object_name,
            'message': f'Project saved successfully'
        }), 201
    except S3Error as e:
        app_logger.error(f"Ошибка сохранения проекта в MinIO: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500




def remove_matrices(data):
    """
    Рекурсивно удаляет ключ 'matrix' из словарей и списков.
    """
    if isinstance(data, dict):
        # Создаем новый словарь, исключая ключ 'matrix'
        return {
            key: remove_matrices(value)
            for key, value in data.items()
            if key != 'matrix'
        }
    elif isinstance(data, list):
        return [remove_matrices(item) for item in data]
    else:
        return data

# curl -X GET  http://localhost:15404/api/v1/projects/proj_1779965855307_ums5py
import re
SAFE_PATH_PATTERN = re.compile(r'^[a-zA-Z0-9/_\.\-]+$')

def validate_path(path):
    """Проверяет, что путь не содержит попыток обхода директорий."""
    if not path:
        return False
    if '..' in path:
        return False
    # Дополнительная проверка на спецсимволы, если требуется
    return bool(SAFE_PATH_PATTERN.match(path))

def load_matrix_from_minio(bucket, client, object_path):
    """
    Загружает .npy файл из MinIO и возвращает его данные как список.
    Возвращает None в случае ошибки.
    """
    if not validate_path(object_path):
        raise ValueError(f"Невалидный путь к матрице: {object_path}")
        
    try:
        response = client.get_object(bucket, object_path)
        matrix_bytes = response.read()
        response.close()
        response.release_conn()
        
        # Декодируем NumPy массив
        matrix_data = np.load(io.BytesIO(matrix_bytes))
        
        # Преобразуем в список для JSON
        return matrix_data.tolist()
        
    except Exception as e:
        # Логирование ошибки можно вынести в caller или оставить здесь
        print(f"Error loading matrix from {object_path}: {e}")
        return None

@app.route('/api/v1/projects/<project_id>', methods=['GET'])
@handle_minio_errors
def get_project_metadata_with_matrices(project_id):
    """
    Возвращает метаданные проекта с загруженными матрицами (включая history).
    """
    app_logger.info(f"Запрос метаданных с матрицами для проекта {project_id}")
    
    object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"

    try:
        # 1. Получаем JSON метаданных
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        json_str = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        
        full_data = json.loads(json_str)
        project_data = full_data['project']

        # 2. Обрабатываем файлы
        if 'files' in project_data:
            for file_entry in project_data['files']:
                processed_files = []
                
                # А. Основная матрица файла
                main_matrix_path = file_entry.get('matrix')
                if main_matrix_path:
                    matrix_data = load_matrix_from_minio(MINIO_BUCKET, minio_client, main_matrix_path)
                    if matrix_data is not None:
                        file_entry['matrix'] = matrix_data
                    else:
                        # Если не удалось загрузить, можно оставить ссылку или null
                        file_entry['matrix'] = None 

                # Б. Матрицы в истории
                if 'history' in file_entry and isinstance(file_entry['history'], list):
                    for hist_item in file_entry['history']:
                        hist_matrix_path = hist_item.get('matrix')
                        if hist_matrix_path:
                            hist_matrix_data = load_matrix_from_minio(MINIO_BUCKET, minio_client, hist_matrix_path)
                            if hist_matrix_data is not None:
                                hist_item['matrix'] = hist_matrix_data
                            else:
                                hist_item['matrix'] = None

        app_logger.info(f"Метаданные с матрицами для проекта {project_id} успешно сформированы")
        return jsonify(project_data), 200

    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Проект {project_id} не найден в MinIO")
            return jsonify({'error': f'Project {project_id} not found'}), 404
        elif e.code == 'AccessDenied':
            app_logger.warning(f"Отказано в доступе к проекту {project_id}")
            return jsonify({'error': 'Access denied'}), 403
        else:
            app_logger.error(f"Ошибка MinIO: {e}", exc_info=True)
            return jsonify({'error': 'Internal server error'}), 500
    except json.JSONDecodeError as e:
        app_logger.error(f"Ошибка парсинга JSON: {e}", exc_info=True)
        return jsonify({'error': 'Invalid JSON format'}), 500
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

    """
    Возвращает метаданные проекта с загруженными матрицами вместо ссылок.
    ВНИМАНИЕ: Этот запрос может быть медленным при большом количестве файлов.
    """
    app_logger.info(f"Запрос метаданных с матрицами для проекта {project_id}")
    
    object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"

    try:
        # 1. Получаем JSON метаданных
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        json_str = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        
        full_data = json.loads(json_str)
        project_data = full_data['project']

        # 2. Обрабатываем файлы внутри проекта
        if 'files' in project_data:
            for file_entry in project_data['files']:
                matrix_path = file_entry.get('matrix')
                
                if not matrix_path:
                    continue

                try:
                    # 3. Загружаем .npy файл из MinIO
                    matrix_response = minio_client.get_object(MINIO_BUCKET, matrix_path)
                    matrix_bytes = matrix_response.read()
                    matrix_response.close()
                    matrix_response.release_conn()

                    # 4. Декодируем NumPy массив из байтов
                    # np.load ожидает файл-подобный объект или путь
                    matrix_data = np.load(io.BytesIO(matrix_bytes))
                    
                    # 5. Преобразуем в список для JSON
                    # Если матрица огромная, это может занять много памяти и времени
                    file_entry['matrix'] = matrix_data.tolist()
                    
                    # Опционально: можно удалить поле 'matrix' ссылку, если оно больше не нужно
                    # del file_entry['matrix_ref'] 

                except Exception as e:
                    app_logger.error(f"Ошибка загрузки матрицы {matrix_path} для файла {file_entry.get('filename', 'unknown')}: {e}")
                    # Вариант А: оставить ссылку, если не удалось загрузить данные
                    # file_entry['matrix'] = matrix_path 
                    # Вариант Б: оставить None
                    file_entry['matrix'] = None

        app_logger.info(f"Метаданные с матрицами для проекта {project_id} успешно сформированы")
        return jsonify(project_data), 200

    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Проект {project_id} не найден в MinIO")
            return jsonify({'error': f'Project {project_id} not found'}), 404
        elif e.code == 'AccessDenied':
            app_logger.warning(f"Отказано в доступе к проекту {project_id}")
            return jsonify({'error': 'Access denied'}), 403
        else:
            app_logger.error(f"Ошибка MinIO: {e}", exc_info=True)
            return jsonify({'error': 'Internal server error'}), 500
    except json.JSONDecodeError as e:
        app_logger.error(f"Ошибка парсинга JSON: {e}", exc_info=True)
        return jsonify({'error': 'Invalid JSON format'}), 500
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500



# curl -X DELETE  http://localhost:15404/api/projects/proj_1780052143631_xme86g
# @app.route('/delete_project/<project_id>', methods=['DELETE'])
@app.route('/api/v1/projects/<project_id>', methods=['DELETE'])
@handle_minio_errors
def delete_project(project_id):
    """
    Удаляет проект из MinIO по его ID.
    """
    app_logger.info(f"Запрос на удаление проекта {project_id} из MinIO")
    
    # Формируем имя объекта в MinIO
    # object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}.json"
    object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
    
    try:
        minio_client.remove_object(MINIO_BUCKET, object_name)
        app_logger.info(f"Проект {project_id} успешно удалён из MinIO")
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'message': f'Project deleted successfully'
        }), 200
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Проект {project_id} не найден в MinIO для удаления")
            return jsonify({'error': f'Project {project_id} not found'}), 404
        app_logger.error(f"Ошибка удаления проекта из MinIO: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500







# curl -X GET  http://localhost:15404/api/v1/projects/proj_1779965855307_ums5py/files
@app.route('/api/v1/projects/<project_id>/files', methods=['GET'])
@handle_minio_errors
def get_project_files(project_id):
    """
    Получает список файлов проекта из JSON-файла, хранящегося в MinIO.
    """
    app_logger.info(f"Запрос на получение списка файлов для проекта {project_id}")

    # 1. Формируем имя объекта в MinIO
    object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"

    try:
        # 2. Загружаем объект из MinIO
        response = minio_client.get_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name
        )
        
        # 3. Считываем и декодируем данные
        try:
            data_bytes = response.read()
            response.close()
            response.release_conn()
            
            project_data_str = data_bytes.decode('utf-8')
            project_data = json.loads(project_data_str)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            app_logger.error(f"Ошибка парсинга JSON для проекта {project_id}: {e}")
            return jsonify({'error': 'Invalid JSON format in project file'}), 400
        finally:
            if response:
                response.close()
                response.release_conn()

    except S3Error as e:
        # S3Error с кодом NoSuchKey или 404 означает, что файл проекта не существует
        if e.code == 'NoSuchKey' or e.status_code == 404:
            app_logger.warning(f"Файл проекта не найден: {object_name}")
            return jsonify({'error': 'Project not found'}), 404
        else:
            app_logger.error(f"Ошибка MinIO при получении файла проекта: {e}")
            return jsonify({'error': 'Failed to load project file'}), 500
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка при получении файла проекта: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

    # 4. Извлекаем список файлов
    files = project_data.get('project').get('files')
    app_logger.info(files)
    if files is None:
        app_logger.warning(f"В файле проекта {project_id} отсутствует поле 'files'")
        return jsonify({'error': 'Project file structure is invalid: missing "files"'}), 400

    # Возвращаем список файлов
    return jsonify({
        'success': True,
        'project_id': project_id,
        'files': files
    }), 200



# curl -X POST "http://localhost:15404/api/v1/projects/proj_1780024359932_2wcdr0/files" -H "Content-Type: application/json" -d @project_data.json -v
@app.route('/api/v1/projects/<project_id>/files', methods=['POST'])
@handle_minio_errors
def save_project_with_matrix_ref(project_id):
    """
    Сохраняет проект и бинарные матрицы.
    Заменяет поле matrix в project.files на ссылку (путь) на файл в MinIO.
    """
    app_logger.info(f"Запрос на сохранение проекта с матрицами для {project_id}")

    # 1. Получаем данные
    data = request.get_json()
    if not data or 'project' not in data:
        return jsonify({'error': 'Invalid request structure'}), 400

    project_data = data['project']
    
    # Проверка ID
    if project_data.get('id') != project_id:
        return jsonify({'error': 'Project ID mismatch'}), 400

    files = project_data.get('files', [])
    if not files:
        return jsonify({'error': 'No files to process'}), 400

    # Список обновленных файлов для вставки в проект
    updated_files = []
    
    # 2. Обработка каждого файла
    for file_obj in files:
        matrix = file_obj.get('matrix')
        filename = file_obj.get('filename')
        
        if not filename:
            app_logger.warning(f"Пропуск файла без имени")
            continue

        # Имя объекта в MinIO для бинарных данных
        matrix_object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{filename}_matrix.npy"

        if matrix is not None:
            try:
                # A. Сохраняем бинарные данные
                np_matrix = np.array(matrix)
                buffer = io.BytesIO()
                np.save(buffer, np_matrix)
                binary_data = buffer.getvalue()
                buffer.close()

                ensure_bucket(minio_client, MINIO_BUCKET)

                minio_client.put_object(
                    bucket_name=MINIO_BUCKET,
                    object_name=matrix_object_name,
                    data=io.BytesIO(binary_data),
                    length=len(binary_data),
                    content_type='application/octet-stream'
                )
                app_logger.info(f"Бинарная матрица сохранена: {matrix_object_name}")

                # B. Обновляем объект файла в памяти
                # Удаляем большой массив matrix, чтобы не дублировать данные в JSON
                # Добавляем ссылку (путь) на файл
                updated_file_obj = {
                    **file_obj,  # Копируем остальные поля (id, name, etc.)
                    'matrix': None,  # Или удаляем ключ: del updated_file_obj['matrix']
                    'matrix_ref': matrix_object_name  # Сохраняем относительный путь
                }
                
            except Exception as e:
                app_logger.error(f"Ошибка сохранения матрицы для {filename}: {e}", exc_info=True)
                # Можно решить: прерывать весь процесс или просто логировать ошибку
                return jsonify({'error': f'Failed to save matrix for {filename}'}), 500
        else:
            # Если матрицы нет, просто копируем файл как есть (или добавляем пустую ссылку)
            updated_file_obj = {**file_obj, 'matrix_ref': None}

        updated_files.append(updated_file_obj)

    # 3. Обновляем проект
    project_data['files'] = updated_files
    
    # 4. Сохраняем обновленный проект в MinIO (JSON)
    try:
        json_str = json.dumps(project_data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        
        project_object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
        
        ensure_bucket(minio_client, MINIO_BUCKET)
        
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=project_object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        
        app_logger.info(f"Проект {project_id} успешно обновлен и сохранен.")
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'message': 'Project and matrices saved. Matrix data replaced with references.',
            'files_count': len(updated_files)
        }), 201
        
    except Exception as e:
        app_logger.error(f"Ошибка сохранения JSON проекта: {e}", exc_info=True)
        return jsonify({'error': 'Failed to save project JSON'}), 500








# curl -X GET "http://localhost:15404/api/v1/projects/proj_1780024359932_2wcdr0/files/1780024367053-7e38769158dfa" -H "Accept: application/json"-v
@app.route('/api/v1/projects/<project_id>/files/<file_id>', methods=['GET'])
def load_file_matrix(project_id, file_id):
    """
    Загружает бинарную матрицу для конкретного файла проекта.
    Путь: /api/projects/{project_id}/files/{file_id}
    """
    app_logger.info(f"Запрос на загрузку матрицы файла {file_id} проекта {project_id}")

    # 1. Загружаем метаданные проекта из MinIO
    project_object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
    
    try:
        response = minio_client.get_object(
            bucket_name=MINIO_BUCKET,
            object_name=project_object_name
        )
        project_json_str = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        
        project_data = json.loads(project_json_str)
        
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Проект не найден: {project_object_name}")
            return jsonify({'error': 'Project not found'}), 404
        app_logger.error(f"Ошибка MinIO при загрузке проекта: {e}")
        return jsonify({'error': 'Failed to load project metadata'}), 500
    except Exception as e:
        app_logger.error(f"Ошибка парсинга проекта: {e}", exc_info=True)
        return jsonify({'error': 'Failed to parse project data'}), 500

    # 2. Находим нужный файл в проекте
    files = project_data.get('files', [])
    target_file = None
    
    for f in files:
        if f.get('id') == file_id:
            target_file = f
            break

    if not target_file:
        app_logger.warning(f"Файл {file_id} не найден в проекте {project_id}")
        return jsonify({'error': 'File not found in project'}), 404

    # 3. Определяем путь к бинарному файлу матрицы
    object_name = None
    
    # Приоритет 1: matrix_ref (если сохранен при записи)
    matrix_ref = target_file.get('matrix_ref')
    if matrix_ref:
        object_name = matrix_ref
    else:
        # Приоритет 2: filename (формирование пути по стандарту)
        filename = target_file.get('filename')
        if not filename:
            return jsonify({'error': 'File has no matrix data or reference'}), 404
        object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{filename}_matrix.npy"

    # 4. Загружаем бинарные данные из MinIO
    try:
        binary_response = minio_client.get_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name
        )
        binary_data = binary_response.read()
        binary_response.close()
        binary_response.release_conn()
        
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.warning(f"Бинарный файл не найден: {object_name}")
            return jsonify({'error': 'Matrix file not found in MinIO'}), 404
        app_logger.error(f"Ошибка MinIO при загрузке матрицы: {e}")
        return jsonify({'error': 'Failed to load matrix data'}), 500
    except Exception as e:
        app_logger.error(f"Ошибка сети: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve matrix data'}), 500

    # 5. Десериализация NumPy
    try:
        buffer = io.BytesIO(binary_data)
        matrix_array = np.load(buffer)
        buffer.close()
        
        # Конвертация в JSON-совместимый список
        matrix_list = matrix_array.tolist()
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'file_id': file_id,
            'filename': target_file.get('filename'),
            'matrix': matrix_list,
            'shape': list(matrix_array.shape),
            'dtype': str(matrix_array.dtype)
        }), 200
        
    except Exception as e:
        app_logger.error(f"Ошибка десериализации: {e}", exc_info=True)
        return jsonify({'error': 'Failed to deserialize matrix data'}), 500


# curl -X POST \
#   'http://localhost:15404/api/v1/projects/proj_1780024359932_2wcdr0/files/1780024367053-7e38769158dfa' \
#   -H 'Content-Type: application/json' \
#   -d '{    "file": {      "id": "1780024367053-7e38769158dfa",      "filename": "example_matrix.npy",      "matrix": [        [1, 2, 3],        [4, 5, 6]      ]    }  }'

# curl -X POST "http://localhost:15404/api/v1/projects/proj_1780457388987_bnqjgh/files/1780457394019-322461c26fbd7" -H "Content-Type: application/json" -d @test_curl.json -v

@app.route('/api/v1/projects/<project_id>/files/<file_id>', methods=['POST'])
@handle_minio_errors
def create_or_update_project_file(project_id, file_id):
    """
    Сохраняет матрицу файла в MinIO и обновляет метаданные файла внутри project.files
    в общем файле проекта {project_id}.json.
    """
    app_logger.info(f"Запрос на сохранение файла '{file_id}' в проект '{project_id}'")

    # 1. Проверка бакета
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            return jsonify({'error': f'Bucket "{MINIO_BUCKET}" does not exist'}), 404
    except S3Error as e:
        app_logger.error(f"Ошибка проверки бакета: {e}", exc_info=True)
        raise

    # 2. Парсинг входящего JSON
    try:
        raw_data = request.get_json(force=True)
        if raw_data is None:
            raise ValueError("Empty JSON body")
        
        file_data = raw_data.get('file')
        if file_data is None:
            return jsonify({'error': "В теле запроса отсутствует ключ 'file'"}), 400
            
        if 'id' not in file_data:
            return jsonify({'error': "Отсутствует обязательное поле 'id' внутри 'file'"}), 400
            
        app_logger.debug(f"JSON распарсен. ID файла: {file_data['id']}")
    except json.JSONDecodeError:
        return jsonify({'error': "Некорректный формат JSON в запросе"}), 400
    except Exception as e:
        app_logger.error(f"Ошибка чтения запроса: {e}", exc_info=True)
        return jsonify({'error': "Ошибка чтения тела запроса"}), 400

    # Глубокая копия данных для обработки
    data_to_save = copy.deepcopy(file_data)
    
    try:
        # --- ЭТАП 1: Сохранение матриц (бинарных данных) ---
        matrix_key = None
        
        # 1.1. Основная матрица
        matrix = data_to_save.get('matrix')
        if matrix is not None:
            try:
                if not isinstance(matrix, np.ndarray):
                    matrix_arr = np.array(matrix)
                else:
                    matrix_arr = matrix

                byte_io = io.BytesIO()
                np.save(byte_io, matrix_arr)
                npy_bytes = byte_io.getvalue()

                # Формируем ключ для матрицы
                matrix_key = f"projects/{project_id}/{file_id}_matrix.npy"
                
                minio_client.put_object(
                    MINIO_BUCKET,
                    matrix_key,
                    io.BytesIO(npy_bytes),
                    length=len(npy_bytes),
                    content_type='application/octet-stream'
                )
                
                # В метаданные записываем ссылку на файл
                data_to_save['matrix'] = matrix_key

            except Exception as e:
                app_logger.error(f"Ошибка сохранения матрицы: {e}", exc_info=True)
                raise

        # 1.2. История матриц
        history = data_to_save.get('history', [])
        for hist_idx, hist_item in enumerate(history):
            hist_matrix = hist_item.get('matrix')
            if hist_matrix is not None:
                try:
                    if not isinstance(hist_matrix, np.ndarray):
                        hist_arr = np.array(hist_matrix)
                    else:
                        hist_arr = hist_matrix

                    hist_byte_io = io.BytesIO()
                    np.save(hist_byte_io, hist_arr)
                    hist_npy_bytes = hist_byte_io.getvalue()

                    timestamp = hist_item.get('timestamp', f"hist_{hist_idx}")
                    hist_key = f"projects/{project_id}/{file_id}_hist_{timestamp}.npy"
                    
                    minio_client.put_object(
                        MINIO_BUCKET,
                        hist_key,
                        io.BytesIO(hist_npy_bytes),
                        length=len(hist_npy_bytes),
                        content_type='application/octet-stream'
                    )
                    hist_item['matrix'] = hist_key

                except Exception as e:
                    app_logger.error(f"Ошибка сохранения истории: {e}", exc_info=True)
                    raise

        app_logger.info(f"Матрицы для файла '{file_id}' сохранены.")

        # --- ЭТАП 2: Обновление общего файла метаданных проекта ---
        
        # Формируем путь к файлу проекта
        project_meta_key = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
        app_logger.info(f"Обновление метаданных проекта: {project_meta_key}")

        # 2.1. Чтение существующих метаданных проекта
        project_metadata = {}
        try:
            obj = minio_client.get_object(MINIO_BUCKET, project_meta_key)
            with obj:
                project_metadata = json.loads(obj.read().decode('utf-8'))
            app_logger.debug(f"Существующие метаданные проекта загружены.")
        except S3Error as e:
            if e.code != 'NoSuchKey':
                app_logger.error(f"Ошибка чтения метаданных проекта: {e}", exc_info=True)
                raise
            # Если файла нет, начинаем с пустой структуры
        except Exception as e:
            app_logger.error(f"Ошибка парсинга метаданных проекта: {e}", exc_info=True)
            raise

        # 2.2. Инициализация структуры, если нужно
        # Убедимся, что есть ключ 'project'
        if 'project' not in project_metadata:
            project_metadata['project'] = {"id": project_id}
        
        # Убедимся, что есть ключ 'files' ВНУТРИ project
        if 'files' not in project_metadata['project']:
            project_metadata['project']['files'] = []

        # 2.3. Добавление/обновление файла в project.files
        file_found = False
        files_list = project_metadata['project']['files']
        
        for i, existing_file in enumerate(files_list):
            if existing_file.get('id') == file_id:
                files_list[i] = data_to_save
                file_found = True
                app_logger.info(f"Файл '{file_id}' обновлен в project.files.")
                break
        
        if not file_found:
            files_list.append(data_to_save)
            app_logger.info(f"Файл '{file_id}' добавлен в project.files.")

        # 2.4. Запись обновленных метаданных проекта обратно в тот же файл
        json_bytes = json.dumps(project_metadata, ensure_ascii=False, indent=2).encode('utf-8')
        
        minio_client.put_object(
            MINIO_BUCKET,
            project_meta_key,
            io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        
        app_logger.info(f"Метаданные проекта '{project_id}' успешно обновлены.")
        
        return jsonify({
            "status": "success",
            "file_id": file_id,
            "project_id": project_id,
            "metadata_key": project_meta_key,
            "matrix_key": matrix_key
        }), 200

    except S3Error as e:
        app_logger.error(f"Ошибка MinIO при сохранении: {e}", exc_info=True)
        return jsonify({'error': f"Ошибка сохранения в хранилище: {e}"}), 500
    
    except Exception as e:
        app_logger.error(f"Неожиданная ошибка: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500



# curl -X DELETE 'http://localhost:15404/api/projects/proj_1780024359932_2wcdr0/files/1780024367053-7e38769158dfa' -H 'Accept: application/json'
@app.route('/api/v1/projects/<project_id>/files/<file_id>', methods=['DELETE'])
@handle_minio_errors
def delete_project_file(project_id, file_id):
    """
    Удаляет файл из проекта.
    - Удаляет объект матрицы из MinIO.
    - Удаляет запись файла из JSON проекта.
    """
    app_logger.info(f"Запрос на удаление файла {file_id} проекта {project_id}")

    # 1. Получаем текущий проект из MinIO
    project_object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
    try:
        response = minio_client.get_object(
            bucket_name=MINIO_BUCKET, 
            object_name=project_object_name
        )
        project_data = json.loads(response.read().decode('utf-8'))
        response.close()
        response.release_conn()
    except Exception as e:
        app_logger.error(f"Ошибка чтения проекта {project_id}: {e}")
        return jsonify({'error': 'Project not found or could not be read'}), 404

    files = project_data.get('files', [])
    target_file = None
    target_index = -1

    # 2. Ищем файл в списке
    for idx, f in enumerate(files):
        if str(f.get('id')) == str(file_id):
            target_file = f
            target_index = idx
            break
    
    if target_file is None:
        return jsonify({'error': f'File with ID {file_id} not found in project {project_id}'}), 404

    # 3. Удаляем бинарные данные матрицы из MinIO, если они есть
    matrix_ref = target_file.get('matrix_ref')
    if matrix_ref:
        try:
            minio_client.remove_object(
                bucket_name=MINIO_BUCKET,
                object_name=matrix_ref
            )
            app_logger.info(f"Матрица файла {file_id} удалена из MinIO: {matrix_ref}")
        except Exception as e:
            # Логируем ошибку, но продолжаем удаление файла, чтобы не блокировать пользователя
            # Если удаление файла важно для целостности, можно вернуть 500
            app_logger.warning(f"Не удалось удалить объект матрицы {matrix_ref}: {e}")

    # 4. Удаляем файл из списка и сохраняем проект
    files.pop(target_index)
    project_data['files'] = files
    
    try:
        json_str = json.dumps(project_data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        
        ensure_bucket(minio_client, MINIO_BUCKET)
        
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=project_object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        
        app_logger.info(f"Файл {file_id} успешно удален из проекта {project_id}.")
        
        return jsonify({
            'success': True,
            'project_id': project_id,
            'file_id': file_id,
            'message': 'File deleted successfully.'
        }), 200
        
    except Exception as e:
        app_logger.error(f"Ошибка сохранения JSON проекта {project_id}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to save project JSON after deletion'}), 500













@app.route('/api/v1/projects/<project_id>/files/<file_id>/history', methods=['POST'])
@handle_minio_errors
def replace_file_history(project_id, file_id):
    """
    Полностью заменяет историю для конкретного файла проекта.
    
    URL: /api/v1/projects/{project_id}/files/{file_id}/history
    Body: { "history": [...] }
    """
    app_logger.info(f"Запрос на полную замену истории: проект = {project_id}, файл = {file_id}")
    
    try:
        # 1. Формируем путь к файлу проекта в MinIO
        # Структура: prefix/{project_id}/{project_id}.json
        project_key = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"
        
        # 2. Загружаем данные проекта из MinIO
        try:
            response = minio_client.get_object(MINIO_BUCKET, project_key)
            json_data = response.read().decode('utf-8')
            project_data = json.loads(json_data)
            app_logger.debug(f"Данные проекта {project_id} успешко загружены.")
        except S3Error as e:
            if e.code == 'NoSuchKey':
                app_logger.warning(f"Проект {project_id} не найден в MinIO")
                return jsonify({'success': False, 'error': f'Проект {project_id} не найден'}), 404
            raise
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            app_logger.error(f"Ошибка парсинга JSON проекта {project_id}: {e}")
            return jsonify({'success': False, 'error': 'Ошибка формата данных проекта'}), 500



        # 3. Извлекаем объект проекта (учитываем вложенность 'project', как в GET)
        if isinstance(project_data, dict) and 'project' in project_data:
            project_info = project_data['project']
        else:
            project_info = project_data

        app_logger.debug(f"Извлечение данных о проекте {project_id}.")

        # 4. Находим целевой файл по file_id
        files = project_info.get('files', [])
        target_file = None
        
        for f in files:
            if f.get('id') == file_id:
                target_file = f
                break
    
        if not target_file:
            app_logger.warning(f"Файл {file_id} не найден в проекте {project_id}")
            return jsonify({'success': False, 'error': f'Файл с ID {file_id} не найден'}), 404

        app_logger.debug(f"Файл с ID {file_id} найден.")

        # 5. Парсим тело запроса
        body1 = request.get_json()
        body = body1.get('file')
        if not body:
            return jsonify({'success': False, 'error': 'Тело запроса отсутствует или не является JSON'}), 400

        # 1.2. История матриц
        history = body.get('history', [])
        for hist_idx, hist_item in enumerate(history):
            hist_matrix = hist_item.get('matrix')
            if hist_matrix is not None:
                try:
                    if not isinstance(hist_matrix, np.ndarray):
                        hist_arr = np.array(hist_matrix)
                    else:
                        hist_arr = hist_matrix

                    hist_byte_io = io.BytesIO()
                    np.save(hist_byte_io, hist_arr)
                    hist_npy_bytes = hist_byte_io.getvalue()

                    timestamp = hist_item.get('timestamp', f"hist_{hist_idx}")
                    hist_key = f"projects/{project_id}/{file_id}_hist_{timestamp}.npy"
                    
                    minio_client.put_object(
                        MINIO_BUCKET,
                        hist_key,
                        io.BytesIO(hist_npy_bytes),
                        length=len(hist_npy_bytes),
                        content_type='application/octet-stream'
                    )
                    hist_item['matrix'] = hist_key

                except Exception as e:
                    app_logger.error(f"Ошибка сохранения истории: {e}", exc_info=True)
                    raise

        new_history = body.get('history')
        app_logger.debug(f"body {body} .")

        # Валидация: поле history должно быть массивом
        if new_history is None or not isinstance(new_history, list):
            return jsonify({'success': False, 'error': 'Поле "history" должно быть массивом'}), 400

        # 6. Полная замена истории
        target_file['history'] = new_history
        
        # Обновляем индекс истории на последний элемент
        # Если история пуста, ставим -1 (или 0, в зависимости от требований UI)
        target_file['historyIndex'] = len(new_history) - 1 if new_history else -1

        # 7. Сохраняем обратно в MinIO
        new_json_data = json.dumps(project_data, ensure_ascii=False, indent=2)
        data_bytes = new_json_data.encode('utf-8')
        
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=project_key, 
            data=io.BytesIO(data_bytes),
            length=len(data_bytes),
            content_type='application/json'
        )
        
        app_logger.info(f"История полностью заменена для файла {file_id} в проекте {project_id}. Записей: {len(new_history)}")
        
        return jsonify({
            'success': True,
            'message': 'История успешно обновлена',
            'historyCount': len(new_history)
        }), 200

    except Exception as e:
        app_logger.error(f"Неожиданная ошибка при замене истории: {e}", exc_info=True)
        return jsonify({'success': False, 'error': 'Внутренняя ошибка сервера'}), 500




















# # @app.route('/load_matrix_binary/<project_id>', methods=['POST'])
# # def load_matrix_binary123(project_id):
# #     """
# #     Загружает бинарную матрицу из MinIO.
# #     Ожидает JSON в теле запроса с полем 'files', содержащим объект файла с полем 'filename'.
# #     """
# #     app_logger.info(f"Запрос на загрузку бинарной матрицы для проекта {project_id}")

# #     # 1. Получаем данные из тела запроса
# #     data = request.get_json()
# #     if not data:
# #         app_logger.error("error: No JSON data provided 400")
# #         return jsonify({'error': 'No JSON data provided'}), 400

# #     # 2. Извлекаем список файлов
# #     # Ожидаемая структура: { "files": [ { "filename": "test_Recon", ... } ] }
# #     # Или если передан весь объект проекта: { "project": { "files": [...] } }
# #     # Для универсальности попробуем оба варианта, но чаще всего фронтенд будет слать именно файлы или весь проект.
    
# #     files = data.get('files')
# #     if not files:
# #         # Если структура {"project": {"files": [...]}}
# #         project_data = data.get('project', {})
# #         files = project_data.get('files', [])

# #     if not files:
# #         app_logger.error("error: No files provided in request 400")
# #         return jsonify({'error': 'No files provided in request'}), 400

# #     # Берем первый файл (согласно логике сохранения, матрица сохраняется для первого файла)
# #     file_obj = files[0]
# #     filename = file_obj.get('filename')
    
# #     if not filename:
# #         app_logger.error("error: Missing 'filename' in file object 400")
# #         return jsonify({'error': 'Missing "filename" in file object'}), 400

# #     # 3. Формируем путь к файлу в MinIO
# #     object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{filename}_matrix.npy"

# #     # 4. Загрузка из MinIO
# #     try:
# #         response = minio_client.get_object(
# #             bucket_name=MINIO_BUCKET,
# #             object_name=object_name
# #         )
# #         binary_data = response.read()
# #         response.close()
# #         response.release_conn()
        
# #     except S3Error as e:
# #         if e.code == 'NoSuchKey':
# #             app_logger.warning(f"Файл не найден в MinIO: {object_name}")
# #             return jsonify({'error': f'File {filename}_matrix.npy not found in MinIO'}), 404
# #         app_logger.error(f"Ошибка MinIO: {e}")
# #         return jsonify({'error': str(e)}), 500
# #     except Exception as e:
# #         app_logger.error(f"Ошибка сети: {e}", exc_info=True)
# #         return jsonify({'error': 'Failed to retrieve object from MinIO'}), 500

# #     # 5. Десериализация NumPy
# #     try:
# #         buffer = io.BytesIO(binary_data)
# #         matrix_array = np.load(buffer)
# #         buffer.close()
        
# #         # Конвертация в JSON-совместимый список
# #         matrix_list = matrix_array.tolist()
        
# #         return jsonify({
# #             'success': True,
# #             'project_id': project_id,
# #             'filename': filename,
# #             'matrix': matrix_list,
# #             'shape': list(matrix_array.shape),
# #             'dtype': str(matrix_array.dtype)
# #         }), 200
        
# #     except Exception as e:
# #         app_logger.error(f"Ошибка десериализации: {e}", exc_info=True)
# #         return jsonify({'error': 'Failed to deserialize matrix data'}), 500




# # # curl -X GET  http://localhost:15404/load_project/proj_1777373741280_8nnowm
# # @app.route('/load_project/<project_id>', methods=['GET'])
# # @handle_minio_errors
# # def load_project(project_id):
# #     """
# #     Загружает проект из MinIO по его ID.
# #     Возвращает JSON с данными проекта.
# #     """
# #     app_logger.info(f"Запрос на загрузку проекта {project_id} из MinIO")
    
# #     # Формируем имя объекта в MinIO
# #     # object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}.json"
# #     object_name = f"{MINIO_PROJECTS_PREFIX}{project_id}/{project_id}.json"

# #     try:
# #         # Получаем объект из MinIO
# #         response = minio_client.get_object(MINIO_BUCKET, object_name)
        
# #         # Читаем данные
# #         json_str = response.read().decode('utf-8')
# #         response.close()
# #         response.release_conn()
        
# #         # Парсим JSON
# #         project_data = json.loads(json_str)
        
# #         app_logger.info(f"Проект {project_id} успешно загружен из MinIO")

# #         return jsonify({
# #             'success': True,
# #             'data': project_data
# #         }), 200
# #     except S3Error as e:
# #         if e.code == 'NoSuchKey':
# #             app_logger.warning(f"Проект {project_id} не найден в MinIO")
# #             return jsonify({'error': f'Project {project_id} not found'}), 404
# #         app_logger.error(f"Ошибка загрузки проекта из MinIO: {e}", exc_info=True)
# #         return jsonify({'error': str(e)}), 500





# # @app.route('/list_projects', methods=['GET'])
# # @handle_minio_errors
# # def list_projects():
# #     """
# #     Возвращает список всех проектов в MinIO с полными данными.
# #     """
# #     app_logger.info("Запрос списка проектов из MinIO")
    
# #     try:
# #         # Получаем список объектов с префиксом проектов
# #         objects = minio_client.list_objects(MINIO_BUCKET, prefix=MINIO_PROJECTS_PREFIX, recursive=True)
        
# #         projects = []
# #         for obj in objects:
# #             # Пропускаем объекты-папки (заканчиваются на /)
# #             if obj.object_name.endswith('/'):
# #                 continue
            
# #             # Извлекаем ID проекта из имени файла
# #             filename = obj.object_name.split('/')[-1]
# #             if filename.endswith('.json'):
# #                 project_id = filename[:-5]  # Убираем .json
                
# #                 # Загружаем полные данные проекта
# #                 try:
# #                     response = minio_client.get_object(MINIO_BUCKET, obj.object_name)
# #                     json_data = response.read().decode('utf-8')
# #                     project_data = json.loads(json_data)
                    
# #                     # Добавляем проект в список, используя данные из JSON
# #                     if 'project' in project_data:
# #                         project_info = project_data['project']
# #                     else:
# #                         # Если структура другая, используем корневой объект
# #                         project_info = project_data
                    
# #                     # # Убеждаемся, что есть все необходимые поля
# #                     # project_entry = {
# #                     #     'id': project_info.get('id', project_id),
# #                     #     'name': project_info.get('name', 'Без названия'),
# #                     #     'category': project_info.get('category', ''),
# #                     #     'type': project_info.get('type', 'classic'),
# #                     #     'deadline': project_info.get('deadline', ''),
# #                     #     'createdAt': project_info.get('createdAt', ''),
# #                     #     'owner': project_info.get('owner', '')
# #                     # }
# #                     projects.append(project_info)
# #                     # app_logger.info(f"{(project_info)}")
# #                 except Exception as e:
# #                     app_logger.warning(f"Не удалось загрузить данные проекта {project_id}: {e}")
# #                     # Добавляем хотя бы базовую информацию
# #                     # projects.append({
# #                     #     'id': project_id,
# #                     #     'name': f'Проект {project_id}',
# #                     #     'category': '',
# #                     #     'type': 'classic',
# #                     #     'deadline': '',
# #                     #     'createdAt': obj.last_modified.strftime('%Y-%m-%d'),
# #                     #     'owner': ''
# #                     # })
        
# #         app_logger.info(f"Найдено {len(projects)} проектов в MinIO")
        
# #         return jsonify({
# #             'success': True,
# #             'projects': projects,
# #             'count': len(projects)
# #         }), 200
# #     except S3Error as e:
# #         app_logger.error(f"Ошибка получения списка проектов: {e}", exc_info=True)
# #         return jsonify({'error': str(e)}), 500



# ==================== Recent Files & Modal States Endpoints (MinIO Storage) ====================

@app.route('/api/recent_files', methods=['GET'])
@handle_minio_errors
def get_recent_files():
    """
    Получает список недавних файлов из MinIO.
    """
    app_logger.info("Запрос списка недавних файлов из MinIO")
    
    object_name = "ui_state/recent_files.json"
    
    try:
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        json_str = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        
        data = json.loads(json_str)
        app_logger.debug(f"Загружено {len(data.get('files', []))} недавних файлов")
        
        return jsonify({
            'success': True,
            'files': data.get('files', [])
        }), 200
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.debug("Список недавних файлов ещё не создан")
            return jsonify({'success': True, 'files': []}), 200
        app_logger.error(f"Ошибка загрузки недавних файлов: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/recent_files', methods=['POST'])
@handle_minio_errors
def save_recent_files():
    """
    Сохраняет список недавних файлов в MinIO.
    """
    app_logger.info("Сохранение списка недавних файлов в MinIO")
    
    data = request.get_json()
    if not data or 'files' not in data:
        return jsonify({'error': 'Missing "files" field'}), 400
    
    object_name = "ui_state/recent_files.json"
    
    try:
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        app_logger.debug(f"Сохранено {len(data['files'])} недавних файлов")
        
        return jsonify({'success': True}), 200
    except Exception as e:
        app_logger.error(f"Ошибка сохранения недавних файлов: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/modal_states', methods=['GET'])
@handle_minio_errors
def get_modal_states():
    """
    Получает состояние модальных окон из MinIO.
    """
    app_logger.info("Запрос состояния модальных окон из MinIO")
    
    object_name = "ui_state/modal_states.json"
    
    try:
        response = minio_client.get_object(MINIO_BUCKET, object_name)
        json_str = response.read().decode('utf-8')
        response.close()
        response.release_conn()
        
        data = json.loads(json_str)
        app_logger.debug(f"Загружено состояний модальных окон: {len(data.get('states', {}))}")
        
        return jsonify({
            'success': True,
            'states': data.get('states', {})
        }), 200
    except S3Error as e:
        if e.code == 'NoSuchKey':
            app_logger.debug("Состояние модальных окон ещё не создано")
            return jsonify({'success': True, 'states': {}}), 200
        app_logger.error(f"Ошибка загрузки состояния модальных окон: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@app.route('/api/modal_states', methods=['POST'])
@handle_minio_errors
def save_modal_states():
    """
    Сохраняет состояние модальных окон в MinIO.
    """
    app_logger.info("Сохранение состояния модальных окон в MinIO")
    
    data = request.get_json()
    if not data or 'states' not in data:
        return jsonify({'error': 'Missing "states" field'}), 400
    
    object_name = "ui_state/modal_states.json"
    
    try:
        json_str = json.dumps(data, ensure_ascii=False, indent=2)
        json_bytes = json_str.encode('utf-8')
        
        minio_client.put_object(
            bucket_name=MINIO_BUCKET,
            object_name=object_name,
            data=io.BytesIO(json_bytes),
            length=len(json_bytes),
            content_type='application/json'
        )
        app_logger.debug(f"Сохранено состояний модальных окон: {len(data['states'])}")
        
        return jsonify({'success': True}), 200
    except Exception as e:
        app_logger.error(f"Ошибка сохранения состояния модальных окон: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':

    # Запускаем сервер
    print(f"Server starting...")
    print(f"Script directory: {script_dir}")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Open http://127.0.0.1:15404 in your browser")
    set_minio_client()
    app.run(debug=True, host='0.0.0.0', port=15404)
