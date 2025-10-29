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

function toCSV(rows, headers) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v).replaceAll('"', '""');
    if (/[",\n]/.test(s)) return `"${s}"`;
    return s;
  };
  return [headers.join(',')].concat(rows.map(r => headers.map(h => esc(r[h])).join(','))).join('\n');
}

// =============================
// State
// =============================
let appState = { workers: [], projects: [], workEntries: [] };
let adminSession = null; // { token, createdAt }
let clickCount = 0;
let clickTimestamps = [];
let currentPage = 'plan';

let changeCounter = 0;
let lastAutoBackupAt = 0;
let fsAccessHandle = null; // File System Access API file handle (not persisted)
let fsDebounceTimer = null;

// =============================
// IndexedDB layer
// =============================
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
    req.onupgradeneeded = (e) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_RECORDS)) {
        db.createObjectStore(STORE_RECORDS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAllRecords() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readonly');
    const store = tx.objectStore(STORE_RECORDS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutRecords(records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDS);
    records.forEach(r => store.put(r));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbBulkReplace(records) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_RECORDS, 'readwrite');
    const store = tx.objectStore(STORE_RECORDS);
    // Clear and add
    const clearReq = store.clear();
    clearReq.onsuccess = () => {
      records.forEach(r => store.add(r));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetMeta(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly');
    const store = tx.objectStore(STORE_META);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result?.value);
    req.onerror = () => reject(req.error);
  });
}

async function idbSetMeta(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readwrite');
    const store = tx.objectStore(STORE_META);
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// =============================
// Migration from localStorage
// =============================
async function maybeMigrateFromLocalStorage() {
  if (localStorage.getItem(LS_MIGRATED)) return;
  const rawWorkers = localStorage.getItem('mst:workers');
  const rawProjects = localStorage.getItem('mst:projects');
  const rawEntries = localStorage.getItem('mst:workEntries');
  let workers = []; let projects = []; let entries = [];
  try { workers = rawWorkers ? JSON.parse(rawWorkers) : []; } catch {}
  try { projects = rawProjects ? JSON.parse(rawProjects) : []; } catch {}
  try { entries = rawEntries ? JSON.parse(rawEntries) : []; } catch {}

  // Deduplicate by id
  const byId = new Map();
  [...workers, ...projects, ...entries].forEach(item => {
    if (!item || !item.id) return;
    const prev = byId.get(item.id);
    if (!prev || (item.updatedAt && prev?.updatedAt && item.updatedAt > prev.updatedAt)) {
      byId.set(item.id, item);
    }
  });
  await idbPutRecords(Array.from(byId.values()));
  localStorage.setItem(LS_MIGRATED, '1');
}

// =============================
// Load/Save state with LWW
// =============================
async function loadStateFromDB() {
  const records = await idbGetAllRecords();
  appState = { workers: [], projects: [], workEntries: [] };
  for (const r of records) {
    if (r.type === 'worker') appState.workers.push(r);
    else if (r.type === 'project') appState.projects.push(r);
    else if (r.type === 'entry') appState.workEntries.push(r);
  }
}

async function saveRecordsLWW(items) {
  // items: array of {id, type, updatedAt, ...}
  await idbPutRecords(items);
  await idbSetMeta('lastBackupAt', Date.now());
  changeCounter += items.length;
  scheduleAutoBackups();
}

// =============================
// Auto backups: LocalStorage ring buffer
// =============================
function getAutoIndex() {
  const raw = localStorage.getItem(LS_AUTO_INDEX);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return { currentSlot: 0, lastBackupAt: 0, metadata: {} };
}

function setAutoIndex(idx) {
  localStorage.setItem(LS_AUTO_INDEX, JSON.stringify(idx));
}

function serializeBackupBlob() {
  const payload = {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowIso(),
    workers: appState.workers,
    projects: appState.projects,
    entries: appState.workEntries,
    meta: {
      lastBackupAt: Date.now(),
      lastVacuumAt: null,
    },
  };
  return JSON.stringify(payload);
}

function doLocalStorageAutoBackup() {
  const idx = getAutoIndex();
  const next = (idx.currentSlot + 1) % AUTO_SLOTS;
  const data = serializeBackupBlob();
  localStorage.setItem(AUTO_SLOT_KEY(next), data);
  const size = new Blob([data]).size;
  const info = { size, savedAt: nowIso() };
  const metadata = { ...idx.metadata, [next]: info };
  const updated = { currentSlot: next, lastBackupAt: Date.now(), metadata };
  setAutoIndex(updated);
}

// =============================
// Auto backups: OPFS
// =============================
async function getOPFSRoot() {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) return null;
  try { return await navigator.storage.getDirectory(); } catch { return null; }
}

