// ============================================
// CRUD Operations & Modal Handlers
// Worker, Project, and Work Entry management
// ============================================

// =============================
// Modal Management
// =============================
function openModal(title, body, footer = '') {
  const modal = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFooter').innerHTML = footer;
  modal.classList.add('active');
}

function closeModal() {
  const modal = document.getElementById('modalOverlay');
  modal.classList.remove('active');
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }
});

// =============================
// Worker CRUD
// =============================
function showAddWorkerModal() {
  const colorOptions = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#f97316', '#6366f1'
  ];

  const body = `
    <form id="workerForm">
      <div class="form-group">
        <label class="form-label">Worker Name *</label>
        <input type="text" class="form-control" id="workerName" required>
      </div>
      <div class="form-group">
        <label class="form-label">Worker Code *</label>
        <input type="text" class="form-control" id="workerCode" required placeholder="e.g., JD-01">
      </div>
      <div class="form-group">
        <label class="form-label">Hourly Rate (CZK) *</label>
        <input type="number" class="form-control" id="workerRate" required min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Color *</label>
        <div class="color-picker-grid">
          ${colorOptions.map((color, i) => `
            <div class="color-option ${i === 0 ? 'selected' : ''}"
                 style="background-color: ${color}"
                 data-color="${color}"
                 onclick="selectColor('${color}')"></div>
          `).join('')}
        </div>
        <input type="hidden" id="workerColor" value="${colorOptions[0]}">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitWorker()">Add Worker</button>
  `;

  openModal('Add Worker', body, footer);
}

function selectColor(color) {
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.remove('selected');
  });
  event.target.classList.add('selected');
  document.getElementById('workerColor').value = color;
}

async function submitWorker(workerId = null) {
  try {
    const name = document.getElementById('workerName').value.trim();
    const workerCode = document.getElementById('workerCode').value.trim();
    const hourlyRate = parseFloat(document.getElementById('workerRate').value);
    const color = document.getElementById('workerColor').value;

    // Validate
    const validation = window.Validation.processWorker({
      name,
      workerCode,
      hourlyRate,
      color
    });

    if (!validation.valid) {
      window.Toast.error(validation.errors.join('<br>'), 'Validation Error');
      return;
    }

    // Check for duplicate worker code
    if (window.Validation.isDuplicateWorkerCode(workerCode, workerId, window.appState.workers)) {
      window.Toast.error('Worker code already exists', 'Duplicate Code');
      return;
    }

    const worker = {
      id: workerId || generateId('worker'),
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (workerId) {
      // Update existing
      const index = window.appState.workers.findIndex(w => w.id === workerId);
      if (index !== -1) {
        window.appState.workers[index] = worker;
        window.Toast.success('Worker updated successfully');
      }
    } else {
      // Add new
      window.appState.workers.push(worker);
      window.Toast.success('Worker added successfully');
    }

    await window.IndexedDBService.saveWorkers(window.appState.workers);
    await window.BackupService.trackChange();

    closeModal();
    window.render();

  } catch (error) {
    console.error('[CRUD] Submit worker failed:', error);
    window.Toast.error('Failed to save worker', 'Error');
  }
}

function editWorker(workerId) {
  const worker = window.appState.workers.find(w => w.id === workerId);
  if (!worker) {
    window.Toast.error('Worker not found', 'Error');
    return;
  }

  const colorOptions = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#f97316', '#6366f1'
  ];

  const body = `
    <form id="workerForm">
      <div class="form-group">
        <label class="form-label">Worker Name *</label>
        <input type="text" class="form-control" id="workerName" value="${worker.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Worker Code *</label>
        <input type="text" class="form-control" id="workerCode" value="${worker.workerCode}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Hourly Rate (CZK) *</label>
        <input type="number" class="form-control" id="workerRate" value="${worker.hourlyRate}" required min="0" step="0.01">
      </div>
      <div class="form-group">
        <label class="form-label">Color *</label>
        <div class="color-picker-grid">
          ${colorOptions.map(color => `
            <div class="color-option ${color === worker.color ? 'selected' : ''}"
                 style="background-color: ${color}"
                 data-color="${color}"
                 onclick="selectColor('${color}')"></div>
          `).join('')}
        </div>
        <input type="hidden" id="workerColor" value="${worker.color}">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitWorker('${workerId}')">Update Worker</button>
  `;

  openModal('Edit Worker', body, footer);
}

