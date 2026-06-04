// import { initRecentFiles } from '/src/recentFiles/recentFiles.js'; // Абсолютный путь (лучше)
// import { handleKeyDown, handleWheel  } from '/src/events/events.js'; // Абсолютный путь (лучше)
// import { closeOpenFilesDropdown } from '/src/fileManager/fileManager.js'; // Абсолютный путь (лучше)

function initDomElements()                     // заполняет объект dom
{
    dom = {
        canvasHost: document.getElementById('canvasHost'),
        canvasWrapper: document.getElementById('canvasWrapper'),
        cursorPos: document.getElementById('cursorPos'),
        canvasSize: document.getElementById('canvasSize'),
        zoomLevel: document.getElementById('zoomLevel'),
        shapesPanel: document.getElementById('shapesPanel'),
        shapesBtn: document.getElementById('shapesBtn'),
        resizeModal: document.getElementById('resizeModal'),
        newWidth: document.getElementById('newWidth'),
        newHeight: document.getElementById('newHeight'),
        textInputOverlay: document.getElementById('textInputOverlay'),
        textInput: document.getElementById('textInput'),
        colorPicker: document.getElementById('colorPicker'),
        saveMethodModal: document.getElementById('saveMethodModal'),
        filenameModal: document.getElementById('filenameModal'),
        loadFromServerModal: document.getElementById('loadFromServerModal'),
        recentFilesModal: document.getElementById('recentFilesModal'),
        recentFilesContainer: document.getElementById('recentFilesContainer'),
        recentFilesCount: document.getElementById('recentFilesCount'),
        medianModal: document.getElementById('medianModal'),
        medianAperture: document.getElementById('newAperture')
    };
}

