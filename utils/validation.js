// ============================================
// Form Validation Utilities
// Provides data validation and sanitization
// ============================================

/**
 * Validate worker data
 * @param {Object} worker
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateWorker(worker) {
  const errors = [];

  if (!worker.name || worker.name.trim() === '') {
    errors.push('Worker name is required');
  }

  if (worker.name && worker.name.length > 100) {
    errors.push('Worker name must be less than 100 characters');
  }

  if (!worker.workerCode || worker.workerCode.trim() === '') {
    errors.push('Worker code is required');
  }

  if (worker.workerCode && !/^[A-Z0-9-]+$/i.test(worker.workerCode)) {
    errors.push('Worker code must contain only letters, numbers, and hyphens');
  }

  if (!worker.hourlyRate || isNaN(parseFloat(worker.hourlyRate))) {
    errors.push('Valid hourly rate is required');
  }

  if (worker.hourlyRate && parseFloat(worker.hourlyRate) < 0) {
    errors.push('Hourly rate cannot be negative');
  }

  if (worker.hourlyRate && parseFloat(worker.hourlyRate) > 10000) {
    errors.push('Hourly rate seems unreasonably high (max: 10,000)');
  }

  if (!worker.color || !isValidColor(worker.color)) {
    errors.push('Valid color is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate project data
 * @param {Object} project
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateProject(project) {
  const errors = [];

  if (!project.name || project.name.trim() === '') {
    errors.push('Project name is required');
  }

  if (project.name && project.name.length > 200) {
    errors.push('Project name must be less than 200 characters');
  }

  if (!project.location || project.location.trim() === '') {
    errors.push('Project location is required');
  }

  if (project.location && project.location.length > 200) {
    errors.push('Project location must be less than 200 characters');
  }

  if (project.startDate && !isValidDate(project.startDate)) {
    errors.push('Invalid start date format');
  }

  if (project.endDate && !isValidDate(project.endDate)) {
    errors.push('Invalid end date format');
  }

  if (project.startDate && project.endDate) {
    const start = new Date(project.startDate);
    const end = new Date(project.endDate);
    if (end < start) {
      errors.push('End date cannot be before start date');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate task entry data
 * @param {Object} entry
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateTaskEntry(entry) {
  const errors = [];

  if (!entry.projectId || entry.projectId.trim() === '') {
    errors.push('Project is required');
  }

  if (!entry.workers || !Array.isArray(entry.workers) || entry.workers.length === 0) {
    errors.push('At least one worker is required');
  }

  if (!entry.tableNumber || entry.tableNumber.trim() === '') {
    errors.push('Table number is required');
  }

  if (entry.tableNumber && entry.tableNumber.length > 50) {
    errors.push('Table number must be less than 50 characters');
  }

  if (!entry.rewardPerWorker || isNaN(parseFloat(entry.rewardPerWorker))) {
    errors.push('Valid reward per worker is required');
  }

  if (entry.rewardPerWorker && parseFloat(entry.rewardPerWorker) < 0) {
    errors.push('Reward cannot be negative');
  }

  if (entry.rewardPerWorker && parseFloat(entry.rewardPerWorker) > 100000) {
    errors.push('Reward seems unreasonably high (max: 100,000)');
  }

  if (!entry.timestamp || !isValidDate(entry.timestamp)) {
    errors.push('Valid date is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate hourly entry data
 * @param {Object} entry
 * @returns {Object} { valid: boolean, errors: string[] }
 */
