// ============================================
// Backup Module
// Handles JSON backups (manual + automatic)
// Supports localStorage slots, OPFS, and File System Access API
// ============================================

const BACKUP_SLOTS = 5; // Number of localStorage backup slots
const BACKUP_TRIGGER_CHANGES = 25; // Trigger backup after N changes
const BACKUP_TRIGGER_INTERVAL = 60000; // Trigger backup after 60s
const FS_DEBOUNCE = 30000; // File System Access debounce 30s

let changeCounter = 0;
let lastBackupTime = 0;
let fsHandle = null;
let fsDebounceTimer = null;

/**
 * Format date for backup filename
 * @param {Date} date 
 * @returns {string}
 */
function formatBackupDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Create backup object
 * @param {Object} data 
 * @returns {Object}
 */
async function createBackupObject(data) {
  const now = new Date().toISOString();
  const meta = {
    schemaVersion: await window.IndexedDBService.getMeta('schemaVersion') || 1,
    lastBackupAt: await window.IndexedDBService.getMeta('lastBackupAt'),
    lastVacuumAt: await window.IndexedDBService.getMeta('lastVacuumAt')
  };

  return {
    version: '1.0.0',
    schemaVersion: window.IndexedDBService.DB_VERSION,
    createdAt: now,
    workers: data.workers || [],
    projects: data.projects || [],
    entries: data.workEntries || [],
    meta
  };
}

/**
 * Export data as JSON file (manual)
 * @returns {Promise<void>}
 */
