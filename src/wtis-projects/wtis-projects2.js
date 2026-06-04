// ==================== Projects Page Logic ====================
        
let projects = [];
let currentView = 'grid';
let currentSort = 'date-desc';
let isLoading = false;
const API_BASE_URL = window.location.origin;

// DOM Elements
const projectsContainer = document.getElementById('projectsContainer');
const projectsCountEl = document.getElementById('projectsCount');
const sortSelect = document.getElementById('sortSelect');
const createProjectBtn = document.getElementById('createProjectBtn');
const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
const newProjectName = document.getElementById('newProjectName');
const projectCategory = document.getElementById('projectCategory');
const projectType = document.getElementById('projectType');
const toastMsg = document.getElementById('toastMsg');

const createProjectModal = document.getElementById('createProjectModal');
const openCreateProjectModalBtn = document.getElementById('openCreateProjectModalBtn');
const closeCreateProjectModalBtn = document.getElementById('closeCreateProjectModalBtn');
const createProjectModalBtn = document.getElementById('createProjectModalBtn');
const cancelCreateProjectModalBtn = document.getElementById('cancelCreateProjectModalBtn');

// ==================== Utility Functions ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function getFirstLetter(text) {
    if (!text) return '?';
    return text.charAt(0).toUpperCase();
}

function generatePlaceholderColor(text) {
    if (!text) return '#666666';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 40%)`;
}

function getFileTypeIcon(type) {
    const icons = {
        'tis': 'T',
        'classic': 'C',
        'workflow': 'W',
        'json': '{}',
        'default': '📄'
    };
    return icons[type] || icons['default'];
}

// ==================== Data Loading ====================

async function loadProjects() {
    isLoading = true;
    renderSkeleton();
    
    try {
        const response = await fetch(`${API_BASE_URL}/list_projects`);
        if (!response.ok) throw new Error('Failed to load projects');
        
        const data = await response.json();
        if (data.success && Array.isArray(data.projects)) {
            projects = data.projects;
            renderProjects();
        } else {
            projects = [];
            renderEmptyState();
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        projects = [];
        renderEmptyState();
    } finally {
        isLoading = false;
    }
}

// ==================== Rendering ====================

function renderSkeleton() {
    let skeletonHTML = '';
    for (let i = 0; i < 8; i++) {
        skeletonHTML += `
            <div class="skeleton-card">
                <div class="skeleton-body">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-meta"></div>
                </div>
            </div>
        `;
    }
    projectsContainer.innerHTML = skeletonHTML;
}

function renderEmptyState() {
    projectsContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <h2 class="empty-state-title">У вас пока нет проектов</h2>
            <p class="empty-state-text">Создайте свой первый проект, чтобы начать работу</p>
            <button class="btn-primary" onclick="createNewProject()">
                <span>+</span> Создать проект
            </button>
        </div>
    `;
    projectsCountEl.textContent = '0';
}

function renderProjects() {
    const sortedProjects = sortProjects(projects, currentSort);
    
    if (sortedProjects.length === 0) {
        renderEmptyState();
        return;
    }

    projectsCountEl.textContent = sortedProjects.length.toString();
    
    let cardsHTML = '';
    sortedProjects.forEach(project => {
        cardsHTML += createProjectCard(project);
    });
    
    projectsContainer.innerHTML = cardsHTML;
    attachCardEventListeners();
}

