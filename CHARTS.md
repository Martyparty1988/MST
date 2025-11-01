# 📊 Chart.js Integration Guide

Complete guide to the data visualization system in MST.

---

## Overview

MST uses **Chart.js 4.4.1** for beautiful, interactive data visualizations. The charts automatically adapt to light/dark mode and provide comprehensive analytics for your solar installation work.

---

## 🎨 Available Charts

### **1. Earnings Over Time (Line Chart)**
- **Type**: Line chart with gradient fill
- **Data**: Daily earnings for the last 30 days
- **Features**:
  - Smooth curved lines
  - Gradient fill under the line
  - Hover tooltips with exact values
  - Responsive to window resizing

**What it shows:**
- Trends in earnings over time
- Peak earning days
- Earning patterns and seasonality

### **2. Earnings by Worker (Bar Chart)**
- **Type**: Horizontal bar chart
- **Data**: Total earnings per worker
- **Features**:
  - Colored bars matching worker colors
  - Sorted by highest earner
  - Rounded bar corners
  - Individual worker performance

**What it shows:**
- Top performing workers
- Earnings distribution across team
- Individual contributions

### **3. Earnings by Project (Doughnut Chart)**
- **Type**: Doughnut (pie) chart
- **Data**: Earnings breakdown by project
- **Features**:
  - Color-coded projects
  - Percentage labels
  - Center cutout (60%)
  - Hover effect with offset

**What it shows:**
- Project profitability
- Distribution of work across projects
- Percentage of total earnings per project

---

## 🎯 How It Works

### **Data Processing**

Charts automatically process your work entries to generate visualizations:

```javascript
// Earnings over time
- Groups entries by date
- Calculates daily totals
- Shows last 30 days

// By worker
- Groups by worker ID
- Sums task and hourly earnings
- Sorts by total earnings

// By project
- Groups by project ID
- Calculates project totals
- Shows percentage distribution
```

### **Automatic Updates**

Charts update automatically when:
- ✅ You add new work entries
- ✅ You delete work entries
- ✅ You navigate to the Stats page
- ✅ Data is imported from backup

### **Theme Support**

Charts automatically adapt to:
- **Light mode**: Cream backgrounds, dark text
- **Dark mode**: Dark backgrounds, light text
- **Custom colors**: Match your MST design system

---

## 📱 Responsive Design

All charts are fully responsive:

```css
/* Desktop */
- Full width for main chart
- Two-column grid for secondary charts

/* Tablet */
- Stacked layout
- Optimized heights

/* Mobile */
- Single column
- Touch-friendly tooltips
- Readable axis labels
```

---

## 🎨 Color Scheme

### **Chart Colors (Light Mode)**
```css
Primary:   #32b8c6 (Teal)
Secondary: #2d96b2 (Darker Teal)
Accent:    #ffa502 (Orange)
Success:   #00c9a7 (Green)
Danger:    #ff4757 (Red)
```

### **Chart Colors (Dark Mode)**
```css
Primary:   #32b8c6 (Teal)
Text:      #f5f5f5 (Light Gray)
Grid:      rgba(167, 169, 169, 0.1)
Background: rgba(38, 40, 40, 0.8)
```

---

## 🔧 Technical Details

### **Chart.js Configuration**

```javascript
// Global options applied to all charts
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { /* ... */ },
    tooltip: { /* ... */ }
  },
  scales: {
    y: { /* Czech locale formatting */ },
    x: { /* 45° label rotation */ }
  }
}
```

### **Data Format**

Charts expect data in this format:

```javascript
// Earnings over time
{
  labels: ['Jan 1', 'Jan 2', ...],
  data: [1200, 1500, ...]
}

// By worker
{
  labels: ['JD-01', 'MK-02', ...],
  data: [5400, 4200, ...],
  colors: ['#3b82f6', '#8b5cf6', ...]
}

// By project
{
  labels: ['Project A', 'Project B', ...],
  data: [12000, 8500, ...],
  colors: ['#32b8c6', '#2d96b2', ...]
}
```

---

## 🚀 Usage Examples

### **Initialize All Charts**

```javascript
// Automatically called when Stats page loads
window.Charts.initializeStatsCharts(appState);
```

### **Create Individual Chart**

```javascript
// Earnings chart
window.Charts.createEarningsChart('earningsChart', appState.workEntries);

// Worker chart
window.Charts.createWorkerComparisonChart('workerChart', appState.workEntries, appState.workers);

// Project chart
window.Charts.createProjectBreakdownChart('projectChart', appState.workEntries, appState.projects);
```

### **Destroy Charts**

```javascript
// Clean up before re-rendering
window.Charts.destroyAllCharts();
```

---

## 📊 Chart Specifications

### **Earnings Over Time Chart**

