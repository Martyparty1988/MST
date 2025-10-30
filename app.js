// ============================================
// MST - Marty Solar Tracker
// Main Application Controller
// ============================================

// =============================
// Constants & Configuration
// =============================
const ADMIN_PASSWORD = 'mst2025';
const ADMIN_SESSION_STORAGE_KEY = 'mst:adminSession';
const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const SECRET_CLICK_COUNT = 5;
const SECRET_CLICK_WINDOW = 3000; // 3 seconds

const NAVIGATION_PAGES = ['plan', 'records', 'stats', 'analytics', 'settings'];

// =============================
// Global State
// =============================
let appState = {
  workers: [],
  projects: [],
  workEntries: []
};

let currentPage = 'plan';
let adminSession = null;
let secretClickCount = 0;
let secretClickTimer = null;

// =============================
// Internationalization Helpers
// =============================
function translate(key, fallback = '') {
  if (window.i18n && typeof window.i18n.t === 'function') {
    const translated = window.i18n.t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }
  return fallback;
}

function applyTranslations() {
  if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
    window.i18n.applyTranslations();
  }
  if (window.i18n && typeof window.i18n.updateLanguageSelector === 'function') {
    window.i18n.updateLanguageSelector();
  }
}

// =============================
// Admin Session Handling
// =============================
function isAdminSessionActive() {
  return Boolean(adminSession && adminSession.expiresAt > Date.now());
}

function persistAdminSession() {
  if (adminSession) {
    localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(adminSession));
  }
}

function restoreAdminSession() {
  try {
    const saved = localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (parsed && parsed.expiresAt > Date.now()) {
      adminSession = parsed;
    } else {
      clearAdminSession();
    }
  } catch (error) {
    console.error('[Admin] Failed to restore session:', error);
    clearAdminSession();
  }
}

function clearAdminSession() {
  adminSession = null;
  localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
}

function logoutAdmin() {
  clearAdminSession();
  window.Toast?.info(
    translate('admin.loggedOut', 'Admin access removed.'),
    translate('messages.infoTitle', 'Info')
  );
  navigateTo('plan');
}

// =============================
// Formatting Helpers
// =============================
function formatCurrency(amount) {
  if (!Number.isFinite(amount)) return '0 CZK';
  return amount.toLocaleString('cs-CZ', { style: 'currency', currency: 'CZK' });
}

function formatDateTime(timestamp) {
  if (!timestamp) return translate('messages.noData', 'N/A');
  try {
    return new Date(timestamp).toLocaleString('cs-CZ', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (error) {
    return translate('messages.noData', 'N/A');
  }
}

function getProjectById(projectId) {
  return appState.projects.find(project => project.id === projectId) || null;
}

function getWorkerById(workerId) {
  return appState.workers.find(worker => worker.id === workerId) || null;
}

function calculateTotals() {
  const totals = {
    tasks: 0,
    hourly: 0,
    hours: 0,
    earnings: 0
  };

  appState.workEntries.forEach(entry => {
    if (entry.type === 'task') {
      totals.tasks += 1;
      const workersCount = entry.workers?.length || 0;
      totals.earnings += (entry.rewardPerWorker || 0) * workersCount;
    } else {
      totals.hourly += 1;
      totals.hours += entry.totalHours || 0;
      totals.earnings += entry.totalEarned || 0;
    }
  });

  return totals;
}

function getActiveProjects() {
  return appState.projects.filter(project => project.status !== 'completed');
}

// =============================
// Data Loading
// =============================
async function loadState() {
  try {
    const data = await window.IndexedDBService.loadAllData();
    appState.workers = Array.isArray(data.workers) ? data.workers : [];
    appState.projects = Array.isArray(data.projects) ? data.projects : [];
    appState.workEntries = Array.isArray(data.workEntries) ? data.workEntries : [];
  } catch (error) {
    console.error('[App] Failed to load state:', error);
    window.Toast?.error(
      translate('messages.dataLoadFailed', 'Unable to load stored data.'),
      translate('messages.errorTitle', 'Error')
    );
  }
}

// =============================
// Navigation & Routing
// =============================
function navigateTo(page) {
  currentPage = page;
  render();
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      if (!page) return;
      currentPage = page;
      render();
    });
  });
}

function updateNavigationState() {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    const page = item.dataset.page;
    if (!page) return;
    if (page === currentPage) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
}

function updatePageTitle() {
  const titleElement = document.getElementById('pageTitle');
  if (!titleElement) return;

  const translationKey = `navigation.${currentPage}`;
  const fallback = {
    plan: 'Plan',
    records: 'Records',
    stats: 'Stats',
    analytics: 'Analytics',
    settings: 'Settings',
    admin: 'Admin'
  }[currentPage] || 'MST';

  titleElement.setAttribute('data-i18n', translationKey);
  titleElement.textContent = translate(translationKey, fallback);
}

