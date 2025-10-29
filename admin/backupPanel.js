// ============================================
// Admin Backup Panel Module
// UI for managing backups in admin dashboard
// ============================================

/**
 * Render backup status panel
 * @returns {string} HTML string
 */
function renderBackupStatus() {
  const lastBackupAt = window.IndexedDBService ?
    (localStorage.getItem('mst:autoBackup:index') ?
      JSON.parse(localStorage.getItem('mst:autoBackup:index')).lastBackupAt : null) : null;

  const slots = window.BackupService?.getLocalStorageSlots() || [];
  const opfsAvailable = window.BackupService?.isOPFSAvailable() || false;
  const fsAccessAvailable = window.BackupService?.isFSAccessAvailable() || false;
  const fsAccessEnabled = localStorage.getItem('mst:fsAccess:enabled') === 'true';

  return `
    <div class="admin-backup-status">
      <h3>📦 Backup Status</h3>

      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Last Auto-Backup:</span>
          <span class="status-value">${lastBackupAt ? new Date(lastBackupAt).toLocaleString('cs-CZ') : 'Never'}</span>
        </div>
        <div class="status-item">
          <span class="status-label">LocalStorage Slots:</span>
          <span class="status-value">${slots.length} / ${5}</span>
        </div>
        <div class="status-item">
          <span class="status-label">OPFS Available:</span>
          <span class="status-value">${opfsAvailable ? '✅ Yes' : '❌ No'}</span>
        </div>
        <div class="status-item">
          <span class="status-label">FS Access:</span>
          <span class="status-value">${fsAccessEnabled ? '✅ Enabled' : '⚠️ Disabled'}</span>
        </div>
      </div>

      <div class="admin-actions">
        <button class="btn btn-primary" onclick="window.BackupService.forceAutoBackup()">
          💾 Force Backup Now
        </button>
        <button class="btn btn-accent" onclick="window.BackupService.exportJSON()">
          📥 Export JSON
        </button>
        <button class="btn btn-accent" onclick="window.BackupService.exportCSV()">
          📊 Export CSV
        </button>
        <button class="btn btn-secondary" onclick="window.BackupService.importJSON()">
          📤 Import JSON
        </button>
      </div>
    </div>
  `;
}

/**
 * Render localStorage backup slots
 * @returns {Promise<string>} HTML string
 */
