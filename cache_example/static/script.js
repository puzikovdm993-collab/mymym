// JavaScript файл для демонстрации кэширования

// Функция для отображения текущего времени
function showCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    document.getElementById('timestamp').textContent = 'Текущее время: ' + timeString;
}

// Функция для проверки информации о кэше
function checkCacheInfo() {
    // Проверяем, загружен ли этот скрипт из кэша
    const cacheInfo = document.getElementById('cache-info');
    
    // Эта информация показывает, что JavaScript работает
    cacheInfo.textContent = 'JavaScript успешно загружен и выполняется! Если вы видите это сообщение, значит JS файл загрузился (из кэша или с сервера).';
    cacheInfo.style.borderColor = '#28a745';
    cacheInfo.style.color = '#28a745';
}

// Обработчик для кнопки
document.getElementById('update-btn').addEventListener('click', function() {
    showCurrentTime();
    
    // Добавляем визуальный эффект
    this.textContent = 'Время обновлено!';
    this.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    
    setTimeout(() => {
        this.textContent = 'Показать текущее время';
        this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }, 2000);
});

// Показываем время при загрузке страницы
showCurrentTime();

// Проверяем информацию о кэше
checkCacheInfo();

// Логируем в консоль информацию о загрузке
console.log('%c JavaScript файл загружен!', 'background: #667eea; color: white; padding: 5px; border-radius: 3px; font-size: 14px;');
console.log('Если вы видите это сообщение в консоли, значит JS файл успешно загрузился.');
console.log('При обновлении страницы (F5) браузер должен загрузить этот файл из кэша.');
