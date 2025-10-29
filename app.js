// ==============================================
// MST - Marty Solar Tracker
// Solar Panel Installation Tracking App
// ==============================================

// App State (In-Memory Storage)
let appState = {
  workers: [],
  projects: [],
  workEntries: []
};

// Admin State
let adminSession = null;

// Secret Admin Button State
let clickCount = 0;
let clickTimestamps = [];

// Current Page State
let currentPage = 'plan';

// ==============================================
// INITIALIZATION
// ==============================================

function initializeApp() {
  // Initialize with default data
  initializeDefaultData();
  
  // Setup event listeners
  setupEventListeners();
  
  // Check admin session
  checkAdminSession();
  
  // Load initial page
  navigateToPage('plan');
}

function initializeDefaultData() {
  // Default Workers
  appState.workers = [
    {
      id: 'worker-1',
      name: 'Tomáš Novák',
      code: 'TN',
      hourlyRate: 25,
      color: '#0066ff'
    },
    {
      id: 'worker-2',
      name: 'Jana Svobodová',
      code: 'JS',
      hourlyRate: 28,
      color: '#00c9a7'
    }
  ];
  
  // Default Projects
  appState.projects = [
    {
      id: 'project-1',
      name: 'Solární instalace Vilnius 2025',
      createdAt: 1730174800000
    }
  ];
  
  // Default Work Entries
  appState.workEntries = [
    {
      id: 'entry-1',
      type: 'task',
      timestamp: 1730174800000,
      projectId: 'project-1',
      workers: [
        { workerId: 'worker-1', workerCode: 'TN' },
        { workerId: 'worker-2', workerCode: 'JS' }
      ],
      tableNumber: 'A-12',
      rewardPerWorker: 150
    },
    {
      id: 'entry-2',
      type: 'hourly',
      timestamp: 1730261200000,
      projectId: 'project-1',
      workerId: 'worker-1',
      totalHours: 8,
      totalEarned: 200
    },
    {
      id: 'entry-3',
      type: 'task',
      timestamp: 1730347600000,
      projectId: 'project-1',
      workers: [
        { workerId: 'worker-2', workerCode: 'JS' }
      ],
      tableNumber: 'B-05',
      rewardPerWorker: 180
    }
  ];
}

// ==============================================
// EVENT LISTENERS
// ==============================================

function setupEventListeners() {
  // Bottom navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateToPage(page);
    });
  });
  
  // Secret admin button (5x click detection)
  const adminButton = document.getElementById('secretAdminButton');
  adminButton.addEventListener('click', handleSecretAdminClick);
  
  // Modal overlay close
  const modalOverlay = document.getElementById('modalOverlay');
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
}

// ==============================================
// SECRET ADMIN ACCESS
// ==============================================

function handleSecretAdminClick() {
  const now = Date.now();
  clickTimestamps.push(now);
  
  // Remove clicks older than 3 seconds
  clickTimestamps = clickTimestamps.filter(timestamp => now - timestamp < 3000);
  
  // Check if 5 clicks within 3 seconds
  if (clickTimestamps.length >= 5) {
    clickTimestamps = [];
    promptAdminPassword();
  }
}

function promptAdminPassword() {
  const password = prompt('Zadejte admin heslo:');
  
  if (password === 'mst2025') {
    adminLogin();
  } else if (password !== null) {
    alert('Nesprávné heslo!');
  }
}

function adminLogin() {
  adminSession = {
    timestamp: Date.now(),
    role: 'admin'
  };
  
  alert('Přihlášení úspěšné! Přesměrování na admin panel...');
  navigateToPage('admin');
}

function adminLogout() {
  adminSession = null;
  alert('Odhlášení úspěšné!');
  navigateToPage('plan');
}

function checkAdminSession() {
  if (adminSession) {
    const now = Date.now();
    const sessionDuration = 28800000; // 8 hours
    
    if (now - adminSession.timestamp > sessionDuration) {
      adminSession = null;
    }
  }
}

function isAdminLoggedIn() {
  checkAdminSession();
  return adminSession !== null;
}

// ==============================================
// NAVIGATION
// ==============================================

