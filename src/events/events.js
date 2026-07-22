// Обработчики событий мыши и клавиатуры

function handleKeyDown(e) {
    // здесь логика обработки клавиш

    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'z': e.preventDefault(); undo(); break; // Ctrl+Z - отменить
            case 'y': e.preventDefault(); redo(); break; // Ctrl+Y - повторить
            case 's': e.preventDefault(); showSaveMethodModal(); break; // Ctrl+S - сохранить
            case 'o': e.preventDefault(); document.getElementById('run').click(); break; // Ctrl+O - открыть
            case 'l': e.preventDefault(); showLoadFromServerModal(); break; // Ctrl+L - загрузить с сервера
            case 'n': e.preventDefault(); newImage(); break; // Ctrl+N - новый файл
            case 'tab': e.preventDefault(); cycleThroughFiles(); break; // Ctrl+Tab для переключения файлов
        }
    }
    if (e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'r': e.preventDefault(); rotateCanvas(90); break; // ALT+R - поворот
        }
    }

    // Ctrl+Shift+R для открытия списка недавних файлов
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        showRecentFilesModal();
    }
}

function handleWheel(e) {
    if (e.ctrlKey) {
        e.preventDefault(); // Отключаем стандартное масштабирование браузера
        
        // Проверяем направление прокрутки
        const deltaY = e.deltaY; // >0 - вниз, <0 - вверх
        if (deltaY > 0) {
            zoomOut(); // Прокрутка вниз → масштабировать "на себя" (уменьшение)
        } else {
            zoomIn();  // Прокрутка вверх → масштабировать "от себя" (увеличение)
        }
        
        // Возвращаем true, чтобы предотвратить стандартное поведение
        return true;
    }
}



// Получение координат на canvas с учетом масштаба
function getCanvasCoords(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return { x: 0, y: 0 };

    const rect = file.canvas.getBoundingClientRect();
    // console.log("rect.x = "+ e.clientX);
    // console.log("rect.y = "+ e.clientY);

    let x = Math.floor((e.clientX - rect.left) / zoom);
    let y = Math.floor((e.clientY - rect.top) / zoom);
    
    // Ограничиваем координаты пределами изображения
    x = Math.max(0, Math.min(file.width - 1, x));
    y = Math.max(0, Math.min(file.height - 1, y));
    
    return { x, y };
}

// Получение координат с ограничением по overlayCanvas (для profile tool)
function getCanvasCoordsClamped(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return { x: 0, y: 0 };

    const rect = file.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / zoom);
    let y = Math.floor((e.clientY - rect.top) / zoom);
    
    // Получаем размеры overlayCanvas для ограничения
    const overlayCanvas = document.getElementById('overlayCanvas');
    if (overlayCanvas) {
        // Ограничиваем координаты пределами overlayCanvas
        x = Math.max(0, Math.min(overlayCanvas.width - 1, x));
        y = Math.max(0, Math.min(overlayCanvas.height - 1, y));
    }
    
    // Дополнительно ограничиваем пределами изображения
    x = Math.max(0, Math.min(file.width - 1, x));
    y = Math.max(0, Math.min(file.height - 1, y));
    
    return { x, y };
}

