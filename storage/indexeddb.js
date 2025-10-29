// ============================================
// IndexedDB Storage Module
// Main persistence layer for MST application
// ============================================

const DB_NAME = 'mst-db';
const DB_VERSION = 1;
const STORES = {
  RECORDS: 'records',
  META: 'meta'
};

let dbInstance = null;

/**
 * Initialize IndexedDB connection
 * @returns {Promise<IDBDatabase>}
 */
async function initDB() {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create records store (workers, projects, entries)
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        db.createObjectStore(STORES.RECORDS);
      }

      // Create meta store (schemaVersion, lastBackupAt, lastVacuumAt)
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META);
      }

      console.log('[IndexedDB] Database upgraded to version', DB_VERSION);
    };
  });
}

/**
 * Get value from store
 * @param {string} storeName 
 * @param {string} key 
 * @returns {Promise<any>}
 */
async function getItem(storeName, key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Set value in store
 * @param {string} storeName 
 * @param {string} key 
 * @param {any} value 
 * @returns {Promise<void>}
 */
async function setItem(storeName, key, value) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete value from store
 * @param {string} storeName 
 * @param {string} key 
 * @returns {Promise<void>}
 */
async function deleteItem(storeName, key) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all keys from store
 * @param {string} storeName 
 * @returns {Promise<string[]>}
 */
async function getAllKeys(storeName) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAllKeys();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load workers from IndexedDB
 * @returns {Promise<Array>}
 */
async function loadWorkers() {
  const workers = await getItem(STORES.RECORDS, 'workers');
  return workers || [];
}

/**
 * Save workers to IndexedDB
 * @param {Array} workers 
 * @returns {Promise<void>}
 */
async function saveWorkers(workers) {
  // Add timestamps
  const now = new Date().toISOString();
  const workersWithTimestamps = workers.map(w => ({
    ...w,
    updatedAt: w.updatedAt || now,
    createdAt: w.createdAt || now
  }));
  await setItem(STORES.RECORDS, 'workers', workersWithTimestamps);
}

/**
 * Load projects from IndexedDB
 * @returns {Promise<Array>}
 */
async function loadProjects() {
  const projects = await getItem(STORES.RECORDS, 'projects');
  return projects || [];
}

/**
 * Save projects to IndexedDB
 * @param {Array} projects 
 * @returns {Promise<void>}
 */
async function saveProjects(projects) {
  const now = new Date().toISOString();
  const projectsWithTimestamps = projects.map(p => ({
    ...p,
    updatedAt: p.updatedAt || now,
    createdAt: p.createdAt || (p.createdAt ? new Date(p.createdAt).toISOString() : now)
  }));
  await setItem(STORES.RECORDS, 'projects', projectsWithTimestamps);
}

/**
 * Load work entries from IndexedDB
 * @returns {Promise<Array>}
 */
async function loadWorkEntries() {
  const entries = await getItem(STORES.RECORDS, 'entries');
  return entries || [];
}

/**
 * Save work entries to IndexedDB
 * @param {Array} entries 
 * @returns {Promise<void>}
 */
async function saveWorkEntries(entries) {
  const now = new Date().toISOString();
  const entriesWithTimestamps = entries.map(e => ({
    ...e,
    updatedAt: e.updatedAt || now,
    createdAt: e.createdAt || (e.timestamp ? new Date(e.timestamp).toISOString() : now)
  }));
  await setItem(STORES.RECORDS, 'entries', entriesWithTimestamps);
}

/**
 * Load all data from IndexedDB
 * @returns {Promise<Object>}
 */
async function loadAllData() {
  const [workers, projects, workEntries] = await Promise.all([
    loadWorkers(),
    loadProjects(),
    loadWorkEntries()
  ]);
  return { workers, projects, workEntries };
}

/**
 * Save all data to IndexedDB
 * @param {Object} data 
 * @returns {Promise<void>}
 */
async function saveAllData(data) {
  await Promise.all([
    saveWorkers(data.workers || []),
    saveProjects(data.projects || []),
    saveWorkEntries(data.workEntries || [])
  ]);
}

/**
 * Get meta information
 * @param {string} key 
 * @returns {Promise<any>}
 */
async function getMeta(key) {
  return await getItem(STORES.META, key);
}

/**
 * Set meta information
 * @param {string} key 
 * @param {any} value 
 * @returns {Promise<void>}
 */
async function setMeta(key, value) {
  await setItem(STORES.META, key, value);
}

/**
 * Initialize meta values
 * @returns {Promise<void>}
 */
async function initMeta() {
  const schemaVersion = await getMeta('schemaVersion');
  if (!schemaVersion) {
    await setMeta('schemaVersion', DB_VERSION);
    await setMeta('lastBackupAt', null);
    await setMeta('lastVacuumAt', null);
  }
}

// Export API
window.IndexedDBService = {
  initDB,
  loadWorkers,
  saveWorkers,
  loadProjects,
  saveProjects,
  loadWorkEntries,
  saveWorkEntries,
  loadAllData,
  saveAllData,
  getMeta,
  setMeta,
  initMeta,
  DB_VERSION
};
