# PWA Icons

This folder contains your Progressive Web App icons and generation tools.

## ✨ Quick Start

### **Option 1: Use Our Icon Generator (Recommended)**

We've created a custom icon with solar panel design!

1. **Open the generator:**
   ```bash
   # Navigate to this folder in terminal
   cd icons

   # Open the generator in your browser
   # Use any local server, e.g.:
   python -m http.server 8080
   ```

2. **Open in browser:**
   ```
   http://localhost:8080/generate-icons.html
   ```

3. **Generate icons:**
   - Click "🚀 Generate Icons"
   - Click "📦 Download All (ZIP)" or download individually
   - Save the PNG files to this `/icons` folder

4. **Done!** Your PWA icons are ready.

### **Option 2: Use Online Generators**

If you prefer to customize the design further:

1. **Edit `icon.svg`** in any SVG editor (Inkscape, Figma, etc.)
2. **Use online tools:**
   - [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)
   - [Favicon Generator](https://realfavicongenerator.net/)
   - [PWA Icon Generator](https://tools.pwabuilder.com/image-generator)

## 📦 Required Icons

For best PWA support, you need these icon sizes:

### **Essential:**
- `icon-192x192.png` - Standard icon (required)
- `icon-512x512.png` - High-res icon (required)

### **Optional (Better iOS support):**
- `icon-180x180.png` - Apple Touch Icon
- `icon-167x167.png` - iPad Pro
- `icon-152x152.png` - iPad
- `icon-120x120.png` - iPhone

## 🎨 Icon Design

The included `icon.svg` features:

- **Solar panel grid** (3x3 cells)
- **Teal color scheme** (#21808d) matching MST design
- **Sun symbol** representing solar energy
- **MST text** for branding
- **Maskable safe zone** (80% inner circle)

### **Design Guidelines:**
- ✅ Simple, recognizable design
- ✅ Works well at small sizes
- ✅ High contrast colors
- ✅ No excessive detail
- ✅ Tested on light and dark backgrounds

## 🔧 Files in This Folder

```
icons/
├── icon.svg               # Source SVG (512x512)
├── generate-icons.html    # Icon generator tool
├── README.md             # This file
└── (generated PNGs will go here)
```

## 📱 Maskable Icons

The manifest.json supports "maskable" icons which adapt to:
- Different device shapes (rounded corners, circular, etc.)
- Light and dark themes
- Various home screen styles

The design accounts for the safe zone (inner 80%) to ensure nothing important gets cropped.

## 🚀 After Generating Icons

Once you've generated and saved the PNG files:

1. **Verify files exist:**
   ```bash
   ls -la icons/*.png
   ```

2. **Test PWA installation:**
   - Open your app in Chrome/Edge
   - Click install button
   - Check home screen icon

3. **Icons should appear in:**
   - Browser install prompt
   - Home screen (mobile)
   - Desktop app
   - Task switcher
   - Splash screen

## 🐛 Troubleshooting

### **Icons not showing:**
1. Clear browser cache
2. Uninstall and reinstall PWA
3. Check file paths in manifest.json
4. Verify PNG files are in `/icons` folder

### **Generator not working:**
1. Make sure you're using a local server (not file://)
2. Check browser console for errors
3. Try a different browser (Chrome recommended)

### **Low quality icons:**
1. Always start with SVG for best quality
2. Use the 512x512 as source
3. Don't upscale smaller images

## 💡 Tips

- **Keep the SVG:** Always keep `icon.svg` as your source
- **Version control:** Commit PNG files to git
- **Test everywhere:** Check icons on iOS, Android, and desktop
- **Update regularly:** Regenerate if you change the design

## 📚 Resources

- [PWA Icons Guide](https://web.dev/add-manifest/#icons)
- [Maskable Icons](https://web.dev/maskable-icon/)
- [Apple Touch Icons](https://developer.apple.com/design/human-interface-guidelines/foundations/app-icons/)

---

**Need help?** Check the main [README.md](../README.md) or [IMPROVEMENTS.md](../IMPROVEMENTS.md)