async function deleteWorker(workerId) {
  if (!confirm('Are you sure you want to delete this worker?')) {
    return;
  }

  try {
    window.appState.workers = window.appState.workers.filter(w => w.id !== workerId);
    await window.IndexedDBService.saveWorkers(window.appState.workers);
    await window.BackupService.trackChange();

    window.Toast.success('Worker deleted successfully');
    window.render();

  } catch (error) {
    console.error('[CRUD] Delete worker failed:', error);
    window.Toast.error('Failed to delete worker', 'Error');
  }
}

// =============================
// Project CRUD
// =============================
function showAddProjectModal() {
  const body = `
    <form id="projectForm">
      <div class="form-group">
        <label class="form-label">Project Name *</label>
        <input type="text" class="form-control" id="projectName" required>
      </div>
      <div class="form-group">
        <label class="form-label">Location *</label>
        <input type="text" class="form-control" id="projectLocation" required>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="projectStatus">
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="paused">Paused</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-control" id="projectStartDate">
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input type="date" class="form-control" id="projectEndDate">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitProject()">Add Project</button>
  `;

  openModal('Add Project', body, footer);
}

async function submitProject(projectId = null) {
  try {
    const name = document.getElementById('projectName').value.trim();
    const location = document.getElementById('projectLocation').value.trim();
    const status = document.getElementById('projectStatus').value;
    const startDate = document.getElementById('projectStartDate').value;
    const endDate = document.getElementById('projectEndDate').value;

    // Validate
    const validation = window.Validation.processProject({
      name,
      location,
      status,
      startDate,
      endDate
    });

    if (!validation.valid) {
      window.Toast.error(validation.errors.join('<br>'), 'Validation Error');
      return;
    }

    // Check for duplicate project name
    if (window.Validation.isDuplicateProjectName(name, projectId, window.appState.projects)) {
      window.Toast.error('Project name already exists', 'Duplicate Name');
      return;
    }

    const project = {
      id: projectId || generateId('project'),
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (projectId) {
      // Update existing
      const index = window.appState.projects.findIndex(p => p.id === projectId);
      if (index !== -1) {
        window.appState.projects[index] = project;
        window.Toast.success('Project updated successfully');
      }
    } else {
      // Add new
      window.appState.projects.push(project);
      window.Toast.success('Project added successfully');
    }

    await window.IndexedDBService.saveProjects(window.appState.projects);
    await window.BackupService.trackChange();

    closeModal();
    window.render();

  } catch (error) {
    console.error('[CRUD] Submit project failed:', error);
    window.Toast.error('Failed to save project', 'Error');
  }
}

function editProject(projectId) {
  const project = window.appState.projects.find(p => p.id === projectId);
  if (!project) {
    window.Toast.error('Project not found', 'Error');
    return;
  }

  const body = `
    <form id="projectForm">
      <div class="form-group">
        <label class="form-label">Project Name *</label>
        <input type="text" class="form-control" id="projectName" value="${project.name}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Location *</label>
        <input type="text" class="form-control" id="projectLocation" value="${project.location}" required>
      </div>
      <div class="form-group">
        <label class="form-label">Status</label>
        <select class="form-control" id="projectStatus">
          <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
          <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="paused" ${project.status === 'paused' ? 'selected' : ''}>Paused</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Start Date</label>
        <input type="date" class="form-control" id="projectStartDate" value="${project.startDate || ''}">
      </div>
      <div class="form-group">
        <label class="form-label">End Date</label>
        <input type="date" class="form-control" id="projectEndDate" value="${project.endDate || ''}">
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitProject('${projectId}')">Update Project</button>
  `;

  openModal('Edit Project', body, footer);
}

async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project?')) {
    return;
  }

  try {
    window.appState.projects = window.appState.projects.filter(p => p.id !== projectId);
    await window.IndexedDBService.saveProjects(window.appState.projects);
    await window.BackupService.trackChange();

    window.Toast.success('Project deleted successfully');
    window.render();

  } catch (error) {
    console.error('[CRUD] Delete project failed:', error);
    window.Toast.error('Failed to delete project', 'Error');
  }
}