function navigateToPage(page) {
  // Check admin access
  if (page === 'admin' && !isAdminLoggedIn()) {
    alert('Přístup odepřen! Nejprve se přihlaste jako admin.');
    return;
  }
  
  currentPage = page;
  
  // Update navigation
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.dataset.page === page) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
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
  document.getElementById('pageTitle').textContent = titles[page];
  
  // Load page content
  loadPageContent(page);
}

function loadPageContent(page) {
  const mainContent = document.getElementById('mainContent');
  
  switch (page) {
    case 'plan':
      mainContent.innerHTML = renderPlanPage();
      break;
    case 'records':
      mainContent.innerHTML = renderRecordsPage();
      attachRecordsEventListeners();
      break;
    case 'stats':
      mainContent.innerHTML = renderStatsPage();
      renderStatsChart();
      break;
    case 'settings':
      mainContent.innerHTML = renderSettingsPage();
      attachSettingsEventListeners();
      break;
    case 'admin':
      mainContent.innerHTML = renderAdminPage();
      attachAdminEventListeners();
      break;
  }
}

// ==============================================
// PLAN PAGE
// ==============================================

function renderPlanPage() {
  return `
    <div class="placeholder">
      <div class="placeholder-icon">📋</div>
      <h2 class="placeholder-text">PDF viewer bude přidán později</h2>
      <p style="color: var(--text-secondary); margin-top: 12px;">Projekt bude zobrazen zde</p>
    </div>
  `;
}

// ==============================================
// RECORDS PAGE
// ==============================================

function renderRecordsPage() {
  const entries = appState.workEntries.sort((a, b) => b.timestamp - a.timestamp);
  
  return `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Pracovní záznamy</h2>
        <div class="btn-group">
          <button class="btn btn-primary btn-small" onclick="openAddTaskModal()">+ Přidat Task</button>
          <button class="btn btn-accent btn-small" onclick="openAddHourlyModal()">+ Přidat Hodiny</button>
        </div>
      </div>
      
      ${entries.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p class="empty-state-text">Zatím žádné záznamy</p>
        </div>
      ` : entries.map(entry => renderRecordCard(entry)).join('')}
    </div>
  `;
}

function renderRecordCard(entry) {
  const date = new Date(entry.timestamp).toLocaleDateString('cs-CZ');
  const time = new Date(entry.timestamp).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const project = appState.projects.find(p => p.id === entry.projectId);
  
  if (entry.type === 'task') {
    const totalAmount = entry.rewardPerWorker * entry.workers.length;
    return `
      <div class="record-card">
        <div class="record-header">
          <span class="record-type task">Task</span>
          <span class="record-date">${date} ${time}</span>
        </div>
        <div class="record-body">
          <div class="record-detail"><strong>Stůl:</strong> ${entry.tableNumber}</div>
          <div class="record-detail"><strong>Projekt:</strong> ${project ? project.name : 'N/A'}</div>
          <div class="record-detail"><strong>Pracovníci:</strong> ${entry.workers.map(w => w.workerCode).join(', ')}</div>
          <div class="record-detail"><strong>Odměna/osoba:</strong> ${entry.rewardPerWorker} €</div>
          <div class="record-amount">${totalAmount} €</div>
        </div>
        <div class="record-footer">
          <button class="btn btn-secondary btn-small" onclick="deleteWorkEntry('${entry.id}')">Smazat</button>
        </div>
      </div>
    `;
  } else {
    const worker = appState.workers.find(w => w.id === entry.workerId);
    return `
      <div class="record-card">
        <div class="record-header">
          <span class="record-type hourly">Hourly</span>
          <span class="record-date">${date} ${time}</span>
        </div>
        <div class="record-body">
          <div class="record-detail"><strong>Projekt:</strong> ${project ? project.name : 'N/A'}</div>
          <div class="record-detail"><strong>Pracovník:</strong> ${worker ? worker.name : 'N/A'}</div>
          <div class="record-detail"><strong>Hodiny:</strong> ${entry.totalHours} h</div>
          <div class="record-amount">${entry.totalEarned} €</div>
        </div>
        <div class="record-footer">
          <button class="btn btn-secondary btn-small" onclick="deleteWorkEntry('${entry.id}')">Smazat</button>
        </div>
      </div>
    `;
  }
}

function attachRecordsEventListeners() {
  // Event listeners are attached via onclick in HTML
}

function openAddTaskModal() {
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Přidat Task záznam</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Projekt</label>
          <select class="form-select" id="taskProject">
            ${appState.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Číslo stolu</label>
          <input type="text" class="form-input" id="taskTableNumber" placeholder="Např. A-12">
        </div>
        <div class="form-group">
          <label class="form-label">Pracovníci</label>
          ${appState.workers.map(w => `
            <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; cursor: pointer;">
              <input type="checkbox" value="${w.id}" class="task-worker-checkbox" style="width: 20px; height: 20px;">
              <span>${w.name} (${w.code})</span>
            </label>
          `).join('')}
        </div>
        <div class="form-group">
          <label class="form-label">Odměna na pracovníka (€)</label>
          <input type="number" class="form-input" id="taskReward" placeholder="150">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveTaskEntry()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
}

function openAddHourlyModal() {
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Přidat hodinový záznam</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Projekt</label>
          <select class="form-select" id="hourlyProject">
            ${appState.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Pracovník</label>
          <select class="form-select" id="hourlyWorker">
            ${appState.workers.map(w => `<option value="${w.id}">${w.name} (${w.code})</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Počet hodin</label>
          <input type="number" class="form-input" id="hourlyHours" placeholder="8" step="0.5">
        </div>
        <div class="form-group">
          <label class="form-label">Celková částka (€)</label>
          <input type="number" class="form-input" id="hourlyEarned" placeholder="200">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveHourlyEntry()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
}

