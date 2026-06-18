# Дерево вызова функций JavaScript приложения

## Общее количество файлов: 21
## Общее количество функций: ~350+

---

## 1. /workspace/src/main/main.js
**Функции:**
- `initDomElements()` - инициализация DOM элементов
- `loadProject123(projectId)` - загрузка проекта (устаревшая)
- `loadProject(projectId)` - загрузка проекта с сервера
- `openHelp()` - открытие справки (внутри DOMContentLoaded)

**Вызовы:**
```
DOMContentLoaded
├── loadProject(projectId)
│   └── fetch(`${API_BASE_URL}/api/v1/projects/${projectId}`)
├── initDomElements()
├── applySettingsTheme(project)
├── updateToolInfo()
├── updateButtonsState()
└── [event listeners]
    ├── click → closeOpenFilesDropdown()
    └── click → toggle shapesPanel

loadProject
└── fetch() → JSON.parse → return project data
```

---

## 2. /workspace/src/ui/ui.js
**Функции:**
- `setМalueСolorbarlabel(min, max)` - установка labels цветовой шкалы
- `updateCanvasSize()` - обновление размера canvas
- `updateActiveFilePreviewLocal(fileId)` - обновление превью файла
- `getFileLocal(fileId)` - получение файла (закомментировано)
- `zoomIn()` - увеличение масштаба
- `zoomOut()` - уменьшение масштаба
- `zoomReset()` - сброс масштаба
- `applyZoom()` - применение зума
- `zoomCustom()` - кастомный зум (закомментировано)
- `showResizeModal()` - показ модалки изменения размера (закомментировано)
- `closeResizeModal()` - закрытие модалки (закомментировано)
- `applyResize()` - применение изменения размера (закомментировано)
- `showLoadMethodModal()` - показ модалки выбора метода загрузки
- `closeLoadMethodModal()` - закрытие модалки загрузки
- `loadToLocal()` - загрузка локально
- `showSaveMethodModal()` - показ модалки выбора метода сохранения
- `closeSaveMethodModal()` - закрытие модалки сохранения
- `saveToLocal()` - сохранение локально
- `showSaveModal()` - показ модалки сохранения
- `closeSaveModal()` - закрытие модалки сохранения
- `showMedianModal()` - показ модалки медианного фильтра
- `closeMedianModal()` - закрытие модалки медианного фильтра
- `showNormalisatioModal()` - показ модалки нормализации
- `closeNormalisatioModal()` - закрытие модалки нормализации
- `showSobelModal()` - показ модалки Sobel фильтра
- `closeSobelModal()` - закрытие модалки Sobel фильтра
- `showApproximationModal()` - показ модалки аппроксимации
- `closeApproximationModal()` - закрытие модалки аппроксимации
- `closeGraphModal()` - закрытие графика
- `showRoundSearchingModal()` - показ модалки поиска кругов
- `showLogorifmModal()` - показ модалки логарифма
- `closeLogorifmModal()` - закрытие модалки логарифма
- `applyLogorifmFilter()` - применение логарифмического фильтра

**Вызовы:**
```
zoomIn/zoomOut/zoomReset
└── applyZoom()
    └── updateCanvasSize()

showSaveMethodModal
└── saveToLocal() / saveToServer()

showLoadMethodModal
└── loadToLocal() / loadFromServer()
```

---