function createProjectCard(project) {
    const viewTypeClass = currentView === 'list' ? 'list-view' : '';
    const fileType = project.type || 'default';
    const lastModified = formatDate(project.last_modified || project.createdAt);
    const author = project.author || 'Неизвестно';
    
    return `
        <div class="project-card ${viewTypeClass}" data-id="${escapeHtml(project.id)}">
            <div class="card-actions">
                <button class="actions-btn" data-id="${escapeHtml(project.id)}" title="Действия">⋮</button>
                <div class="context-menu" id="menu-${escapeHtml(project.id)}">
                    <button class="context-menu-item" data-action="open" data-id="${escapeHtml(project.id)}">
                        📂 Открыть
                    </button>
                    <button class="context-menu-item" data-action="settings" data-id="${escapeHtml(project.id)}">
                        ⚙️ Настройки
                    </button>
                    <button class="context-menu-item" data-action="rename" data-id="${escapeHtml(project.id)}">
                        ✏️ Переименовать
                    </button>
                    <button class="context-menu-item" data-action="duplicate" data-id="${escapeHtml(project.id)}">
                        📑 Дублировать
                    </button>
                    <div class="context-menu-divider"></div>
                    <button class="context-menu-item" data-action="export" data-id="${escapeHtml(project.id)}">
                        📤 Экспорт
                    </button>
                    <button class="context-menu-item" data-action="import" data-id="${escapeHtml(project.id)}">
                        📥 Импорт
                    </button>
                    <div class="context-menu-divider"></div>
                    <button class="context-menu-item danger" data-action="delete" data-id="${escapeHtml(project.id)}">
                        🗑 Удалить
                    </button>
                </div>
            </div>
            
            <div class="card-body">
                <div class="card-header">
                    <div class="file-type-icon">${getFileTypeIcon(fileType)}</div>
                    <div class="card-title-wrapper">
                        <div class="card-title" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</div>
                    </div>
                </div>
                
                <div class="card-metadata">
                    <span class="metadata-item" title="Дата изменения">
                        📅 ${lastModified}
                    </span>
                    <span class="metadata-item" title="Автор">
                        👤 ${escapeHtml(author)}
                    </span>
                </div>
            </div>
        </div>
    `;
}


function attachCardEventListeners() {
    // Actions buttons - left click
    document.querySelectorAll('.actions-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            showContextMenu(btn.dataset.id, btn);
        });
        
        // Right click support
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showContextMenu(btn.dataset.id, btn);
        });
        
        // Prevent mousemove from triggering any behavior
        btn.addEventListener('mousemove', (e) => {
            e.stopPropagation();
        });
    });

    // Context menu items
    document.querySelectorAll('.context-menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            handleContextMenuAction(item.dataset.action, item.dataset.id);
            closeAllContextMenus();
        });
        
        // Prevent mousemove on menu items
        item.addEventListener('mousemove', (e) => {
            e.stopPropagation();
        });
    });

    // Card click (open project)
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.actions-btn') && !e.target.closest('.context-menu')) {
                openProject(card.dataset.id);
            }
        });
        
        // Right click on card
        card.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const actionsBtn = card.querySelector('.actions-btn');
            if (actionsBtn) {
                showContextMenu(actionsBtn.dataset.id, actionsBtn);
            }
        });
        
        // Prevent mousemove on cards from affecting menu
        card.addEventListener('mousemove', (e) => {
            // Only stop propagation if menu is open and we're not over the button
            const openMenu = document.querySelector('.context-menu.show');
            if (openMenu && !e.target.closest('.actions-btn') && !e.target.closest('.context-menu')) {
                e.stopPropagation();
            }
        });
    });

    // Close menus on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.actions-btn')) {
            closeAllContextMenus();
        }
    });
    
    // Also close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllContextMenus();
        }
    });
}

function showContextMenu(projectId, triggerElement) {
    closeAllContextMenus();
    const menu = document.getElementById(`menu-${projectId}`);
    if (menu) {
        // Force layout calculation to ensure stable positioning
        const rect = triggerElement.getBoundingClientRect();
        
        // Calculate position once and apply
        const topPosition = rect.bottom + 4;
        const leftPosition = Math.max(0, rect.right - 200); // Ensure menu doesn't go off-screen left
        
        // Apply positions directly without any animation that could cause jumping
        menu.style.top = topPosition + 'px';
        menu.style.left = leftPosition + 'px';
        menu.style.right = 'auto'; // Reset any right positioning
        menu.classList.add('show');
    }
}

function closeAllContextMenus() {
    document.querySelectorAll('.context-menu').forEach(menu => {
        menu.classList.remove('show');
    });
}

// ==================== Sorting ====================

function sortProjects(projectsList, sortType) {
    const sorted = [...projectsList];
    
    switch (sortType) {
        case 'date-desc':
            sorted.sort((a, b) => new Date(b.last_modified || b.createdAt || 0) - new Date(a.last_modified || a.createdAt || 0));
            break;
        case 'date-asc':
            sorted.sort((a, b) => new Date(a.last_modified || a.createdAt || 0) - new Date(b.last_modified || b.createdAt || 0));
            break;
        case 'name-asc':
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
            break;
        case 'name-desc':
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'ru'));
            break;
    }
    
    return sorted;
}

// ==================== Actions ====================

function openProject(projectId) {
    console.log('Opening project:', projectId);
    // Redirect to project editor or load project
    window.location.href = `/editor?project=${projectId}`;
}