async function exportJSON() {
  try {
    const data = await window.IndexedDBService.loadAllData();
    const backup = await createBackupObject(data);
    
    const filename = `mst-backup-${formatBackupDate(new Date())}.json`;
    const dataStr = JSON.stringify(backup, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    
    await window.IndexedDBService.setMeta('lastBackupAt', new Date().toISOString());
    console.log('[Backup] Manual export completed:', filename);
    
  } catch (error) {
    console.error('[Backup] Export failed:', error);
    throw error;
  }
}

/**
 * Export data as CSV file
 * @returns {Promise<void>}
 */
async function exportCSV() {
  try {
    const data = await window.IndexedDBService.loadAllData();
    
    // CSV Headers
    const headers = [
      'ID', 'Type', 'Date', 'Time', 'Project', 'Worker/Workers',
      'Table Number', 'Hours', 'Reward Per Worker', 'Total Amount'
    ];
    
    // CSV Rows
    const rows = data.workEntries.map(entry => {
      const date = new Date(entry.timestamp);
      const project = data.projects.find(p => p.id === entry.projectId);
      
      if (entry.type === 'task') {
        const workers = entry.workers.map(w => w.workerCode).join(';');
        const totalAmount = entry.rewardPerWorker * entry.workers.length;
        return [
          entry.id,
          'Task',
          date.toLocaleDateString('cs-CZ'),
          date.toLocaleTimeString('cs-CZ'),
          project ? project.name : 'N/A',
          workers,
          entry.tableNumber || '',
          '',
          entry.rewardPerWorker || '',
          totalAmount
        ];
      } else {
        const worker = data.workers.find(w => w.id === entry.workerId);
        return [
          entry.id,
          'Hourly',
          date.toLocaleDateString('cs-CZ'),
          date.toLocaleTimeString('cs-CZ'),
          project ? project.name : 'N/A',
          worker ? worker.name : 'N/A',
          '',
          entry.totalHours || '',
          '',
          entry.totalEarned || ''
        ];
      }
    });
    
    // Build CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const filename = `mst-export-${formatBackupDate(new Date())}.csv`;
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log('[Backup] CSV export completed:', filename);
    
  } catch (error) {
    console.error('[Backup] CSV export failed:', error);
    throw error;
  }
}

/**
 * Validate backup data structure
 * @param {Object} backup 
 * @returns {Object} Validation result
 */
function validateBackup(backup) {
  const errors = [];
  
  if (!backup.version) errors.push('Missing version');
  if (!backup.schemaVersion) errors.push('Missing schemaVersion');
  if (!backup.createdAt) errors.push('Missing createdAt');
  if (!Array.isArray(backup.workers)) errors.push('Invalid workers array');
  if (!Array.isArray(backup.projects)) errors.push('Invalid projects array');
  if (!Array.isArray(backup.entries)) errors.push('Invalid entries array');
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Perform dry-run import analysis (LWW merge preview)
 * @param {Object} backup 
 * @returns {Promise<Object>} Analysis result
 */
async function analyzeImport(backup) {
  const existingData = await window.IndexedDBService.loadAllData();
  
  const analysis = {
    workers: { added: 0, updated: 0, skipped: 0 },
    projects: { added: 0, updated: 0, skipped: 0 },
    entries: { added: 0, updated: 0, skipped: 0 },
    conflictsResolved: 0
  };
  
  // Analyze workers
  backup.workers.forEach(importWorker => {
    const existing = existingData.workers.find(w => w.id === importWorker.id);
    if (!existing) {
      analysis.workers.added++;
    } else {
      const importDate = new Date(importWorker.updatedAt || importWorker.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        analysis.workers.updated++;
        analysis.conflictsResolved++;
      } else {
        analysis.workers.skipped++;
      }
    }
  });
  
  // Analyze projects
  backup.projects.forEach(importProject => {
    const existing = existingData.projects.find(p => p.id === importProject.id);
    if (!existing) {
      analysis.projects.added++;
    } else {
      const importDate = new Date(importProject.updatedAt || importProject.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        analysis.projects.updated++;
        analysis.conflictsResolved++;
      } else {
        analysis.projects.skipped++;
      }
    }
  });
  
  // Analyze entries
  backup.entries.forEach(importEntry => {
    const existing = existingData.workEntries.find(e => e.id === importEntry.id);
    if (!existing) {
      analysis.entries.added++;
    } else {
      const importDate = new Date(importEntry.updatedAt || importEntry.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        analysis.entries.updated++;
        analysis.conflictsResolved++;
      } else {
        analysis.entries.skipped++;
      }
    }
  });
  
  return analysis;
}

/**
 * Import backup with LWW (Last-Write-Wins) merge
 * @param {Object} backup 
 * @param {boolean} hardRestore - If true, wipe existing data
 * @returns {Promise<Object>} Import summary
 */
async function importBackup(backup, hardRestore = false) {
  // Validate
  const validation = validateBackup(backup);
  if (!validation.valid) {
    throw new Error(`Invalid backup: ${validation.errors.join(', ')}`);
  }
  
  if (hardRestore) {
    // Hard restore: wipe and import
    await window.IndexedDBService.saveAllData({
      workers: backup.workers,
      projects: backup.projects,
      workEntries: backup.entries
    });
    
    return {
      workers: { added: backup.workers.length, updated: 0, skipped: 0 },
      projects: { added: backup.projects.length, updated: 0, skipped: 0 },
      entries: { added: backup.entries.length, updated: 0, skipped: 0 },
      conflictsResolved: 0
    };
  }
  
  // LWW merge
  const existingData = await window.IndexedDBService.loadAllData();
  const summary = {
    workers: { added: 0, updated: 0, skipped: 0 },
    projects: { added: 0, updated: 0, skipped: 0 },
    entries: { added: 0, updated: 0, skipped: 0 },
    conflictsResolved: 0
  };
  
  // Merge workers
  const mergedWorkers = [...existingData.workers];
  backup.workers.forEach(importWorker => {
    const existingIndex = mergedWorkers.findIndex(w => w.id === importWorker.id);
    if (existingIndex === -1) {
      mergedWorkers.push(importWorker);
      summary.workers.added++;
    } else {
      const existing = mergedWorkers[existingIndex];
      const importDate = new Date(importWorker.updatedAt || importWorker.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        mergedWorkers[existingIndex] = importWorker;
        summary.workers.updated++;
        summary.conflictsResolved++;
      } else {
        summary.workers.skipped++;
      }
    }
  });
  
  // Merge projects
  const mergedProjects = [...existingData.projects];
  backup.projects.forEach(importProject => {
    const existingIndex = mergedProjects.findIndex(p => p.id === importProject.id);
    if (existingIndex === -1) {
      mergedProjects.push(importProject);
      summary.projects.added++;
    } else {
      const existing = mergedProjects[existingIndex];
      const importDate = new Date(importProject.updatedAt || importProject.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        mergedProjects[existingIndex] = importProject;
        summary.projects.updated++;
        summary.conflictsResolved++;
      } else {
        summary.projects.skipped++;
      }
    }
  });
  
  // Merge entries
  const mergedEntries = [...existingData.workEntries];
  backup.entries.forEach(importEntry => {
    const existingIndex = mergedEntries.findIndex(e => e.id === importEntry.id);
    if (existingIndex === -1) {
      mergedEntries.push(importEntry);
      summary.entries.added++;
    } else {
      const existing = mergedEntries[existingIndex];
      const importDate = new Date(importEntry.updatedAt || importEntry.createdAt);
      const existingDate = new Date(existing.updatedAt || existing.createdAt);
      if (importDate > existingDate) {
        mergedEntries[existingIndex] = importEntry;
        summary.entries.updated++;
        summary.conflictsResolved++;
      } else {
        summary.entries.skipped++;
      }
    }
  });
  
  // Save merged data
  await window.IndexedDBService.saveAllData({
    workers: mergedWorkers,
    projects: mergedProjects,
    workEntries: mergedEntries
  });
  
  console.log('[Backup] Import completed:', summary);
  return summary;
}

/**
 * Import JSON file with user selection
 * @param {boolean} showPreview - Show diff preview before import
 * @returns {Promise<void>}
 */
async function importJSON(showPreview = true) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      try {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const backup = JSON.parse(event.target.result);
            
            if (showPreview) {
              // Show analysis before importing
              const analysis = await analyzeImport(backup);
              const proceed = confirm(
                `Import Preview:\n\n` +
                `Workers: +${analysis.workers.added} ~${analysis.workers.updated} =${analysis.workers.skipped}\n` +
                `Projects: +${analysis.projects.added} ~${analysis.projects.updated} =${analysis.projects.skipped}\n` +
                `Entries: +${analysis.entries.added} ~${analysis.entries.updated} =${analysis.entries.skipped}\n` +
                `Conflicts resolved: ${analysis.conflictsResolved}\n\n` +
                `Proceed with import?`
              );
              
              if (!proceed) {
                resolve();
                return;
              }
            }
            
            const summary = await importBackup(backup, false);
            alert(
              `Import completed!\n\n` +
              `Workers: +${summary.workers.added} ~${summary.workers.updated}\n` +
              `Projects: +${summary.projects.added} ~${summary.projects.updated}\n` +
              `Entries: +${summary.entries.added} ~${summary.entries.updated}`
            );
            resolve(summary);
            
          } catch (error) {
            console.error('[Backup] Import parsing failed:', error);
            alert('Chyba při načítání dat! Neplatný formát.');
            reject(error);
          }
        };
        reader.readAsText(file);
        
      } catch (error) {
        reject(error);
      }
    };
    
    input.click();
  });
}