## 3. /workspace/src/imageOps/imageOps.js
**Функции:**
- `rotateCanvas(angle)` - поворот canvas
- `_rotateMatrix(matrix, width, height, angleDegrees)` - поворот матрицы (приватная)
- `flipCanvas(direction)` - отражение canvas
- `flipVertical(arr)` - вертикальное отражение массива
- `flepHorizontal(arr)` - горизонтальное отражение массива
- `getColormap(name)` - получение цветовой карты
- `replaceColormap(file, newColormap)` - замена цветовой карты
- `getGradientColor(t, colors)` - получение цвета градиента
- `imageToMatrix(imageData, width, height, minVal, maxVal, autoscale)` - конвертация изображения в матрицу
- `applyMedianFilter()` - применение медианного фильтра (async)
- `_medianFilter(matrix, kernelSize)` - медианный фильтр (приватная, async)
- `_createPaddedMatrix(matrix, padSize)` - создание матрицы с отступами (приватная)
- `_extractWindow(matrix, x, y, size)` - извлечение окна (приватная)
- `_calculateMedian(arr)` - вычисление медианы (приватная)
- `applyNormalisatioFilter()` - применение фильтра нормализации
- `applySobelFilter()` - применение Sobel фильтра
- `applyApproximationFilter()` - применение фильтра аппроксимации
- `_computePolynomialCoefficients(matrix, width, height, order, allArea)` - вычисление коэффициентов полинома
- `_applyPolynomialCorrection(matrix, width, height, coefficients, allArea)` - применение коррекции полиномом
- `_calculatePolynomialTerms(order)` - расчет членов полинома
- `_buildSystemMatrix(matrix, width, height, order, allArea, sums, b)` - построение системной матрицы
- `_getPolynomialTerms(order)` - получение членов полинома
- `_calculatePolynomialTerms1(x, y, order)` - расчет членов полинома (версия 1)
- `_solveGaussianElimination(sums, b)` - решение методом Гаусса
- `showLogorifmModal()` - показ модалки логарифма
- `closeLogorifmModal()` - закрытие модалки логарифма
- `applyLogorifmFilter()` - применение логарифмического фильтра
- `applyRoundSearchingFilter()` - применение фильтра поиска кругов
- `circleSearch(count_points, X, Y, num_iter)` - поиск круга (итеративно)
- `findCircle(boundaryPoints)` - нахождение круга по граничным точкам

**Вызовы:**
```
rotateCanvas
└── _rotateMatrix()

flipCanvas
├── flipVertical()
└── flepHorizontal()

applyMedianFilter
└── _medianFilter()
    ├── _createPaddedMatrix()
    ├── _extractWindow()
    └── _calculateMedian()

applyApproximationFilter
├── _computePolynomialCoefficients()
│   └── _buildSystemMatrix()
│       └── _calculatePolynomialTerms1()
│           └── _getPolynomialTerms()
│               └── _solveGaussianElimination()
└── _applyPolynomialCorrection()
    └── _calculatePolynomialTerms1()

applyRoundSearchingFilter
└── circleSearch()
    └── findCircle()
```

---

## 4. /workspace/src/globals/globals.js
**Функции:**
- `createDefaultProject()` - создание проекта по умолчанию
- `logProject(project)` - логирование проекта
- `saveProjectToMinIO123(project)` - сохранение в MinIO (устаревшая, закомментирована)
- `projectToJson(project, space)` - конвертация проекта в JSON
- `createProjectFromData(projectData)` - создание проекта из данных

**Вызовы:**
```
createDefaultProject
└── возвращает шаблон проекта

projectToJson
└── cleanSensitiveProperties()

createProjectFromData
└── парсинг JSON → проект объект
```

---

## 5. /workspace/src/history/history.js
**Функции:**
- `setActionName(name, params)` - установка имени действия
- `resetHistory(file)` - сброс истории файла
- `pushState(file)` - добавление состояния в историю
- `pushState_l(file)` - добавление состояния (локальная версия)
- `updateHistoryFile(projectId, fileId)` - обновление истории файла на сервере (async)
- `restoreState(file, state)` - восстановление состояния
- `saveState()` - сохранение текущего состояния
- `redrawFromHistory()` - перерисовка из истории
- `undo()` - отмена действия
- `redo()` - повтор действия
- `captureState(file)` - захват текущего состояния

**Вызовы:**
```
pushState
└── captureState()
    └── getImageData()

undo
├── restoreState()
│   └── putImageData()
└── redrawFromHistory()

redo
├── restoreState()
└── redrawFromHistory()
```

---

## 6. /workspace/src/tabs/tabs.js
**Функции:**
- `updateTabsFileField()` - обновление полей вкладок файлов

**Вызовы:**
```
updateTabsFileField
└── обновляет DOM элементы вкладок
```

---

## 7. /workspace/src/recentFiles/recentFiles.js
**Функции:**
- `initRecentFiles()` - инициализация последних файлов
- `updateRecentFilesMenu()` - обновление меню последних файлов
- `updateRecentFilesModal()` - обновление модалки последних файлов
- `getRecentFiles()` - получение списка последних файлов
- `addToRecentFiles(fileInfo)` - добавление файла в последние
- `openRecentFile(file)` - открытие последнего файла (закомментировано)
- `formatRecentDate(dateStr)` - форматирование даты (закомментировано)
- `showRecentFilesModal()` - показ модалки (закомментировано)
- `clearRecentFiles()` - очистка списка (закомментировано)
- `removeRecentFile(index)` - удаление файла из списка (закомментировано)