// Глобальные обработчики для profile tool (чтобы рисование не прерывалось при выходе за canvas)
function handleGlobalMouseMove(e) {
    if (currentTool !== 'profile' || !isDrawing) return;
    
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    // Получаем координаты относительно окна, затем переводим в координаты canvas
    const rect = file.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / zoom);
    let y = Math.floor((e.clientY - rect.top) / zoom);
    
    // Ограничиваем координаты пределами overlayCanvas
    const overlayCanvas = document.getElementById('overlayCanvas');
    if (overlayCanvas) {
        x = Math.max(0, Math.min(overlayCanvas.width - 1, x));
        y = Math.max(0, Math.min(overlayCanvas.height - 1, y));
    }
    
    // Дополнительно ограничиваем пределами изображения
    x = Math.max(0, Math.min(file.width - 1, x));
    y = Math.max(0, Math.min(file.height - 1, y));
    
    const coords = { x, y };
    
    if (dom.cursorPos) {
        dom.cursorPos.textContent = `X: ${coords.x}, Y: ${coords.y}`;
        if (coords.y >= 0 && coords.y < file.height && coords.x >= 0 && coords.x < file.width) {
            document.getElementById('cursorMatrixData').textContent = `d = ${file.matrix[coords.y][coords.x]}`;
        }
    }

    if (dragMode !== 'none') {
        // Режим перетаскивания существующего профиля
        redrawFromHistory();

        if (dragMode === 'start') {
            currentProfile.x1 = coords.x;
            currentProfile.y1 = coords.y;
        } else if (dragMode === 'end') {
            currentProfile.x2 = coords.x;
            currentProfile.y2 = coords.y;
        } else if (dragMode === 'whole') {
            const dx = coords.x - dragOffsetX - originalProfile.x1;
            const dy = coords.y - dragOffsetY - originalProfile.y1;
            currentProfile.x1 = originalProfile.x1 + dx;
            currentProfile.y1 = originalProfile.y1 + dy;
            currentProfile.x2 = originalProfile.x2 + dx;
            currentProfile.y2 = originalProfile.y2 + dy;
        }
        drawProfile(currentProfile);
        updateGraph(currentProfile.x1, currentProfile.y1, currentProfile.x2, currentProfile.y2);
    } else {
        // Рисование нового профиля
        redrawFromHistory();
        drawProfileInProgress(startX, startY, coords.x, coords.y);
        updateGraph(startX, startY, coords.x, coords.y);
    }
    
    lastX = coords.x;
    lastY = coords.y;
}

function handleGlobalMouseUp(e) {
    if (currentTool !== 'profile' || !isDrawing) return;
    
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    // Получаем координаты относительно окна, затем переводим в координаты canvas
    const rect = file.canvas.getBoundingClientRect();
    let x = Math.floor((e.clientX - rect.left) / zoom);
    let y = Math.floor((e.clientY - rect.top) / zoom);
    
    // Ограничиваем координаты пределами overlayCanvas
    const overlayCanvas = document.getElementById('overlayCanvas');
    if (overlayCanvas) {
        x = Math.max(0, Math.min(overlayCanvas.width - 1, x));
        y = Math.max(0, Math.min(overlayCanvas.height - 1, y));
    }
    
    // Дополнительно ограничиваем пределами изображения
    x = Math.max(0, Math.min(file.width - 1, x));
    y = Math.max(0, Math.min(file.height - 1, y));
    
    const coords = { x, y };

    if (dragMode !== 'none') {
        // Завершаем перетаскивание – ничего не сохраняем, просто выходим
        dragMode = 'none';
        originalProfile = null;
    } else {
        // Завершаем создание нового профиля
        if (lassoPoints.length > 0 || true) {
            // Сохраняем координаты
            currentProfile = {
                x1: startX,
                y1: startY,
                x2: lastX,
                y2: lastY
            };
            // Перерисовываем финальную версию
            redrawFromHistory();
            drawProfile(currentProfile);
        }
    }
    
    isDrawing = false;
    
    // Удаляем глобальные обработчики
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
}