// =============================
// Secret Admin Access
// =============================
function setupSecretAccess() {
  const secretButton = document.getElementById('secretAdminButton');
  if (!secretButton) return;

  secretButton.addEventListener('click', () => {
    secretClickCount += 1;

    if (secretClickTimer) {
      clearTimeout(secretClickTimer);
    }

    secretClickTimer = setTimeout(() => {
      secretClickCount = 0;
    }, SECRET_CLICK_WINDOW);

    if (secretClickCount >= SECRET_CLICK_COUNT) {
      secretClickCount = 0;
      openAdminLoginModal();
    }
  });
}

function openAdminLoginModal() {
  const body = `
    <form id="adminLoginForm" class="form-stack">
      <div class="form-group">
        <label class="form-label" for="adminPassword" data-i18n="admin.passwordLabel">Admin password</label>
        <input type="password" class="form-control" id="adminPassword" autocomplete="current-password" required>
      </div>
      <p class="form-helper" data-i18n="admin.passwordHint">Hint: ask the MST lead.</p>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()" data-i18n="buttons.cancel">Cancel</button>
    <button class="btn btn-primary" onclick="window.submitAdminLogin()" data-i18n="admin.loginButton">Unlock</button>
  `;

  openModal(
    translate('admin.unlockTitle', 'Unlock admin tools'),
    body,
    footer
  );
  applyTranslations();
}

async function submitAdminLogin() {
  const passwordInput = document.getElementById('adminPassword');
  const password = passwordInput?.value || '';

  if (password !== ADMIN_PASSWORD) {
    window.Toast?.error(
      translate('admin.invalidPassword', 'Incorrect password.'),
      translate('messages.errorTitle', 'Error')
    );
    return;
  }

  adminSession = {
    token: `admin_${Date.now()}`,
    createdAt: Date.now(),
    expiresAt: Date.now() + ADMIN_SESSION_DURATION
  };
  persistAdminSession();
  closeModal();
  window.Toast?.success(
    translate('admin.unlocked', 'Admin dashboard unlocked.'),
    translate('messages.successTitle', 'Success')
  );
  navigateTo('admin');
}

// =============================
// Plan Page Rendering
// =============================
function renderPlanPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  const activeProjects = getActiveProjects();

  container.innerHTML = `
    <div class="page plan-page">
      <section class="page-section plan-hero">
        <div class="section-header">
          <h2 class="section-title" data-i18n="plan.heroTitle">Installation plans & documentation</h2>
          <p class="section-subtitle" data-i18n="plan.heroSubtitle">
            Keep the latest layout drawings at hand, annotate tasks and share updates with your crew.
          </p>
        </div>
        <div class="plan-actions">
          <label class="btn btn-primary">
            <input type="file" id="planFileInput" accept="application/pdf" hidden>
            <span data-i18n="plan.uploadLabel">Upload installation plan (PDF)</span>
          </label>
          <button class="btn btn-secondary" id="planRefreshStored" data-i18n="plan.refreshStored">Refresh stored plans</button>
          <button class="btn btn-secondary" id="planClearViewer" data-i18n="plan.clearViewer">Clear viewer</button>
        </div>
      </section>

      <section class="page-section plan-viewer">
        <div class="viewer-toolbar">
          <div class="toolbar-group">
            <button id="prev-page" class="btn-icon" title="Previous page">⟨</button>
            <span id="page-info" class="toolbar-label">Page 0 of 0</span>
            <button id="next-page" class="btn-icon" title="Next page">⟩</button>
            <label class="toolbar-input">
              <span data-i18n="plan.goToLabel">Go to</span>
              <input type="number" id="page-input" min="1" value="1">
            </label>
          </div>
          <div class="toolbar-group">
            <button id="zoom-out" class="btn-icon" title="Zoom out">-</button>
            <span id="zoom-level" class="toolbar-label">100%</span>
            <button id="zoom-in" class="btn-icon" title="Zoom in">+</button>
            <button id="zoom-reset" class="btn-icon" title="Reset zoom">↺</button>
          </div>
          <div class="toolbar-group">
            <button id="rotate-left" class="btn-icon" title="Rotate left">⟲</button>
            <button id="rotate-right" class="btn-icon" title="Rotate right">⟳</button>
            <button id="fullscreen-toggle" class="btn-icon" title="Fullscreen">⛶</button>
          </div>
        </div>
        <div id="pdf-viewer-container" class="pdf-viewer">
          <canvas id="pdf-canvas"></canvas>
        </div>
        <div class="stored-plans">
          <h3 class="section-title" data-i18n="plan.storedTitle">Stored PDFs</h3>
          <p class="section-subtitle" data-i18n="plan.storedSubtitle">
            Plans are saved in your browser for offline access.
          </p>
          <div id="storedPlansList" class="stored-plans-list"></div>
        </div>
      </section>

      <section class="page-section plan-projects">
        <h3 class="section-title" data-i18n="plan.projectsTitle">Active projects</h3>
        <div class="projects-grid">
          ${activeProjects.length === 0
            ? `<div class="empty-state" data-i18n="plan.noProjects">No active projects yet. Add one in Settings.</div>`
            : activeProjects.map(project => `
                <article class="project-card">
                  <header class="project-card-header">
                    <h4 class="project-card-title">${project.name}</h4>
                    <span class="project-status status-${project.status || 'active'}">${project.status || 'active'}</span>
                  </header>
                  <dl class="project-card-meta">
                    <div>
                      <dt data-i18n="plan.location">Location</dt>
                      <dd>${project.location || translate('messages.noData', 'N/A')}</dd>
                    </div>
                    <div>
                      <dt data-i18n="plan.schedule">Schedule</dt>
                      <dd>${project.startDate ? new Date(project.startDate).toLocaleDateString('cs-CZ') : '—'}
                        ${project.endDate ? `→ ${new Date(project.endDate).toLocaleDateString('cs-CZ')}` : ''}
                      </dd>
                    </div>
                  </dl>
                </article>
              `).join('')}
        </div>
      </section>
    </div>
  `;

  attachPlanPageEvents();
  applyTranslations();
}