**Вызовы:**
```
initRecentFiles
└── updateRecentFilesMenu()
    └── updateRecentFilesModal()

addToRecentFiles
└── localStorage.setItem()
```

---

## 8. /workspace/src/radialMenu/radialMenu.js
**Функции:**
- `handleRadialMenuMouseMove(e)` - обработка движения мыши в радиальном меню
- `createRadialMenu()` - создание радиального меню
- `renderRadialMenuItems(menu)` - рендер элементов меню
- `showRadialMenu(x, y)` - показ радиального меню
- `hideRadialMenu()` - скрытие радиального меню
- `hideRadialMenuMove()` - скрытие при движении
- `handleRadialMenuAction(action)` - обработка действия меню
- `handleCanvasContextMenu(e)` - обработка контекстного меню canvas
- `createRadialMenuConfigModalHTML()` - создание HTML модалки конфигурации
- `initRadialMenuConfigModal()` - инициализация модалки конфигурации
- `handleConfigModalKeyDown(e)` - обработка клавиш в модалке
- `handleConfigModalOutsideClick(e)` - обработка клика вне модалки
- `handleConfigModalInputChange()` - обработка изменений ввода
- `markAsDirty()` - пометка как измененное
- `updateDirtyIndicator()` - обновление индикатора изменений
- `validateAndEnableSave()` - проверка и включение сохранения
- `validateConfig()` - проверка конфигурации
- `renderToolsList()` - рендер списка инструментов
- `renderFiltersList()` - рендер списка фильтров
- `renderOthersList()` - рендер списка прочего
- `createToolItem(item, index, type)` - создание элемента инструмента
- `toggleItemEnabled(itemId, enabled)` - переключение включения элемента
- `updateSettings()` - обновление настроек
- `updatePreview()` - обновление превью
- `createPreviewSVG(config)` - создание SVG превью
- `openRadialMenuConfigModal(existingConfig)` - открытие модалки конфигурации
- `populateForm()` - заполнение формы
- `closeRadialMenuConfigModal()` - закрытие модалки конфигурации
- `saveRadialMenuConfigFromModal()` - сохранение конфигурации из модалки
- `bringToFront(modal)` - вывод модалки на передний план

**Вызовы:**
```
handleCanvasContextMenu
└── showRadialMenu()
    └── renderRadialMenuItems()

handleRadialMenuMouseMove
└── highlight sector

handleRadialMenuAction
└── execute action (tool/filter)
    └── hideRadialMenu()

openRadialMenuConfigModal
├── createRadialMenuConfigModalHTML()
├── populateForm()
│   ├── renderToolsList()
│   │   └── createToolItem()
│   ├── renderFiltersList()
│   │   └── createToolItem()
│   └── renderOthersList()
│       └── createToolItem()
└── initRadialMenuConfigModal()
    ├── handleConfigModalInputChange()
    │   ├── markAsDirty()
    │   ├── updateDirtyIndicator()
    │   ├── validateConfig()
    │   ├── validateAndEnableSave()
    │   └── updatePreview()
    │       └── createPreviewSVG()
    ├── handleConfigModalKeyDown()
    └── handleConfigModalOutsideClick()

saveRadialMenuConfigFromModal
├── validateConfig()
└── save to localStorage
```

---

