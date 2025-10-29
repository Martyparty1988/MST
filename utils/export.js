// ============================================
// Export Module
// Chart and data export functionality
// ============================================

/**
 * Export single chart as PNG
 * @param {string} canvasId - Canvas element ID
 * @param {string} filename - Output filename
 */
function exportChartAsPNG(canvasId, filename = 'chart.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    window.Toast?.error('Chart not found', 'Export Error');
    return;
  }

  try {
    // Convert canvas to blob
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      window.Toast?.success(`Exported ${filename}`, 'Export Complete');
    }, 'image/png', 1.0);
  } catch (error) {
    console.error('[Export] PNG export failed:', error);
    window.Toast?.error('Failed to export chart', 'Export Error');
  }
}

/**
 * Export all charts as PNG in a ZIP (simplified: sequential downloads)
 */
async function exportAllChartsAsPNG() {
  const chartIds = [
    { id: 'earningsChart', name: 'earnings-over-time.png' },
    { id: 'workerComparisonChart', name: 'earnings-by-worker.png' },
    { id: 'projectBreakdownChart', name: 'earnings-by-project.png' },
    { id: 'performanceRadarChart', name: 'worker-performance.png' },
    { id: 'correlationScatterChart', name: 'hours-vs-earnings.png' },
    { id: 'timeStackedBarChart', name: 'monthly-by-project.png' },
    { id: 'trendPredictionChart', name: 'trend-prediction.png' }
  ];

  let exportCount = 0;

  for (const chart of chartIds) {
    const canvas = document.getElementById(chart.id);
    if (canvas) {
      await new Promise(resolve => {
        setTimeout(() => {
          exportChartAsPNG(chart.id, chart.name);
          exportCount++;
          resolve();
        }, 300);
      });
    }
  }

  if (exportCount > 0) {
    window.Toast?.success(`Exported ${exportCount} charts`, 'Export Complete');
  } else {
    window.Toast?.warning('No charts to export', 'No Data');
  }
}

/**
 * Export comprehensive PDF report
 */