function attachPlanPageEvents() {
  if (!window.PDFViewer) {
    console.warn('[Plan] PDFViewer module not available.');
    return;
  }

  const fileInput = document.getElementById('planFileInput');
  const refreshButton = document.getElementById('planRefreshStored');
  const clearButton = document.getElementById('planClearViewer');

  fileInput?.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) {
      window.PDFViewer.loadPdfFromFile(file).then(() => populateStoredPlans());
    }
  });

  refreshButton?.addEventListener('click', populateStoredPlans);
  clearButton?.addEventListener('click', () => window.PDFViewer.clearPdf());

  document.getElementById('prev-page')?.addEventListener('click', () => window.PDFViewer.prevPage());
  document.getElementById('next-page')?.addEventListener('click', () => window.PDFViewer.nextPage());
  document.getElementById('zoom-in')?.addEventListener('click', () => window.PDFViewer.zoomIn());
  document.getElementById('zoom-out')?.addEventListener('click', () => window.PDFViewer.zoomOut());
  document.getElementById('zoom-reset')?.addEventListener('click', () => window.PDFViewer.zoomReset());
  document.getElementById('rotate-left')?.addEventListener('click', () => window.PDFViewer.rotateCounterClockwise());
  document.getElementById('rotate-right')?.addEventListener('click', () => window.PDFViewer.rotateClockwise());
  document.getElementById('fullscreen-toggle')?.addEventListener('click', () => window.PDFViewer.toggleFullScreen());
  document.getElementById('page-input')?.addEventListener('change', event => {
    window.PDFViewer.goToPage(event.target.value);
  });

  populateStoredPlans();
}

async function populateStoredPlans() {
  const listContainer = document.getElementById('storedPlansList');
  if (!listContainer || !window.PDFViewer) return;

  listContainer.innerHTML = `<div class="loading" data-i18n="plan.loadingPlans">Loading stored plans…</div>`;
  applyTranslations();

  try {
    const stored = await window.PDFViewer.getStoredPdfs();

    if (!stored || stored.length === 0) {
      listContainer.innerHTML = `<div class="empty-state" data-i18n="plan.noStored">No stored PDFs yet.</div>`;
      applyTranslations();
      return;
    }

    listContainer.innerHTML = stored
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
      .map(item => `
        <div class="stored-plan-item">
          <div class="stored-plan-meta">
            <h4 class="stored-plan-title">${item.filename}</h4>
            <p class="stored-plan-details">
              ${new Date(item.uploadedAt).toLocaleString('cs-CZ')} • ${window.PDFViewer.formatFileSize(item.size || 0)}
            </p>
          </div>
          <div class="stored-plan-actions">
            <button class="btn-small" data-action="open" data-plan-id="${item.id}" data-i18n="plan.open">Open</button>
            <button class="btn-small btn-danger" data-action="delete" data-plan-id="${item.id}" data-i18n="plan.delete">Delete</button>
          </div>
        </div>
      `)
      .join('');

    listContainer.querySelectorAll('button[data-action="open"]').forEach(button => {
      button.addEventListener('click', async () => {
        const planId = Number(button.dataset.planId);
        const plan = stored.find(item => item.id === planId);
        if (!plan) return;
        await window.PDFViewer.loadPdfFromData(plan.data, plan.filename);
      });
    });

    listContainer.querySelectorAll('button[data-action="delete"]').forEach(button => {
      button.addEventListener('click', async () => {
        const planId = Number(button.dataset.planId);
        await window.PDFViewer.deletePdf(planId);
        populateStoredPlans();
      });
    });

    applyTranslations();
  } catch (error) {
    console.error('[Plan] Failed to load stored PDFs:', error);
    listContainer.innerHTML = `<div class="empty-state" data-i18n="plan.loadFailed">Unable to load stored plans.</div>`;
    applyTranslations();
  }
}

