let cancelled = false;

self.onmessage = function(e) {
    if (e.data.type === 'test') {
        console.log('Тестовое сообщение получено:', e.data.data);
        self.postMessage({ type: 'test_response', message: 'Воркер работает!' });
        return;
    }
    // const { matrix, aperture, width, height } = e.data;
    // cancelled = false;

    // // Функция медианного фильтра
    // function medianFilter(matrix, aperture) {
    //     const result = Array.from({ length: width }, () => Array(height).fill(0));
    //     const windowWidth = Math.floor(aperture / 2);

    //     for (let x = 0; x < width; x++) {
    //         if (cancelled) {
    //             self.postMessage({ type: 'cancelled' });
    //             return; // Прекращаем обработку
    //         }

    //         for (let y = 0; y < height; y++) {
    //             const window = [];
    //             for (let i = -windowWidth; i <= windowWidth; i++) {
    //                 for (let j = -windowWidth; j <= windowWidth; j++) {
    //                     const nx = Math.max(0, Math.min(x + i, width - 1));
    //                     const ny = Math.max(0, Math.min(y + j, height - 1));
    //                     window.push(matrix[nx][ny]);
                       
    //                 }
    //             }

    //             window.sort((a, b) => a - b);
    //             result[x][y] = window[Math.floor(window.length / 2)];
    //         }

    //         // Отправляем прогресс после каждой строки
    //         const percent = Math.round(((x + 1) / width) * 100);
    //         self.postMessage({ type: 'progress', percent });
    //     }

    //     self.postMessage({ type: 'result', matrix: result });
    // }

    // medianFilter(matrix, aperture);
};

// Обработка отмена через внешний вызов
self.onmessage = function(e) {
    if (e.data.type === 'cancel') {
        cancelled = true;
    }
};