## 9. /workspace/src/wtis-projects/wtis-projects2.js
**Функции:**
- `escapeHtml(text)` - экранирование HTML
- `formatDate(dateString)` - форматирование даты
- `getFirstLetter(text)` - получение первой буквы
- `generatePlaceholderColor(text)` - генерация цвета плейсхолдера
- `getFileTypeIcon(type)` - получение иконки типа файла
- `loadProjects()` - загрузка проектов (async)
- `renderSkeleton()` - рендер скелетона загрузки
- `renderEmptyState()` - рендер пустого состояния
- `renderProjects()` - рендер проектов
- `createProjectCard(project)` - создание карточки проекта
- `attachCardEventListeners()` - привязка обработчиков событий карточек
- `showContextMenu(projectId, triggerElement)` - показ контекстного меню
- `closeAllContextMenus()` - закрытие всех контекстных меню
- `sortProjects(projectsList, sortType)` - сортировка проектов
- `openProject(projectId)` - открытие проекта
- `handleContextMenuAction(action, projectId)` - обработка действия контекстного меню (async)
- `openProjectSettings(projectId)` - открытие настроек проекта
- `closeProjectSettings()` - закрытие настроек проекта
- `saveProjectSettings()` - сохранение настроек проекта (async)
- `loadUserProfile()` - загрузка профиля пользователя
- `saveUserProfile()` - сохранение профиля пользователя
- `updateProfileDisplay()` - обновление отображения профиля
- `openUserSettings()` - открытие настроек пользователя
- `closeUserSettings()` - закрытие настроек пользователя
- `saveUserSettings()` - сохранение настроек пользователя
- `openCreateProjectModal()` - открытие модалки создания проекта
- `renameProject(projectId)` - переименование проекта (async)
- `duplicateProject(projectId)` - дублирование проекта (async)
- `deleteProject(projectId)` - удаление проекта (async)
- `exportProject(projectId)` - экспорт проекта

**Вызовы:**
```
loadProjects
├── fetch() → API
├── renderSkeleton()
└── renderProjects()
    └── createProjectCard()
        └── attachCardEventListeners()

handleContextMenuAction
├── renameProject()
├── duplicateProject()
├── deleteProject()
└── exportProject()

openProject
└── window.location.href = ?projectId=
```

---

## 10. /workspace/src/wtis-projects/wtis-projects.js
**Функции:**
- `showToast(msg, type, duration)` - показ уведомления
- `showConfirmModal(title, message, callback)` - показ модального подтверждения
- `hideConfirmModal()` - скрытие подтверждения
- `saveFavorites()` - сохранение избранного
- `toggleFavorite(projectId)` - переключение избранного
- `loadProjectsFromMinIO()` - загрузка проектов из MinIO (async)
- `updateAuthorFilter()` - обновление фильтра по автору
- `updateTypeFilter()` - обновление фильтра по типу
- `loadlogin()` - загрузка login (async)
- `saveProjectToMinIO(project)` - сохранение проекта в MinIO (async)
- `deleteProjectFromMinIO(projectId)` - удаление проекта из MinIO (async)
- `getFilteredProjects()` - получение отфильтрованных проектов
- `sortProjects(projectsList, sortType)` - сортировка проектов
- `sortProjects123(projectsList, sortType)` - сортировка проектов (альтернативная)
- `getIconByType(type)` - получение иконки по типу
- `escapeHtml(str)` - экранирование HTML
- `updateUserStatsUI()` - обновление статистики пользователя
- `renderSidebarList()` - рендер списка sidebar
- `handleDragStart(e, projectId)` - обработка начала перетаскивания
- `handleDragEnd(e)` - обработка конца перетаскивания
- `handleDragOver(e)` - обработка перетаскивания над элементом
- `getDragAfterElement(container, y)` - получение элемента после перетаскиваемого
- `handleDrop(e, targetProjectId)` - обработка завершения перетаскивания (async)
- `selectProject(projectId)` - выбор проекта
- `formatCurrentDateAsDDMMYYYY()` - форматирование текущей даты
- `formatCurrentDateTimeAsYYYYMMDD_HHMMSS()` - форматирование даты и времени
- `formatDate(now)` - форматирование даты
- `createDefaultProject()` - создание проекта по умолчанию
- `createNewProject()` - создание нового проекта (async)
- `duplicateProject(projectId)` - дублирование проекта (async)

**Вызовы:**
```
loadProjectsFromMinIO
├── fetch() → MinIO API
├── updateAuthorFilter()
├── updateTypeFilter()
└── renderSidebarList()

createNewProject
├── createDefaultProject()
├── saveProjectToMinIO()
└── reload projects list

handleDrop
├── getDragAfterElement()
└── reorder projects

duplicateProject
├── load project
├── copy data
└── saveProjectToMinIO()
```

---

