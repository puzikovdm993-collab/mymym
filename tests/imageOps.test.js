// Тесты для функций работы с матрицами из imageOps.js

// Импортируем функции (в реальном проекте нужно настроить импорт)
// Для примера предполагаем, что функции доступны глобально или через модуль

// Функции для тестирования (копируем из imageOps.js для изолированного тестирования)

/**
 * Переворачивает двумерный массив по вертикали (зеркалирует строки).
 * @param {Array<Array<*>>} arr - Исходный двумерный массив.
 * @returns {Array<Array<*>>} Новый массив с перевернутыми строками.
 */
function flipVertical(arr) {
    // Создаём копию массива и переворачиваем порядок строк
    return arr.slice().reverse();
}

/**
 * Переворачивает двумерный массив по горизонтали (зеркалирует столбцы).
 * @param {Array<Array<*>>} arr - Исходный двумерный массив.
 * @returns {Array<Array<*>>} Новый массив с перевернутыми столбцами.
 */
function flipHorizontal(arr) {
    return arr.map(row => row.slice().reverse());
}

/**
 * Поворачивает матрицу данных на произвольный угол.
 * @param {number[][]} matrix - Входная матрица (массив массивов).
 * @param {number} width - Ширина матрицы.
 * @param {number} height - Высота матрицы.
 * @param {number} angleDegrees - Угол поворота в градусах.
 * @returns {Object} - Объект с повернутой матрицей и новыми размерами.
 */
function _rotateMatrix(matrix, width, height, angleDegrees) {
    // Преобразуем угол в радианы
    const angleRad = angleDegrees * Math.PI / 180;
    let sin = Math.sin(angleRad);
    let cos = Math.cos(angleRad);

    if (angleDegrees == 360) {
        sin=0;
        cos=1;
    }
    if (angleDegrees == 90) {
        sin=1;
        cos=0;
    }
    if (angleDegrees == 270) {
        sin=-1;
        cos=0;
    }
    if (angleDegrees == 180) {
        sin=0;
        cos=-1;
    }

    
    // Вычисляем новые размеры после поворота
    const newWidth = Math.round(Math.abs(width * cos) + Math.abs(height * sin));
    const newHeight = Math.round(Math.abs(width * sin) + Math.abs(height * cos));
    
    // Создаем новую матрицу для результата
    const rotatedMatrix = Array.from({ length: Math.round(newHeight) }, () =>
        Array(Math.round(newWidth)).fill(0)
    );
    // Центры исходной и новой матрицы
    const centerX = (width - 1) / 2;
    const centerY = (height - 1) / 2;
    const newCenterX = (newWidth - 1) / 2;
    const newCenterY = (newHeight - 1) / 2;
    
    // Проходим по каждому пикселю новой матрицы
    for (let newY = 0; newY < newHeight; newY++) {
        for (let newX = 0; newX < newWidth; newX++) {
            // Вычисляем координаты в исходной матрице (обратное преобразование)
            const dx = newX - newCenterX;
            const dy = newY - newCenterY;
            
            // Обратный поворот
            const srcX = centerX + dx * cos + dy * sin;
            const srcY = centerY - dx * sin + dy * cos;
            
            // Билинейная интерполяция
            if (srcX >= 0 && srcX < width - 1 && srcY >= 0 && srcY < height - 1) {
                const x0 = Math.floor(srcX);
                const y0 = Math.floor(srcY);
                const x1 = x0 + 1;
                const y1 = y0 + 1;
                
                const wx = srcX - x0;
                const wy = srcY - y0;
                
                // Получаем значения четырех соседних пикселей
                const q11 = matrix[y0][x0];
                const q12 = matrix[y0][x1];
                const q21 = matrix[y1][x0];
                const q22 = matrix[y1][x1];
                
                // Билинейная интерполяция
                const interpolatedValue = 
                    q11 * (1 - wx) * (1 - wy) +
                    q12 * wx * (1 - wy) +
                    q21 * (1 - wx) * wy +
                    q22 * wx * wy;
                
                rotatedMatrix[newY][newX] = interpolatedValue;
            } else if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
                // Граничные значения - берем ближайший пиксель
                const nearestX = Math.round(Math.max(0, Math.min(width - 1, srcX)));
                const nearestY = Math.round(Math.max(0, Math.min(height - 1, srcY)));
                rotatedMatrix[newY][newX] = matrix[nearestY][nearestX];
            } else {
                // За пределами изображения - оставляем 0 или можно задать другое значение
                rotatedMatrix[newY][newX] = 0;
            }
        }
    }
    
    return {
        matrix: rotatedMatrix,
        width: newWidth,
        height: newHeight
    };
}

// ==========================================
// ТЕСТЫ
// ==========================================