// =============================
// Work Entry CRUD
// =============================
function showAddRecordModal() {
  const body = `
    <div class="form-group">
      <label class="form-label">Entry Type *</label>
      <select class="form-control" id="entryType" onchange="toggleEntryForm()">
        <option value="task">Task (Per Completion)</option>
        <option value="hourly">Hourly Work</option>
      </select>
    </div>
    <div id="entryFormContainer"></div>
  `;

  const footer = `
    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn btn-primary" onclick="submitWorkEntry()">Add Record</button>
  `;

  openModal('Add Work Record', body, footer);
  toggleEntryForm();
}

function toggleEntryForm() {
  const entryType = document.getElementById('entryType').value;
  const container = document.getElementById('entryFormContainer');

  if (entryType === 'task') {
    container.innerHTML = renderTaskEntryForm();
  } else {
    container.innerHTML = renderHourlyEntryForm();
  }
}

function renderTaskEntryForm() {
  return `
    <div class="form-group">
      <label class="form-label">Project *</label>
      <select class="form-control" id="entryProject" required>
        <option value="">Select project...</option>
        ${window.appState.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Workers *</label>
      <div id="workerCheckboxes">
        ${window.appState.workers.map(w => `
          <label style="display: block; margin-bottom: 8px;">
            <input type="checkbox" class="worker-checkbox" value="${w.id}" data-code="${w.workerCode}">
            ${w.name} (${w.workerCode})
          </label>
        `).join('')}
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Table Number *</label>
      <input type="text" class="form-control" id="entryTableNumber" required>
    </div>
    <div class="form-group">
      <label class="form-label">Reward per Worker (CZK) *</label>
      <input type="number" class="form-control" id="entryReward" required min="0" step="0.01">
    </div>
    <div class="form-group">
      <label class="form-label">Date & Time *</label>
      <input type="datetime-local" class="form-control" id="entryTimestamp" required value="${new Date().toISOString().slice(0, 16)}">
    </div>
  `;
}