async function handleContextMenuAction(action, projectId) {
    switch (action) {
        case 'open':
            openProject(projectId);
            break;
        case 'settings':
            openProjectSettings(projectId);
            break;
        case 'rename':
            await renameProject(projectId);
            break;
        case 'duplicate':
            await duplicateProject(projectId);
            break;
        case 'delete':
            await deleteProject(projectId);
            break;
        case 'export':
            exportProject(projectId);
            break;
        case 'import':
            importProject(projectId);
            break;
    }
}

// ==================== Project Settings ====================

let currentEditingProjectId = null;

function openProjectSettings(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    currentEditingProjectId = projectId;
    document.getElementById('projectSettingsName').value = project.name || '';
    document.getElementById('projectSettingsAuthor').value = project.author || '';
    document.getElementById('projectSettingsAutoSave').checked = project.settings?.autoSave !== false;
    document.getElementById('projectSettingsPrivate').checked = project.settings?.private || false;
    
    document.getElementById('projectSettingsModal').classList.add('show');
}

function closeProjectSettings() {
    document.getElementById('projectSettingsModal').classList.remove('show');
    currentEditingProjectId = null;
}

async function saveProjectSettings() {
    if (!currentEditingProjectId) return;
    
    const project = projects.find(p => p.id === currentEditingProjectId);
    if (!project) return;
    
    const name = document.getElementById('projectSettingsName').value.trim();
    const author = document.getElementById('projectSettingsAuthor').value.trim();
    const autoSave = document.getElementById('projectSettingsAutoSave').checked;
    const isPrivate = document.getElementById('projectSettingsPrivate').checked;
    
    if (!name) {
        alert('Название проекта не может быть пустым');
        return;
    }
    
    project.name = name;
    project.author = author;
    project.settings = {
        ...project.settings,
        autoSave: autoSave,
        private: isPrivate
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/save_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                project: project,
                history: project.history || {}
            })
        });
        const data = await response.json();
        if (data.success) {
            await loadProjects();
            closeProjectSettings();
        }
    } catch (error) {
        console.error('Error saving project settings:', error);
    }
}

// ==================== User Settings ====================

let userProfile = {
    name: 'User',
    email: '',
    theme: 'dark',
    notifications: true
};

function loadUserProfile() {
    const saved = localStorage.getItem('userProfile');
    if (saved) {
        userProfile = JSON.parse(saved);
    }
    updateProfileDisplay();
}

function saveUserProfile() {
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    updateProfileDisplay();
}

function updateProfileDisplay() {
    document.getElementById('profileName').textContent = userProfile.name;
    document.getElementById('profileAvatar').textContent = userProfile.name.charAt(0).toUpperCase();
}

function openUserSettings() {
    document.getElementById('userSettingsName').value = userProfile.name || '';
    document.getElementById('userSettingsEmail').value = userProfile.email || '';
    document.getElementById('userSettingsTheme').value = userProfile.theme || 'dark';
    document.getElementById('userSettingsNotifications').checked = userProfile.notifications !== false;
    
    document.getElementById('userSettingsModal').classList.add('show');
}

function closeUserSettings() {
    document.getElementById('userSettingsModal').classList.remove('show');
}

function saveUserSettings() {
    userProfile.name = document.getElementById('userSettingsName').value.trim() || 'User';
    userProfile.email = document.getElementById('userSettingsEmail').value.trim();
    userProfile.theme = document.getElementById('userSettingsTheme').value;
    userProfile.notifications = document.getElementById('userSettingsNotifications').checked;
    
    saveUserProfile();
    closeUserSettings();
}

function openCreateProjectModal() {
    document.getElementById('createProjectModal').classList.add('show');
    console.log(123);
}


async function renameProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    const newName = prompt('Введите новое название проекта:', project.name);
    if (newName && newName.trim() !== project.name) {
        try {
            const response = await fetch(`${API_BASE_URL}/save_project`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...project,
                    name: newName.trim()
                })
            });
            const data = await response.json();
            if (data.success) {
                await loadProjects();
            }
        } catch (error) {
            console.error('Error renaming project:', error);
        }
    }
}

