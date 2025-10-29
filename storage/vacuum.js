// ============================================
// Vacuum Module
// Cleans up soft-deleted entries older than 90 days
// ============================================

const VACUUM_RETENTION_DAYS = 90;
const VACUUM_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if entry should be vacuumed
 * @param {Object} entry 
 * @returns {boolean}
 */
function shouldVacuum(entry) {
  if (!entry.deleted) return false;
  
  const now = Date.now();
  const entryDate = entry.deletedAt ? new Date(entry.deletedAt).getTime() : 0;
  const age = now - entryDate;
  const retentionMs = VACUUM_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  return age > retentionMs;
}

/**
 * Run vacuum process
 * @returns {Promise<Object>} Vacuum report
 */
async function runVacuum() {
  console.log('[Vacuum] Starting vacuum process...');
  
  const report = {
    entriesRemoved: 0,
    workersRemoved: 0,
    projectsRemoved: 0,
    startedAt: new Date().toISOString(),
    completedAt: null
  };
  
  try {
    const data = await window.IndexedDBService.loadAllData();
    
    // Vacuum work entries
    const entriesToKeep = data.workEntries.filter(entry => {
      if (shouldVacuum(entry)) {
        report.entriesRemoved++;
        return false;
      }
      return true;
    });
    
    // Vacuum workers
    const workersToKeep = data.workers.filter(worker => {
      if (shouldVacuum(worker)) {
        report.workersRemoved++;
        return false;
      }
      return true;
    });
    
    // Vacuum projects
    const projectsToKeep = data.projects.filter(project => {
      if (shouldVacuum(project)) {
        report.projectsRemoved++;
        return false;
      }
      return true;
    });
    
    // Save cleaned data
    await window.IndexedDBService.saveAllData({
      workers: workersToKeep,
      projects: projectsToKeep,
      workEntries: entriesToKeep
    });
    
    // Update meta
    report.completedAt = new Date().toISOString();
    await window.IndexedDBService.setMeta('lastVacuumAt', report.completedAt);
    
    console.log('[Vacuum] Complete:', report);
    return report;
    
  } catch (error) {
    console.error('[Vacuum] Failed:', error);
    throw error;
  }
}

/**
 * Schedule automatic vacuum
 */
function scheduleVacuum() {
  // Run vacuum once per day
  setInterval(async () => {
    const lastVacuum = await window.IndexedDBService.getMeta('lastVacuumAt');
    const now = Date.now();
    
    if (!lastVacuum) {
      await runVacuum();
      return;
    }
    
    const lastVacuumTime = new Date(lastVacuum).getTime();
    const timeSinceLastVacuum = now - lastVacuumTime;
    
    if (timeSinceLastVacuum >= VACUUM_INTERVAL) {
      await runVacuum();
    }
  }, VACUUM_INTERVAL);
  
  console.log('[Vacuum] Scheduled automatic vacuum');
}

/**
 * Check if vacuum is needed
 * @returns {Promise<boolean>}
 */
async function needsVacuum() {
  const lastVacuum = await window.IndexedDBService.getMeta('lastVacuumAt');
  if (!lastVacuum) return true;
  
  const now = Date.now();
  const lastVacuumTime = new Date(lastVacuum).getTime();
  const timeSinceLastVacuum = now - lastVacuumTime;
  
  return timeSinceLastVacuum >= VACUUM_INTERVAL;
}

// Export API
window.VacuumService = {
  runVacuum,
  scheduleVacuum,
  needsVacuum,
  VACUUM_RETENTION_DAYS
};
