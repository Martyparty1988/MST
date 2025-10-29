// ============================================
// MST - Marty Solar Tracker
// Main Application (Optimized & Refactored)
// ============================================

// =============================
// Constants
// =============================
const ADMIN_PASSWORD = 'mst2025';
const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const SECRET_CLICK_COUNT = 5;
const SECRET_CLICK_WINDOW = 3000; // 3 seconds

// =============================
// State
// =============================
let appState = {
  workers: [],
  projects: [],
  workEntries: []
};

let adminSession = null;
let secretClickCount = 0;
let secretClickTimer = null;
let currentPage = 'plan';

// =============================
// Initialization
// =============================
async function init() {
  try {
    showLoading('Initializing app...');

    // Initialize IndexedDB
    await window.IndexedDBService.initDB();
    await window.IndexedDBService.initMeta();

    // Perform migration if needed
    const migrationReport = await window.MigrationService.performMigrationIfNeeded();
    if (migrationReport) {
      const total = migrationReport.workers.migrated + migrationReport.projects.migrated + migrationReport.workEntries.migrated;
      if (total > 0) {
        window.Toast.success(`Migrated ${total} items from old storage`, 'Migration Complete');
      }
    }

    // Load state
    await loadState();

    // Check admin session
    restoreAdminSession();

    // Setup event listeners
    setupEventListeners();

    // Schedule automatic vacuum
    window.VacuumService.scheduleVacuum();

    // Render initial page
    render();

    hideLoading();
    window.Toast.success('App loaded successfully', 'Welcome to MST');

  } catch (error) {
    console.error('[App] Initialization failed:', error);
    hideLoading();
    window.Toast.error('Failed to initialize app. Please refresh the page.', 'Initialization Error', 0);
  }
}

// =============================
// State Management
// =============================
async function loadState() {
  try {
    const data = await window.IndexedDBService.loadAllData();
    appState.workers = data.workers || [];
    appState.projects = data.projects || [];
    appState.workEntries = data.workEntries || [];
    console.log('[App] State loaded:', appState);
  } catch (error) {
    console.error('[App] Load state failed:', error);
    throw error;
  }
}

async function saveState() {
  try {
    await window.IndexedDBService.saveAllData(appState);
    await window.BackupService.trackChange();
    console.log('[App] State saved');
  } catch (error) {
    console.error('[App] Save state failed:', error);
    window.Toast.error('Failed to save changes', 'Save Error');
    throw error;
  }
}

// =============================
// Admin Authentication
// =============================
function restoreAdminSession() {
  const sessionData = localStorage.getItem('mst:adminSession');
  if (!sessionData) return;

  try {
    const session = JSON.parse(sessionData);
    const now = Date.now();
    const elapsed = now - session.createdAt;

    if (elapsed < ADMIN_SESSION_DURATION) {
      adminSession = session;
      console.log('[Admin] Session restored');
    } else {
      localStorage.removeItem('mst:adminSession');
      console.log('[Admin] Session expired');
    }
  } catch (error) {
    console.error('[Admin] Session restore failed:', error);
    localStorage.removeItem('mst:adminSession');
  }
}

function handleSecretClick() {
  secretClickCount++;

  if (secretClickTimer) clearTimeout(secretClickTimer);

  if (secretClickCount >= SECRET_CLICK_COUNT) {
    showAdminLogin();
    secretClickCount = 0;
    return;
  }

  secretClickTimer = setTimeout(() => {
    secretClickCount = 0;
  }, SECRET_CLICK_WINDOW);
}

function showAdminLogin() {
  const password = prompt('Enter admin password:');
  if (!password) return;

  if (password === ADMIN_PASSWORD) {
    adminSession = {
      token: generateToken(),
      createdAt: Date.now()
    };
    localStorage.setItem('mst:adminSession', JSON.stringify(adminSession));
    window.Toast.success('Admin access granted', 'Welcome Admin');
    render();
  } else {
    window.Toast.error('Incorrect password', 'Access Denied');
  }
}

function logoutAdmin() {
  adminSession = null;
  localStorage.removeItem('mst:adminSession');
  window.Toast.info('Admin session ended', 'Logged Out');
  navigateToPage('plan');
}

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isAdmin() {
  if (!adminSession) return false;

  const elapsed = Date.now() - adminSession.createdAt;
  if (elapsed >= ADMIN_SESSION_DURATION) {
    logoutAdmin();
    return false;
  }

  return true;
}

// =============================
// Navigation
// =============================
function navigateToPage(page) {
  currentPage = page;

  // Update active nav item
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.page === page) {
      item.classList.add('active');
    }
  });

  // Update page title
  const titles = {
    plan: 'Plan',
    records: 'Records',
    stats: 'Stats',
    settings: 'Settings',
    admin: 'Admin Dashboard'
  };
  document.getElementById('pageTitle').textContent = titles[page] || 'MST';

  render();
}

function setupEventListeners() {
  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      navigateToPage(item.dataset.page);
    });
  });

  // Secret admin button
  document.getElementById('secretAdminButton').addEventListener('click', handleSecretClick);

  // Service Worker messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
  }
}

