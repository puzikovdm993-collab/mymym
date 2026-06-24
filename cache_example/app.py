from flask import Flask, render_template, send_from_directory, make_response

app = Flask(__name__)

# Маршрут для главной страницы
@app.route('/')
def index():
    response = make_response(render_template('index.html'))
    # Устанавливаем заголовок для HTML - не кэшировать или короткое время
    # Это нужно, чтобы браузер проверял обновления HTML
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# Маршрут для статических файлов (CSS, JS)
@app.route('/static/<path:filename>')
def serve_static(filename):
    response = make_response(send_from_directory('static', filename))
    
    # Устанавливаем длительное кэширование для статических файлов
    # Максимальный возраст 1 год (31536000 секунд)
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    response.headers['Expires'] = 'Sun, 31 Dec 2034 23:59:59 GMT'
    
    return response

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