describe('flipVertical', () => {
    test('должен переворачивать матрицу по вертикали', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ];
        const expected = [
            [7, 8, 9],
            [4, 5, 6],
            [1, 2, 3]
        ];
        expect(flipVertical(input)).toEqual(expected);
    });

    test('не должен изменять исходную матрицу', () => {
        const input = [
            [1, 2],
            [3, 4]
        ];
        const inputCopy = JSON.parse(JSON.stringify(input));
        flipVertical(input);
        expect(input).toEqual(inputCopy);
    });

    test('должен работать с матрицей 1xN', () => {
        const input = [[1, 2, 3, 4]];
        const expected = [[1, 2, 3, 4]];
        expect(flipVertical(input)).toEqual(expected);
    });

    test('должен работать с матрицей Nx1', () => {
        const input = [[1], [2], [3]];
        const expected = [[3], [2], [1]];
        expect(flipVertical(input)).toEqual(expected);
    });

    test('должен работать с пустой матрицей', () => {
        const input = [];
        expect(flipVertical(input)).toEqual([]);
    });
});

describe('flipHorizontal', () => {
    test('должен переворачивать матрицу по горизонтали', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ];
        const expected = [
            [3, 2, 1],
            [6, 5, 4],
            [9, 8, 7]
        ];
        expect(flipHorizontal(input)).toEqual(expected);
    });

    test('не должен изменять исходную матрицу', () => {
        const input = [
            [1, 2],
            [3, 4]
        ];
        const inputCopy = JSON.parse(JSON.stringify(input));
        flipHorizontal(input);
        expect(input).toEqual(inputCopy);
    });

    test('должен работать с матрицей 1xN', () => {
        const input = [[1, 2, 3, 4]];
        const expected = [[4, 3, 2, 1]];
        expect(flipHorizontal(input)).toEqual(expected);
    });

    test('должен работать с матрицей Nx1', () => {
        const input = [[1], [2], [3]];
        const expected = [[1], [2], [3]];
        expect(flipHorizontal(input)).toEqual(expected);
    });

    test('должен работать с пустой матрицей', () => {
        const input = [];
        expect(flipHorizontal(input)).toEqual([]);
    });
});

describe('_rotateMatrix', () => {
    test('должен поворачивать матрицу на 90 градусов по часовой стрелке', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ];
        const result = _rotateMatrix(input, 3, 3, 90);
        
        expect(result.width).toBe(3);
        expect(result.height).toBe(3);
        
        // После поворота на 90 градусов:
        // [1,2,3]      [7,4,1]
        // [4,5,6]  ->  [8,5,2]
        // [7,8,9]      [9,6,3]
        expect(result.matrix[0][0]).toBeCloseTo(7, 0);
        expect(result.matrix[0][1]).toBeCloseTo(4, 0);
        expect(result.matrix[0][2]).toBeCloseTo(1, 0);
        expect(result.matrix[1][1]).toBeCloseTo(5, 0);
        expect(result.matrix[2][2]).toBeCloseTo(3, 0);
    });

    test('должен поворачивать матрицу на 180 градусов', () => {
        const input = [
            [1, 2],
            [3, 4]
        ];
        const result = _rotateMatrix(input, 2, 2, 180);
        
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        expect(result.matrix[0][0]).toBeCloseTo(4, 0);
        expect(result.matrix[1][1]).toBeCloseTo(1, 0);
    });

    test('должен поворачивать матрицу на 270 градусов', () => {
        const input = [
            [1, 2, 3],
            [4, 5, 6]
        ];
        const result = _rotateMatrix(input, 3, 2, 270);
        
        // После поворота на 270 градусов (или 90 против часовой):
        // [1,2,3]      [3,6]
        // [4,5,6]  ->  [2,5]
        //              [1,4]
        expect(result.width).toBe(2);
        expect(result.height).toBe(3);
        expect(result.matrix[0][0]).toBeCloseTo(3, 0);
        expect(result.matrix[2][1]).toBeCloseTo(4, 0);
    });

    test('должен сохранять матрицу при повороте на 360 градусов', () => {
        const input = [
            [1, 2],
            [3, 4]
        ];
        const result = _rotateMatrix(input, 2, 2, 360);
        
        expect(result.width).toBe(2);
        expect(result.height).toBe(2);
        expect(result.matrix[0][0]).toBeCloseTo(1, 0);
        expect(result.matrix[1][1]).toBeCloseTo(4, 0);
    });

    test('должен обрабатывать прямоугольные матрицы', () => {
        const input = [
            [1, 2, 3, 4],
            [5, 6, 7, 8]
        ];
        const result = _rotateMatrix(input, 4, 2, 90);
        
        expect(result.width).toBe(2);
        expect(result.height).toBe(4);
    });

    test('должен работать с матрицей 1x1', () => {
        const input = [[42]];
        const result = _rotateMatrix(input, 1, 1, 90);
        
        expect(result.width).toBe(1);
        expect(result.height).toBe(1);
        expect(result.matrix[0][0]).toBeCloseTo(42, 0);
    });
});
