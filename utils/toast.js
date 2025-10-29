// ============================================
// Toast Notification System
// Provides user feedback for actions
// ============================================

const TOAST_DURATION = 3000; // 3 seconds default
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

let toastContainer = null;
let toastQueue = [];
let currentToast = null;

/**
 * Initialize toast container
 */
function initToastSystem() {
  if (toastContainer) return;

  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  // Add CSS styles
  addToastStyles();
}

/**
 * Add toast styles to document
 */
function addToastStyles() {
  if (document.getElementById('toast-styles')) return;

  const styleElement = document.createElement('style');
  styleElement.id = 'toast-styles';
  styleElement.textContent = `
    .toast-container {
      position: fixed;
      top: 90px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      background: var(--bg-secondary);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius-md);
      padding: 16px 20px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: var(--shadow-lg);
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;
      animation: slideInRight 0.3s var(--ease-standard);
      backdrop-filter: blur(20px);
    }

    .toast.removing {
      animation: slideOutRight 0.3s var(--ease-standard) forwards;
    }

    .toast-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .toast-content {
      flex: 1;
    }

    .toast-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    .toast-message {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.4;
    }

    .toast-close {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: var(--text-primary);
    }

    .toast.success {
      border-left: 4px solid var(--mst-accent);
    }

    .toast.success .toast-icon {
      color: var(--mst-accent);
    }

    .toast.error {
      border-left: 4px solid var(--mst-danger);
    }

    .toast.error .toast-icon {
      color: var(--mst-danger);
    }

    .toast.warning {
      border-left: 4px solid var(--mst-warning);
    }

    .toast.warning .toast-icon {
      color: var(--mst-warning);
    }

    .toast.info {
      border-left: 4px solid var(--mst-primary);
    }

    .toast.info .toast-icon {
      color: var(--mst-primary);
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideOutRight {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    @media (max-width: 768px) {
      .toast-container {
        top: 80px;
        right: 10px;
        left: 10px;
      }

      .toast {
        min-width: unset;
        max-width: unset;
      }
    }
  `;
  document.head.appendChild(styleElement);
}

/**
 * Get icon for toast type
 * @param {string} type
 * @returns {string}
 */
function getToastIcon(type) {
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      return '✅';
    case TOAST_TYPES.ERROR:
      return '❌';
    case TOAST_TYPES.WARNING:
      return '⚠️';
    case TOAST_TYPES.INFO:
      return 'ℹ️';
    default:
      return 'ℹ️';
  }
}

/**
 * Show toast notification
 * @param {Object} options
 * @param {string} options.title - Toast title
 * @param {string} options.message - Toast message
 * @param {string} options.type - Toast type (success, error, warning, info)
 * @param {number} options.duration - Duration in ms (0 = no auto-dismiss)
 */
function showToast({ title, message, type = TOAST_TYPES.INFO, duration = TOAST_DURATION }) {
  initToastSystem();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = getToastIcon(type);

  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      ${title ? `<div class="toast-title">${title}</div>` : ''}
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close">×</button>
  `;

  // Close button handler
  const closeButton = toast.querySelector('.toast-close');
  closeButton.addEventListener('click', () => {
    removeToast(toast);
  });

  // Add to container
  toastContainer.appendChild(toast);

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  return toast;
}

/**
 * Remove toast
 * @param {HTMLElement} toast
 */
function removeToast(toast) {
  if (!toast || !toast.parentElement) return;

  toast.classList.add('removing');
  setTimeout(() => {
    if (toast.parentElement) {
      toast.parentElement.removeChild(toast);
    }
  }, 300);
}

/**
 * Show success toast
 * @param {string} message
 * @param {string} title
 * @param {number} duration
 */
function showSuccess(message, title = 'Success', duration = TOAST_DURATION) {
  return showToast({ title, message, type: TOAST_TYPES.SUCCESS, duration });
}

/**
 * Show error toast
 * @param {string} message
 * @param {string} title
 * @param {number} duration
 */
function showError(message, title = 'Error', duration = 5000) {
  return showToast({ title, message, type: TOAST_TYPES.ERROR, duration });
}

/**
 * Show warning toast
 * @param {string} message
 * @param {string} title
 * @param {number} duration
 */
function showWarning(message, title = 'Warning', duration = TOAST_DURATION) {
  return showToast({ title, message, type: TOAST_TYPES.WARNING, duration });
}

/**
 * Show info toast
 * @param {string} message
 * @param {string} title
 * @param {number} duration
 */
function showInfo(message, title = 'Info', duration = TOAST_DURATION) {
  return showToast({ title, message, type: TOAST_TYPES.INFO, duration });
}

/**
 * Clear all toasts
 */
function clearAllToasts() {
  if (!toastContainer) return;
  const toasts = toastContainer.querySelectorAll('.toast');
  toasts.forEach(toast => removeToast(toast));
}

// Export API
window.Toast = {
  show: showToast,
  success: showSuccess,
  error: showError,
  warning: showWarning,
  info: showInfo,
  clear: clearAllToasts,
  TYPES: TOAST_TYPES
};

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToastSystem);
} else {
  initToastSystem();
}
