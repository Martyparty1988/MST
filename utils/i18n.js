// i18n.js - Internationalization Module for MST
// Provides dynamic multi-language support with lazy loading

const i18n = {
  currentLanguage: 'cs', // Default language
  translations: {},
  fallbackLanguage: 'cs',
  
  /**
   * Initialize the i18n system
   * Loads saved language preference or detects browser language
   */
  async initLanguage() {
    try {
      // Load saved language from localStorage
      const savedLang = localStorage.getItem('appLanguage');
      
      // If no saved language, detect from browser
      if (!savedLang) {
        const browserLang = navigator.language || navigator.userLanguage;
        this.currentLanguage = browserLang.startsWith('cs') ? 'cs' : 'en';
      } else {
        this.currentLanguage = savedLang;
      }
      
      // Load the translations for the current language
      await this.loadTranslations(this.currentLanguage);
      
      // Apply translations to the page
      this.applyTranslations();
      
      console.log(`i18n initialized with language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('Error initializing i18n:', error);
      // Fallback to default language
      await this.loadTranslations(this.fallbackLanguage);
      this.applyTranslations();
    }
  },
  
  /**
   * Lazy load translations for a specific language
   * @param {string} lang - Language code (cs, en)
   */
  async loadTranslations(lang) {
    // Check if translations are already loaded
    if (this.translations[lang]) {
      console.log(`Translations for ${lang} already loaded`);
      return;
    }
    
    try {
      const response = await fetch(`./lang/${lang}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }
      
      this.translations[lang] = await response.json();
      console.log(`Translations loaded for ${lang}`);
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);
      
      // If not the fallback language, try loading fallback
      if (lang !== this.fallbackLanguage) {
        console.log(`Attempting to load fallback language: ${this.fallbackLanguage}`);
        await this.loadTranslations(this.fallbackLanguage);
      }
    }
  },
  
  /**
   * Set a new language and update the UI
   * @param {string} lang - Language code (cs, en)
   */
  async setLanguage(lang) {
    if (lang === this.currentLanguage) {
      console.log(`Language ${lang} is already active`);
      return;
    }
    
    try {
      // Load translations if not already loaded
      await this.loadTranslations(lang);
      
      // Update current language
      this.currentLanguage = lang;
      
      // Save to localStorage
      localStorage.setItem('appLanguage', lang);
      
      // Apply translations to the page
      this.applyTranslations();
      
      // Update language selector UI
      this.updateLanguageSelector();
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: lang } 
      }));
      
      console.log(`Language changed to: ${lang}`);
    } catch (error) {
      console.error(`Error setting language to ${lang}:`, error);
    }
  },
  
  /**
   * Get a translation by key
   * @param {string} key - Translation key (e.g., 'app.title' or 'buttons.save')
   * @param {object} params - Optional parameters for string interpolation
   * @returns {string} Translated text
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let translation = this.translations[this.currentLanguage];
    
    // Navigate through nested keys
    for (const k of keys) {
      if (translation && typeof translation === 'object') {
        translation = translation[k];
      } else {
        break;
      }
    }
    
    // If translation not found, try fallback language
    if (!translation && this.currentLanguage !== this.fallbackLanguage) {
      let fallback = this.translations[this.fallbackLanguage];
      for (const k of keys) {
        if (fallback && typeof fallback === 'object') {
          fallback = fallback[k];
        } else {
          break;
        }
      }
      translation = fallback;
    }
    
    // If still not found, return the key
    if (!translation) {
      console.warn(`Translation not found for key: ${key}`);
      return key;
    }
    
    // Replace parameters in the translation
    let result = translation;
    Object.keys(params).forEach(param => {
      result = result.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return result;
  },
  
  /**
   * Apply translations to all elements with data-i18n attribute
   */
  applyTranslations() {
    const elements = document.querySelectorAll('[data-i18n]');
    
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = this.t(key);
      
      // Check if element has data-i18n-attr to translate attributes
      const attrName = element.getAttribute('data-i18n-attr');
      
      if (attrName) {
        // Translate attribute (e.g., placeholder, title)
        element.setAttribute(attrName, translation);
      } else {
        // Translate text content
        element.textContent = translation;
      }
    });
    
    console.log(`Applied translations for ${elements.length} elements`);
  },
  
  /**
   * Update language selector buttons state
   */
  updateLanguageSelector() {
    const langButtons = document.querySelectorAll('[data-lang-btn]');
    
    langButtons.forEach(btn => {
      const lang = btn.getAttribute('data-lang-btn');
      if (lang === this.currentLanguage) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  },
  
  /**
   * Export current translations to JSON file
   * @param {string} lang - Language to export (optional, defaults to current)
   */
  exportTranslations(lang = this.currentLanguage) {
    const translations = this.translations[lang];
    
    if (!translations) {
      console.error(`No translations found for ${lang}`);
      return;
    }
    
    const dataStr = JSON.stringify(translations, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${lang}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    console.log(`Exported translations for ${lang}`);
  },
  
  /**
   * Import translations from JSON file
   * @param {File} file - JSON file containing translations
   */
  async importTranslations(file) {
    try {
      const text = await file.text();
      const translations = JSON.parse(text);
      
      // Extract language code from filename (e.g., cs.json -> cs)
      const lang = file.name.replace('.json', '');
      
      // Validate that it's a supported language
      if (!['cs', 'en'].includes(lang)) {
        throw new Error(`Unsupported language: ${lang}`);
      }
      
      // Store the translations
      this.translations[lang] = translations;
      
      // If it's the current language, apply immediately
      if (lang === this.currentLanguage) {
        this.applyTranslations();
      }
      
      console.log(`Imported translations for ${lang}`);
      return true;
    } catch (error) {
      console.error('Error importing translations:', error);
      return false;
    }
  },
  
  /**
   * Get available languages
   * @returns {Array} Array of language codes
   */
  getAvailableLanguages() {
    return ['cs', 'en'];
  },
  
  /**
   * Get current language
   * @returns {string} Current language code
   */
  getCurrentLanguage() {
    return this.currentLanguage;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = i18n;
}

// Make available globally
window.i18n = i18n;