async function exportPDFReport() {
  // Check if jsPDF is loaded
  if (typeof window.jspdf === 'undefined') {
    window.Toast?.error('PDF library not loaded', 'Export Error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const appState = window.appState || { workers: [], projects: [], workEntries: [] };
    const stats = calculateReportStats(appState);

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPos = margin;

    // Header
    doc.setFontSize(24);
    doc.setTextColor(33, 128, 141); // Teal
    doc.text('MST Analytics Report', margin, yPos);
    yPos += 12;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString('cs-CZ')}`, margin, yPos);
    yPos += 15;

    // Executive Summary
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Executive Summary', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const summaryData = [
      `Total Earnings: ${stats.totalEarnings.toLocaleString('cs-CZ')} CZK`,
      `Total Hours Worked: ${stats.totalHours.toFixed(1)}h`,
      `Total Tasks Completed: ${stats.taskCount}`,
      `Average Earnings per Task: ${stats.avgPerTask.toFixed(0)} CZK`,
      `Active Workers: ${stats.workerCount}`,
      `Active Projects: ${stats.projectCount}`,
      `Date Range: ${stats.dateRange}`
    ];

    summaryData.forEach(line => {
      doc.text(line, margin, yPos);
      yPos += 6;
    });

    yPos += 10;

    // Worker Performance Section
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Worker Performance', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    stats.workerStats.forEach(worker => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont(undefined, 'bold');
      doc.text(`${worker.name} (${worker.code})`, margin, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      doc.text(`  Earnings: ${worker.earnings.toLocaleString('cs-CZ')} CZK`, margin, yPos);
      yPos += 5;
      doc.text(`  Tasks: ${worker.taskCount} | Hours: ${worker.hours.toFixed(1)}h`, margin, yPos);
      yPos += 8;
    });

    yPos += 10;

    // Project Breakdown Section
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(16);
    doc.text('Project Breakdown', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    stats.projectStats.forEach(project => {
      if (yPos > pageHeight - 25) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont(undefined, 'bold');
      doc.text(project.name, margin, yPos);
      yPos += 6;

      doc.setFont(undefined, 'normal');
      doc.text(`  Total Earnings: ${project.earnings.toLocaleString('cs-CZ')} CZK`, margin, yPos);
      yPos += 5;
      doc.text(`  Percentage of Total: ${project.percentage.toFixed(1)}%`, margin, yPos);
      yPos += 8;
    });

    // Add charts as images
    doc.addPage();
    yPos = margin;

    doc.setFontSize(16);
    doc.text('Visual Analytics', margin, yPos);
    yPos += 10;

    // Earnings chart
    const earningsCanvas = document.getElementById('earningsChart');
    if (earningsCanvas) {
      const imgData = earningsCanvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', margin, yPos, pageWidth - 2 * margin, 80);
      yPos += 85;
    }

    // Worker comparison (new page if needed)
    if (yPos > pageHeight - 90) {
      doc.addPage();
      yPos = margin;
    }

    const workerCanvas = document.getElementById('workerComparisonChart');
    if (workerCanvas) {
      const imgData = workerCanvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', margin, yPos, pageWidth - 2 * margin, 70);
    }

    // Footer on last page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount} | MST - Marty Solar Tracker`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save PDF
    const filename = `mst-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);

    window.Toast?.success('PDF report generated', 'Export Complete');

  } catch (error) {
    console.error('[Export] PDF generation failed:', error);
    window.Toast?.error('Failed to generate PDF report', 'Export Error');
  }
}

/**
 * Calculate statistics for PDF report
 * @param {Object} appState
 * @returns {Object} Stats object
 */
function calculateReportStats(appState) {
  const { workers, projects, workEntries } = appState;

  let totalEarnings = 0;
  let totalHours = 0;
  let taskCount = 0;

  workEntries.forEach(entry => {
    if (entry.type === 'task') {
      totalEarnings += entry.rewardPerWorker * entry.workers.length;
      taskCount++;
    } else {
      totalEarnings += entry.totalEarned || 0;
      totalHours += entry.totalHours || 0;
    }
  });

  // Worker stats
  const workerStats = workers.map(worker => {
    const workerEntries = workEntries.filter(e => {
      if (e.type === 'task') {
        return e.workers.some(w => w.workerId === worker.id);
      }
      return e.workerId === worker.id;
    });

    const earnings = workerEntries.reduce((sum, e) => {
      if (e.type === 'task') return sum + e.rewardPerWorker;
      return sum + (e.totalEarned || 0);
    }, 0);

    const hours = workerEntries
      .filter(e => e.type === 'hourly')
      .reduce((sum, e) => sum + (e.totalHours || 0), 0);

    const tasks = workerEntries.filter(e => e.type === 'task').length;

    return {
      name: worker.name,
      code: worker.workerCode,
      earnings,
      hours,
      taskCount: tasks
    };
  }).sort((a, b) => b.earnings - a.earnings);

  // Project stats
  const projectStats = projects.map(project => {
    const projectEntries = workEntries.filter(e => e.projectId === project.id);

    const earnings = projectEntries.reduce((sum, e) => {
      if (e.type === 'task') return sum + e.rewardPerWorker * e.workers.length;
      return sum + (e.totalEarned || 0);
    }, 0);

    return {
      name: project.name,
      earnings,
      percentage: totalEarnings > 0 ? (earnings / totalEarnings) * 100 : 0
    };
  }).sort((a, b) => b.earnings - a.earnings);

  // Date range
  let dateRange = 'N/A';
  if (workEntries.length > 0) {
    const dates = workEntries.map(e => new Date(e.timestamp)).sort((a, b) => a - b);
    const start = dates[0].toLocaleDateString('cs-CZ');
    const end = dates[dates.length - 1].toLocaleDateString('cs-CZ');
    dateRange = `${start} - ${end}`;
  }

  return {
    totalEarnings,
    totalHours,
    taskCount,
    avgPerTask: taskCount > 0 ? totalEarnings / taskCount : 0,
    workerCount: workers.length,
    projectCount: projects.length,
    dateRange,
    workerStats,
    projectStats
  };
}

/**
 * Share chart using Web Share API
 * @param {string} canvasId
 * @param {string} title
 */
async function shareChart(canvasId, title = 'MST Chart') {
  if (!navigator.share || !navigator.canShare) {
    window.Toast?.warning('Sharing not supported in this browser', 'Share');
    // Fallback: copy image to clipboard
    await copyChartToClipboard(canvasId);
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    window.Toast?.error('Chart not found', 'Share Error');
    return;
  }

  try {
    canvas.toBlob(async (blob) => {
      const file = new File([blob], 'mst-chart.png', { type: 'image/png' });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: title,
          text: `MST Analytics: ${title}`,
          files: [file]
        });
        window.Toast?.success('Chart shared successfully', 'Share');
      } else {
        window.Toast?.warning('File sharing not supported', 'Share');
      }
    }, 'image/png');
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[Export] Share failed:', error);
      window.Toast?.error('Failed to share chart', 'Share Error');
    }
  }
}

/**
 * Copy chart to clipboard
 * @param {string} canvasId
 */
async function copyChartToClipboard(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  try {
    canvas.toBlob(async (blob) => {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      window.Toast?.success('Chart copied to clipboard', 'Copied');
    }, 'image/png');
  } catch (error) {
    console.error('[Export] Clipboard copy failed:', error);
    window.Toast?.error('Failed to copy to clipboard', 'Copy Error');
  }
}

/**
 * Export data as JSON
 */
function exportDataAsJSON() {
  if (window.BackupService?.exportJSON) {
    window.BackupService.exportJSON();
  }
}

/**
 * Export data as CSV
 */
function exportDataAsCSV() {
  if (window.BackupService?.exportCSV) {
    window.BackupService.exportCSV();
  }
}

// Export API
window.ExportService = {
  exportChartAsPNG,
  exportAllChartsAsPNG,
  exportPDFReport,
  shareChart,
  copyChartToClipboard,
  exportDataAsJSON,
  exportDataAsCSV
};