async function renderLocalStorageSlots() {
  const slots = window.BackupService?.getLocalStorageSlots() || [];

  if (slots.length === 0) {
    return `
      <div class="section-card">
        <h3>💾 LocalStorage Auto-Backups</h3>
        <p class="section-description">Automatic backups saved in browser storage (5 rotating slots)</p>
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">No auto-backups found</div>
        </div>
      </div>
    `;
  }

  const rows = slots.map((slot, index) => `
    <tr>
      <td>Slot ${slot.slot}</td>
      <td>${new Date(slot.createdAt).toLocaleString('cs-CZ')}</td>
      <td>${(slot.size / 1024).toFixed(2)} KB</td>
      <td>
        <button class="btn-small" onclick="restoreFromLocalStorageSlot(${slot.slot})">
          Restore
        </button>
        <button class="btn-small" onclick="downloadLocalStorageSlot(${slot.slot})">
          Download
        </button>
        <button class="btn-small btn-danger" onclick="deleteLocalStorageSlot(${slot.slot})">
          Delete
        </button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="section-card">
      <h3>💾 LocalStorage Auto-Backups</h3>
      <p class="section-description">Automatic backups saved in browser storage (5 rotating slots)</p>
      <table class="backup-table">
        <thead>
          <tr>
            <th>Slot</th>
            <th>Created</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render OPFS backup files
 * @returns {Promise<string>} HTML string
 */
async function renderOPFSBackups() {
  if (!window.BackupService?.isOPFSAvailable()) {
    return `
      <div class="section-card">
        <h3>📁 OPFS Auto-Backups</h3>
        <p class="section-description">Origin Private File System backups (persistent storage)</p>
        <div class="info-box">
          <div class="info-box-title">⚠️ Not Available</div>
          <div class="info-box-content">OPFS is not supported in this browser.</div>
        </div>
      </div>
    `;
  }

  const files = await window.BackupService.getOPFSBackups();

  if (files.length === 0) {
    return `
      <div class="section-card">
        <h3>📁 OPFS Auto-Backups</h3>
        <p class="section-description">Origin Private File System backups (persistent storage)</p>
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">No OPFS backups found</div>
        </div>
      </div>
    `;
  }

  const rows = files.map(file => `
    <tr>
      <td>${file.name}</td>
      <td>${new Date(file.lastModified).toLocaleString('cs-CZ')}</td>
      <td>${(file.size / 1024).toFixed(2)} KB</td>
      <td>
        <button class="btn-small" onclick="window.BackupService.restoreFromOPFS('${file.name}')">
          Restore
        </button>
        <button class="btn-small" onclick="window.BackupService.downloadOPFSBackup('${file.name}')">
          Download
        </button>
        <button class="btn-small btn-danger" onclick="window.BackupService.deleteOPFSBackup('${file.name}').then(() => renderAdminBackupPanel())">
          Delete
        </button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="section-card">
      <h3>📁 OPFS Auto-Backups</h3>
      <p class="section-description">Origin Private File System backups (7 daily + 3 weekly retention)</p>
      <table class="backup-table">
        <thead>
          <tr>
            <th>Filename</th>
            <th>Last Modified</th>
            <th>Size</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render File System Access section
 * @returns {string} HTML string
 */
function renderFSAccessSection() {
  if (!window.BackupService?.isFSAccessAvailable()) {
    return `
      <div class="section-card">
        <h3>💾 File System Auto-Backup</h3>
        <p class="section-description">Continuous backup to a file on your computer</p>
        <div class="info-box">
          <div class="info-box-title">⚠️ Not Available</div>
          <div class="info-box-content">File System Access API is not supported in this browser.</div>
        </div>
      </div>
    `;
  }

  const enabled = localStorage.getItem('mst:fsAccess:enabled') === 'true';

  return `
    <div class="section-card">
      <h3>💾 File System Auto-Backup</h3>
      <p class="section-description">Continuous backup to a file on your computer (auto-saves every 30s)</p>

      <div class="fs-access-section">
        <div class="status-item" style="margin-bottom: 1rem;">
          <span class="status-label">Status:</span>
          <span class="status-value">${enabled ? '✅ Active' : '⚠️ Inactive'}</span>
        </div>

        ${enabled ? `
          <button class="btn btn-danger" onclick="disableFSAccess()">
            🚫 Disable Auto-Backup
          </button>
        ` : `
          <button class="btn btn-primary" onclick="window.BackupService.selectPersistentFile()">
            📂 Select Backup File
          </button>
        `}
      </div>
    </div>
  `;
}

/**
 * Render complete admin backup panel
 * @returns {Promise<string>} HTML string
 */
async function renderAdminBackupPanel() {
  const statusHTML = renderBackupStatus();
  const localStorageHTML = await renderLocalStorageSlots();
  const opfsHTML = await renderOPFSBackups();
  const fsAccessHTML = renderFSAccessSection();

  return `
    <div class="backup-manager">
      ${statusHTML}
      ${localStorageHTML}
      ${opfsHTML}
      ${fsAccessHTML}
    </div>
  `;
}

// ============================================
// Helper Functions for Button Actions
// ============================================

/**
 * Restore from localStorage slot
 * @param {number} slot
 */
async function restoreFromLocalStorageSlot(slot) {
  try {
    const slotData = localStorage.getItem(`mst:autoBackup:slot:${slot}`);
    if (!slotData) {
      alert('Backup slot not found!');
      return;
    }

    const backup = JSON.parse(slotData);
    const analysis = await window.BackupService.analyzeImport(backup);

    const proceed = confirm(
      `Restore from Slot ${slot}:\n\n` +
      `Workers: +${analysis.workers.added} ~${analysis.workers.updated} =${analysis.workers.skipped}\n` +
      `Projects: +${analysis.projects.added} ~${analysis.projects.updated} =${analysis.projects.skipped}\n` +
      `Entries: +${analysis.entries.added} ~${analysis.entries.updated} =${analysis.entries.skipped}\n\n` +
      `Proceed?`
    );

    if (proceed) {
      await window.BackupService.importBackup(backup, false);
      alert('Restore completed!');
      // Reload app state
      if (window.loadStateFromDB) await window.loadStateFromDB();
      if (window.render) window.render();
    }

  } catch (error) {
    console.error('[Admin] Restore failed:', error);
    alert('Restore failed! Check console for details.');
  }
}

/**
 * Download localStorage slot as file
 * @param {number} slot
 */
function downloadLocalStorageSlot(slot) {
  try {
    const slotData = localStorage.getItem(`mst:autoBackup:slot:${slot}`);
    if (!slotData) {
      alert('Backup slot not found!');
      return;
    }

    const backup = JSON.parse(slotData);
    const filename = `mst-slot-${slot}-${new Date(backup.createdAt).toISOString().slice(0, 10)}.json`;
    const dataBlob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('[Admin] Download failed:', error);
    alert('Download failed!');
  }
}

/**
 * Delete localStorage slot
 * @param {number} slot
 */
function deleteLocalStorageSlot(slot) {
  if (confirm(`Delete backup slot ${slot}?`)) {
    window.BackupService.deleteLocalStorageSlot(slot);
    alert('Slot deleted!');
    renderAdminBackupPanel().then(html => {
      document.getElementById('mainContent').innerHTML = html;
    });
  }
}

/**
 * Disable FS Access
 */
function disableFSAccess() {
  if (confirm('Disable File System auto-backup?')) {
    window.BackupService.disablePersistentFile();
    alert('File System auto-backup disabled!');
    renderAdminBackupPanel().then(html => {
      document.getElementById('mainContent').innerHTML = html;
    });
  }
}

// Export API
window.AdminBackupPanel = {
  renderAdminBackupPanel,
  renderBackupStatus,
  renderLocalStorageSlots,
  renderOPFSBackups,
  renderFSAccessSection
};

// Global helper functions
window.restoreFromLocalStorageSlot = restoreFromLocalStorageSlot;
window.downloadLocalStorageSlot = downloadLocalStorageSlot;
window.deleteLocalStorageSlot = deleteLocalStorageSlot;
window.disableFSAccess = disableFSAccess;