function handleServiceWorkerMessage(event) {
  if (event.data.type === 'TRIGGER_BACKUP') {
    window.BackupService.triggerAutoBackup();
  }
  if (event.data.type === 'TRIGGER_AUTO_BACKUP') {
    window.BackupService.triggerAutoBackup();
  }
}

// =============================
// Rendering
// =============================
function render() {
  const mainContent = document.getElementById('mainContent');

  switch (currentPage) {
    case 'plan':
      mainContent.innerHTML = renderPlanPage();
      break;
    case 'records':
      mainContent.innerHTML = renderRecordsPage();
      break;
    case 'stats':
      mainContent.innerHTML = renderStatsPage();
      break;
    case 'settings':
      mainContent.innerHTML = renderSettingsPage();
      break;
    case 'admin':
      if (isAdmin()) {
        renderAdminPage();
      } else {
        window.Toast.error('Admin access required', 'Access Denied');
        navigateToPage('plan');
      }
      break;
    default:
      mainContent.innerHTML = '<div class="placeholder"><div class="placeholder-text">Page not found</div></div>';
  }
}

// =============================
// Page Renderers
// =============================
function renderPlanPage() {
  return `
    <div class="section">
      <div class="placeholder">
        <div class="placeholder-icon">📋</div>
        <div class="placeholder-text">PDF Viewer Coming Soon</div>
        <p style="margin-top: 16px; color: var(--text-secondary);">
          This section will display project plans and technical drawings.
        </p>
      </div>
    </div>
  `;
}

function renderRecordsPage() {
  const filters = `
    <div class="filters">
      <div class="filter-group">
        <select class="form-select" id="filterProject" onchange="filterRecords()">
          <option value="">All Projects</option>
          ${appState.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <select class="form-select" id="filterType" onchange="filterRecords()">
          <option value="">All Types</option>
          <option value="task">Task</option>
          <option value="hourly">Hourly</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="showAddRecordModal()">+ Add Record</button>
    </div>
  `;

  if (appState.workEntries.length === 0) {
    return `
      <div class="section">
        ${filters}
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <div class="empty-state-text">No work records yet</div>
          <button class="btn btn-primary" onclick="showAddRecordModal()" style="margin-top: 20px;">
            Add First Record
          </button>
        </div>
      </div>
    `;
  }

  const sortedEntries = [...appState.workEntries].sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const recordsList = sortedEntries.map(entry => renderRecordCard(entry)).join('');

  return `
    <div class="section">
      ${filters}
      <div id="recordsList">
        ${recordsList}
      </div>
    </div>
  `;
}

function renderRecordCard(entry) {
  const project = appState.projects.find(p => p.id === entry.projectId);
  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString('cs-CZ');
  const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });

  if (entry.type === 'task') {
    const totalAmount = entry.rewardPerWorker * entry.workers.length;
    return `
      <div class="record-card">
        <div class="record-header">
          <span class="record-type task">Task</span>
          <span class="record-date">${dateStr} ${timeStr}</span>
        </div>
        <div class="record-body">
          <div class="record-detail"><strong>Project:</strong> ${project ? project.name : 'N/A'}</div>
          <div class="record-detail"><strong>Table:</strong> ${entry.tableNumber}</div>
          <div class="record-detail"><strong>Workers:</strong> ${entry.workers.map(w => w.workerCode).join(', ')}</div>
          <div class="record-detail"><strong>Reward/Worker:</strong> ${entry.rewardPerWorker} CZK</div>
          <div class="record-amount">${totalAmount} CZK</div>
        </div>
        <div class="record-footer">
          <button class="btn-small btn-danger" onclick="deleteRecord('${entry.id}')">Delete</button>
        </div>
      </div>
    `;
  } else {
    const worker = appState.workers.find(w => w.id === entry.workerId);
    return `
      <div class="record-card">
        <div class="record-header">
          <span class="record-type hourly">Hourly</span>
          <span class="record-date">${dateStr} ${timeStr}</span>
        </div>
        <div class="record-body">
          <div class="record-detail"><strong>Project:</strong> ${project ? project.name : 'N/A'}</div>
          <div class="record-detail"><strong>Worker:</strong> ${worker ? worker.name : 'N/A'}</div>
          <div class="record-detail"><strong>Hours:</strong> ${entry.totalHours}</div>
          <div class="record-amount">${entry.totalEarned} CZK</div>
        </div>
        <div class="record-footer">
          <button class="btn-small btn-danger" onclick="deleteRecord('${entry.id}')">Delete</button>
        </div>
      </div>
    `;
  }
}

