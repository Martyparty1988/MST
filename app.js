// ============================================
// MST - Marty Solar Tracker
// Main Application (Optimized & Refactored)
// ============================================
// =============================
// Constants
// =============================
const ADMIN_PASSWORD = 'mst2025';
const ADMIN_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours
const SECRET_CLICK_COUNT = 5;
const SECRET_CLICK_WINDOW = 3000; // 3 seconds
// =============================
// State
// =============================
let appState = {
  workers: [],
  projects: [],
  workEntries: []
};
let adminSession = null;
let secretClickCount = 0;
let secretClickTimer = null;
let currentPage = 'plan';

// =============================
// I18N Helpers (switch only; actual implementation in i18n module)
// =============================
async function switchLanguage(lang) {
  if (window.i18n && typeof window.i18n.setLanguage === 'function') {
    try {
      await window.i18n.setLanguage(lang);
      // re-render current page to reflect language change
      if (typeof render === 'function') render();

      if (window.Toast && typeof window.Toast.success === 'function') {
        const message = window.i18n.t('messages.languageChanged');
        const title = window.i18n.t('messages.successTitle');
        window.Toast.success(message, title);
      }
    } catch (error) {
      console.error('Language switch failed', error);
      if (window.Toast && typeof window.Toast.error === 'function') {
        const fallbackTitle = 'Error';
        const message = window.i18n?.t('messages.languageChangeFailed') || 'Failed to change language';
        const title = window.i18n?.t('messages.errorTitle') || fallbackTitle;
        window.Toast.error(message, title);
      }
    }
  }
}

// =============================
// Initialization
// =============================
async function init() {  
  try {    
    showLoading('Initializing app...');

    // Initialize IndexedDB
    await window.IndexedDBService.initDB();

    // Initialize I18N (per I18N_IMPLEMENTATION.md)
    if (window.i18n && typeof window.i18n.initLanguage === 'function') {
      await window.i18n.initLanguage();
    }

    // ... rest of existing init logic ...
  } catch (e) {
    console.error('Init failed', e);
  }
}

// =============================
// Renderers (only showing settings page injection related to language)
// =============================
function renderSettingsPage() {
  const container = document.getElementById('content');
  if (!container) return;

  // Existing settings UI construction above/below ... keep as-is
  // Add Language Switcher UI (per I18N_IMPLEMENTATION.md)
  const langSection = document.createElement('section');
  langSection.id = 'settings-language';
  langSection.innerHTML = `
    <h3 data-i18n="settings.language.title">Language</h3>
    <div class="lang-switcher">
      <button type="button" class="lang-button" data-lang-btn="en" onclick="switchLanguage('en')">
        <span data-i18n="settings.language.english">English</span>
      </button>
      <button type="button" class="lang-button" data-lang-btn="cs" onclick="switchLanguage('cs')">
        <span data-i18n="settings.language.czech">Čeština</span>
      </button>
    </div>
    <p class="lang-info" data-i18n="settings.language.info">Your language preference is saved for future visits.</p>
  `;

  container.appendChild(langSection);

  if (window.i18n) {
    if (typeof window.i18n.applyTranslations === 'function') {
      window.i18n.applyTranslations();
    }
    if (typeof window.i18n.updateLanguageSelector === 'function') {
      window.i18n.updateLanguageSelector();
    }
  }
}

// Export functions to window for HTML onclick handlers
window.appState = appState;
window.switchLanguage = switchLanguage;
window.renderSettingsPage = renderSettingsPage;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