function validateHourlyEntry(entry) {
  const errors = [];

  if (!entry.projectId || entry.projectId.trim() === '') {
    errors.push('Project is required');
  }

  if (!entry.workerId || entry.workerId.trim() === '') {
    errors.push('Worker is required');
  }

  if (!entry.totalHours || isNaN(parseFloat(entry.totalHours))) {
    errors.push('Valid hours worked is required');
  }

  if (entry.totalHours && parseFloat(entry.totalHours) <= 0) {
    errors.push('Hours must be greater than 0');
  }

  if (entry.totalHours && parseFloat(entry.totalHours) > 24) {
    errors.push('Hours cannot exceed 24 in a single entry');
  }

  if (!entry.timestamp || !isValidDate(entry.timestamp)) {
    errors.push('Valid date is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if string is valid date
 * @param {string} dateString
 * @returns {boolean}
 */
function isValidDate(dateString) {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Check if string is valid hex color
 * @param {string} color
 * @returns {boolean}
 */
function isValidColor(color) {
  if (!color) return false;
  // Check hex color format
  if (/^#[0-9A-F]{6}$/i.test(color)) return true;
  // Check rgb/rgba format
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) return true;
  return false;
}

/**
 * Sanitize string input
 * @param {string} input
 * @returns {string}
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';
  // Remove any HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitize number input
 * @param {any} input
 * @param {number} defaultValue
 * @returns {number}
 */
function sanitizeNumber(input, defaultValue = 0) {
  const num = parseFloat(input);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Validate and sanitize worker
 * @param {Object} worker
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
function processWorker(worker) {
  const sanitized = {
    ...worker,
    name: sanitizeString(worker.name),
    workerCode: sanitizeString(worker.workerCode).toUpperCase(),
    hourlyRate: sanitizeNumber(worker.hourlyRate, 0),
    color: sanitizeString(worker.color)
  };

  const validation = validateWorker(sanitized);

  return {
    ...validation,
    data: sanitized
  };
}

/**
 * Validate and sanitize project
 * @param {Object} project
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
function processProject(project) {
  const sanitized = {
    ...project,
    name: sanitizeString(project.name),
    location: sanitizeString(project.location),
    status: sanitizeString(project.status) || 'active'
  };

  const validation = validateProject(sanitized);

  return {
    ...validation,
    data: sanitized
  };
}

/**
 * Validate and sanitize task entry
 * @param {Object} entry
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
function processTaskEntry(entry) {
  const sanitized = {
    ...entry,
    projectId: sanitizeString(entry.projectId),
    tableNumber: sanitizeString(entry.tableNumber),
    rewardPerWorker: sanitizeNumber(entry.rewardPerWorker, 0),
    workers: Array.isArray(entry.workers) ? entry.workers : []
  };

  const validation = validateTaskEntry(sanitized);

  return {
    ...validation,
    data: sanitized
  };
}

/**
 * Validate and sanitize hourly entry
 * @param {Object} entry
 * @returns {Object} { valid: boolean, errors: string[], data: Object }
 */
function processHourlyEntry(entry) {
  const sanitized = {
    ...entry,
    projectId: sanitizeString(entry.projectId),
    workerId: sanitizeString(entry.workerId),
    totalHours: sanitizeNumber(entry.totalHours, 0)
  };

  const validation = validateHourlyEntry(sanitized);

  return {
    ...validation,
    data: sanitized
  };
}

/**
 * Check for duplicate worker code
 * @param {string} workerCode
 * @param {string} excludeId
 * @param {Array} workers
 * @returns {boolean}
 */
function isDuplicateWorkerCode(workerCode, excludeId, workers) {
  return workers.some(w =>
    w.workerCode.toLowerCase() === workerCode.toLowerCase() && w.id !== excludeId
  );
}

/**
 * Check for duplicate project name
 * @param {string} projectName
 * @param {string} excludeId
 * @param {Array} projects
 * @returns {boolean}
 */
function isDuplicateProjectName(projectName, excludeId, projects) {
  return projects.some(p =>
    p.name.toLowerCase() === projectName.toLowerCase() && p.id !== excludeId
  );
}

// Export API
window.Validation = {
  // Validators
  validateWorker,
  validateProject,
  validateTaskEntry,
  validateHourlyEntry,

  // Processors (validate + sanitize)
  processWorker,
  processProject,
  processTaskEntry,
  processHourlyEntry,

  // Helpers
  isValidDate,
  isValidColor,
  sanitizeString,
  sanitizeNumber,
  isDuplicateWorkerCode,
  isDuplicateProjectName
};