// =============================
// Records Page Rendering
// =============================
function renderRecordsPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  const totals = calculateTotals();
  const hasData = appState.workEntries.length > 0;

  container.innerHTML = `
    <div class="page records-page">
      <section class="page-section records-overview">
        <div class="records-header">
          <div>
            <h2 class="section-title" data-i18n="records.title">Work records</h2>
            <p class="section-subtitle" data-i18n="records.subtitle">Track daily installation progress and hourly work.</p>
          </div>
          <button class="btn btn-primary" onclick="showAddRecordModal()" data-i18n="records.addButton">Add record</button>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-label" data-i18n="records.statEarnings">Total earnings</span>
            <span class="stat-value">${formatCurrency(totals.earnings)}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label" data-i18n="records.statTasks">Task completions</span>
            <span class="stat-value">${totals.tasks}</span>
          </div>
          <div class="stat-card">
            <span class="stat-label" data-i18n="records.statHours">Hourly work</span>
            <span class="stat-value">${totals.hours.toFixed(1)} h</span>
          </div>
        </div>
      </section>

      <section class="page-section records-filters">
        <div class="filter-group">
          <label class="filter-control">
            <span data-i18n="records.filterProject">Project</span>
            <select id="filterProject" class="form-control">
              <option value="" data-i18n="records.filterAllProjects">All projects</option>
              ${appState.projects.map(project => `<option value="${project.id}">${project.name}</option>`).join('')}
            </select>
          </label>
          <label class="filter-control">
            <span data-i18n="records.filterType">Type</span>
            <select id="filterType" class="form-control">
              <option value="" data-i18n="records.filterAllTypes">All types</option>
              <option value="task" data-i18n="records.filterTasks">Task entries</option>
              <option value="hourly" data-i18n="records.filterHourly">Hourly entries</option>
            </select>
          </label>
          <button class="btn btn-secondary" onclick="window.filterRecords()" data-i18n="records.applyFilters">Apply filters</button>
        </div>
      </section>

      <section class="page-section records-list" id="recordsListSection">
        ${hasData
          ? '<div id="recordsList" class="records-grid"></div>'
          : `<div class="empty-state" data-i18n="records.empty">No records yet. Add your first record to start tracking.</div>`}
      </section>
    </div>
  `;

  if (hasData) {
    renderRecordsList();
    document.getElementById('filterProject')?.addEventListener('change', window.filterRecords);
    document.getElementById('filterType')?.addEventListener('change', window.filterRecords);
  }

  applyTranslations();
}

