from flask import Flask, send_from_directory, make_response
import os
from datetime import datetime, timedelta

app = Flask(__name__, static_folder='static')
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 31536000  # 1 год по умолчанию

# Директория для статических файлов
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')

@app.route('/')
def index():
    """Отдаем HTML файл с заголовками для кэширования"""
    response = make_response(send_from_directory(STATIC_DIR, 'index.html'))
    # Устанавливаем заголовки для кэширования HTML
    response.headers['Cache-Control'] = 'public, max-age=3600'  # Кэшировать 1 час
    response.headers['ETag'] = '"html-v1"'  # Версия файла для проверки изменений
    return response

@app.route('/static/<path:filename>')
def serve_static(filename):
    """Отдаем статические файлы (CSS, JS) с заголовками для кэширования"""
    filepath = os.path.join(STATIC_DIR, filename)
    
    if not os.path.exists(filepath):
        return "File not found", 404
    
    # Определяем max-age в зависимости от типа файла
    if filename.endswith('.css') or filename.endswith('.js'):
        max_age = 31536000  # 1 год
    elif filename.endswith('.html'):
        max_age = 3600  # 1 час
    else:
        max_age = 86400  # 1 день
    
    # Отправляем файл с правильными заголовками
    response = make_response(
        send_from_directory(
            STATIC_DIR, 
            filename,
            max_age=max_age
        )
    )
    
    # Добавляем ETag для валидации кэша
    if filename.endswith('.css'):
        response.headers['ETag'] = '"css-v1"'
        response.headers['Content-Type'] = 'text/css; charset=utf-8'
    elif filename.endswith('.js'):
        response.headers['ETag'] = '"js-v1"'
        response.headers['Content-Type'] = 'application/javascript; charset=utf-8'
    elif filename.endswith('.html'):
        response.headers['ETag'] = '"html-v1"'
    
    return response

if __name__ == '__main__':
    app.run(debug=False, port=5000, threaded=True)
