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
    analytics: 'Analytics',
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

  // Destroy existing charts before rendering new page
  if (window.Charts) {
    window.Charts.destroyAllCharts();
  }

  switch (currentPage) {
    case 'plan':
      mainContent.innerHTML = renderPlanPage();
      break;
    case 'records':
      mainContent.innerHTML = renderRecordsPage();
      break;
    case 'stats':
      mainContent.innerHTML = renderStatsPage();
      // Initialize charts after rendering
      if (window.Charts && appState.workEntries.length > 0) {
        window.Charts.initializeStatsCharts(appState);
      }
      break;
    case 'analytics':
      mainContent.innerHTML = renderAnalyticsPage();
      // Initialize advanced charts after rendering
      setTimeout(() => {
        if (window.AdvancedCharts && appState.workEntries.length > 0) {
          initializeAnalyticsCharts();
        }
      }, 100);
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

  if (appState.workEntries.length === 0) {
    return `
      <div class="section">
        <div class="kpi-grid">
          <div class="kpi-card primary">
            <div class="kpi-label">Total Earnings</div>
            <div class="kpi-value">0 CZK</div>
          </div>
          <div class="kpi-card accent">
            <div class="kpi-label">Total Hours</div>
            <div class="kpi-value">0h</div>
          </div>
          <div class="kpi-card secondary">
            <div class="kpi-label">Total Tasks</div>
            <div class="kpi-value">0</div>
          </div>
          <div class="kpi-card warning">
            <div class="kpi-label">Avg Earnings/Task</div>
            <div class="kpi-value">0 CZK</div>
          </div>
        </div>

        <div class="empty-state" style="margin-top: 40px;">
          <div class="empty-state-icon">📊</div>
          <div class="empty-state-text">No data to visualize yet</div>
          <p style="margin-top: 16px; color: var(--text-secondary);">
            Add some work records to see beautiful charts and analytics!
          </p>
          <button class="btn btn-primary" onclick="navigateToPage('records')" style="margin-top: 20px;">
            Go to Records
          </button>
        </div>
      </div>
    `;
  }

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

      <!-- Earnings Over Time Chart -->
      <div class="chart-container">
        <canvas id="earningsChart"></canvas>
      </div>

      <!-- Two-column layout for additional charts -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 24px; margin-top: 24px;">
        <!-- Worker Comparison Chart -->
        <div class="chart-container" style="height: 350px;">
          <canvas id="workerComparisonChart"></canvas>
        </div>

        <!-- Project Breakdown Chart -->
        <div class="chart-container" style="height: 350px;">
          <canvas id="projectBreakdownChart"></canvas>
        </div>
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
// Analytics Page
// =============================
function renderAnalyticsPage() {
  if (appState.workEntries.length === 0) {
    return `
      <div class="section">
        <div class="empty-state" style="margin-top: 40px;">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">No data for analytics yet</div>
          <p style="margin-top: 16px; color: var(--text-secondary);">
            Add some work records to see advanced analytics, goals, and predictions!
          </p>
          <button class="btn btn-primary" onclick="navigateToPage('records')" style="margin-top: 20px;">
            Go to Records
          </button>
        </div>
      </div>
    `;
  }

  // Get goals with progress
  const goalsWithProgress = window.Analytics.getGoalsWithProgress(appState.workEntries);

  // Calculate performance metrics
  const metrics = window.Analytics.calculatePerformanceMetrics(appState);

  // Get insights
  const insights = window.Analytics.getPerformanceInsights(metrics);

  return `
    <div class="section animated-gradient-bg">
      <!-- Export Buttons -->
      <div class="export-btn-group">
        <button class="export-btn" onclick="window.ChartExport.exportAllChartsAsPNG()">
          📥 Export All Charts
        </button>
        <button class="export-btn" onclick="window.ChartExport.exportPDFReport()">
          📄 Generate PDF Report
        </button>
      </div>

      <div class="section-divider"></div>

      <!-- Goals Section -->
      <div class="section-header">
        <h2 class="section-title">🎯 Goals</h2>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 32px;">
        ${goalsWithProgress.map(goal => renderGoalCard(goal)).join('')}
      </div>

      <div class="section-divider"></div>

      <!-- Performance Metrics -->
      <div class="section-header">
        <h2 class="section-title">📈 Performance Metrics</h2>
      </div>
      <div class="performance-grid">
        <div class="metric-card velocity">
          <div class="metric-label">Tasks Per Day</div>
          <div class="metric-value">${metrics.velocity.tasksPerDay.toFixed(1)}</div>
        </div>
        <div class="metric-card velocity">
          <div class="metric-label">Earnings Per Day</div>
          <div class="metric-value">${metrics.velocity.earningsPerDay.toFixed(0)} CZK</div>
        </div>
        <div class="metric-card efficiency">
          <div class="metric-label">Earnings Per Hour</div>
          <div class="metric-value">${metrics.efficiency.earningsPerHour.toFixed(0)} CZK</div>
        </div>
        <div class="metric-card efficiency">
          <div class="metric-label">Earnings Per Task</div>
          <div class="metric-value">${metrics.efficiency.earningsPerTask.toFixed(0)} CZK</div>
        </div>
        <div class="metric-card consistency">
          <div class="metric-label">Consistency Score</div>
          <div class="metric-value">${metrics.consistency.earningsConsistency.toFixed(0)}%</div>
        </div>
        <div class="metric-card growth">
          <div class="metric-label">Earnings Growth</div>
          <div class="metric-value">${metrics.growth.earningsGrowth > 0 ? '+' : ''}${metrics.growth.earningsGrowth.toFixed(1)}%</div>
        </div>
        <div class="metric-card overall">
          <div class="metric-label">Overall Score</div>
          <div class="metric-value">${metrics.overallScore.toFixed(0)}/100</div>
        </div>
      </div>

      ${insights.length > 0 ? `
        <div class="insights-panel">
          <div class="insights-title">💡 Insights & Recommendations</div>
          ${insights.map(insight => `
            <div class="insight-item ${insight.type}">
              <div class="insight-icon">${insight.icon}</div>
              <div class="insight-content">
                <div class="insight-title-text">${insight.title}</div>
                <div class="insight-message">${insight.message}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="section-divider"></div>

      <!-- Advanced Charts -->
      <div class="section-header">
        <h2 class="section-title">📊 Advanced Charts</h2>
      </div>

      <!-- Performance Radar Chart -->
      <div class="advanced-chart-container">
        <div class="chart-header">
          <div class="chart-title">Worker Performance Radar</div>
          <div class="chart-actions">
            <button class="chart-btn" onclick="window.ChartExport.exportChartAsPNG('performanceRadarChart', 'worker-performance')">
              📥 Export
            </button>
            <button class="chart-btn" onclick="window.ChartExport.shareChart('performanceRadarChart', 'Worker Performance')">
              🔗 Share
            </button>
          </div>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="performanceRadarChart"></canvas>
        </div>
      </div>

      <!-- Correlation Scatter Chart -->
      <div class="advanced-chart-container">
        <div class="chart-header">
          <div class="chart-title">Hours vs Earnings Correlation</div>
          <div class="chart-actions">
            <button class="chart-btn" onclick="window.ChartExport.exportChartAsPNG('correlationScatterChart', 'hours-earnings-correlation')">
              📥 Export
            </button>
            <button class="chart-btn" onclick="window.ChartExport.shareChart('correlationScatterChart', 'Hours vs Earnings')">
              🔗 Share
            </button>
          </div>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="correlationScatterChart"></canvas>
        </div>
      </div>

      <!-- Time Stacked Bar Chart -->
      <div class="advanced-chart-container">
        <div class="chart-header">
          <div class="chart-title">Monthly Earnings by Project</div>
          <div class="chart-actions">
            <button class="chart-btn" onclick="window.ChartExport.exportChartAsPNG('timeStackedBarChart', 'monthly-earnings')">
              📥 Export
            </button>
            <button class="chart-btn" onclick="window.ChartExport.shareChart('timeStackedBarChart', 'Monthly Earnings')">
              🔗 Share
            </button>
          </div>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="timeStackedBarChart"></canvas>
        </div>
      </div>

      <!-- Trend Prediction Chart -->
      <div class="advanced-chart-container">
        <div class="chart-header">
          <div class="chart-title">Earnings Trend & Prediction</div>
          <div class="chart-actions">
            <button class="chart-btn" onclick="window.ChartExport.exportChartAsPNG('trendPredictionChart', 'earnings-prediction')">
              📥 Export
            </button>
            <button class="chart-btn" onclick="window.ChartExport.shareChart('trendPredictionChart', 'Earnings Prediction')">
              🔗 Share
            </button>
          </div>
        </div>
        <div class="chart-canvas-wrapper">
          <canvas id="trendPredictionChart"></canvas>
        </div>
      </div>
    </div>
  `;
}

function renderGoalCard(goalWithProgress) {
  const { id, name, icon, type, target, period, progress } = goalWithProgress;
  const percentage = Math.min(100, progress.percentage);

  return `
    <div class="goal-card">
      <div class="goal-card-header">
        <div>
          <div class="goal-icon">${icon}</div>
          <div class="goal-title">${name}</div>
          <div class="goal-period">${period}</div>
        </div>
        <div class="goal-percentage">${percentage.toFixed(0)}%</div>
      </div>
      <div class="goal-progress-bar">
        <div class="goal-progress-fill" style="width: ${percentage}%"></div>
      </div>
      <div class="goal-stats">
        <div>
          <div class="goal-current">${progress.current.toFixed(type === 'hours' ? 1 : 0)}</div>
          <div class="goal-target">of ${target} ${type === 'earnings' ? 'CZK' : type === 'hours' ? 'hours' : 'tasks'}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; color: var(--text-secondary);">Remaining</div>
          <div style="font-size: 16px; font-weight: 600; color: var(--mst-warning);">${progress.remaining.toFixed(type === 'hours' ? 1 : 0)}</div>
        </div>
      </div>
    </div>
  `;
}

function initializeAnalyticsCharts() {
  try {
    // Performance Radar Chart
    window.AdvancedCharts.createPerformanceRadarChart(
      'performanceRadarChart',
      appState.workEntries,
      appState.workers
    );

    // Correlation Scatter Chart
    window.AdvancedCharts.createCorrelationScatterChart(
      'correlationScatterChart',
      appState.workEntries,
      appState.workers
    );

    // Time Stacked Bar Chart
    window.AdvancedCharts.createTimeStackedBarChart(
      'timeStackedBarChart',
      appState.workEntries,
      appState.projects
    );

    // Trend Prediction Chart
    window.AdvancedCharts.createTrendPredictionChart(
      'trendPredictionChart',
      appState.workEntries
    );

    console.log('[Analytics] All charts initialized successfully');
  } catch (error) {
    console.error('[Analytics] Chart initialization failed:', error);
    window.Toast.error('Failed to initialize analytics charts', 'Chart Error');
  }
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
