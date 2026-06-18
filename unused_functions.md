# Список неиспользуемых функций в проекте

## 📊 Общая статистика
- **Всего функций в проекте**: ~421
- **Неиспользуемых функций**: 60+
- **Файлов с заглушками**: 1 (menuStubs.js)
- **Файлов без подключений**: 2 (wtis-projects2.js, medianFilterWorker.js)

---

## 1️⃣ Файл-заглушка: `src/menuStubs/menuStubs.js`

**43 функции-заглушки** для нереализованных пунктов меню (не имеют тела функции и не вызываются):

### Работа с файлами
| № | Функция | Назначение |
|---|---------|------------|
| 1 | `newFromTemplate()` | Создание из шаблона |
| 2 | `saveImageAs()` | Сохранение как |
| 3 | `exportImage(format)` | Экспорт изображения |
| 4 | `printImage()` | Печать изображения |

### Настройки и выход
| 5 | `showSettings()` | Показать настройки |
| 6 | `exitApp()` | Выход из приложения |

### Вставка
| 7 | `pasteAsNewLayer()` | Вставить как новый слой |
| 8 | `pasteWithTransparency()` | Вставка с прозрачностью |
| 9 | `pasteWithScaling()` | Вставка с масштабированием |

### Автокоррекция цвета
| 10 | `autoAdjustColors()` | Автонастройка цветов |
| 11 | `autoContrast()` | Автоматический контраст |
| 12 | `autoBrightness()` | Автоматическая яркость |
| 13 | `autoGamma()` | Автоматическая гамма |

### Масштабирование
| 14 | `zoomToWindow()` | Масштаб по окну |
| 15 | `zoomToSelection()` | Масштаб по выделению |

### Отображение сетки и направляющих
| 16 | `toggleGrid()` | Переключить сетку |
| 17 | `toggleRulers()` | Переключить линейки |
| 18 | `toggleGuides()` | Переключить направляющие |
| 19 | `togglePixelGrid()` | Переключить пиксельную сетку |

### Управление окнами
| 20 | `newWindow()` | Новое окно |
| 21 | `arrangeWindows()` | Упорядочить окна |
| 22 | `cascadeWindows()` | Каскадом |
| 23 | `tileWindows()` | Плиткой |
| 24 | `toggleFullscreen()` | Полный экран |

### Коррекция цвета (ручная)
| 25 | `adjustBrightness()` | Настройка яркости |
| 26 | `adjustHueSaturation()` | Цветовой тон/насыщенность |
| 27 | `adjustLevels()` | Уровни |
| 28 | `adjustCurves()` | Кривые |

### Фильтры
| 29 | `applyBlur(type)` | Размытие |
| 30 | `applySharpen(type)` | Резкость |
| 31 | `applyNoise()` | Шум |
| 32 | `applyEmboss()` | Тиснение |
| 33 | `sepiaTone()` | Сепия |

### Кадрирование
| 34 | `cropToSelection()` | Кадрировать по выделению |
| 35 | `cropToContent()` | Кадрировать по содержимому |
| 36 | `cropCustom()` | Произвольное кадрирование |

### Помощь
| 37 | `showHelp()` | Показать помощь |
| 38 | `showTips()` | Показать советы |
| 39 | `openTutorials()` | Открыть уроки |
| 40 | `openGallery()` | Открыть галерею |
| 41 | `openForum()` | Открыть форум |
| 42 | `checkUpdates()` | Проверить обновления |
| 43 | `showAbout()` | О программе |

---

## 2️⃣ Файлы без подключений

### `src/wtis-projects/wtis-projects2.js`
**~50 функций** - альтернативная версия страницы проектов, **не подключена ни к одному HTML-файлу**.

Основные функции:
- `loadProjects()` - загрузка проектов
- `renderProjects()` - отображение проектов
- `createProjectCard()` - создание карточки проекта
- `openProject()` - открытие проекта
- `deleteProject()` - удаление проекта
- `exportProject()` - экспорт проекта
- `sortProjects()` - сортировка проектов
- `showContextMenu()` - контекстное меню
- `openUserSettings()` / `closeUserSettings()` - настройки пользователя
- `saveUserSettings()` - сохранение настроек
- `loadUserProfile()` / `updateProfileDisplay()` - профиль пользователя

**Статус**: Файл дублирует функционал `wtis-projects.js`, но не используется.

---

### `src/worker/medianFilterWorker.js`
**Web Worker для медианного фильтра**, **полностью закомментирован и не используется**.

```javascript
// Весь код закомментирован:
// function medianFilter(matrix, aperture) { ... }
// self.postMessage({ type: 'result', matrix: result });
```

**Причина**: В `src/imageOps/imageOps.js` используется синхронная версия `_medianFilter()`, а не worker.

**Статус**: Мёртвый код, можно удалить или реализовать.

---

## 3️⃣ Частично используемые функции

### Из `src/modals/models.js`
Функции экспортированы в `window`, но **могут не вызываться**:

| Функция | Статус |
|---------|--------|
| `window.showHelpModal()` | ⚠️ Вызывается из HTML, но кнопка скрыта (`display: none`) |
| `window.closeHelpModal()` | ⚠️ Аналогично |
| `window.debounceTemporaryRestore()` | ✅ Используется |
| `window.jumpToSelectedState()` | ⚠️ Не найдено вызовов в HTML |

---

## 4️⃣ Закомментированный код в активных файлах

### `src/radialMenu/radialMenu.js`
```javascript
if (typeof applyMedianFilter === 'function')
    // applyMedianFilter();  // ЗАКОММЕНТИРОВАНО
```

### `src/tabs/tabs.js`
```javascript
// <button onclick="cropToSelection()">  // ЗАКОММЕНТИРОВАНО в HTML-шаблоне
```

---

## 📋 Итоговая таблица

| Категория | Количество | Файлы |
|-----------|------------|-------|
| **Заглушки меню** | 43 | `menuStubs.js` |
| **Неподключенные файлы** | ~50 | `wtis-projects2.js`, `medianFilterWorker.js` |
| **Скрытые функции** | 2 | `models.js` (help modal) |
| **Закомментированные вызовы** | 2+ | `radialMenu.js`, `tabs.js` |
| **ВСЕГО** | **~60+** | |

---

## 🔧 Рекомендации

### Можно безопасно удалить:
1. ✅ `src/menuStubs/menuStubs.js` - если не планируете реализовывать эти функции
2. ✅ `src/wtis-projects/wtis-projects2.js` - дубликат активной версии
3. ✅ `src/worker/medianFilterWorker.js` - полностью закомментирован

### Требует решения:
1. ⚠️ Реализовать функции из `menuStubs.js` или удалить их из UI
2. ⚠️ Скрыть кнопку помощи или реализовать `showHelpModal()` полноценно
3. ⚠️ Удалить закомментированный код из активных файлов

---

*Документ сгенерирован автоматически на основе анализа исходного кода*
