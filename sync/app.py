from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
from minio import Minio
from minio.error import S3Error
import json
import os
import io

app = Flask(__name__)
CORS(app)

# Конфигурация MinIO
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'json-data')

# Инициализация клиента MinIO
minio_client = Minio(
    MINIO_ENDPOINT,
    access_key=MINIO_ACCESS_KEY,
    secret_key=MINIO_SECRET_KEY,
    secure=False
)

def ensure_bucket_exists():
    """Убедиться, что бакет существует"""
    try:
        if not minio_client.bucket_exists(MINIO_BUCKET):
            minio_client.make_bucket(MINIO_BUCKET)
        return True
    except Exception as e:
        # Если MinIO недоступен, просто игнорируем
        print(f"Warning: MinIO unavailable - {e}")
        return False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data', methods=['GET'])
def get_data():
    """Получить данные из MinIO"""
    try:
        response = minio_client.get_object(MINIO_BUCKET, 'data.json')
        data = json.loads(response.read().decode('utf-8'))
        return jsonify(data)
    except Exception as e:
        # Если файл не существует или MinIO недоступен, возвращаем пустую структуру
        print(f"Info: Returning empty data - {e}")
        return jsonify({})

@app.route('/api/data', methods=['POST', 'PUT'])
def save_data():
    """Сохранить данные в MinIO"""
    try:
        data = request.get_json()
        if data is None:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Пытаемся сохранить в MinIO, но не блокируем если недоступен
        try:
            json_data = json.dumps(data, indent=2, ensure_ascii=False)
            minio_client.put_object(
                MINIO_BUCKET,
                'data.json',
                io.BytesIO(json_data.encode('utf-8')),
                len(json_data.encode('utf-8')),
                content_type='application/json'
            )
        except Exception as e:
            print(f"Warning: Could not save to MinIO - {e}")
        
        return jsonify({'status': 'success', 'message': 'Data saved (MinIO may be unavailable)'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