function renderHourlyEntryForm() {
  return `
    <div class="form-group">
      <label class="form-label">Project *</label>
      <select class="form-control" id="entryProject" required>
        <option value="">Select project...</option>
        ${window.appState.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Worker *</label>
      <select class="form-control" id="entryWorker" required>
        <option value="">Select worker...</option>
        ${window.appState.workers.map(w => `<option value="${w.id}">${w.name} (${w.workerCode})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Hours Worked *</label>
      <input type="number" class="form-control" id="entryHours" required min="0" max="24" step="0.5">
    </div>
    <div class="form-group">
      <label class="form-label">Date & Time *</label>
      <input type="datetime-local" class="form-control" id="entryTimestamp" required value="${new Date().toISOString().slice(0, 16)}">
    </div>
  `;
}

async function submitWorkEntry() {
  try {
    const entryType = document.getElementById('entryType').value;
    const projectId = document.getElementById('entryProject').value;
    const timestamp = new Date(document.getElementById('entryTimestamp').value).toISOString();

    let entry = {
      id: generateId('entry'),
      type: entryType,
      projectId,
      timestamp,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (entryType === 'task') {
      const selectedWorkers = Array.from(document.querySelectorAll('.worker-checkbox:checked')).map(cb => ({
        workerId: cb.value,
        workerCode: cb.dataset.code
      }));
      const tableNumber = document.getElementById('entryTableNumber').value.trim();
      const rewardPerWorker = parseFloat(document.getElementById('entryReward').value);

      entry.workers = selectedWorkers;
      entry.tableNumber = tableNumber;
      entry.rewardPerWorker = rewardPerWorker;

      const validation = window.Validation.processTaskEntry(entry);
      if (!validation.valid) {
        window.Toast.error(validation.errors.join('<br>'), 'Validation Error');
        return;
      }

      entry = validation.data;

    } else {
      const workerId = document.getElementById('entryWorker').value;
      const totalHours = parseFloat(document.getElementById('entryHours').value);

      const worker = window.appState.workers.find(w => w.id === workerId);
      const totalEarned = worker ? totalHours * worker.hourlyRate : 0;

      entry.workerId = workerId;
      entry.totalHours = totalHours;
      entry.totalEarned = totalEarned;

      const validation = window.Validation.processHourlyEntry(entry);
      if (!validation.valid) {
        window.Toast.error(validation.errors.join('<br>'), 'Validation Error');
        return;
      }

      entry = validation.data;
    }

    window.appState.workEntries.push(entry);
    await window.IndexedDBService.saveWorkEntries(window.appState.workEntries);
    await window.BackupService.trackChange();

    window.Toast.success('Work record added successfully');
    closeModal();
    window.render();

  } catch (error) {
    console.error('[CRUD] Submit work entry failed:', error);
    window.Toast.error('Failed to add record', 'Error');
  }
}

async function deleteRecord(entryId) {
  if (!confirm('Are you sure you want to delete this record?')) {
    return;
  }

  try {
    window.appState.workEntries = window.appState.workEntries.filter(e => e.id !== entryId);
    await window.IndexedDBService.saveWorkEntries(window.appState.workEntries);
    await window.BackupService.trackChange();

    window.Toast.success('Record deleted successfully');
    window.render();

  } catch (error) {
    console.error('[CRUD] Delete record failed:', error);
    window.Toast.error('Failed to delete record', 'Error');
  }
}

// =============================
// Data Import/Export
// =============================
async function exportData() {
  try {
    await window.BackupService.exportJSON();
    window.Toast.success('Data exported successfully');
  } catch (error) {
    console.error('[Export] Failed:', error);
    window.Toast.error('Failed to export data', 'Export Error');
  }
}

async function exportCSV() {
  try {
    await window.BackupService.exportCSV();
    window.Toast.success('CSV exported successfully');
  } catch (error) {
    console.error('[Export] Failed:', error);
    window.Toast.error('Failed to export CSV', 'Export Error');
  }
}

async function importData() {
  try {
    await window.BackupService.importJSON(true);
    await window.loadState();
    window.render();
  } catch (error) {
    console.error('[Import] Failed:', error);
    if (error.message !== 'User cancelled') {
      window.Toast.error('Failed to import data', 'Import Error');
    }
  }
}

// =============================
// Filtering
// =============================
function filterRecords() {
  const projectFilter = document.getElementById('filterProject')?.value;
  const typeFilter = document.getElementById('filterType')?.value;

  let filtered = window.appState.workEntries;

  if (projectFilter) {
    filtered = filtered.filter(e => e.projectId === projectFilter);
  }

  if (typeFilter) {
    filtered = filtered.filter(e => e.type === typeFilter);
  }

  const sortedEntries = filtered.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const recordsList = document.getElementById('recordsList');
  if (recordsList) {
    recordsList.innerHTML = sortedEntries.map(entry => window.renderRecordCard(entry)).join('');
  }
}

// =============================
// Utility Functions
// =============================
function generateId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
}

// Export to window
window.openModal = openModal;
window.closeModal = closeModal;
window.showAddWorkerModal = showAddWorkerModal;
window.selectColor = selectColor;
window.submitWorker = submitWorker;
window.editWorker = editWorker;
window.deleteWorker = deleteWorker;
window.showAddProjectModal = showAddProjectModal;
window.submitProject = submitProject;
window.editProject = editProject;
window.deleteProject = deleteProject;
window.showAddRecordModal = showAddRecordModal;
window.toggleEntryForm = toggleEntryForm;
window.submitWorkEntry = submitWorkEntry;
window.deleteRecord = deleteRecord;
window.exportData = exportData;
window.exportCSV = exportCSV;
window.importData = importData;
window.filterRecords = filterRecords;