function loadProject123(projectId) {
    const API_BASE_URL = window.location.origin;
    
    return fetch(`${API_BASE_URL}/load_project/${projectId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            return response.json(); // Парсинг JSON
        })
        .then(projects => {
            return projects.data;
        }) // Возвращаем данные проекта
        .catch(error => {
            console.error("Ошибка загрузки проекта:", error);
            throw error; // Пробрасываем ошибку для обработки вызывающим кодом
        });
}

/**
 * Загружает проект с сервера по ID.
 * @param {string|number} projectId - ID проекта
 * @returns {Promise<Project|null>} Объект проекта или null, если не найден
 */
 async function loadProject(projectId) {
    try {
        const API_BASE_URL = window.location.origin;
        const response = await fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`, { method: 'GET', headers: {'Content-Type': 'application/json' }});
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Проект с ID ${projectId} не найден.`);
                return null;
            }
            throw new Error(`Ошибка загрузки проекта: ${response.statusText}`);
        }
        
        const data = await response.json();
        const rawProject = data;
        return rawProject;

    } catch (error) {
        console.error('Не удалось загрузить проект:', error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');

    const API_BASE_URL = window.location.origin;

    console.log("urlParams = ",urlParams);
    console.log("projectId = ",projectId);
    console.log("API_BASE_URL = ",API_BASE_URL);

    loadProject(projectId).then(currentProject => {
        if (currentProject) {
            project = currentProject;

            // const jsonPretty = JSON.stringify(project, null, 2);
            // console.log(jsonPretty); 

            console.log('Проект успешно загружен и инициализирован:', project);
            // Здесь можно вызвать логику отрисовки файлов
        } else {
            console.log('Проект не найден, используем пустой шаблон.');
            project = createDefaultProject();
        }


if (project.files.length > 0) {
    project.files.forEach((file, fileIndex) => {

        // Создаем canvas элемент
        const cnv = document.createElement('canvas');
        cnv.className = 'paint-canvas';
        cnv.id = `canvas-${file.id}`;
        cnv.width = file.width;
        cnv.height = file.height;
        cnv.style.display = 'none';


        attachCanvasEvents(cnv);
        const canvasHost  = document.getElementById('canvasHost');
        canvasHost.appendChild(cnv);
        
        const colorBarNames = {
            'color-bar-gray': 'gray',
            'color-bar-plasma': 'plasma',
            'color-bar-inferno': 'inferno',
            'color-bar-magma': 'magma',
            'color-bar-cividis': 'cividis',
            'color-bar-rainbow': 'rainbow',
            'color-bar-coolwarm': 'coolwarm'       
        };


        const colorBar = document.getElementById('colorBar');
        const colormap = colorBarNames[colorBar.classList[1]];
        //console.log(colormap);
        const colorMap = getColormap(colormap);
        const data = new Uint8ClampedArray(file.width * file.height * 4);
        let dataIndex = 0;

        for (let y = 0; y < file.height; y++) {
            for (let x = 0; x < file.width; x++) {
                const normalizedValue = (file.matrix[y][x] - file.minValue) / (file.maxValue - file.minValue + 1e-9) ;

                const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));

                data[dataIndex++] = color.r;
                data[dataIndex++] = color.g;
                data[dataIndex++] = color.b;
                data[dataIndex++] = 255;
            }
        }

        file.canvas = cnv;
        file.ctx = cnv.getContext('2d', { willReadFrequently: true });


        
        const imageData = new ImageData(data, file.width, file.height);
        file.ctx.putImageData(imageData, 0, 0);




        switchToFile(file.id);
        updateOpenFilesList();
    });
}

// if (project.files.length >0) {
//     // Создаем canvas элемент
//     const cnv = document.createElement('canvas');
//     cnv.className = 'paint-canvas';
//     cnv.id = `canvas-${file.id}`;
//     cnv.width = project.files[0].width;
//     cnv.height = project.files[0].height;
//     cnv.style.display = 'none';
//     attachCanvasEvents(cnv);
//     document.getElementById('canvasHost').appendChild(cnv);
//     const colorBarNames = {
//         'color-bar-gray': 'gray',
//         'color-bar-plasma': 'plasma',
//         'color-bar-inferno': 'inferno',
//         'color-bar-magma': 'magma',
//         'color-bar-cividis': 'cividis',
//         'color-bar-rainbow': 'rainbow',
//         'color-bar-coolwarm': 'coolwarm'       
//     };
//     const colorBar = document.getElementById('colorBar');
//     const colormap = colorBarNames[colorBar.classList[1]];
//     //console.log(colormap);
//     const colorMap = getColormap(colormap);
//     const data = new Uint8ClampedArray(project.files[0].width * project.files[0].height * 4);
//     let dataIndex = 0;
//     for (let y = 0; y < project.files[0].height; y++) {
//         for (let x = 0; x < project.files[0].width; x++) {
//             const normalizedValue = (project.files[0].history[0].matrix[y][x] - project.files[0].minValue) / (project.files[0].maxValue - project.files[0].minValue + 1e-9) ;          
//             const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
//             // data[dataIndex++] = color.r * 255;
//             // data[dataIndex++] = color.g * 255;
//             // data[dataIndex++] = color.b * 255;
//             data[dataIndex++] = color.r;
//             data[dataIndex++] = color.g;
//             data[dataIndex++] = color.b;
//             data[dataIndex++] = 255;
//         }
//     }
//     project.files[0].history[0].canvas = cnv;
//     project.files[0].history[0].ctx = cnv.getContext('2d', { willReadFrequently: true });
//     console.log(project.files[0].maxValue)
//     const imageData = new ImageData(data, project.files[0].width, project.files[0].height);
//     project.files[0].history[0].ctx .putImageData(imageData, 0, 0);
//     console.log(project.files[0].history[0].ctx.getImageData(0, 0, project.files[0].history[0].canvas.width, project.files[0].history[0].canvas.height));
//     project.files[0].history[0].ctx = project.files[0].history[0].ctx.getImageData(0, 0, project.files[0].history[0].canvas.width, project.files[0].history[0].canvas.height)
//     switchToFile(project.files[0].id);
//     updateOpenFilesList();
// }
// if (project.files.length >0) {
//     // Создаем canvas элемент
//     const cnv = document.createElement('canvas');
//     cnv.className = 'paint-canvas';
//     cnv.id = `canvas-${file.id}`;
//     cnv.width = project.files[0].width;
//     cnv.height = project.files[0].height;
//     cnv.style.display = 'none';
//     attachCanvasEvents(cnv);
//     document.getElementById('canvasHost').appendChild(cnv);
//     const colorBarNames = {
//         'color-bar-gray': 'gray',
//         'color-bar-plasma': 'plasma',
//         'color-bar-inferno': 'inferno',
//         'color-bar-magma': 'magma',
//         'color-bar-cividis': 'cividis',
//         'color-bar-rainbow': 'rainbow',
//         'color-bar-coolwarm': 'coolwarm'       
//     };
//     const colorBar = document.getElementById('colorBar');
//     const colormap = colorBarNames[colorBar.classList[1]];
//     //console.log(colormap);
//     const colorMap = getColormap(colormap);
//     const data = new Uint8ClampedArray(project.files[0].width * project.files[0].height * 4);
//     let dataIndex = 0;
//     for (let y = 0; y < project.files[0].height; y++) {
//         for (let x = 0; x < project.files[0].width; x++) {
//             const normalizedValue = (project.files[0].history[1].matrix[y][x] - project.files[0].minValue) / (project.files[0].maxValue - project.files[0].minValue + 1e-9) ;
//             const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
//             // data[dataIndex++] = color.r * 255;
//             // data[dataIndex++] = color.g * 255;
//             // data[dataIndex++] = color.b * 255;
//             data[dataIndex++] = color.r;
//             data[dataIndex++] = color.g;
//             data[dataIndex++] = color.b;
//             data[dataIndex++] = 255;
//         }
//     }
//     project.files[0].history[1].canvas = cnv;
//     project.files[0].history[1].ctx = cnv.getContext('2d', { willReadFrequently: true });
//     console.log(data)
//     console.log(project.files[0].width)
//     console.log(project.files[0].height)
//     console.log(project.files[0].minValue)
//     console.log(project.files[0].maxValue)
//     const imageData = new ImageData(data, project.files[0].width, project.files[0].height);
//     project.files[0].history[1].ctx .putImageData(imageData, 0, 0);
//     console.log(project.files[0].history[1].ctx.getImageData(0, 0, project.files[0].history[1].canvas.width, project.files[0].history[1].canvas.height));
//     project.files[0].history[1].ctx = project.files[0].history[1].ctx.getImageData(0, 0, project.files[0].history[1].canvas.width, project.files[0].history[1].canvas.height)
//     switchToFile(project.files[0].id);
//     updateOpenFilesList();
// }


if (project.files.length > 0) {
    project.files.forEach((file, fileIndex) => {

        if (file.history && Array.isArray(file.history)) {
            file.history.forEach((historyItem, historyIndex) => {

                // Создаем canvas элемент
                const cnv = document.createElement('canvas');
                cnv.className = 'paint-canvas';
                cnv.id = `canvas-${file.id}`;
                cnv.width = file.width;
                cnv.height = file.height;
                cnv.style.display = 'none';
                    
                attachCanvasEvents(cnv);
                document.getElementById('canvasHost').appendChild(cnv);
                    
                const colorBarNames = {
                    'color-bar-gray': 'gray',
                    'color-bar-plasma': 'plasma',
                    'color-bar-inferno': 'inferno',
                    'color-bar-magma': 'magma',
                    'color-bar-cividis': 'cividis',
                    'color-bar-rainbow': 'rainbow',
                    'color-bar-coolwarm': 'coolwarm'       
                };

                const colorBar = document.getElementById('colorBar');
                const colormap = colorBarNames[colorBar.classList[1]];
                const colorMap = getColormap(colormap);
                const data = new Uint8ClampedArray(file.width * file.height * 4);
                let dataIndex = 0;

                for (let y = 0; y < file.height; y++) {
                    for (let x = 0; x < file.width; x++) {
                        const normalizedValue = (historyItem.matrix[y][x] - file.minValue) / (file.maxValue - file.minValue + 1e-9) ;
                        const color = colorMap(Math.max(0, Math.min(1, normalizedValue)));
                        data[dataIndex++] = color.r;
                        data[dataIndex++] = color.g;
                        data[dataIndex++] = color.b;
                        data[dataIndex++] = 255;
                    }
                }

                historyItem.canvas = cnv;
                historyItem.ctx = cnv.getContext('2d', { willReadFrequently: true });
                // console.log(data)
                // console.log(file.width)
                // console.log(file.height)
                // console.log(file.minValue)
                // console.log(file.maxValue)
                const imageData = new ImageData(data, file.width, file.height);
                historyItem.ctx.putImageData(imageData, 0, 0);

                //console.log(project.files[0].history[1].ctx.getImageData(0, 0, project.files[0].history[1].canvas.width, project.files[0].history[1].canvas.height));
                
                historyItem.ctx = historyItem.ctx.getImageData(0, 0, historyItem.canvas.width, historyItem.canvas.height)
                // switchToFile(file.id);
                updateOpenFilesList();

                // const jsonPretty = JSON.stringify(project, null, 2);
                // console.log(jsonPretty); 
            
            });
        }
    });

    switchToFile(project.files[project.files.length-1].id);
    console.log((project.files.length-1));

    const file = project.files[project.files.length-1];
    restoreState(file, file.history[file.historyIndex]);
}

    // loadProject(projectId)
    // .then(projectData => {
        //console.log("projectData:",projectData);

        // project = Project.fromProjectData(projectData);
        // project = createProjectFromData(projectData);
        // console.log("Проект загружен:", project);
        applySettingsTheme(project);

        initDomElements();
        // Инициализация при загрузке
        //AppDB.init().then(() => console.log('AppDB инициализирован'));

        updateToolInfo();
        // Инициализируем состояние кнопок при загрузке (когда файлов еще нет)
        updateButtonsState();

        // initIndexedb();



        // Обработчик клика вне выпадающих списков
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('openFilesDropdown');
            const button = document.getElementById('openFilesDropdownBtn');
            
            if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
                //closeOpenFilesDropdown();
            }
            
            // Закрытие панели фигур при клике вне её
            if (dom.shapesPanel && !event.target.closest('#shapesBtn') && !event.target.closest('#shapesPanel')) {
                dom.shapesPanel.classList.remove('active');
            }
        });

        // Глобальные обработчики событий
        document.addEventListener('keydown', handleKeyDown);    // определяется в events.js
        document.addEventListener('wheel', handleWheel, { passive: false });
        document.addEventListener('mousemove', handleRadialMenuMouseMove); // обработчик движения мыши для радиального меню

    // })
    // .catch(error => {
    //     console.error("Не удалось загрузить проект:", error);
    // });

});

        // ============ Инициализация графика Plotly ============
        const plotlyDiv = document.getElementById('graphCanvas');
        if (plotlyDiv) {
            Plotly.newPlot(plotlyDiv, [{
                x: [], y: [],
                type: 'scatter',
                mode: 'lines',
                line: { color: 'rgb(220, 60, 80)', width: 2.2 }
            }], {
                title: { text: '', font: { size: 14 } },
                xaxis: { title: 'Пиксель вдоль линии' },
                yaxis: { 
                    title: 'Интенсивность (R)',
                    range: [0, 255],
                    autorange: false
                },
                margin: { t: 30, l: 50, r: 35, b: 50 },
                showlegend: false,
                autosize: true
            }, { responsive: true, displayModeBar: false });
        }








      




});

document.addEventListener('DOMContentLoaded', () => {
    const helpBtn = document.getElementById('helpBtn');

    function openHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.style.display = 'flex';
        }
    }

    if (helpBtn) {
        helpBtn.addEventListener('click', openHelp);
    }
    
    // Инициализация обработчика контекстного меню для canvasHost
    if (typeof attachCanvasHostEvents === 'function') {
        attachCanvasHostEvents();
    }
});