async function ensureOPFSBackupsDir() {
  const root = await getOPFSRoot();
  if (!root) return null;
  try { return await root.getDirectoryHandle('backups', { create: true }); } catch { return null; }
}

function opfsFilename(date = new Date()) {
  const y = date.toISOString().slice(0,10);
  return `mst-auto-${y}.json`;
}

async function listOPFSBackups() {
  const dir = await ensureOPFSBackupsDir();
  if (!dir) return [];
  const files = [];
  for await (const [name, handle] of dir.entries()) {
    if (name.endsWith('.json')) files.push({ name, handle });
  }
  return files;
}

async function writeOPFSBackup() {
  const dir = await ensureOPFSBackupsDir();
  if (!dir) return;
  const name = opfsFilename(new Date());
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  const data = serializeBackupBlob();
  await writable.write(new Blob([data], { type: 'application/json' }));
  await writable.close();
  await enforceOPFSRetention(dir);
}

async function enforceOPFSRetention(dir) {
  const entries = await listOPFSBackups();
  // Keep last 7 daily and 3 weekly within 30 days
  const now = Date.now();
  const within30 = entries.filter(async f => {
    try { const file = await f.handle.getFile(); return now - file.lastModified <= 30*24*60*60*1000; } catch { return false; }
  });
  // Sort by date descending using name
  entries.sort((a,b)=> a.name.localeCompare(b.name));
  // Delete older than 30 days
  for (const e of entries) {
    try {
      const file = await e.handle.getFile();
      if (now - file.lastModified > 30*24*60*60*1000) {
        await dir.removeEntry(e.name);
      }
    } catch {}
  }
  // Retain policy simplified: keep last 7 files by name
  const toDelete = entries.slice(0, Math.max(0, entries.length - 7));
  for (const e of toDelete) {
    try { await dir.removeEntry(e.name); } catch {}
  }
}

// =============================
// Auto backups: File System Access API (optional)
// =============================
function hasFSAccess() {
  return 'showSaveFilePicker' in window;
}

async function activateFSAccess() {
  if (!hasFSAccess()) return null;
  try {
    fsAccessHandle = await window.showSaveFilePicker({
      suggestedName: 'mst-auto-backup.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
    });
    scheduleFSWrite();
    return true;
  } catch { return null; }
}

function deactivateFSAccess() {
  fsAccessHandle = null;
  if (fsDebounceTimer) { clearTimeout(fsDebounceTimer); fsDebounceTimer = null; }
}

function scheduleFSWrite() {
  if (!fsAccessHandle) return;
  if (fsDebounceTimer) clearTimeout(fsDebounceTimer);
  fsDebounceTimer = setTimeout(writeFSAccessBackup, FS_DEBOUNCE_MS);
}

async function writeFSAccessBackup() {
  if (!fsAccessHandle) return;
  try {
    const writable = await fsAccessHandle.createWritable();
    const data = serializeBackupBlob();
    await writable.write(data);
    await writable.close();
  } catch {}
}

// =============================
// Service Worker Sync (best-effort)
// =============================
async function tryRegisterSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ('periodicSync' in reg) {
      try { await reg.periodicSync.register('mst-auto-backup', { minInterval: 24*60*60*1000 }); } catch {}
    }
    if ('sync' in reg) {
      try { await reg.sync.register('mst-backup-sync'); } catch {}
    }
  } catch {}
}

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
  if (!parsed || parsed.version == null || parsed.schemaVersion == null || !Array.isArray(parsed.workers) || !Array.isArray