async function duplicateProject(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (!confirm(`Создать копию проекта "${project.name}"?`)) return;
    
    try {
        const duplicatedProject = {
            ...project,
            id: 'proj_tis_' + Date.now(),
            name: project.name + ' (копия)',
            createdAt: new Date().toISOString(),
            last_modified: new Date().toISOString()
        };
        
        const response = await fetch(`${API_BASE_URL}/save_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(duplicatedProject)
        });
        const data = await response.json();
        if (data.success) {
            await loadProjects();
        }
    } catch (error) {
        console.error('Error duplicating project:', error);
    }
}

async function deleteProject(projectId) {
    if (!confirm('Вы уверены, что хотите удалить этот проект? Это действие нельзя отменить.')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete_project/${projectId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (data.success) {
            await loadProjects();
        }
    } catch (error) {
        console.error('Error deleting project:', error);
    }
}

function exportProject(projectId) {
    console.log('Exporting project:', projectId);
    // Implement export logic
    window.location.href = `${API_BASE_URL}/export_project/${projectId}`;
}

function importProject(projectId) {
    console.log('Importing project:', projectId);
    // Implement import logic
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.tis';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Handle file import
            console.log('Importing file:', file.name);
        }
    };
    input.click();
}

async function createNewProject123() {
    const name = prompt('Введите название проекта:', 'Новый проект');
    if (!name || !name.trim()) return;
    
    try {
        const projectId = 'proj_tis_' + Date.now();
        const now = new Date().toISOString();
        
        const projectData = {
            project: {
                id: projectId,
                name: name.trim(),
                type: "tis",
                createdAt: now,
                rootPath: "/workspace/projects/" + projectId,
                settings: {
                    theme: "dark",
                    fontSize: 14,
                    autoSave: true
                }
            },
            history: {
                lastOpened: now,
                activeFileId: null,
                files: [],
                uiState: {
                    sidebarVisible: true,
                    terminalHeight: 200,
                    panelLayout: "vertical"
                }
            }
        };
        
        const response = await fetch(`${API_BASE_URL}/save_project`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        const data = await response.json();
        if (data.success) {
            await loadProjects();
//            openProject(projectId);
        }
    } catch (error) {
        console.error('Error creating project:', error);
    }
}
async function createNewProject() {
    const name = newProjectName.value.trim();
    if(!name) { 
        showToast("укажите название", true); 
        alert('Ошибка: LiteGraph не загрузился. Проверьте соединение.');
        return; 
    }
    if(projects.some(p => p.name.toLowerCase() === name.toLowerCase())) { 
        showToast("проект существует", true); 
        return; 
    }
    const newId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
    const maxOrder = projects.length ? Math.max(...projects.map(p => p.order || 0)) : -1;
    const newProj = {
        id: newId, name, 
        category: projectCategory.value, 
        type: projectType.value,
        deadline: "", 
        createdAt: new Date().toISOString().slice(0,10),
        owner: displayUserNameSpan.innerText,
        order: maxOrder + 1
    };
    // Добавляем settings, только если type === 'tis'
    if (newProj.type === "tis") {
        newProj.settings = {  // Вложенный объект
            theme: "dark",
            notifications: true,
            defaultView: "list"
        };
        newProj.history = {  // Вложенный объект

        };
    }
    console.log(newProj);
    const saved = await saveProjectToMinIO(newProj);
    if(!saved) { showToast("ошибка", true); return; }
    projects.push(newProj);
    newProjectName.value = '';
    activeProjectId = newId;
    sidebarSearchInput.value = '';
    renderAll();
    showToast(`✓ ${name}`);
    createProjectModal.classList.remove('show');
}

// ==================== Event Listeners ====================

// View toggle
viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        viewToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentView = btn.dataset.view;
        
        projectsContainer.className = currentView === 'grid' ? 'projects-grid' : 'projects-list';
        renderProjects();
    });
});

// Sort change
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderProjects();
});

// Create project
document.getElementById('openCreateProjectModalBtn').addEventListener('click', openCreateProjectModal);


// Project Settings Modal
document.getElementById('closeProjectSettingsModal').addEventListener('click', closeProjectSettings);
document.getElementById('cancelProjectSettings').addEventListener('click', closeProjectSettings);
document.getElementById('saveProjectSettings').addEventListener('click', saveProjectSettings);

// User Settings Modal
document.getElementById('userSettingsBtn').addEventListener('click', openUserSettings);
document.getElementById('closeUserSettingsModal').addEventListener('click', closeUserSettings);
document.getElementById('cancelUserSettings').addEventListener('click', closeUserSettings);
document.getElementById('saveUserSettings').addEventListener('click', saveUserSettings);

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('show');
        }
    });
});

// ==================== Initialization ====================

async function init() {
    loadUserProfile();
    await loadProjects();
}

// Start the app
init();