## 11. /workspace/src/menuStubs/menuStubs.js
**Функции-заглушки:**
- `newFromTemplate()` - новый из шаблона
- `saveImageAs()` - сохранить изображение как
- `exportImage(format)` - экспорт изображения
- `printImage()` - печать изображения
- `showSettings()` - показать настройки
- `exitApp()` - выход из приложения
- `pasteAsNewLayer()` - вставить как новый слой
- `pasteWithTransparency()` - вставить с прозрачностью
- `pasteWithScaling()` - вставить с масштабированием
- `autoAdjustColors()` - автонастройка цветов
- `autoContrast()` - автоконтраст
- `autoBrightness()` - автояркость
- `autoGamma()` - автогамма
- `zoomToWindow()` - зум к окну
- `zoomToSelection()` - зум к выделению
- `toggleGrid()` - переключить сетку
- `toggleRulers()` - переключить линейки
- `toggleGuides()` - переключить направляющие
- `togglePixelGrid()` - переключить пиксельную сетку
- `newWindow()` - новое окно
- `arrangeWindows()` - упорядочить окна
- `cascadeWindows()` - каскад окон
- `tileWindows()` - плитка окон
- `toggleFullscreen()` - полноэкранный режим
- `adjustBrightness()` - настройка яркости
- `adjustHueSaturation()` - настройка тона/насыщенности
- `adjustLevels()` - настройка уровней
- `adjustCurves()` - настройка кривых
- `applyBlur(type)` - применение размытия
- `applySharpen(type)` - применение резкости

**Вызовы:**
```
Все функции - заглушки (stubs) для будущих реализаций
```

---

## 12. /workspace/src/tools/tools.js
**Функции:**
- `setCanvasCursor()` - установка курсора canvas
- `questionActiveFile()` - проверка активного файла
- `questionProject()` - проверка проекта
- `setTool(tool)` - установка инструмента
- `updateToolInfo()` - обновление информации об инструменте
- `setShape(shape)` - установка фигуры (закомментировано)
- `toggleShapesPanel()` - переключение панели фигур (закомментировано)
- `setBrushSize(size, ev)` - установка размера кисти (закомментировано)

**Вызовы:**
```
setTool
├── setCanvasCursor()
└── updateToolInfo()
```

---

## 13. /workspace/src/server/server.js
**Функции:**
- `showServerCommander(mode, callback)` - показ серверного командера
- `loadPanelListInServer(panel)` - загрузка списка панелей на сервере (async)
- `loadPanelList(panel)` - загрузка списка панелей (async)
- `updateActivePanelHighlight()` - обновление подсветки активной панели
- `renderPanelList(panel, allFiles, currentPath)` - рендер списка панелей
- `onItemDblClick1(panel, folderPath)` - обработка двойного клика (устаревшая)
- `makePanelClickable(panelId)` - сделать панель кликабельной
- `commanderSelect()` - выбор в командере
- `closeServerCommander()` - закрытие серверного командера
- `showFilenameModal()` - показ модалки имени файла
- `resetUploadModal()` - сброс модалки загрузки
- `resetUploadButtons()` - сброс кнопок загрузки
- `hideUploadProgress()` - скрытие прогресса загрузки
- `loadToServer()` - загрузка на сервер
- `saveToServer()` - сохранение на сервер
- `closeFilenameModal()` - закрытие модалки имени файла
- `uploadToServer()` - загрузка на сервер (основная функция)
- `showUploadProgress()` - показ прогресса загрузки
- `updateUploadProgress(percent, message)` - обновление прогресса загрузки
- `showUploadSuccess(data)` - показ успеха загрузки
- `showUploadError(title, details)` - показ ошибки загрузки
- `showLoadMessage(text, type)` - показ сообщения загрузки
- `selectItem(panel, fullPath, isFolder, displayName)` - выбор элемента
- `refreshBothPanels()` - обновление обеих панелей
- `refreshBothPanelsToServer()` - обновление панелей с сервера
- `loadImageFromServer(filePath)` - загрузка изображения с сервера
- `navigatePanel(panel, folderPath)` - навигация панели
- `navigateUp(panel)` - навигация вверх
- `downloadFile(fullPath)` - скачивание файла
- `closeLoadFromServerModal()` - закрытие модалки загрузки с сервера

**Вызовы:**
```
showServerCommander
├── loadPanelList(leftPanel)
└── loadPanelList(rightPanel)

loadPanelList
└── fetch() → server API
    └── renderPanelList()

uploadToServer
├── showUploadProgress()
├── fetch() → upload
├── updateUploadProgress()
└── showUploadSuccess() / showUploadError()

loadImageFromServer
├── fetch() → download
└── createFileFromImageData()
```

---

