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
function switchLanguage(lang) {
  if (window.i18n && typeof window.i18n.setLanguage === 'function') {
    window.i18n.setLanguage(lang);
    // re-render current page to reflect language change
    if (typeof render === 'function') render();
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
      <button type="button" onclick="switchLanguage('en')" data-i18n="settings.language.english">English</button>
      <button type="button" onclick="switchLanguage('cs')" data-i18n="settings.language.czech">Čeština</button>
    </div>
  `;

  container.appendChild(langSection);
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