// ============================================
// AUTO-BACKUP: localStorage Slots
// ============================================

/**
 * Save snapshot to localStorage slot (circular buffer)
 * @returns {Promise<void>}
 */
async function saveToLocalStorageSlot() {
  try {
    const data = await window.IndexedDBService.loadAllData();
    const backup = await createBackupObject(data);
    const backupStr = JSON.stringify(backup);
    
    // Get current index
    const index = JSON.parse(localStorage.getItem('mst:autoBackup:index') || '{}');
    const currentSlot = index.currentSlot || 0;
    const nextSlot = (currentSlot + 1) % BACKUP_SLOTS;
    
    // Save to slot
    localStorage.setItem(`mst:autoBackup:slot:${currentSlot}`, backupStr);
    
    // Update index
    index.currentSlot = nextSlot;
    index.lastBackupAt = new Date().toISOString();
    index.slots = index.slots || {};
    index.slots[currentSlot] = {
      createdAt: new Date().toISOString(),
      size: backupStr.length
    };
    localStorage.setItem('mst:autoBackup:index', JSON.stringify(index));
    
    console.log(`[Auto-Backup] Saved to slot ${currentSlot}`);
    
  } catch (error) {
    console.error('[Auto-Backup] localStorage slot save failed:', error);
  }
}

/**
 * Get all localStorage backup slots
 * @returns {Array}
 */
