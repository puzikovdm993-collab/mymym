// Проверка статуса кэширования через AppCache
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');
const checkBtn = document.getElementById('check-btn');

function log(message) {
    const p = document.createElement('p');
    p.textContent = message;
    logEl.appendChild(p);
    console.log(message);
}

// Обработчики событий AppCache
if (window.applicationCache) {
    const appCache = window.applicationCache;

    appCache.addEventListener('cached', () => {
        log('✓ Страница закэширована!');
        statusEl.textContent = 'В кэше';
        statusEl.style.color = 'green';
    });

    appCache.addEventListener('updateready', () => {
        log('✓ Доступна новая версия. Обновите страницу (F5).');
        statusEl.textContent = 'Доступно обновление';
        statusEl.style.color = 'orange';
        if (confirm('Доступна новая версия. Перезагрузить?')) {
            window.location.reload();
        }
    });

    appCache.addEventListener('error', () => {
        log('✗ Ошибка кэширования');
        statusEl.textContent = 'Ошибка';
        statusEl.style.color = 'red';
    });

    appCache.addEventListener('checking', () => {
        log('Проверка обновлений...');
    });

    appCache.addEventListener('downloading', () => {
        log('Загрузка новой версии...');
    });

    appCache.addEventListener('progress', (e) => {
        log(`Загружено файлов: ${e.loaded}`);
    });

    appCache.addEventListener('noupdate', () => {
        log('Обновлений нет, используем кэш');
        statusEl.textContent = 'Актуально (кэш)';
        statusEl.style.color = 'blue';
    });

    appCache.addEventListener('obsolete', () => {
        log('Кэш устарел');
        statusEl.textContent = 'Устарело';
        statusEl.style.color = 'gray';
    });
} else {
    log('AppCache не поддерживается браузером');
    statusEl.textContent = 'Не поддерживается';
    statusEl.style.color = 'red';
}

// Проверка соединения
checkBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/status', { cache: 'no-cache' });
        if (response.ok) {
            log('✓ Сервер доступен');
            statusEl.textContent = 'Онлайн';
            statusEl.style.color = 'green';
        }
    } catch (e) {
        log('✗ Сервер недоступен (работаем из кэша)');
        statusEl.textContent = 'Офлайн (кэш)';
        statusEl.style.color = 'orange';
    }
});

// Автоматическая проверка при загрузке
window.addEventListener('load', () => {
    log('Страница загружена');
    // Проверяем соединение
    fetch('/api/status', { cache: 'no-cache' })
        .then(response => {
            if (response.ok) {
                log('✓ Сервер доступен');
                statusEl.textContent = 'Онлайн';
                statusEl.style.color = 'green';
            }
        })
        .catch(() => {
            log('✗ Сервер недоступен (работаем из кэша)');
            statusEl.textContent = 'Офлайн (кэш)';
            statusEl.style.color = 'orange';
        });
});