function renderRecordsList() {
  const recordsList = document.getElementById('recordsList');
  if (!recordsList) return;

  const sorted = [...appState.workEntries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  recordsList.innerHTML = sorted.map(entry => renderRecordCard(entry)).join('');
}

function renderRecordCard(entry) {
  const project = getProjectById(entry.projectId);
  const projectName = project ? project.name : translate('records.unknownProject', 'Unknown project');
  const timestamp = formatDateTime(entry.timestamp);

  if (entry.type === 'task') {
    const workers = (entry.workers || []).map(workerRef => {
      const worker = getWorkerById(workerRef.workerId);
      return worker ? `${worker.name} (${worker.workerCode})` : workerRef.workerCode;
    }).join(', ');
    const totalReward = (entry.rewardPerWorker || 0) * (entry.workers?.length || 0);

    return `
      <article class="record-card record-card-task">
        <header class="record-card-header">
          <span class="record-type">${translate('records.taskType', 'Task')}</span>
          <time class="record-time">${timestamp}</time>
        </header>
        <div class="record-body">
          <h4 class="record-title">${projectName}</h4>
          <dl class="record-details">
            <div>
              <dt data-i18n="records.table">Table</dt>
              <dd>${entry.tableNumber || '—'}</dd>
            </div>
            <div>
              <dt data-i18n="records.workers">Workers</dt>
              <dd>${workers || translate('records.noWorkers', 'No workers assigned')}</dd>
            </div>
            <div>
              <dt data-i18n="records.rewardPerWorker">Reward / worker</dt>
              <dd>${formatCurrency(entry.rewardPerWorker || 0)}</dd>
            </div>
            <div>
              <dt data-i18n="records.totalEarned">Total</dt>
              <dd>${formatCurrency(totalReward)}</dd>
            </div>
          </dl>
        </div>
        <footer class="record-actions">
          <button class="btn-small btn-danger" onclick="deleteRecord('${entry.id}')" data-i18n="buttons.delete">Delete</button>
        </footer>
      </article>
    `;
  }

  const worker = getWorkerById(entry.workerId);
  return `
    <article class="record-card record-card-hourly">
      <header class="record-card-header">
        <span class="record-type">${translate('records.hourlyType', 'Hourly')}</span>
        <time class="record-time">${timestamp}</time>
      </header>
      <div class="record-body">
        <h4 class="record-title">${projectName}</h4>
        <dl class="record-details">
          <div>
            <dt data-i18n="records.worker">Worker</dt>
            <dd>${worker ? `${worker.name} (${worker.workerCode})` : translate('records.noWorkers', 'No workers assigned')}</dd>
          </div>
          <div>
            <dt data-i18n="records.hours">Hours</dt>
            <dd>${(entry.totalHours || 0).toFixed(2)} h</dd>
          </div>
          <div>
            <dt data-i18n="records.totalEarned">Total</dt>
            <dd>${formatCurrency(entry.totalEarned || 0)}</dd>
          </div>
        </dl>
      </div>
      <footer class="record-actions">
        <button class="btn-small btn-danger" onclick="deleteRecord('${entry.id}')" data-i18n="buttons.delete">Delete</button>
      </footer>
    </article>
  `;
}

// Expose for CRUD module
window.renderRecordCard = renderRecordCard;

// =============================
// Stats Page Rendering
// =============================
function renderStatsPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  const totals = calculateTotals();
  const hasData = appState.workEntries.length > 0;

  const averageEarnings = appState.workEntries.length > 0
    ? totals.earnings / appState.workEntries.length
    : 0;

  container.innerHTML = `
    <div class="page stats-page">
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title" data-i18n="stats.title">Performance overview</h2>
          <p class="section-subtitle" data-i18n="stats.subtitle">Understand productivity trends across the crew.</p>
        </div>
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-label" data-i18n="stats.totalEarnings">Total earnings</span>
            <span class="stat-value">${formatCurrency(totals.earnings)}</span>
            <span class="stat-footnote" data-i18n="stats.avgPerEntry">${formatCurrency(averageEarnings)} avg / entry</span>
          </div>
          <div class="stat-card">
            <span class="stat-label" data-i18n="stats.taskCompletion">Task completions</span>
            <span class="stat-value">${totals.tasks}</span>
            <span class="stat-footnote" data-i18n="stats.totalEntries">${appState.workEntries.length} entries</span>
          </div>
          <div class="stat-card">
            <span class="stat-label" data-i18n="stats.hoursTracked">Tracked hours</span>
            <span class="stat-value">${totals.hours.toFixed(1)} h</span>
            <span class="stat-footnote" data-i18n="stats.hourlyEntries">${totals.hourly} hourly entries</span>
          </div>
        </div>
      </section>

      <section class="page-section charts-section">
        ${hasData
          ? `
            <div class="chart-grid">
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="stats.earningsOverTime">Earnings over time</h3>
                <canvas id="earningsChart" height="260"></canvas>
              </div>
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="stats.workerComparison">Worker comparison</h3>
                <canvas id="workerComparisonChart" height="260"></canvas>
              </div>
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="stats.projectBreakdown">Project breakdown</h3>
                <canvas id="projectBreakdownChart" height="260"></canvas>
              </div>
            </div>
          `
          : `<div class="empty-state" data-i18n="stats.noData">Add work records to unlock analytics.</div>`}
      </section>
    </div>
  `;

  if (window.Charts && typeof window.Charts.destroyAllCharts === 'function') {
    window.Charts.destroyAllCharts();
  }

  if (hasData && window.Charts && typeof window.Charts.initializeStatsCharts === 'function') {
    window.Charts.initializeStatsCharts(appState);
  }

  applyTranslations();
}