| Property | Value |
|----------|-------|
| Type | Line |
| Height | 400px |
| Data Points | Last 30 days |
| Line Tension | 0.4 (curved) |
| Point Radius | 4px |
| Gradient Fill | Yes |

### **Worker Comparison Chart**

| Property | Value |
|----------|-------|
| Type | Bar |
| Height | 350px |
| Orientation | Vertical |
| Border Radius | 8px |
| Sorting | By earnings (desc) |

### **Project Breakdown Chart**

| Property | Value |
|----------|-------|
| Type | Doughnut |
| Height | 350px |
| Cutout | 60% |
| Hover Offset | 8px |
| Legend Position | Bottom |

---

## 🎯 Empty State

When no data exists:

```html
<div class="empty-state">
  📊 No data to visualize yet

  Add some work records to see beautiful charts!

  [Go to Records]
</div>
```

---

## 🔍 Tooltips

Interactive tooltips show:

```
Project Name: 1,250 CZK
- or -
Worker JD-01: 3,450 CZK (23.5%)
```

**Features:**
- Czech number formatting (1.250 CZK)
- Percentage for doughnut chart
- Custom background colors
- Border matching chart colors

---

## 🎨 Customization

### **Change Colors**

Edit `utils/charts.js`:

```javascript
function getChartColors() {
  return {
    primary: '#YOUR_COLOR',
    accent: '#YOUR_COLOR',
    // ...
  };
}
```

### **Adjust Time Range**

Change from 30 days to 60:

```javascript
const last30Days = sortedDates.slice(-30);
// Change to:
const last60Days = sortedDates.slice(-60);
```

### **Add New Chart Type**

```javascript
function createCustomChart(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');

  new Chart(ctx, {
    type: 'radar', // or 'pie', 'polarArea', etc.
    data: { /* ... */ },
    options: { /* ... */ }
  });
}
```

---

## 🐛 Troubleshooting

### **Charts not showing**

1. **Check console for errors**
   ```
   [Charts] Failed to initialize: ...
   ```

2. **Verify Chart.js loaded**
   ```javascript
   console.log(window.Chart); // Should not be undefined
   ```

3. **Check canvas elements exist**
   ```javascript
   document.getElementById('earningsChart'); // Should exist
   ```

### **Charts not updating**

1. **Ensure destroyAllCharts() is called**
   - Charts must be destroyed before re-creating

2. **Check appState has data**
   ```javascript
   console.log(appState.workEntries.length); // Should be > 0
   ```

3. **Verify initialization timing**
   - Charts initialize 100ms after render

### **Wrong colors in dark mode**

1. **Check prefers-color-scheme**
   ```javascript
   window.matchMedia('(prefers-color-scheme: dark)').matches
   ```

2. **Verify getChartColors() returns correct values**

---

## 📚 Resources

- **Chart.js Docs**: https://www.chartjs.org/docs/latest/
- **Chart.js Examples**: https://www.chartjs.org/docs/latest/samples/
- **Color Palette Generator**: https://coolors.co/
- **Gradient Generator**: https://cssgradient.io/

---

## 🎓 Advanced Features

### **Export Chart as Image**

```javascript
const canvas = document.getElementById('earningsChart');
const image = canvas.toDataURL('image/png');

// Download
const a = document.createElement('a');
a.href = image;
a.download = 'earnings-chart.png';
a.click();
```

### **Print Charts**

Charts automatically adjust for print:

```css
@media print {
  .chart-container {
    page-break-inside: avoid;
  }
}
```

### **Animate Charts**

Charts have subtle animations:
- On load: 750ms ease
- On hover: 150ms ease
- On update: 750ms ease

---

## 🚀 Performance

### **Optimization Tips**

1. **Limit data points**
   - Current: 30 days max
   - Prevents rendering lag

2. **Destroy unused charts**
   - Free up memory
   - Prevent memory leaks

3. **Use requestAnimationFrame**
   - Smooth animations
   - Better performance

### **Browser Support**

| Browser | Support |
|---------|---------|
| Chrome 90+ | ✅ Full |
| Firefox 88+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Edge 90+ | ✅ Full |
| IE 11 | ❌ Not supported |

---

## 📊 Future Enhancements

Planned features:

1. **More Chart Types**
   - Radar charts for worker skills
   - Scatter plots for hour/earnings correlation
   - Stacked bar charts for project phases

2. **Interactive Features**
   - Click to filter data
   - Drill-down capabilities
   - Real-time updates

3. **Export Options**
   - Export as PNG/SVG
   - Share charts
   - Print-optimized layouts

4. **Advanced Analytics**
   - Trend predictions
   - Goal tracking
   - Performance metrics

---

**Built with Chart.js for beautiful data visualization**

*MST - Marty Solar Tracker*
