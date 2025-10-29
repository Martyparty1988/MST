# PWA Icons

This folder should contain your Progressive Web App icons.

## Required Icons

For best PWA support, you need the following icon sizes:

- `icon-192x192.png` - Standard icon (192x192 pixels)
- `icon-512x512.png` - High-res icon (512x512 pixels)

## How to Generate Icons

You can use one of these tools to generate PWA icons from your logo:

1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **Favicon Generator**: https://realfavicongenerator.net/
3. **PWA Icon Generator**: https://tools.pwabuilder.com/image-generator

## Icon Design Guidelines

- Use a simple, recognizable design
- Ensure the icon works well at small sizes
- Use high contrast colors
- Avoid too much detail or text
- Test on both light and dark backgrounds

## Maskable Icons

The manifest.json is configured to support "maskable" icons, which adapt to different device shapes and themes. Make sure your icon design accounts for the safe zone (inner 80% of the icon).

## Temporary Placeholder

Until you create custom icons, the app will fall back to the solar panel emoji (☀️) used in the UI.

To add your icons:
1. Generate icons using one of the tools above
2. Place `icon-192x192.png` and `icon-512x512.png` in this folder
3. The app will automatically use them
