from flask import Flask, send_from_directory, make_response, jsonify

app = Flask(__name__, static_folder='static')

# Маршрут для главной страницы с правильным типом контента для манифеста
@app.route('/')
def index():
    response = make_response(send_from_directory(app.static_folder, 'index.html'))
    # Кэшируем HTML на 1 час, но браузер будет использовать AppCache
    response.headers['Cache-Control'] = 'public, max-age=3600'
    return response

# Отдаем файл манифеста с правильным MIME-типом
@app.route('/cache.manifest')
def manifest():
    response = make_response(send_from_directory(app.static_folder, 'cache.manifest'))
    response.headers['Content-Type'] = 'text/cache-manifest'
    # Не кэшируем сам манифест, чтобы браузер всегда проверял обновления
    response.headers['Cache-Control'] = 'no-cache'
    return response

# API для проверки статуса сервера
@app.route('/api/status')
def status():
    return jsonify({'status': 'online', 'message': 'Сервер работает'})

if __name__ == '__main__':
    print("Запуск сервера на http://127.0.0.1:5000")
    print("Откройте страницу в браузере - она закэшируется через AppCache")
    print("После первого посещения можно выключить сервер и обновлять страницу (F5) - она будет работать!")
    app.run(host='0.0.0.0', port=5000, debug=True)