// =============================
// Analytics Page Rendering
// =============================
function renderAnalyticsPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  const hasData = appState.workEntries.length > 0;
  const goals = window.Analytics.getGoalsWithProgress(appState.workEntries);
  const metrics = window.Analytics.calculatePerformanceMetrics(appState);
  const insights = window.Analytics.getPerformanceInsights(metrics);

  container.innerHTML = `
    <div class="page analytics-page">
      <section class="page-section">
        <div class="section-header">
          <h2 class="section-title" data-i18n="analytics.title">Smart insights</h2>
          <p class="section-subtitle" data-i18n="analytics.subtitle">Goals, trends and quality metrics powered by your data.</p>
        </div>
        <div class="analytics-score">
          <div class="score-ring" aria-label="Overall performance score">
            <span class="score-value">${Math.round(metrics.overallScore)}</span>
          </div>
          <div class="score-text">
            <h3 data-i18n="analytics.overallScore">Overall score</h3>
            <p data-i18n="analytics.overallDescription">Composite of productivity, consistency and growth indicators.</p>
          </div>
        </div>
      </section>

      <section class="page-section goals-section">
        <h3 class="section-title" data-i18n="analytics.goalsTitle">Team goals</h3>
        <div class="goals-grid">
          ${goals.map(goal => {
            const progress = goal.progress;
            const percentage = Math.min(100, Math.round(progress.percentage));
            return `
              <article class="goal-card ${progress.achieved ? 'goal-achieved' : ''}">
                <header class="goal-card-header">
                  <span class="goal-icon">${goal.icon || '🎯'}</span>
                  <div>
                    <h4 class="goal-title">${goal.name || goal.id}</h4>
                    <p class="goal-period">${goal.period}</p>
                  </div>
                </header>
                <div class="goal-progress">
                  <div class="goal-progress-bar">
                    <span style="width: ${percentage}%"></span>
                  </div>
                  <div class="goal-progress-values">
                    <span>${progress.current.toLocaleString('cs-CZ')}</span>
                    <span>/ ${progress.target.toLocaleString('cs-CZ')}</span>
                  </div>
                </div>
                <p class="goal-status">
                  ${progress.achieved
                    ? translate('analytics.goalAchieved', 'Goal achieved!')
                    : `${translate('analytics.remaining', 'Remaining')}: ${progress.remaining.toLocaleString('cs-CZ')}`}
                </p>
              </article>
            `;
          }).join('')}
        </div>
      </section>

      <section class="page-section insights-section">
        <h3 class="section-title" data-i18n="analytics.insightsTitle">Performance insights</h3>
        ${insights.length === 0
          ? `<div class="empty-state" data-i18n="analytics.noInsights">No insights yet. Keep adding data.</div>`
          : `<div class="insights-grid">
              ${insights.map(insight => `
                <article class="insight-card insight-${insight.type}">
                  <div class="insight-icon">${insight.icon}</div>
                  <div class="insight-body">
                    <h4 class="insight-title">${insight.title}</h4>
                    <p class="insight-text">${insight.message}</p>
                  </div>
                </article>
              `).join('')}
            </div>`}
      </section>

      <section class="page-section charts-section">
        ${hasData
          ? `
            <div class="chart-grid">
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="analytics.performanceRadar">Worker performance radar</h3>
                <canvas id="performanceRadar" height="260"></canvas>
              </div>
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="analytics.correlation">Hours vs earnings</h3>
                <canvas id="correlationScatter" height="260"></canvas>
              </div>
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="analytics.timeDistribution">Time distribution</h3>
                <canvas id="timeStacked" height="260"></canvas>
              </div>
              <div class="chart-card">
                <h3 class="chart-title" data-i18n="analytics.trend">Earnings forecast</h3>
                <canvas id="trendPrediction" height="260"></canvas>
              </div>
            </div>
          `
          : `<div class="empty-state" data-i18n="analytics.noData">Add more records to generate advanced analytics.</div>`}
      </section>
    </div>
  `;

  if (window.AdvancedCharts && typeof window.AdvancedCharts.destroyAdvancedCharts === 'function') {
    window.AdvancedCharts.destroyAdvancedCharts();
  }

  if (hasData && window.AdvancedCharts) {
    window.AdvancedCharts.createPerformanceRadarChart('performanceRadar', appState.workEntries, appState.workers);
    window.AdvancedCharts.createCorrelationScatterChart('correlationScatter', appState.workEntries);
    window.AdvancedCharts.createTimeStackedBarChart('timeStacked', appState.workEntries, appState.projects);
    window.AdvancedCharts.createTrendPredictionChart('trendPrediction', appState.workEntries);
  }

  applyTranslations();
}