## 14. /workspace/src/matrix/matrix.js
**Функции:**
- `showMatrix3DSurface()` - показ 3D поверхности матрицы
- `refreshMatrixPlot()` - обновление графика матрицы
- `plotlyZoom()` - зум Plotly
- `plotlyPan()` - панорамирование Plotly
- `plotlyRotate()` - вращение Plotly
- `plotlyReset()` - сброс Plotly

**Вызовы:**
```
showMatrix3DSurface
└── refreshMatrixPlot()
    └── Plotly.newPlot()

plotlyZoom/plotlyPan/plotlyRotate/plotlyReset
└── Plotly.relayout()
```

---

## 15. /workspace/src/color/color.js
**Функции:**
- `setPrimaryColor(color)` - установка основного цвета
- `setSecondaryColor(color)` - установка вторичного цвета
- `openColorPicker(target)` - открытие палитры цветов
- `initPalette()` - инициализация палитры

**Вызовы:**
```
setPrimaryColor/setSecondaryColor
└── update UI elements

openColorPicker
└── show color picker modal
```

---

## 16. /workspace/src/fileManager/fileManager.js
**Функции:**
- `updateCurrentFileLabel()` - обновление метки текущего файла
- `makeId()` - генерация ID
- `getFile(fileId)` - получение файла по ID
- `getActiveFile()` - получение активного файла
- `switchToFile(fileId)` - переключение на файл
- `closeFile(fileId, event)` - закрытие файла
- `updateFileThumbnails()` - обновление превью файлов
- `updateFileThumbnail(fileId)` - обновление превью конкретного файла
- `updateOpenFilesList()` - обновление списка открытых файлов
- `updateActiveFilePreview(fileId)` - обновление превью активного файла
- `toggleOpenFilesDropdown()` - переключение выпадающего списка файлов
- `openOpenFilesDropdown()` - открытие выпадающего списка
- `closeOpenFilesDropdown()` - закрытие выпадающего списка
- `closeAllDropdowns()` - закрытие всех выпадающих списков
- `cycleThroughFiles()` - циклическое переключение файлов
- `attachCanvasEvents(cnv)` - привязка событий canvas
- `attachCanvasHostEvents()` - привязка событий хоста canvas
- `newImage()` - новое изображение (закомментировано)
- `loadImage(event)` - загрузка изображения (закомментировано)
- `clearCanvas()` - очистка canvas (закомментировано)
- `createFileFromImageData(filename, matrix, width, height, minValue, maxValue, dpi)` - создание файла из ImageData
- `loadMatrixByFileId(projectId, fileId)` - загрузка матрицы по ID файла (async)
- `updateProjectFile(projectId, fileId, fileData)` - обновление файла проекта (async)
- `applySave()` - применение сохранения
- `saveToTptFile(file, filename)` - сохранение в TPT файл
- `matrixToImage()` - конвертация матрицы в изображение
- `createBlankFile(filename)` - создание пустого файла (закомментировано)
- `createFileFromImage(filename, img)` - создание файла из изображения (закомментировано)
- `cleanSensitiveProperties(obj)` - очистка чувствительных свойств
- `saveProjectToMinIO(project)` - сохранение проекта в MinIO (async)

**Вызовы:**
```
switchToFile
├── updateCurrentFileLabel()
├── updateActiveFilePreview()
└── updateOpenFilesList()

closeFile
├── remove from project.files
└── updateOpenFilesList()

updateOpenFilesList
└── updateFileThumbnails()
    └── updateFileThumbnail()

createFileFromImageData
└── makeId()
    └── возвращает File объект

saveProjectToMinIO
├── cleanSensitiveProperties()
├── projectToJson()
└── fetch() → MinIO API
```

---

## 17. /workspace/src/events/events.js
**Функции:**
- `handleKeyDown(e)` - обработка нажатия клавиш
- `handleWheel(e)` - обработка колеса мыши
- `getCanvasCoords(e)` - получение координат canvas
- `handleMouseDown(e)` - обработка нажатия кнопки мыши
- `handleMouseMove(e)` - обработка движения мыши
- `handleMouseUp(e)` - обработка отпускания кнопки мыши
- `handleDoubleClick(e)` - обработка двойного клика