function saveTaskEntry() {
  const projectId = document.getElementById('taskProject').value;
  const tableNumber = document.getElementById('taskTableNumber').value;
  const rewardPerWorker = parseFloat(document.getElementById('taskReward').value);
  const workerCheckboxes = document.querySelectorAll('.task-worker-checkbox:checked');
  
  if (!tableNumber || !rewardPerWorker || workerCheckboxes.length === 0) {
    alert('Vyplňte všechna pole!');
    return;
  }
  
  const workers = Array.from(workerCheckboxes).map(cb => {
    const worker = appState.workers.find(w => w.id === cb.value);
    return { workerId: worker.id, workerCode: worker.code };
  });
  
  const entry = {
    id: 'entry-' + Date.now(),
    type: 'task',
    timestamp: Date.now(),
    projectId,
    workers,
    tableNumber,
    rewardPerWorker
  };
  
  appState.workEntries.push(entry);
  closeModal();
  navigateToPage('records');
}

function saveHourlyEntry() {
  const projectId = document.getElementById('hourlyProject').value;
  const workerId = document.getElementById('hourlyWorker').value;
  const totalHours = parseFloat(document.getElementById('hourlyHours').value);
  const totalEarned = parseFloat(document.getElementById('hourlyEarned').value);
  
  if (!totalHours || !totalEarned) {
    alert('Vyplňte všechna pole!');
    return;
  }
  
  const entry = {
    id: 'entry-' + Date.now(),
    type: 'hourly',
    timestamp: Date.now(),
    projectId,
    workerId,
    totalHours,
    totalEarned
  };
  
  appState.workEntries.push(entry);
  closeModal();
  navigateToPage('records');
}

function deleteWorkEntry(id) {
  if (confirm('Opravdu chcete smazat tento záznam?')) {
    appState.workEntries = appState.workEntries.filter(e => e.id !== id);
    navigateToPage('records');
  }
}

// ==============================================
// STATS PAGE
// ==============================================

function renderStatsPage() {
  const stats = calculateStats();
  
  return `
    <div class="kpi-grid">
      <div class="kpi-card primary">
        <div class="kpi-label">Celkové výdělky</div>
        <div class="kpi-value">${stats.totalEarnings.toFixed(0)} €</div>
      </div>
      <div class="kpi-card accent">
        <div class="kpi-label">Celkové hodiny</div>
        <div class="kpi-value">${stats.totalHours.toFixed(1)} h</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Dokončené stoly</div>
        <div class="kpi-value">${stats.completedTables}</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Průměrná odměna</div>
        <div class="kpi-value">${stats.avgReward.toFixed(0)} €</div>
      </div>
    </div>
    
    <div class="card">
      <h3 class="card-title">Výdělky podle pracovníků</h3>
      <div class="chart-container">
        <canvas id="statsChart"></canvas>
      </div>
    </div>
  `;
}

