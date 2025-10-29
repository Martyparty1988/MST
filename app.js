/*
MST - Marty Solar Tracker
Refactor: IndexedDB persistent storage + multilayer backup strategy
*/
// =============================
// Constants & Utilities
// =============================
const SCHEMA_VERSION = 1;
const DB_NAME = 'mst';
const STORE_RECORDS = 'records';
const STORE_META = 'meta';
const LS_MIGRATED = 'mst:migrated';
const LS_ADMIN_SESSION = 'mst:adminSession';
const LS_AUTO_INDEX = 'mst:autoBackup:index';
const AUTO_SLOTS = 5;
const AUTO_SLOT_KEY = (i) => `mst:autoBackup:slot:${i}`;
const ADMIN_SECRET = 'mst2025';
const ADMIN_SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8h
const AUTO_BACKUP_CHANGE_THRESHOLD = 25;
const AUTO_BACKUP_TIME_MS = 60 * 1000;
const FS_DEBOUNCE_MS = 30 * 1000;
const nowIso = () => new Date().toISOString();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function uid(prefix='id') {
  return `${prefix}_${Math.random().toString(36).slice(2,10)}_${Date.now()}`;
}
function downloadBlob(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
// =============================
// ... other functions omitted for brevity (unchanged from previous content) ...
// =============================
// Auto-backup scheduler
// =============================
function scheduleAutoBackups() {
  const now = Date.now();
  if (changeCounter >= AUTO_BACKUP_CHANGE_THRESHOLD || now - lastAutoBackupAt >= AUTO_BACKUP_TIME_MS) {
    doLocalStorageAutoBackup();
    writeOPFSBackup();
    scheduleFSWrite();
    lastAutoBackupAt = now;
    changeCounter = 0;
  }
}
// =============================
// Export / Import
// =============================
function exportJSON() {
  const name = `mst-backup-${new Date().toISOString().replace(/[:]/g,'-').slice(0,19)}.json`;
  const blob = new Blob([serializeBackupBlob()], { type: 'application/json;charset=utf-8' });
  downloadBlob(name, blob);
}
function exportCSV() {
  const headers = ['ID','Type','Date','Time','Project','Worker/Workers','Table Number','Hours','Reward Per Worker','Total Amount'];
  const rows = appState.workEntries.map(e => ({
    'ID': e.id,
    'Type': e.entryType || '',
    'Date': e.date || '',
    'Time': e.time || '',
    'Project': e.projectId || '',
    'Worker/Workers': Array.isArray(e.workerIds) ? e.workerIds.join(' | ') : (e.workerId || ''),
    'Table Number': e.tableNumber || '',
    'Hours': e.hours || 0,
    'Reward Per Worker': e.rewardPerWorker || 0,
    'Total Amount': e.totalAmount || 0,
  }));
  const csv = toCSV(rows, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const name = `mst-entries-${new Date().toISOString().slice(0,10)}.csv`;
  downloadBlob(name, blob);
}
async function importJSONFile(file, { mode = 'soft' } = {}) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  // Validate
  if (!parsed || parsed.version == null || parsed.schemaVersion == null ||
      !Array.isArray(parsed.workers) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.entries)) {
    throw new Error('Invalid backup format');
  }
  // Apply import based on mode
  if (mode === 'hard') {
    // Hard mode: replace everything
    appState.workers = parsed.workers || [];
    appState.projects = parsed.projects || [];
    appState.workEntries = parsed.entries || [];
    const allRecords = [...appState.workers, ...appState.projects, ...appState.workEntries];
    await idbBulkReplace(allRecords);
  } else {
    // Soft mode: merge with LWW
    const incoming = [...(parsed.workers || []), ...(parsed.projects || []), ...(parsed.entries || [])];
    await saveRecordsLWW(incoming);
    await loadStateFromDB();
  }
  changeCounter = 0;
  lastAutoBackupAt = Date.now();
  render();
}