**Вызовы:**
```
handleKeyDown
├── Ctrl+S → saveProjectToMinIO()
├── Ctrl+Z → undo()
├── Ctrl+Y → redo()
├── Delete → delete selection
└── инструмент-specific hotkeys

handleWheel
└── zoomIn()/zoomOut()

handleMouseDown
├── getCanvasCoords()
├── setTool()
├── drawLasso()/drawLine()/etc.
└── pushState()

handleMouseMove
├── getCanvasCoords()
├── drawShape() / drawLine() / drawLasso()
├── update cursor position
└── radialMenu handling

handleMouseUp
├── getCanvasCoords()
├── finalize shape
├── pushState()
└── reset drawing state

handleDoubleClick
└── select word / shape
```

---

## 18. /workspace/src/modals/models.js
**Функции:**
- `bringToFront(modal)` - вывод модалки на передний план
- `initModal(modal)` - инициализация модалки
    - `saveModalState()` - сохранение состояния модалки
    - `restoreModalState()` - восстановление состояния модалки
- `resizePlotlyGraph()` - изменение размера графика Plotly
- `throttleResizePlotly()` - ограничение частоты изменения размера Plotly
- `updateHistoryModal()` - обновление модалки истории
- `updateHistoryList()` - обновление списка истории
- `updateHistoryMarkers()` - обновление маркеров истории
- `temporaryRestore(index)` - временное восстановление состояния
- `getActionName(state)` - получение имени действия

**Вызовы:**
```
initModal
├── saveModalState()
└── restoreModalState()

updateHistoryModal
├── updateHistoryList()
└── updateHistoryMarkers()

temporaryRestore
└── restoreState()
    └── redrawFromHistory()

resizePlotlyGraph
└── Plotly.Plots.resize()

throttleResizePlotly
└── throttle → resizePlotlyGraph()
```

---

## 19. /workspace/src/worker/medianFilterWorker.js
**Функции:**
- `medianFilter(matrix, aperture)` - медианный фильтр (закомментировано, в воркере)

**Вызовы:**
```
Web Worker для выполнения тяжелых вычислений медианного фильтра
без блокировки основного потока
```

---

## 20. /workspace/src/drawing/drawing.js
**Функции:**
- `bresenham(x0, y0, x1, y1)` - алгоритм Брезенхема для рисования линий
- `clipLine(x0, y0, x1, y1, minX, minY, maxX, maxY)` - обрезка линии
    - `computeOutCode(x, y)` - вычисление кода выхода (вложенная)
- `updateGraph(x1, y1, x2, y2)` - обновление графика
- `drawShape(shape, x1, y1, x2, y2, color)` - рисование фигуры (закомментировано)
- `drawStar(cx, cy, spikes, outerR, innerR)` - рисование звезды (закомментировано)
- `drawLasso(points, currentX, currentY)` - рисование лассо
- `drawLassoSelection(points)` - рисование выделения лассо
- `drawLassoSelectionRED(points)` - рисование выделения лассо (красным)
    - `calculatePointsInsidePolygon(Lpoints)` - расчет точек внутри полигона (вложенная)
        - `isPointInPolygon(points, px, py)` - проверка точки в полигоне (вложенная)
- `floodFill(x, y, fillColor)` - заливка (закомментировано)
- `getPixelColor(data, width, x, y)` - получение цвета пикселя (закомментировано)
- `setPixelColor(data, width, x, y, color)` - установка цвета пикселя (закомментировано)
- `colorsMatch(c1, c2)` - сравнение цветов (закомментировано)
- `hexToRgb(hex)` - конвертация hex в RGB (закомментировано)
- `showTextInput(clientX, clientY, canvasX, canvasY, color)` - показ текстового ввода (закомментировано)
- `distanceToSegment(px, py, x1, y1, x2, y2)` - расстояние от точки до сегмента
- `drawProfile(profile)` - рисование профиля
- `drawProfileInProgress(x1, y1, x2, y2)` - рисование профиля в процессе

**Вызовы:**
```
bresenham
└── возвращает массив точек линии

clipLine
└── computeOutCode()
    └── Cohen-Sutherland algorithm

drawLassoSelection
└── calculatePointsInsidePolygon()
    └── isPointInPolygon()
        └── ray casting algorithm

drawProfile
├── bresenham()
└── draw points on canvas
```

---