function getLocalStorageSlots() {
  const slots = [];
  const index = JSON.parse(localStorage.getItem('mst:autoBackup:index') || '{}');
  
  for (let i = 0; i < BACKUP_SLOTS; i++) {
    const data = localStorage.getItem(`mst:autoBackup:slot:${i}`);
    if (data && index.slots && index.slots[i]) {
      slots.push({
        slot: i,
        createdAt: index.slots[i].createdAt,
        size: index.slots[i].size,
        data: JSON.parse(data)
      });
    }
  }
  
  return slots.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Delete localStorage backup slot
 * @param {number} slot 
 */
function deleteLocalStorageSlot(slot) {
  localStorage.removeItem(`mst:autoBackup:slot:${slot}`);
  const index = JSON.parse(localStorage.getItem('mst:autoBackup:index') || '{}');
  if (index.slots) {
    delete index.slots[slot];
    localStorage.setItem('mst:autoBackup:index', JSON.stringify(index));
  }
}

// ============================================
// AUTO-BACKUP: OPFS (Origin Private File System)
// ============================================

/**
 * Check if OPFS is available
 * @returns {boolean}
 */
function isOPFSAvailable() {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Save backup to OPFS
 * @returns {Promise<void>}
 */
async function saveToOPFS() {
  if (!isOPFSAvailable()) return;
  
  try {
    const root = await navigator.storage.getDirectory();
    const backupsDir = await root.getDirectoryHandle('backups', { create: true });
    
    const data = await window.IndexedDBService.loadAllData();
    const backup = await createBackupObject(data);
    const backupStr = JSON.stringify(backup, null, 2);
    
    const date = new Date();
    const filename = `mst-auto-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.json`;
    
    const fileHandle = await backupsDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(backupStr);
    await writable.close();
    
    console.log('[Auto-Backup] Saved to OPFS:', filename);
    
    // Cleanup old backups (retention policy)
    await cleanupOPFSBackups(backupsDir);
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS save failed:', error);
  }
}

/**
 * Get all OPFS backup files
 * @returns {Promise<Array>}
 */
async function getOPFSBackups() {
  if (!isOPFSAvailable()) return [];
  
  try {
    const root = await navigator.storage.getDirectory();
    const backupsDir = await root.getDirectoryHandle('backups', { create: true });
    
    const files = [];
    for await (const entry of backupsDir.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        files.push({
          name: entry.name,
          size: file.size,
          lastModified: file.lastModified,
          handle: entry
        });
      }
    }
    
    return files.sort((a, b) => b.lastModified - a.lastModified);
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS list failed:', error);
    return [];
  }
}

/**
 * Cleanup old OPFS backups (7 daily + 3 weekly)
 * @param {FileSystemDirectoryHandle} backupsDir 
 */
async function cleanupOPFSBackups(backupsDir) {
  try {
    const files = [];
    for await (const entry of backupsDir.values()) {
      if (entry.kind === 'file') {
        const file = await entry.getFile();
        files.push({
          name: entry.name,
          lastModified: file.lastModified,
          handle: entry
        });
      }
    }
    
    // Sort by date (newest first)
    files.sort((a, b) => b.lastModified - a.lastModified);
    
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    
    let dailyCount = 0;
    let weeklyCount = 0;
    
    for (const file of files) {
      const age = now - file.lastModified;
      
      if (age < 7 * oneDay) {
        // Keep last 7 days
        dailyCount++;
      } else if (age < 30 * oneDay) {
        // Keep 3 weekly backups
        weeklyCount++;
        if (weeklyCount > 3) {
          await backupsDir.removeEntry(file.name);
          console.log('[Auto-Backup] Removed old OPFS backup:', file.name);
        }
      } else {
        // Remove older than 30 days
        await backupsDir.removeEntry(file.name);
        console.log('[Auto-Backup] Removed old OPFS backup:', file.name);
      }
    }
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS cleanup failed:', error);
  }
}

/**
 * Download OPFS backup file
 * @param {string} filename 
 */
async function downloadOPFSBackup(filename) {
  if (!isOPFSAvailable()) return;
  
  try {
    const root = await navigator.storage.getDirectory();
    const backupsDir = await root.getDirectoryHandle('backups', { create: true });
    const fileHandle = await backupsDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const content = await file.text();
    
    const dataBlob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS download failed:', error);
  }
}

/**
 * Restore from OPFS backup
 * @param {string} filename 
 */
async function restoreFromOPFS(filename) {
  if (!isOPFSAvailable()) return;
  
  try {
    const root = await navigator.storage.getDirectory();
    const backupsDir = await root.getDirectoryHandle('backups', { create: true });
    const fileHandle = await backupsDir.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const content = await file.text();
    const backup = JSON.parse(content);
    
    const analysis = await analyzeImport(backup);
    const proceed = confirm(
      `Restore from OPFS:\n\n` +
      `Workers: +${analysis.workers.added} ~${analysis.workers.updated} =${analysis.workers.skipped}\n` +
      `Projects: +${analysis.projects.added} ~${analysis.projects.updated} =${analysis.projects.skipped}\n` +
      `Entries: +${analysis.entries.added} ~${analysis.entries.updated} =${analysis.entries.skipped}\n\n` +
      `Proceed?`
    );
    
    if (proceed) {
      await importBackup(backup, false);
      alert('Restore completed!');
    }
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS restore failed:', error);
    alert('Restore failed!');
  }
}

/**
 * Delete OPFS backup
 * @param {string} filename 
 */
async function deleteOPFSBackup(filename) {
  if (!isOPFSAvailable()) return;
  
  try {
    const root = await navigator.storage.getDirectory();
    const backupsDir = await root.getDirectoryHandle('backups', { create: true });
    await backupsDir.removeEntry(filename);
    console.log('[Auto-Backup] Deleted OPFS backup:', filename);
    
  } catch (error) {
    console.error('[Auto-Backup] OPFS delete failed:', error);
  }
}

// ============================================
// AUTO-BACKUP: File System Access API
// ============================================

/**
 * Check if File System Access API is available
 * @returns {boolean}
 */
function isFSAccessAvailable() {
  return 'showSaveFilePicker' in window;
}

/**
 * Select persistent file for auto-backup
 * @returns {Promise<void>}
 */
async function selectPersistentFile() {
  if (!isFSAccessAvailable()) {
    alert('File System Access API není dostupné v tomto prohlížeči.');
    return;
  }
  
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'mst-auto-backup.json',
      types: [{
        description: 'JSON Files',
        accept: { 'application/json': ['.json'] }
      }]
    });
    
    fsHandle = handle;
    localStorage.setItem('mst:fsAccess:enabled', 'true');
    alert('Automatické ukládání do souboru aktivováno!');
    
    // Immediate save
    await saveToPersistentFile();
    
  } catch (error) {
    console.error('[Auto-Backup] FS Access selection failed:', error);
  }
}