function renderStatsPage() {
  const stats = calculateStats();

  return `
    <div class="section">
      <div class="kpi-grid">
        <div class="kpi-card primary">
          <div class="kpi-label">Total Earnings</div>
          <div class="kpi-value">${stats.totalEarnings.toFixed(0)} CZK</div>
        </div>
        <div class="kpi-card accent">
          <div class="kpi-label">Total Hours</div>
          <div class="kpi-value">${stats.totalHours.toFixed(1)}h</div>
        </div>
        <div class="kpi-card secondary">
          <div class="kpi-label">Total Tasks</div>
          <div class="kpi-value">${stats.taskCount}</div>
        </div>
        <div class="kpi-card warning">
          <div class="kpi-label">Avg Earnings/Task</div>
          <div class="kpi-value">${stats.avgPerTask.toFixed(0)} CZK</div>
        </div>
      </div>

      <div class="chart-container">
        <canvas id="earningsChart"></canvas>
      </div>
    </div>
  `;
}

function renderSettingsPage() {
  return `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Workers</h2>
        <button class="btn btn-primary" onclick="showAddWorkerModal()">+ Add Worker</button>
      </div>
      ${renderWorkersList()}
    </div>

    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Projects</h2>
        <button class="btn btn-primary" onclick="showAddProjectModal()">+ Add Project</button>
      </div>
      ${renderProjectsList()}
    </div>

    <div class="section">
      <h2 class="section-title">Data Management</h2>
      <div class="btn-group">
        <button class="btn btn-accent" onclick="exportData()">📥 Export JSON</button>
        <button class="btn btn-accent" onclick="exportCSV()">📊 Export CSV</button>
        <button class="btn btn-secondary" onclick="importData()">📤 Import JSON</button>
      </div>
    </div>

    ${isAdmin() ? `
      <div class="section">
        <button class="btn btn-primary" onclick="navigateToPage('admin')">
          🔐 Admin Dashboard
        </button>
      </div>
    ` : ''}
  `;
}

async function renderAdminPage() {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = '<div class="placeholder"><div class="placeholder-text">Loading admin panel...</div></div>';

  try {
    const html = await window.AdminBackupPanel.renderAdminBackupPanel();
    mainContent.innerHTML = `
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">Admin Dashboard</h2>
          <button class="btn btn-danger" onclick="logoutAdmin()">Logout</button>
        </div>
        ${html}
      </div>
    `;
  } catch (error) {
    console.error('[Admin] Render failed:', error);
    window.Toast.error('Failed to load admin panel', 'Error');
    mainContent.innerHTML = '<div class="placeholder"><div class="placeholder-text">Failed to load admin panel</div></div>';
  }
}

function renderWorkersList() {
  if (appState.workers.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">👷</div>
        <div class="empty-state-text">No workers yet</div>
      </div>
    `;
  }

  return `
    <div class="workers-grid">
      ${appState.workers.map(w => `
        <div class="worker-card">
          <div class="worker-header">
            <div class="worker-avatar" style="background-color: ${w.color}">
              ${w.name.charAt(0).toUpperCase()}
            </div>
            <div class="worker-info">
              <h3>${w.name}</h3>
              <div class="worker-code">${w.workerCode}</div>
            </div>
          </div>
          <div class="worker-details">
            <strong>${w.hourlyRate} CZK/hour</strong>
          </div>
          <div class="btn-group">
            <button class="btn-small" onclick="editWorker('${w.id}')">Edit</button>
            <button class="btn-small btn-danger" onclick="deleteWorker('${w.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderProjectsList() {
  if (appState.projects.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🏗️</div>
        <div class="empty-state-text">No projects yet</div>
      </div>
    `;
  }

  return `
    <div class="list">
      ${appState.projects.map(p => `
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">${p.name}</div>
            <div class="list-item-subtitle">${p.location} • ${p.status}</div>
          </div>
          <div class="list-item-actions">
            <button class="btn-small" onclick="editProject('${p.id}')">Edit</button>
            <button class="btn-small btn-danger" onclick="deleteProject('${p.id}')">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// =============================
// Stats Calculations
// =============================
function calculateStats() {
  let totalEarnings = 0;
  let totalHours = 0;
  let taskCount = 0;

  appState.workEntries.forEach(entry => {
    if (entry.type === 'task') {
      totalEarnings += entry.rewardPerWorker * entry.workers.length;
      taskCount++;
    } else {
      totalEarnings += entry.totalEarned || 0;
      totalHours += entry.totalHours || 0;
    }
  });

  return {
    totalEarnings,
    totalHours,
    taskCount,
    avgPerTask: taskCount > 0 ? totalEarnings / taskCount : 0
  };
}

// =============================
// Loading State
// =============================
function showLoading(message = 'Loading...') {
  const mainContent = document.getElementById('mainContent');
  mainContent.innerHTML = `
    <div class="placeholder">
      <div class="placeholder-icon" style="animation: pulse 1.5s infinite;">⚡</div>
      <div class="placeholder-text">${message}</div>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.1); }
      }
    </style>
  `;
}

function hideLoading() {
  // Handled by render()
}

// =============================
// Utility Functions
// =============================
function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// Export functions to window for HTML onclick handlers
window.appState = appState;
window.navigateToPage = navigateToPage;
window.logoutAdmin = logoutAdmin;
window.isAdmin = isAdmin;
window.loadState = loadState;
window.render = render;
window.renderRecordCard = renderRecordCard;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