// =============================
// Settings Page Rendering
// =============================
function renderSettingsPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  container.innerHTML = `
    <div class="page settings-page">
      <section class="settings-section">
        <h3 data-i18n="settings.language.title">Language</h3>
        <p class="settings-description" data-i18n="settings.language.info">Your language preference is saved for future visits.</p>
        <div class="lang-switcher">
          <button type="button" class="lang-button" data-lang-btn="cs" onclick="switchLanguage('cs')">
            <span data-i18n="settings.language.czech">Čeština</span>
          </button>
          <button type="button" class="lang-button" data-lang-btn="en" onclick="switchLanguage('en')">
            <span data-i18n="settings.language.english">English</span>
          </button>
        </div>
      </section>

      <section class="settings-section">
        <header class="settings-header">
          <div>
            <h3 data-i18n="settings.workers.title">Workers</h3>
            <p class="settings-description" data-i18n="settings.workers.subtitle">Maintain crew details, color coding and hourly rates.</p>
          </div>
          <button class="btn btn-secondary" onclick="showAddWorkerModal()" data-i18n="settings.workers.add">Add worker</button>
        </header>
        <div class="settings-grid">
          ${appState.workers.length === 0
            ? `<div class="empty-state" data-i18n="settings.workers.empty">No workers yet.</div>`
            : appState.workers.map(worker => `
                <article class="settings-card">
                  <header class="settings-card-header">
                    <div class="worker-color" style="background:${worker.color}"></div>
                    <div>
                      <h4 class="settings-card-title">${worker.name}</h4>
                      <p class="settings-card-subtitle">${worker.workerCode}</p>
                    </div>
                  </header>
                  <dl class="settings-card-body">
                    <div>
                      <dt data-i18n="settings.workers.hourlyRate">Hourly rate</dt>
                      <dd>${formatCurrency(worker.hourlyRate || 0)}</dd>
                    </div>
                    <div>
                      <dt data-i18n="settings.workers.created">Created</dt>
                      <dd>${worker.createdAt ? new Date(worker.createdAt).toLocaleDateString('cs-CZ') : '—'}</dd>
                    </div>
                  </dl>
                  <footer class="settings-card-actions">
                    <button class="btn-small" onclick="editWorker('${worker.id}')" data-i18n="buttons.edit">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteWorker('${worker.id}')" data-i18n="buttons.delete">Delete</button>
                  </footer>
                </article>
              `).join('')}
        </div>
      </section>

      <section class="settings-section">
        <header class="settings-header">
          <div>
            <h3 data-i18n="settings.projects.title">Projects</h3>
            <p class="settings-description" data-i18n="settings.projects.subtitle">Track solar sites, locations and status.</p>
          </div>
          <button class="btn btn-secondary" onclick="showAddProjectModal()" data-i18n="settings.projects.add">Add project</button>
        </header>
        <div class="settings-grid">
          ${appState.projects.length === 0
            ? `<div class="empty-state" data-i18n="settings.projects.empty">No projects yet.</div>`
            : appState.projects.map(project => `
                <article class="settings-card">
                  <header class="settings-card-header">
                    <div>
                      <h4 class="settings-card-title">${project.name}</h4>
                      <p class="settings-card-subtitle">${project.location || translate('messages.noData', 'N/A')}</p>
                    </div>
                    <span class="project-status status-${project.status || 'active'}">${project.status || 'active'}</span>
                  </header>
                  <dl class="settings-card-body">
                    <div>
                      <dt data-i18n="settings.projects.schedule">Schedule</dt>
                      <dd>
                        ${project.startDate ? new Date(project.startDate).toLocaleDateString('cs-CZ') : '—'}
                        ${project.endDate ? `→ ${new Date(project.endDate).toLocaleDateString('cs-CZ')}` : ''}
                      </dd>
                    </div>
                  </dl>
                  <footer class="settings-card-actions">
                    <button class="btn-small" onclick="editProject('${project.id}')" data-i18n="buttons.edit">Edit</button>
                    <button class="btn-small btn-danger" onclick="deleteProject('${project.id}')" data-i18n="buttons.delete">Delete</button>
                  </footer>
                </article>
              `).join('')}
        </div>
      </section>

      <section class="settings-section">
        <h3 data-i18n="settings.data.title">Data management</h3>
        <p class="settings-description" data-i18n="settings.data.subtitle">Backup your data regularly and restore if needed.</p>
        <div class="data-actions">
          <button class="btn btn-secondary" onclick="exportData()" data-i18n="settings.data.exportJson">Export JSON</button>
          <button class="btn btn-secondary" onclick="exportCSV()" data-i18n="settings.data.exportCsv">Export CSV</button>
          <button class="btn btn-secondary" onclick="importData()" data-i18n="settings.data.import">Import data</button>
        </div>
        <div class="data-meta">
          <div>
            <span class="meta-label" data-i18n="settings.data.lastBackup">Last backup</span>
            <span class="meta-value" id="lastBackupMeta">${renderLastBackupInfo()}</span>
          </div>
          <div>
            <span class="meta-label" data-i18n="settings.data.entries">Entries</span>
            <span class="meta-value">${appState.workEntries.length}</span>
          </div>
        </div>
      </section>

      <section class="settings-section admin-shortcut">
        <h3 data-i18n="settings.admin.title">Admin dashboard</h3>
        <p data-i18n="settings.admin.subtitle">Click the sun logo 5× to unlock advanced backup tooling.</p>
        ${isAdminSessionActive()
          ? `<button class="btn btn-danger" onclick="logoutAdmin()" data-i18n="settings.admin.logout">Logout admin</button>`
          : `<button class="btn btn-secondary" onclick="openAdminLoginModal()" data-i18n="settings.admin.login">Unlock admin</button>`}
      </section>
    </div>
  `;

  applyTranslations();
}

function renderLastBackupInfo() {
  try {
    const metaRaw = localStorage.getItem('mst:autoBackup:index');
    if (!metaRaw) return translate('messages.noData', 'N/A');
    const meta = JSON.parse(metaRaw);
    if (!meta.lastBackupAt) return translate('messages.noData', 'N/A');
    return new Date(meta.lastBackupAt).toLocaleString('cs-CZ');
  } catch (error) {
    return translate('messages.noData', 'N/A');
  }
}

