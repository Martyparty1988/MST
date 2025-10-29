# MST - Marty Solar Tracker

Professional time tracking Progressive Web App for solar panel installation teams.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![PWA](https://img.shields.io/badge/PWA-enabled-green)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

### 📋 **Plan Management**
- View project plans and technical drawings (PDF viewer coming soon)
- Quick access to project documentation

### 📝 **Work Records**
- **Task-based tracking**: Record completion of solar panel installations per table
- **Hourly tracking**: Track time spent on various project activities
- Filter by project and entry type
- Detailed record cards with earnings calculations

### 📊 **Statistics & Analytics**
- Real-time KPI dashboard
- Total earnings and hours tracking
- Average earnings per task
- Visual charts (Chart.js integration coming soon)

### ⚙️ **Settings & Management**
- **Worker Management**: Add, edit, delete workers with custom colors
- **Project Management**: Manage multiple projects with locations and status
- **Data Export**: Export to JSON or CSV formats
- **Data Import**: Import backups with smart conflict resolution

### 🔐 **Admin Dashboard**
- Secret access (click logo 5 times in 3 seconds)
- Password: `mst2025`
- Multi-layer backup management
- System analytics and data overview

---

## 🚀 Quick Start

### **1. Clone & Setup**
```bash
git clone <your-repo-url>
cd MST
```

### **2. Serve the App**

You need a web server to run the PWA. Choose one:

**Option A: Python**
```bash
python -m http.server 8000
```

**Option B: Node.js**
```bash
npx serve
```

**Option C: PHP**
```bash
php -S localhost:8000
```

### **3. Open in Browser**
```
http://localhost:8000
```

### **4. Install as PWA**
- Click the install button in your browser
- Or use browser menu: "Install MST..."
- Enjoy full offline functionality!

---

## 📱 PWA Features

- ✅ **Offline Support**: Works without internet connection
- ✅ **Installable**: Install on desktop and mobile devices
- ✅ **Fast**: Caching strategy for optimal performance
- ✅ **Auto-Updates**: Seamless updates when new version is available
- ✅ **Background Sync**: Automatic backups when online

---

## 💾 Backup Strategy

MST uses a comprehensive **4-layer backup system**:

### **Layer 1: IndexedDB (Primary)**
- Fast browser database
- Automatic saves after every change
- Supports large datasets

### **Layer 2: LocalStorage Slots**
- 5 rotating backup slots
- Automatic backup every 25 changes or 60 seconds
- Instant recovery

### **Layer 3: OPFS (Origin Private File System)**
- Daily backups (7 days retained)
- Weekly backups (3 weeks retained)
- Automatic cleanup

### **Layer 4: File System Access**
- Continuous backup to your computer
- Auto-save every 30 seconds
- Full control over location

---

## 🎨 Design System

Built with the **MST Design System**:

- **Modern High-Tech Aesthetic**: Teal accents with professional styling
- **Light/Dark Mode**: Automatic theme switching
- **Typography**: FK Grotesk Neue font family
- **Responsive**: Mobile-first design
- **Accessible**: WCAG 2.1 compliant

---

## 🔧 Tech Stack

### **Frontend**
- Vanilla JavaScript (ES6+)
- CSS3 with CSS Variables
- HTML5 with semantic markup

### **Storage**
- IndexedDB for primary data
- LocalStorage for settings and backups
- OPFS for persistent backups
- File System Access API for external backups

### **PWA Technologies**
- Service Workers
- Web App Manifest
- Cache API
- Background Sync API

---

## 📂 Project Structure

```
MST/
├── index.html                 # Main application
├── app.js                     # Core application logic
├── style.css                  # Comprehensive styles
├── manifest.json              # PWA manifest
├── service-worker.js          # Service worker for offline support
│
├── utils/                     # Utility modules
│   ├── toast.js              # Toast notification system
│   ├── validation.js         # Form validation & sanitization
│   └── crud.js               # CRUD operations & modals
│
├── storage/                   # Storage management
│   ├── indexeddb.js          # IndexedDB service
│   ├── migration.js          # Data migration from localStorage
│   ├── backup.js             # Multi-layer backup system
│   └── vacuum.js             # Cleanup service
│
├── admin/                     # Admin features
│   └── backupPanel.js        # Backup management UI
│
└── icons/                     # PWA icons
    └── README.md             # Icon guidelines
```

---

## 🎯 Usage Guide

### **Adding Workers**
1. Go to **Settings**
2. Click "**+ Add Worker**"
3. Fill in:
   - Worker name
   - Worker code (e.g., "JD-01")
   - Hourly rate
   - Color (for visual identification)
4. Click "**Add Worker**"

### **Adding Projects**
1. Go to **Settings**
2. Scroll to **Projects** section
3. Click "**+ Add Project**"
4. Fill in:
   - Project name
   - Location
   - Status (active/completed/paused)
   - Dates (optional)
5. Click "**Add Project**"

### **Recording Work**

**Task Entry (Per Table):**
1. Go to **Records**
2. Click "**+ Add Record**"
3. Select "**Task (Per Completion)**"
4. Choose:
   - Project
   - Workers (multiple)
   - Table number
   - Reward per worker
   - Date & time
5. Click "**Add Record**"

**Hourly Entry:**
1. Go to **Records**
2. Click "**+ Add Record**"
3. Select "**Hourly Work**"
4. Choose:
   - Project
   - Worker (single)
   - Hours worked
   - Date & time
5. Click "**Add Record**"

### **Viewing Statistics**
1. Go to **Stats**
2. View:
   - Total earnings
   - Total hours
   - Task count
   - Average earnings per task
3. Charts coming soon!

### **Exporting Data**
1. Go to **Settings**
2. Scroll to **Data Management**
3. Click:
   - "**📥 Export JSON**" for full backup
   - "**📊 Export CSV**" for spreadsheet

### **Importing Data**
1. Go to **Settings**
2. Click "**📤 Import JSON**"
3. Select your backup file
4. Review the import preview
5. Confirm import

### **Admin Access**
1. Click the **☀️ logo** in header **5 times** within **3 seconds**
2. Enter password: `mst2025`
3. Access admin dashboard with:
   - Backup management
   - System analytics
   - Advanced features

---

## 🔐 Security & Privacy

- **Local-First**: All data stored locally in your browser
- **No Cloud**: No data sent to external servers
- **Password Protected**: Admin features require authentication
- **Data Sanitization**: All inputs validated and sanitized
- **XSS Protection**: HTML tags removed from user input

---

## 🐛 Troubleshooting

### **App won't load**
1. Check browser console for errors
2. Clear browser cache
3. Reload the page
4. Try incognito/private mode

### **Data missing after update**
1. Data is automatically migrated
2. Check Admin > Backup Panel for auto-backups
3. Import from your last manual export

### **Service Worker issues**
1. Unregister service worker in browser dev tools
2. Clear all site data
3. Reload the app
4. Service worker will re-register

### **Backup not working**
- **LocalStorage**: Check browser storage quota
- **OPFS**: Requires modern browser (Chrome 86+, Edge 86+)
- **File System Access**: Requires user permission

---

## 📊 Browser Support

### **Recommended**
- ✅ Chrome 90+ (full support)
- ✅ Edge 90+ (full support)
- ✅ Safari 14+ (most features)
- ✅ Firefox 88+ (most features)

### **Feature Support**
| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| OPFS | ✅ | ✅ | ⚠️ | ❌ |
| File System Access | ✅ | ✅ | ❌ | ❌ |

---

## 🔄 Updates & Versioning

### **Automatic Updates**
- Service worker checks for updates on every load
- Prompt appears when new version is available
- Click "Reload" to update

### **Manual Update**
1. Clear browser cache
2. Unregister service worker (dev tools)
3. Reload the page

### **Version History**
- **v1.0.0** (2025-10-29): Complete optimization & refactoring
  - Added toast notification system
  - Added comprehensive validation
  - Refactored app.js (removed duplicates)
  - Created modular architecture
  - Full PWA support
  - Multi-layer backup system

---

## 📝 Recent Improvements

See [IMPROVEMENTS.md](./IMPROVEMENTS.md) for detailed changelog.

**Highlights:**
- ✨ Modern toast notification system
- 🔒 Comprehensive form validation
- 📦 Modular code architecture
- 🚀 Full PWA service worker
- 💾 4-layer backup strategy
- 🎨 Improved UI/UX
- 🐛 Bug fixes and optimizations
- 📚 Extensive documentation

---

## 🤝 Contributing

This is a personal project for solar installation tracking. Feel free to fork and adapt for your own use.

---

## 📄 License

MIT License - Feel free to use and modify as needed.

---

## 🙏 Acknowledgments

- **Design System**: Based on modern high-tech aesthetics
- **Icons**: Emoji-based (custom icons coming soon)
- **Font**: FK Grotesk Neue
- **Optimization**: Powered by Claude Code

---

## 📞 Support

For issues or questions:
1. Check the [IMPROVEMENTS.md](./IMPROVEMENTS.md) documentation
2. Review browser console for error messages
3. Export your data before making changes
4. Check the icons/README.md for PWA icon setup

---

**Built with ☀️ for solar installation professionals**

*MST - Marty Solar Tracker*
*Professional Time Tracking PWA*