function calculateStats() {
  let totalEarnings = 0;
  let totalHours = 0;
  let completedTables = 0;
  
  appState.workEntries.forEach(entry => {
    if (entry.type === 'task') {
      totalEarnings += entry.rewardPerWorker * entry.workers.length;
      completedTables++;
    } else {
      totalEarnings += entry.totalEarned;
      totalHours += entry.totalHours;
    }
  });
  
  const avgReward = appState.workEntries.length > 0 ? totalEarnings / appState.workEntries.length : 0;
  
  return { totalEarnings, totalHours, completedTables, avgReward };
}

function renderStatsChart() {
  const ctx = document.getElementById('statsChart');
  if (!ctx) return;
  
  // Calculate earnings by worker
  const workerEarnings = {};
  
  appState.workers.forEach(worker => {
    workerEarnings[worker.id] = 0;
  });
  
  appState.workEntries.forEach(entry => {
    if (entry.type === 'task') {
      entry.workers.forEach(w => {
        if (workerEarnings[w.workerId] !== undefined) {
          workerEarnings[w.workerId] += entry.rewardPerWorker;
        }
      });
    } else if (entry.workerId) {
      if (workerEarnings[entry.workerId] !== undefined) {
        workerEarnings[entry.workerId] += entry.totalEarned;
      }
    }
  });
  
  const labels = appState.workers.map(w => w.name);
  const data = appState.workers.map(w => workerEarnings[w.id]);
  const colors = appState.workers.map(w => w.color);
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Výdělky (€)',
        data: data,
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#cbd5e1'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#cbd5e1'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

// ==============================================
// SETTINGS PAGE
// ==============================================

function renderSettingsPage() {
  return `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Pracovníci</h2>
        <button class="btn btn-primary btn-small" onclick="openAddWorkerModal()">+ Přidat pracovníka</button>
      </div>
      <div class="workers-grid">
        ${appState.workers.map(worker => renderWorkerCard(worker)).join('')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Projekty</h2>
        <button class="btn btn-primary btn-small" onclick="openAddProjectModal()">+ Přidat projekt</button>
      </div>
      ${appState.projects.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <p class="empty-state-text">Žádné projekty</p>
        </div>
      ` : appState.projects.map(project => renderProjectCard(project)).join('')}
    </div>
    
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Data Management</h2>
      </div>
      <div class="btn-group">
        <button class="btn btn-accent" onclick="exportData()">📥 Export dat (JSON)</button>
        <button class="btn btn-secondary" onclick="importData()">📤 Import dat (JSON)</button>
      </div>
    </div>
  `;
}

function renderWorkerCard(worker) {
  return `
    <div class="worker-card">
      <div class="worker-header">
        <div class="worker-avatar" style="background-color: ${worker.color};">
          ${worker.code}
        </div>
        <div class="worker-info">
          <h3>${worker.name}</h3>
          <div class="worker-code">Kód: ${worker.code}</div>
        </div>
      </div>
      <div class="worker-details">
        Hodinová sazba: <strong>${worker.hourlyRate} €/h</strong>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="openEditWorkerModal('${worker.id}')">Upravit</button>
        <button class="btn btn-danger btn-small" onclick="deleteWorker('${worker.id}')">Smazat</button>
      </div>
    </div>
  `;
}

function renderProjectCard(project) {
  const date = new Date(project.createdAt).toLocaleDateString('cs-CZ');
  return `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${project.name}</div>
        <div class="list-item-subtitle">Vytvořeno: ${date}</div>
      </div>
      <div class="list-item-actions">
        <button class="btn btn-secondary btn-small" onclick="openEditProjectModal('${project.id}')">Upravit</button>
        <button class="btn btn-danger btn-small" onclick="deleteProject('${project.id}')">Smazat</button>
      </div>
    </div>
  `;
}

function attachSettingsEventListeners() {
  // Event listeners are attached via onclick in HTML
}

function openAddWorkerModal() {
  const colors = ['#0066ff', '#00c9a7', '#6b46c1', '#ff4757', '#ffa502', '#48dbfb', '#ff6348', '#1dd1a1'];
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Přidat pracovníka</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Jméno</label>
          <input type="text" class="form-input" id="workerName" placeholder="Jan Novák">
        </div>
        <div class="form-group">
          <label class="form-label">Kód</label>
          <input type="text" class="form-input" id="workerCode" placeholder="JN" maxlength="3">
        </div>
        <div class="form-group">
          <label class="form-label">Hodinová sazba (€)</label>
          <input type="number" class="form-input" id="workerRate" placeholder="25">
        </div>
        <div class="form-group">
          <label class="form-label">Barva</label>
          <div class="color-picker-grid">
            ${colors.map(color => `
              <div class="color-option" style="background-color: ${color};" onclick="selectColor('${color}')"></div>
            `).join('')}
          </div>
          <input type="hidden" id="workerColor" value="${colors[0]}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveWorker()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
  selectColor(colors[0]);
}

function openEditWorkerModal(workerId) {
  const worker = appState.workers.find(w => w.id === workerId);
  if (!worker) return;
  
  const colors = ['#0066ff', '#00c9a7', '#6b46c1', '#ff4757', '#ffa502', '#48dbfb', '#ff6348', '#1dd1a1'];
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Upravit pracovníka</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Jméno</label>
          <input type="text" class="form-input" id="workerName" value="${worker.name}">
        </div>
        <div class="form-group">
          <label class="form-label">Kód</label>
          <input type="text" class="form-input" id="workerCode" value="${worker.code}" maxlength="3">
        </div>
        <div class="form-group">
          <label class="form-label">Hodinová sazba (€)</label>
          <input type="number" class="form-input" id="workerRate" value="${worker.hourlyRate}">
        </div>
        <div class="form-group">
          <label class="form-label">Barva</label>
          <div class="color-picker-grid">
            ${colors.map(color => `
              <div class="color-option ${color === worker.color ? 'selected' : ''}" style="background-color: ${color};" onclick="selectColor('${color}')"></div>
            `).join('')}
          </div>
          <input type="hidden" id="workerColor" value="${worker.color}">
          <input type="hidden" id="workerId" value="${workerId}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveWorker()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
}

function selectColor(color) {
  document.getElementById('workerColor').value = color;
  document.querySelectorAll('.color-option').forEach(option => {
    option.classList.remove('selected');
  });
  document.querySelector(`.color-option[style*="${color}"]`).classList.add('selected');
}

function saveWorker() {
  const name = document.getElementById('workerName').value;
  const code = document.getElementById('workerCode').value.toUpperCase();
  const hourlyRate = parseFloat(document.getElementById('workerRate').value);
  const color = document.getElementById('workerColor').value;
  const workerId = document.getElementById('workerId')?.value;
  
  if (!name || !code || !hourlyRate) {
    alert('Vyplňte všechna pole!');
    return;
  }
  
  if (workerId) {
    // Edit existing worker
    const worker = appState.workers.find(w => w.id === workerId);
    if (worker) {
      worker.name = name;
      worker.code = code;
      worker.hourlyRate = hourlyRate;
      worker.color = color;
    }
  } else {
    // Add new worker
    appState.workers.push({
      id: 'worker-' + Date.now(),
      name,
      code,
      hourlyRate,
      color
    });
  }
  
  closeModal();
  navigateToPage('settings');
}

function deleteWorker(id) {
  if (confirm('Opravdu chcete smazat tohoto pracovníka?')) {
    appState.workers = appState.workers.filter(w => w.id !== id);
    navigateToPage('settings');
  }
}

function openAddProjectModal() {
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Přidat projekt</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Název projektu</label>
          <input type="text" class="form-input" id="projectName" placeholder="Solární instalace...">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveProject()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
}

function openEditProjectModal(projectId) {
  const project = appState.projects.find(p => p.id === projectId);
  if (!project) return;
  
  const modal = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Upravit projekt</h3>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Název projektu</label>
          <input type="text" class="form-input" id="projectName" value="${project.name}">
          <input type="hidden" id="projectId" value="${projectId}">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">Zrušit</button>
        <button class="btn btn-primary" onclick="saveProject()">Uložit</button>
      </div>
    </div>
  `;
  showModal(modal);
}

