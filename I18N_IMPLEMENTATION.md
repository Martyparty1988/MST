# MST - Multi-Language System Implementation

The MST application ships with full Czech and English localisation powered by the `utils/i18n.js` module. This document summarises how the system is wired together and what to update when new strings are introduced.

## ✅ Completed Components

### Translation Files
- `lang/cs.json` – Czech strings for all navigation items, page content and toast messages.
- `lang/en.json` – English baseline strings.

### Runtime Module
- `utils/i18n.js` handles:
  - Lazy loading JSON dictionaries on demand.
  - Browser language detection with localStorage persistence.
  - `data-i18n` / `data-i18n-attr` attribute replacement.
  - Language switching via `i18n.setLanguage(lang)` including events and selector state syncing.

### Application Hooks
- `app.js` initialises the module during `init()` before state loading.
- The Settings page renders a language switcher and calls `switchLanguage(lang)`.
- Every `render()` call reapplies translations so dynamically generated markup is localised immediately.

## 🔁 Adding New Strings

1. **Add keys** to both `lang/en.json` and `lang/cs.json`. Follow the existing structure (`plan`, `records`, `stats`, etc.) so related strings stay grouped.
2. **Annotate markup** with `data-i18n="section.key"`. For attribute translations, add `data-i18n-attr="placeholder"` (or similar).
3. **Re-render after DOM updates.** All core rendering functions already call `applyTranslations()`, so new keys will appear automatically once the attributes are in place.

## 🌐 Language Switching Behaviour

- The user can toggle languages from *Settings → Language*. Buttons are annotated with `data-lang-btn` so `i18n.updateLanguageSelector()` can highlight the active choice.
- After switching, `switchLanguage()` triggers a toast using `messages.languageChanged` / `messages.languageChangeFailed` fallbacks.
- The current language is persisted under `appLanguage` in `localStorage`.

## 🛠 Admin & Export Support

- Admin screens inherit the same translation flow because rendered HTML is processed by `applyTranslations()` once the async content resolves.
- The `i18n.exportTranslations(lang)` and `i18n.importTranslations(file)` helpers remain available for bulk editing from the admin dashboard.

Keep this guide handy when introducing new UI elements so every feature stays bilingual.
