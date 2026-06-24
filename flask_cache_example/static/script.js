// Скрипт для демонстрации кэширования

document.addEventListener('DOMContentLoaded', function() {
    const loadStatus = document.getElementById('load-status');
    const timestamp = document.getElementById('timestamp');
    const checkCacheBtn = document.getElementById('check-cache');
    
    // Отображаем текущее время загрузки
    const now = new Date();
    timestamp.textContent = `Время загрузки: ${now.toLocaleTimeString('ru-RU')}`;
    
    // Проверяем, загружено ли из кэша
    if (performance.navigation.type === performance.navigation.TYPE_BACK_FORWARD) {
        loadStatus.textContent = 'Страница загружена из кэша (навигация назад/вперед)';
        loadStatus.className = 'cached';
    } else if (performance.navigation.type === performance.navigation.TYPE_RELOAD) {
        loadStatus.textContent = 'Страница обновлена (F5) - должна загрузиться из кэша';
        loadStatus.className = 'cached';
    } else {
        loadStatus.textContent = 'Страница загружена с сервера (первый визит)';
        loadStatus.className = 'from-server';
    }
    
    // Обработчик кнопки проверки кэша
    checkCacheBtn.addEventListener('click', function() {
        checkCacheStatus();
    });
    
    // Функция проверки статуса кэша
    function checkCacheStatus() {
        const resources = performance.getEntriesByType('resource');
        let cachedCount = 0;
        let serverCount = 0;
        
        resources.forEach(resource => {
            if (resource.transferSize === 0 || resource.encodedBodySize === 0) {
                cachedCount++;
            } else {
                serverCount++;
            }
        });
        
        const infoBox = document.querySelector('.info-box');
        const summary = document.createElement('p');
        summary.innerHTML = `<strong>Статистика:</strong> Из кэша: ${cachedCount} | С сервера: ${serverCount}`;
        summary.style.marginTop = '10px';
        summary.style.color = '#667eea';
        infoBox.appendChild(summary);
        
        // Выводим детальную информацию в консоль
        console.log('=== Статус кэширования ресурсов ===');
        resources.forEach(resource => {
            const fromCache = resource.transferSize === 0 || resource.encodedBodySize === 0;
            console.log(`${resource.name}: ${fromCache ? 'ИЗ КЭША' : 'С СЕРВЕРА'} (${resource.transferSize} байт)`);
        });
        
        alert(`Проверка завершена!\nИз кэша: ${cachedCount} файлов\nС сервера: ${serverCount} файлов\n\nОткройте консоль браузера (F12) для детальной информации.`);
    }
    
    // Автоматическая проверка через 2 секунды
    setTimeout(checkCacheStatus, 2000);
});