// Обработка нажатия кнопки мыши
function handleMouseDown(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;

    // Проверка активного canvas
    if (e.currentTarget !== file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);
    startX = coords.x;
    startY = coords.y;
    lastX = coords.x;
    lastY = coords.y;
    isDrawing = true;


    // Обработка различных инструментов
    switch (currentTool) {
        case 'profile': {
            const file = getActiveFile();
            if (!file) break;

            const coords = getCanvasCoordsClamped(e);
            const threshold = Math.max(10 / zoom, 5); // порог захвата

            // Проверяем, есть ли уже профиль и не перетаскиваем ли мы его
            if (currentProfile) {
                const distStart = Math.hypot(coords.x - currentProfile.x1, coords.y - currentProfile.y1);
                const distEnd = Math.hypot(coords.x - currentProfile.x2, coords.y - currentProfile.y2);
                const distLine = distanceToSegment(coords.x, coords.y, currentProfile.x1, currentProfile.y1, currentProfile.x2, currentProfile.y2);

                if (distStart < threshold) {
                    // Начинаем перетаскивать начало
                    dragMode = 'start';
                    isDrawing = true;
                    break;
                } else if (distEnd < threshold) {
                    // Перетаскиваем конец
                    dragMode = 'end';
                    isDrawing = true;
                    break;
                } else if (distLine < threshold) {
                    // Перемещаем весь профиль
                    dragMode = 'whole';
                    dragOffsetX = coords.x - currentProfile.x1;
                    dragOffsetY = coords.y - currentProfile.y1;
                    originalProfile = { ...currentProfile };
                    isDrawing = true;
                    break;
                }
            }

            // Если не попали в существующий профиль, начинаем новый
            startX = coords.x;
            startY = coords.y;
            // lassoPoints = [{x: startX, y: startY}];
            isLassoClosed = false;
            isDrawing = true;
            
            // Добавляем глобальные обработчики для profile tool
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            break;
        }
        case 'lasso':

            matrixToImage();
            // Начало создания контура лассо
            // Если зажат Ctrl, не сбрасываем предыдущее выделение
            if (!e.ctrlKey) {
                lassoPoints = [{x: startX, y: startY}];
                previousSelections = []; // Очищаем предыдущие выделения
            } else {
                // Сохраняем текущее выделение в массив предыдущих
                if (file.selection && file.selection.length > 0) {
                    previousSelections.push([...file.selection]);
                }
                lassoPoints = [{x: startX, y: startY}];
            }
            isLassoClosed = false;
            isDrawing = true;
            break;
    }
}

// Обработка движения мыши
function handleMouseMove(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    if (e.currentTarget !== file.canvas) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoords(e);
    if (dom.cursorPos) {
        dom.cursorPos.textContent = `X: ${coords.x}, Y: ${coords.y}`;
        document.getElementById('cursorMatrixData').textContent = `d = ${file.matrix[coords.y][coords.x]}`;
    }

    // Если рисуем профиль, глобальные обработчики уже работают, выходим
    if (currentTool === 'profile' && isDrawing) return;

    if (!isDrawing) return;

    // Обработка рисования для различных инструментов
    switch (currentTool) {
        case 'lasso':
            //redrawFromHistory();
            matrixToImage();
            // Добавление точек в контур лассо
            if (lassoPoints.length === 0) {
                lassoPoints.push({x: coords.x, y: coords.y});
            } else {
                const lastPoint = lassoPoints[lassoPoints.length - 1];
                const dist = Math.sqrt((coords.x - lastPoint.x) ** 2 + (coords.y - lastPoint.y) ** 2);
                if (dist > 5) {
                    lassoPoints.push({x: coords.x, y: coords.y});
                }
            }
            drawLasso(lassoPoints, coords.x, coords.y);
            break;
        case 'select':

                redrawFromHistory();
                
                // Отрисовка предыдущих выделений (если были с Ctrl)
                if (previousSelections.length > 0) {
                    ctx.strokeStyle = 'rgba(0, 120, 215, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    for (const prevSel of previousSelections) {
                        // Вычисляем bounding box для каждого предыдущего выделения
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        for (const p of prevSel) {
                            minX = Math.min(minX, p[0]);
                            minY = Math.min(minY, p[1]);
                            maxX = Math.max(maxX, p[0]);
                            maxY = Math.max(maxY, p[1]);
                        }
                        const width = Math.ceil(maxX - minX);
                        const height = Math.ceil(maxY - minY);
                        ctx.strokeRect(minX, minY, width, height);
                    }
                    ctx.setLineDash([]);
                }
                
                ctx.strokeStyle = '#0078d7';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(startX, startY, coords.x - startX, coords.y - startY);
                ctx.setLineDash([]);
                break;
    }

    lastX = coords.x;
    lastY = coords.y;
}