## 21. /workspace/src/onboarding/onboarding.js
**Функции:**
- `isLocalStorageAvailable()` - проверка доступности localStorage
- `getOnboardingStatus()` - получение статуса онбординга
- `setOnboardingStatus(completed)` - установка статуса онбординга
- `createOverlay()` - создание оверлея
- `createTooltip()` - создание подсказки
- `updateTooltipPosition(targetElement)` - обновление позиции подсказки
- `highlightElement(element)` - подсветка элемента
- `showStep(index)` - показ шага
- `nextTourStep()` - следующий шаг тура
- `prevTourStep()` - предыдущий шаг тура
- `finishTour()` - завершение тура
- `closeProductTour()` - закрытие тура продукта
- `startProductTour()` - запуск тура продукта
- `showToast(message, duration)` - показ уведомления
- `checkFirstLaunch()` - проверка первого запуска
- `skipOnboarding()` - пропуск онбординга
- `addTourButtonToHelp()` - добавление кнопки тура в справку

**Вызовы:**
```
checkFirstLaunch
├── getOnboardingStatus()
└── startProductTour()

startProductTour
├── createOverlay()
├── createTooltip()
└── showStep(0)

showStep
├── highlightElement()
├── updateTooltipPosition()
└── update tooltip content

nextTourStep/prevTourStep
└── showStep(newIndex)

finishTour
├── setOnboardingStatus(true)
└── closeProductTour()
```

---

## Глобальные зависимости и точки входа

### Точки входа:
1. **DOMContentLoaded** (main.js) - основная инициализация приложения
2. **startProductTour()** (onboarding.js) - запуск онбординга
3. **loadProjects()** (wtis-projects2.js) - загрузка списка проектов
4. **showServerCommander()** (server.js) - открытие файлового менеджера

### Основные цепочки вызовов:

```
Загрузка приложения:
└── DOMContentLoaded
    ├── loadProject()
    │   └── fetch() → API
    ├── initDomElements()
    ├── applySettingsTheme()
    ├── updateToolInfo()
    └── updateButtonsState()

Открытие проекта:
└── openProject(projectId)
    └── window.location.href = ?projectId=
        └── DOMContentLoaded → loadProject()

Сохранение проекта:
└── Ctrl+S / Save button
    ├── saveProjectToMinIO()
    │   ├── cleanSensitiveProperties()
    │   ├── projectToJson()
    │   └── fetch() → MinIO API
    └── updateRecentFiles()

Рисование:
└── handleMouseDown()
    ├── getCanvasCoords()
    ├── setTool()
    └── начать рисование
        └── handleMouseMove()
            ├── bresenham() / drawLasso() / etc.
            └── обновить canvas
                └── handleMouseUp()
                    └── pushState()

Фильтры:
└── Apply Filter button
    ├── applyMedianFilter() / applySobelFilter() / etc.
    │   └── [_private helper functions]
    ├── pushState()
    └── updateHistoryModal()

Радиальное меню:
└── right-click canvas
    └── handleCanvasContextMenu()
        └── showRadialMenu()
            └── handleRadialMenuAction()
                └── execute tool/filter
```

---

## Сводка по модулям

| Модуль | Функций | Основное назначение |
|--------|---------|---------------------|
| main.js | 4 | Инициализация приложения, загрузка проекта |
| ui.js | 30+ | UI элементы, модалки, зум |
| imageOps.js | 30+ | Операции над изображениями, фильтры |
| globals.js | 5 | Глобальные функции, проект по умолчанию |
| history.js | 11 | История действий, undo/redo |
| tabs.js | 1 | Управление вкладками |
| recentFiles.js | 6 | Последние файлы |
| radialMenu.js | 30+ | Радиальное контекстное меню |
| wtis-projects2.js | 30+ | Управление проектами (новый UI) |
| wtis-projects.js | 30+ | Управление проектами (старый UI) |
| menuStubs.js | 30+ | Заглушки для меню |
| tools.js | 5 | Инструменты рисования |
| server.js | 30+ | Работа с сервером, файловый менеджер |
| matrix.js | 6 | 3D визуализация матриц |
| color.js | 4 | Цветовая палитра |
| fileManager.js | 25+ | Управление файлами |
| events.js | 7 | Обработчики событий мыши/клавиатуры |
| modals/models.js | 10+ | Управление модалками, история |
| worker/medianFilterWorker.js | 1 | Web Worker для медианного фильтра |
| drawing.js | 15+ | Алгоритмы рисования |
| onboarding.js | 17 | Онбординг для новых пользователей |

**Итого: ~350+ функций в 21 файле**
