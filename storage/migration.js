// ============================================
// Migration Module
// Migrates data from localStorage to IndexedDB
// ============================================

/**
 * Check if migration is needed
 * @returns {boolean}
 */
function needsMigration() {
  // Check if data exists in localStorage
  const hasLegacyData = localStorage.getItem('mst:workers') || 
                        localStorage.getItem('mst:projects') || 
                        localStorage.getItem('mst:workEntries');
  return !!hasLegacyData;
}

/**
 * Migrate data from localStorage to IndexedDB
 * @returns {Promise<Object>} Migration report
 */
async function migrateFromLocalStorage() {
  console.log('[Migration] Starting migration from localStorage...');

  const report = {
    workers: { migrated: 0, skipped: 0 },
    projects: { migrated: 0, skipped: 0 },
    workEntries: { migrated: 0, skipped: 0 }
  };

  try {
    // Load existing IndexedDB data
    const existingData = await window.IndexedDBService.loadAllData();
    const existingWorkerIds = new Set(existingData.workers.map(w => w.id));
    const existingProjectIds = new Set(existingData.projects.map(p => p.id));
    const existingEntryIds = new Set(existingData.workEntries.map(e => e.id));

    // Migrate workers
    const legacyWorkers = JSON.parse(localStorage.getItem('mst:workers') || '[]');
    const workersToMigrate = legacyWorkers.filter(w => {
      if (existingWorkerIds.has(w.id)) {
        report.workers.skipped++;
        return false;
      }
      report.workers.migrated++;
      return true;
    });

    // Migrate projects
    const legacyProjects = JSON.parse(localStorage.getItem('mst:projects') || '[]');
    const projectsToMigrate = legacyProjects.filter(p => {
      if (existingProjectIds.has(p.id)) {
        report.projects.skipped++;
        return false;
      }
      report.projects.migrated++;
      return true;
    });

    // Migrate work entries
    const legacyEntries = JSON.parse(localStorage.getItem('mst:workEntries') || '[]');
    const entriesToMigrate = legacyEntries.filter(e => {
      if (existingEntryIds.has(e.id)) {
        report.workEntries.skipped++;
        return false;
      }
      report.workEntries.migrated++;
      return true;
    });

    // Save migrated data
    const migratedData = {
      workers: [...existingData.workers, ...workersToMigrate],
      projects: [...existingData.projects, ...projectsToMigrate],
      workEntries: [...existingData.workEntries, ...entriesToMigrate]
    };

    await window.IndexedDBService.saveAllData(migratedData);

    // Mark migration as complete
    localStorage.setItem('mst:migrated', 'true');
    localStorage.setItem('mst:migratedAt', new Date().toISOString());

    console.log('[Migration] Complete:', report);
    return report;

  } catch (error) {
    console.error('[Migration] Failed:', error);
    throw error;
  }
}

/**
 * Clean up old localStorage data (optional)
 * Keeps only admin session and backup indexes
 */
function cleanupLegacyStorage() {
  const keysToKeep = ['mst:adminSession', 'mst:migrated', 'mst:migratedAt'];
  
  // Remove old data keys
  ['mst:workers', 'mst:projects', 'mst:workEntries'].forEach(key => {
    localStorage.removeItem(key);
  });

  console.log('[Migration] Legacy storage cleaned up');
}

/**
 * Perform migration if needed
 * @returns {Promise<void>}
 */
async function performMigrationIfNeeded() {
  const migrated = localStorage.getItem('mst:migrated');
  
  if (!migrated && needsMigration()) {
    const report = await migrateFromLocalStorage();
    
    // Show user notification
    if (report.workers.migrated > 0 || report.projects.migrated > 0 || report.workEntries.migrated > 0) {
      console.log(`[Migration] Migrated: ${report.workers.migrated} workers, ${report.projects.migrated} projects, ${report.workEntries.migrated} entries`);
    }
    
    return report;
  }
  
  return null;
}

// Export API
window.MigrationService = {
  needsMigration,
  migrateFromLocalStorage,
  cleanupLegacyStorage,
  performMigrationIfNeeded
};