// Обработка отпускания кнопки мыши
function handleMouseUp(e) {
    const file = getActiveFile();
    if (!file || !file.canvas) return;
    if (e.currentTarget !== file.canvas) return;

    // Для profile tool обработка уже выполнена в handleGlobalMouseUp
    if (currentTool === 'profile') return;

    if (!isDrawing) return;

    ctx = file.ctx;
    canvas = file.canvas;

    const coords = getCanvasCoordsClamped(e);


    // Завершение рисования для различных инструментов
    switch (currentTool) {
        case 'lasso': {
            // Завершение создания лассо
            if (lassoPoints.length < 2) {
                lassoPoints = [];
                file.selection = [];
                isLassoClosed = false;
                break;
            }
            
            isLassoClosed = true;
            lassoPoints.push({x: lassoPoints[0].x, y: lassoPoints[0].y});
            
            // Вычисление bounding box полигона
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const p of lassoPoints) {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            }
            
            const width = Math.ceil(maxX - minX);
            const height = Math.ceil(maxY - minY);
            
            if (width > 0 && height > 0) {
                // Создание временного canvas для выделения
                const tempCanvas = document.createElement('canvas');
                const tempCtx = tempCanvas.getContext('2d');
                tempCanvas.width = width;
                tempCanvas.height = height;
                
                // Создание маски полигона
                tempCtx.beginPath();
                tempCtx.moveTo(lassoPoints[0].x - minX, lassoPoints[0].y - minY);
                for (let i = 1; i < lassoPoints.length; i++) {
                    tempCtx.lineTo(lassoPoints[i].x - minX, lassoPoints[i].y - minY);
                }
                tempCtx.closePath();
                tempCtx.clip();
                
                // Копирование изображения в выделенную область
                tempCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
                




                // Получение ImageData выделенной области
                selectionData = tempCtx.getImageData(0, 0, width, height);
                
                // Сохранение информации о выделении
                selection = {
                    x: minX,
                    y: minY,
                    w: width,
                    h: height,
                    points: lassoPoints.slice()
                };
                
                // Отрисовка выделения на основном canvas
                //redrawFromHistory();
                matrixToImage();
                drawLassoSelection(lassoPoints);

                //lassoPoints  = calculatePointsInsidePolygon(lassoPoints);
                //console.log(lassoPoints.length);
                const newSelectionPoints = calculatePointsInsidePolygon(lassoPoints);
                
                // Если было выделение с Ctrl, объединяем с предыдущими
                if (previousSelections.length > 0) {
                    // Добавляем новые точки к предыдущим
                    for (const prevSel of previousSelections) {
                        for (const point of prevSel) {
                            newSelectionPoints.push(point);
                        }
                    }
                    // Уникализация точек
                    file.selection = [...new Set(newSelectionPoints.map(JSON.stringify))].map(JSON.parse);
                } else {
                    file.selection = newSelectionPoints;
                }

                saveState();
            }
            // Очищаем массив предыдущих выделений после завершения
            previousSelections = [];
            //console.log(calculatePointsInsidePolygon(lassoPoints,width,  height));

            // const file = getActiveFile();
            // if (!file) return;

            // for (let i = 0; i < lassoPoints123.length; i++) {
            //     file.matrix[lassoPoints123[i][1]][lassoPoints123[i][0]]=100; 
            // }

            
            break;
        }

        case 'select': {
            // Создание прямоугольного выделения
            selection = {
                x: Math.min(startX, coords.x),
                y: Math.min(startY, coords.y),
                w: Math.abs(coords.x - startX),
                h: Math.abs(coords.y - startY)
            };
            if (selection.w > 0 && selection.h > 0) {
                selectionData = ctx.getImageData(selection.x, selection.y, selection.w, selection.h);
            }
            break;
        }


    }

    isDrawing = false;
}

// Обработка двойного клика (для завершения лассо)
function handleDoubleClick(e) {
    if (currentTool === 'lasso' && lassoPoints.length > 2) {
        isDrawing = false;
        // Симуляция события mouseup для завершения рисования
        const event = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        e.currentTarget.dispatchEvent(event);
    }
}


// Обработчик клика для ВСЕХ кнопок с классом "tab-action-btn"
document.querySelectorAll('.tab-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        //if(currentTool == "profile"){

            if (currentTool == 'profile' && currentProfile !=null ) {
                
                redrawFromHistory();
                currentProfile = null;

            }
            setTimeout(() => isProcessing = false, 300); // защита от множественных кликов
        //}
    });
});