// =============================
// Admin Page Rendering
// =============================
function renderAdminPage() {
  const container = document.getElementById('mainContent');
  if (!container) return;

  if (!isAdminSessionActive()) {
    container.innerHTML = `
      <div class="admin-locked">
        <h3 data-i18n="admin.lockedTitle">Admin dashboard locked</h3>
        <p data-i18n="admin.lockedDescription">Use the hidden gesture (tap the sun icon five times) to unlock advanced tools.</p>
        <button class="btn btn-secondary" onclick="openAdminLoginModal()" data-i18n="admin.loginButton">Unlock</button>
      </div>
    `;
    applyTranslations();
    return;
  }

  container.innerHTML = `
    <div class="page admin-page">
      <section class="page-section admin-header">
        <div>
          <h2 class="section-title" data-i18n="admin.title">Admin dashboard</h2>
          <p class="section-subtitle" data-i18n="admin.subtitle">Manage backups, verify storage health and troubleshoot sync.</p>
        </div>
        <button class="btn btn-danger" onclick="logoutAdmin()" data-i18n="settings.admin.logout">Logout admin</button>
      </section>
      <section class="page-section" id="adminPanelContainer">
        <div class="loading" data-i18n="admin.loading">Loading backup overview…</div>
      </section>
    </div>
  `;
  applyTranslations();

  if (!window.AdminBackupPanel || typeof window.AdminBackupPanel.renderAdminBackupPanel !== 'function') {
    document.getElementById('adminPanelContainer').innerHTML = `<div class="empty-state" data-i18n="admin.unavailable">Admin module not available.</div>`;
    applyTranslations();
    return;
  }

  window.AdminBackupPanel.renderAdminBackupPanel()
    .then(html => {
      const panelContainer = document.getElementById('adminPanelContainer');
      if (panelContainer) {
        panelContainer.innerHTML = html;
        applyTranslations();
      }
    })
    .catch(error => {
      console.error('[Admin] Failed to render backup panel:', error);
      const panelContainer = document.getElementById('adminPanelContainer');
      if (panelContainer) {
        panelContainer.innerHTML = `<div class="empty-state" data-i18n="admin.loadFailed">Unable to load admin tools.</div>`;
        applyTranslations();
      }
    });
}

// =============================
// Rendering Orchestrator
// =============================
function render() {
  updateNavigationState();
  updatePageTitle();

  switch (currentPage) {
    case 'plan':
      renderPlanPage();
      break;
    case 'records':
      renderRecordsPage();
      break;
    case 'stats':
      renderStatsPage();
      break;
    case 'analytics':
      renderAnalyticsPage();
      break;
    case 'settings':
      renderSettingsPage();
      break;
    case 'admin':
      renderAdminPage();
      break;
    default:
      currentPage = 'plan';
      renderPlanPage();
  }
}

// =============================
// Language Switching
// =============================
async function switchLanguage(lang) {
  if (!window.i18n || typeof window.i18n.setLanguage !== 'function') {
    return;
  }

  try {
    await window.i18n.setLanguage(lang);
    render();
    window.Toast?.success(
      window.i18n.t('messages.languageChanged') || 'Language changed successfully',
      window.i18n.t('messages.successTitle') || 'Success'
    );
  } catch (error) {
    console.error('[i18n] Failed to switch language:', error);
    window.Toast?.error(
      window.i18n.t('messages.languageChangeFailed') || 'Failed to change language',
      window.i18n.t('messages.errorTitle') || 'Error'
    );
  }
}

// =============================
// Initialization
// =============================
async function init() {
  try {
    showLoading(translate('messages.loading', 'Loading…'));

    if (window.IndexedDBService && typeof window.IndexedDBService.initDB === 'function') {
      await window.IndexedDBService.initDB();
      if (typeof window.IndexedDBService.initMeta === 'function') {
        await window.IndexedDBService.initMeta();
      }
    }

    if (window.i18n && typeof window.i18n.initLanguage === 'function') {
      await window.i18n.initLanguage();
    }

    await loadState();
    restoreAdminSession();
    setupNavigation();
    setupSecretAccess();

    window.addEventListener('languageChanged', () => render());

    render();
  } catch (error) {
    console.error('[App] Initialization failed:', error);
    window.Toast?.error(
      translate('messages.initFailed', 'Application failed to initialise.'),
      translate('messages.errorTitle', 'Error')
    );
  } finally {
    hideLoading();
  }
}

// =============================
// Global Exports
// =============================
window.appState = appState;
window.render = render;
window.loadState = loadState;
window.switchLanguage = switchLanguage;
window.submitAdminLogin = submitAdminLogin;
window.logoutAdmin = logoutAdmin;
window.navigateTo = navigateTo;

// =============================
// Start Application
// =============================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