function saveProject() {
  const name = document.getElementById('projectName').value;
  const projectId = document.getElementById('projectId')?.value;
  
  if (!name) {
    alert('Vyplňte název projektu!');
    return;
  }
  
  if (projectId) {
    // Edit existing project
    const project = appState.projects.find(p => p.id === projectId);
    if (project) {
      project.name = name;
    }
  } else {
    // Add new project
    appState.projects.push({
      id: 'project-' + Date.now(),
      name,
      createdAt: Date.now()
    });
  }
  
  closeModal();
  navigateToPage('settings');
}

function deleteProject(id) {
  if (confirm('Opravdu chcete smazat tento projekt?')) {
    appState.projects = appState.projects.filter(p => p.id !== id);
    navigateToPage('settings');
  }
}

function exportData() {
  const dataStr = JSON.stringify(appState, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mst-data-export.json';
  link.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.workers && data.projects && data.workEntries) {
          appState = data;
          alert('Data úspěšně importována!');
          navigateToPage('settings');
        } else {
          alert('Neplatný formát dat!');
        }
      } catch (err) {
        alert('Chyba při načítání dat!');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ==============================================
// ADMIN PAGE
// ==============================================

function renderAdminPage() {
  const stats = calculateStats();
  const dataSize = JSON.stringify(appState).length;
  const sessionTime = adminSession ? Date.now() - adminSession.timestamp : 0;
  const remainingTime = 28800000 - sessionTime; // 8 hours
  const remainingHours = Math.floor(remainingTime / 3600000);
  const remainingMinutes = Math.floor((remainingTime % 3600000) / 60000);
  
  return `
    <div class="info-box">
      <div class="info-box-title">🔐 Admin Dashboard</div>
      <div class="info-box-content">Máte plný přístup ke všem admin funkcím a statistikám systému.</div>
    </div>
    
    <div class="kpi-grid">
      <div class="kpi-card primary">
        <div class="kpi-label">Celkové výdělky</div>
        <div class="kpi-value">${stats.totalEarnings.toFixed(0)} €</div>
      </div>
      <div class="kpi-card accent">
        <div class="kpi-label">Počet pracovníků</div>
        <div class="kpi-value">${appState.workers.length}</div>
      </div>
      <div class="kpi-card secondary">
        <div class="kpi-label">Počet projektů</div>
        <div class="kpi-value">${appState.projects.length}</div>
      </div>
      <div class="kpi-card warning">
        <div class="kpi-label">Počet záznamů</div>
        <div class="kpi-value">${appState.workEntries.length}</div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Admin akce</h2>
      </div>
      <div class="btn-group">
        <button class="btn btn-accent" onclick="exportData()">📥 Export všech dat</button>
        <button class="btn btn-danger" onclick="clearOldEntries()">🗑️ Vyčistit staré záznamy (90+ dní)</button>
      </div>
    </div>
    
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Systémové informace</h2>
      </div>
      <div class="card">
        <div style="display: grid; gap: 16px;">
          <div>
            <div class="kpi-label">Verze aplikace</div>
            <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">1.0.0</div>
          </div>
          <div>
            <div class="kpi-label">Velikost dat</div>
            <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${(dataSize / 1024).toFixed(2)} KB</div>
          </div>
          <div>
            <div class="kpi-label">Aktivní session</div>
            <div style="font-size: 18px; font-weight: 600; margin-top: 4px;">${remainingHours}h ${remainingMinutes}m zbývá</div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <button class="btn btn-danger btn-small" onclick="adminLogout()">🚪 Odhlásit se</button>
    </div>
  `;
}

function attachAdminEventListeners() {
  // Event listeners are attached via onclick in HTML
}

function clearOldEntries() {
  const daysThreshold = 90;
  const thresholdTimestamp = Date.now() - (daysThreshold * 24 * 60 * 60 * 1000);
  const originalCount = appState.workEntries.length;
  
  appState.workEntries = appState.workEntries.filter(entry => entry.timestamp > thresholdTimestamp);
  
  const removedCount = originalCount - appState.workEntries.length;
  
  if (removedCount > 0) {
    alert(`Smazáno ${removedCount} starých záznamů.`);
    navigateToPage('admin');
  } else {
    alert('Žádné staré záznamy k vymazání.');
  }
}

// ==============================================
// MODAL FUNCTIONS
// ==============================================

function showModal(content) {
  const overlay = document.getElementById('modalOverlay');
  overlay.innerHTML = content;
  overlay.classList.add('active');
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.remove('active');
  overlay.innerHTML = '';
}

// ==============================================
// START APP
// ==============================================

document.addEventListener('DOMContentLoaded', initializeApp);