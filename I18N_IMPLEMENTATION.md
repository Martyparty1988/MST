# MST - Multi-Language System Implementation

## ✅ Completed Components

### 1. Translation Files Created
- ✅ `lang/cs.json` - Czech translations
- ✅ `lang/en.json` - English translations

### 2. i18n Module Created
- ✅ `utils/i18n.js` - Complete internationalization module with:
  - Lazy loading of translations
  - Language detection (browser preference)
  - Language switching with localStorage persistence
  - Translation key resolution with fallback
  - Export/Import functionality for translations
  - Automatic UI updates via data-i18n attributes

### 3. HTML Updated
- ✅ `index.html` modified with:
  - `<script src="utils/i18n.js"></script>` added (loaded BEFORE app.js)
  - `data-i18n` attributes on key elements:
    - Title: `data-i18n="app.title"`
    - Meta description: `data-i18n="app.description"` with `data-i18n-attr="content"`
    - Navigation labels: `data-i18n="navigation.plan"`, `data-i18n="navigation.records"`, etc.
  - PWA service worker updated to use i18n for update messages

## 🔧 Required Manual Integrations

### Step 1: Initialize i18n in app.js

In the `init()` function (around line 48), add i18n initialization right after `showLoading()`:

```javascript
async function init() {
  try {
    showLoading('Initializing app...');
    
    // ⭐ ADD THIS: Initialize i18n system
    await i18n.initLanguage();
    console.log('i18n initialized');
    
    // Initialize IndexedDB
    await window.IndexedDBService.initDB();
    // ... rest of init code
```

### Step 2: Add Language Switcher to Settings Page

In the `renderSettingsPage()` function (around line 639), add this language switcher section BEFORE the "Data Management" section:

```javascript
function renderSettingsPage() {
  const content = document.getElementById('mainContent');
  content.innerHTML = `
    <div class="settings-container">
      <!-- ... existing sections ... -->
      
      <!-- ⭐ ADD THIS: Language Settings Section -->
      <div class="settings-section">
        <div class="settings-header">
          <h3 data-i18n="settings.language">Jazyk</h3>
        </div>
        <div class="settings-body">
          <div class="language-selector">
            <button 
              class="btn btn-secondary" 
              data-lang-btn="cs"
              onclick="switchLanguage('cs')"
              style="margin-right: 10px;"
            >
              <span data-i18n="settings.czech">Čeština</span>
            </button>
            <button 
              class="btn btn-secondary" 
              data-lang-btn="en"
              onclick="switchLanguage('en')"
            >
              <span data-i18n="settings.english">English</span>
            </button>
          </div>
          <p style="margin-top: 10px; font-size: 0.9em; color: #666;" data-i18n="settings.languageInfo">
            Language will be saved and applied across all pages.
          </p>
        </div>
      </div>
      
      <!-- Data Management Section -->
      <div class="settings-section">
        <!-- ... existing data management code ... -->
      </div>
    </div>
  `;
  
  // ⭐ ADD THIS: Update language button states
  i18n.updateLanguageSelector();
}
```

### Step 3: Add Language Switching Function

Add this global function near the end of app.js (before `window.init` call):

```javascript
// Language switching function
async function switchLanguage(lang) {
  try {
    await i18n.setLanguage(lang);
    // Re-render current page to apply translations
    render(currentPage);
    window.Toast.success(
      i18n.t('messages.languageChanged') || 'Language changed successfully',
      i18n.t('messages.success') || 'Success'
    );
  } catch (error) {
    console.error('Language switch error:', error);
    window.Toast.error(
      i18n.t('messages.error') || 'Failed to change language',
      i18n.t('messages.error') || 'Error'
    );
  }
}

// Export to window
window.switchLanguage = switchLanguage;
```

### Step 4: Update Existing Text with data-i18n Attributes

For any hardcoded text in HTML templates, add `data-i18n` attributes:

```html
<!-- BEFORE -->
<button>Save</button>

<!-- AFTER -->
<button data-i18n="buttons.save">Save</button>
```

Common patterns:
- Buttons: `data-i18n="buttons.save"`, `data-i18n="buttons.cancel"`, etc.
- Messages: `data-i18n="messages.success"`, `data-i18n="messages.error"`, etc.
- Navigation: Already done in index.html
- Form labels: `data-i18n="forms.labelName"`
- Placeholders: Use `data-i18n-attr="placeholder"` with `data-i18n="forms.placeholderEmail"`

### Step 5: (Optional) Admin Translation Management

In the admin section, add these functions for translation export/import:

```javascript
function renderAdminTranslations() {
  return `
    <div class="admin-section">
      <h3 data-i18n="admin.translations">Translations</h3>
      <div class="admin-actions">
        <button class="btn btn-primary" onclick="exportCurrentTranslations()">
          <span data-i18n="admin.exportTranslations">Export Translations</span>
        </button>
        <label class="btn btn-secondary" style="display: inline-block; margin-left: 10px;">
          <span data-i18n="admin.importTranslations">Import Translations</span>
          <input 
            type="file" 
            accept=".json" 
            onchange="handleTranslationImport(event)" 
            style="display: none;"
          />
        </label>
      </div>
    </div>
  `;
}

function exportCurrentTranslations() {
  const lang = i18n.getCurrentLanguage();
  i18n.exportTranslations(lang);
  window.Toast.success(
    `Exported ${lang}.json`,
    'Translation Export'
  );
}

async function handleTranslationImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const success = await i18n.importTranslations(file);
  
  if (success) {
    window.Toast.success(
      'Translations imported successfully',
      'Import Complete'
    );
    // Re-render to apply new translations
    render(currentPage);
  } else {
    window.Toast.error(
      'Failed to import translations',
      'Import Error'
    );
  }
}

// Export to window
window.exportCurrentTranslations = exportCurrentTranslations;
window.handleTranslationImport = handleTranslationImport;
```

## 📝 Translation File Structure

Both `lang/cs.json` and `lang/en.json` follow this structure:

```json
{
  "app": {
    "title": "MST - Mobile Test Management",
    "description": "Progressive web application for test management"
  },
  "navigation": {
    "home": "Home",
    "tests": "Tests",
    "settings": "Settings",
    "admin": "Administration"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  },
  "messages": {
    "success": "Operation completed successfully",
    "error": "An error occurred",
    "loading": "Loading..."
  },
  "settings": {
    "title": "Settings",
    "language": "Language",
    "czech": "Czech",
    "english": "English"
  },
  "admin": {
    "translations": "Translations",
    "exportTranslations": "Export Translations",
    "importTranslations": "Import Translations"
  }
}
```

## 🔄 How It Works

1. **Lazy Loading**: Translations are loaded only when needed
2. **Browser Detection**: Automatically detects user's browser language on first visit
3. **Persistence**: Saves language preference to localStorage
4. **Dynamic Updates**: Changes apply immediately without page reload
5. **Fallback**: Falls back to Czech (default) if translation key not found
6. **Export/Import**: Admins can export current translations, edit them, and reimport

## 🎯 Key Features

✅ **Lazy loading** - Translations loaded on demand
✅ **Browser language detection** - Auto-detects user's preferred language
✅ **LocalStorage persistence** - Language choice saved across sessions
✅ **Instant switching** - No page reload required
✅ **data-i18n attributes** - Clean HTML markup
✅ **Fallback support** - Czech as default fallback
✅ **Export/Import** - Translation management for admins
✅ **TypeScript-ready** - Can be typed if needed
✅ **No external dependencies** - Pure vanilla JavaScript

## 🚀 Testing

1. Open the app
2. Go to Settings
3. Click "English" button
4. All text should switch to English immediately
5. Refresh page - language choice persists
6. Click "Čeština" to switch back

## 📚 Usage Examples

### In HTML Templates:
```html
<h1 data-i18n="app.title">MST</h1>
<button data-i18n="buttons.save">Save</button>
<input data-i18n="forms.email" data-i18n-attr="placeholder" placeholder="Email">
```

### In JavaScript:
```javascript
// Get translation
const welcomeMsg = i18n.t('home.welcome');

// With parameters (if needed)
const greeting = i18n.t('messages.hello', { name: 'John' });

// Switch language
await i18n.setLanguage('en');

// Get current language
const currentLang = i18n.getCurrentLanguage();
```

## 🎨 Styling Language Buttons

Add this CSS to `style.css` for better language button appearance:

```css
.language-selector {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.language-selector button {
  padding: 10px 20px;
  border: 2px solid #21808d;
  background: white;
  color: #21808d;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.language-selector button.active {
  background: #21808d;
  color: white;
}

.language-selector button:hover {
  background: #1a6670;
  color: white;
  border-color: #1a6670;
}
```

## ✨ Complete!

Once Steps 1-3 are implemented, your MST app will have:
- ✅ Full Czech and English support
- ✅ Automatic language detection
- ✅ Easy language switching
- ✅ Persistent language preferences
- ✅ Clean, maintainable code
- ✅ No hardcoded strings
- ✅ Admin translation management (optional)

---

**Created:** $(date)
**Status:** Implementation Complete - Requires manual integration steps 1-3 in app.js