/**
 * Save to persistent file (with debounce)
 * @returns {Promise<void>}
 */
async function saveToPersistentFile() {
  if (!fsHandle) return;
  
  // Clear existing timer
  if (fsDebounceTimer) {
    clearTimeout(fsDebounceTimer);
  }
  
  // Debounce
  fsDebounceTimer = setTimeout(async () => {
    try {
      const data = await window.IndexedDBService.loadAllData();
      const backup = await createBackupObject(data);
      const backupStr = JSON.stringify(backup, null, 2);
      
      const writable = await fsHandle.createWritable();
      await writable.write(backupStr);
      await writable.close();
      
      console.log('[Auto-Backup] Saved to persistent file');
      
    } catch (error) {
      console.error('[Auto-Backup] FS Access save failed:', error);
      // Permission lost - reset
      fsHandle = null;
      localStorage.removeItem('mst:fsAccess:enabled');
    }
  }, FS_DEBOUNCE);
}

/**
 * Disable persistent file auto-backup
 */
function disablePersistentFile() {
  fsHandle = null;
  localStorage.removeItem('mst:fsAccess:enabled');
  if (fsDebounceTimer) {
    clearTimeout(fsDebounceTimer);
  }
}

// ============================================
// AUTO-BACKUP: Trigger Logic
// ============================================

/**
 * Track change and trigger auto-backup if needed
 * @returns {Promise<void>}
 */
async function trackChange() {
  changeCounter++;
  const now = Date.now();
  const timeSinceLastBackup = now - lastBackupTime;
  
  const shouldBackup = 
    changeCounter >= BACKUP_TRIGGER_CHANGES || 
    timeSinceLastBackup >= BACKUP_TRIGGER_INTERVAL;
  
  if (shouldBackup) {
    await triggerAutoBackup();
    changeCounter = 0;
    lastBackupTime = now;
  }
}

/**
 * Trigger all auto-backup strategies
 * @returns {Promise<void>}
 */
async function triggerAutoBackup() {
  console.log('[Auto-Backup] Triggering auto-backup...');
  
  try {
    // localStorage slots
    await saveToLocalStorageSlot();
    
    // OPFS (if available)
    if (isOPFSAvailable()) {
      await saveToOPFS();
    }
    
    // FS Access (if enabled)
    if (fsHandle) {
      await saveToPersistentFile();
    }
    
    // Update meta
    await window.IndexedDBService.setMeta('lastBackupAt', new Date().toISOString());
    
  } catch (error) {
    console.error('[Auto-Backup] Trigger failed:', error);
  }
}

/**
 * Force manual auto-backup
 * @returns {Promise<void>}
 */
async function forceAutoBackup() {
  await triggerAutoBackup();
  alert('Záloha dokončena!');
}

// Export API
window.BackupService = {
  // Manual backup
  exportJSON,
  exportCSV,
  importJSON,
  importBackup,
  validateBackup,
  analyzeImport,
  
  // Auto-backup
  trackChange,
  triggerAutoBackup,
  forceAutoBackup,
  
  // localStorage slots
  getLocalStorageSlots,
  deleteLocalStorageSlot,
  
  // OPFS
  isOPFSAvailable,
  getOPFSBackups,
  downloadOPFSBackup,
  restoreFromOPFS,
  deleteOPFSBackup,
  
  // FS Access
  isFSAccessAvailable,
  selectPersistentFile,
  disablePersistentFile
};
