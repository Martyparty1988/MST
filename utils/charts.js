// ============================================
// Charts Module
// Data visualization using Chart.js
// ============================================

let earningsChart = null;
let workerComparisonChart = null;
let projectBreakdownChart = null;

/**
 * Get theme colors based on current mode
 * @returns {Object} Color scheme
 */
function getChartColors() {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches ||
                 document.documentElement.getAttribute('data-color-scheme') === 'dark';

  return {
    primary: '#32b8c6',
    primaryLight: 'rgba(50, 184, 198, 0.2)',
    secondary: '#2d96b2',
    accent: '#ffa502',
    success: '#00c9a7',
    danger: '#ff4757',
    text: isDark ? '#f5f5f5' : '#1f2121',
    textSecondary: isDark ? '#a7a9a9' : '#626c6c',
    grid: isDark ? 'rgba(167, 169, 169, 0.1)' : 'rgba(94, 82, 64, 0.1)',
    background: isDark ? 'rgba(38, 40, 40, 0.8)' : 'rgba(255, 255, 253, 0.8)'
  };
}

/**
 * Get default chart options
 * @returns {Object} Chart.js options
 */
function getDefaultChartOptions() {
  const colors = getChartColors();

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: colors.text,
          font: {
            size: 12,
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: colors.background,
        titleColor: colors.text,
        bodyColor: colors.textSecondary,
        borderColor: colors.primary,
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toLocaleString('cs-CZ') + ' CZK';
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.textSecondary,
          font: {
            size: 11
          },
          callback: function(value) {
            return value.toLocaleString('cs-CZ') + ' CZK';
          }
        },
        grid: {
          color: colors.grid,
          drawBorder: false
        }
      },
      x: {
        ticks: {
          color: colors.textSecondary,
          font: {
            size: 11
          },
          maxRotation: 45,
          minRotation: 0
        },
        grid: {
          display: false,
          drawBorder: false
        }
      }
    }
  };
}

/**
 * Process earnings data by date
 * @param {Array} workEntries
 * @returns {Object} Processed data
 */
function processEarningsByDate(workEntries) {
  const earningsByDate = {};

  workEntries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dateKey = date.toISOString().split('T')[0];

    if (!earningsByDate[dateKey]) {
      earningsByDate[dateKey] = 0;
    }

    if (entry.type === 'task') {
      earningsByDate[dateKey] += entry.rewardPerWorker * entry.workers.length;
    } else {
      earningsByDate[dateKey] += entry.totalEarned || 0;
    }
  });

  // Sort by date
  const sortedDates = Object.keys(earningsByDate).sort();

  // Get last 30 days or all available data
  const last30Days = sortedDates.slice(-30);

  return {
    labels: last30Days.map(d => new Date(d).toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' })),
    data: last30Days.map(d => earningsByDate[d]),
    rawDates: last30Days
  };
}

/**
 * Process earnings by worker
 * @param {Array} workEntries
 * @param {Array} workers
 * @returns {Object} Processed data
 */
function processEarningsByWorker(workEntries, workers) {
  const earningsByWorker = {};

  // Initialize with all workers
  workers.forEach(worker => {
    earningsByWorker[worker.id] = {
      name: worker.name,
      code: worker.workerCode,
      color: worker.color,
      earnings: 0
    };
  });

  // Calculate earnings
  workEntries.forEach(entry => {
    if (entry.type === 'task') {
      entry.workers.forEach(w => {
        if (earningsByWorker[w.workerId]) {
          earningsByWorker[w.workerId].earnings += entry.rewardPerWorker;
        }
      });
    } else {
      if (earningsByWorker[entry.workerId]) {
        earningsByWorker[entry.workerId].earnings += entry.totalEarned || 0;
      }
    }
  });

  const sortedWorkers = Object.values(earningsByWorker)
    .sort((a, b) => b.earnings - a.earnings);

  return {
    labels: sortedWorkers.map(w => w.code),
    data: sortedWorkers.map(w => w.earnings),
    colors: sortedWorkers.map(w => w.color)
  };
}

/**
 * Process earnings by project
 * @param {Array} workEntries
 * @param {Array} projects
 * @returns {Object} Processed data
 */
function processEarningsByProject(workEntries, projects) {
  const earningsByProject = {};

  // Initialize with all projects
  projects.forEach(project => {
    earningsByProject[project.id] = {
      name: project.name,
      earnings: 0
    };
  });

  // Calculate earnings
  workEntries.forEach(entry => {
    if (earningsByProject[entry.projectId]) {
      if (entry.type === 'task') {
        earningsByProject[entry.projectId].earnings += entry.rewardPerWorker * entry.workers.length;
      } else {
        earningsByProject[entry.projectId].earnings += entry.totalEarned || 0;
      }
    }
  });

  const sortedProjects = Object.values(earningsByProject)
    .filter(p => p.earnings > 0)
    .sort((a, b) => b.earnings - a.earnings);

  const colors = getChartColors();
  const projectColors = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.success,
    colors.danger,
    '#8b5cf6',
    '#ec4899',
    '#f97316'
  ];

  return {
    labels: sortedProjects.map(p => p.name),
    data: sortedProjects.map(p => p.earnings),
    colors: sortedProjects.map((_, i) => projectColors[i % projectColors.length])
  };
}

/**
 * Create earnings over time chart
 * @param {string} canvasId
 * @param {Array} workEntries
 */
function createEarningsChart(canvasId, workEntries) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();
  const processed = processEarningsByDate(workEntries);

  // Destroy existing chart
  if (earningsChart) {
    earningsChart.destroy();
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colors.primaryLight);
  gradient.addColorStop(1, 'rgba(50, 184, 198, 0.01)');

  earningsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: processed.labels,
      datasets: [{
        label: 'Daily Earnings',
        data: processed.data,
        borderColor: colors.primary,
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.primary,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: colors.primary,
        pointHoverBorderColor: '#fff'
      }]
    },
    options: {
      ...getDefaultChartOptions(),
      plugins: {
        ...getDefaultChartOptions().plugins,
        title: {
          display: true,
          text: 'Earnings Over Time (Last 30 Days)',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: {
            top: 10,
            bottom: 20
          }
        }
      }
    }
  });
}

/**
 * Create worker comparison chart
 * @param {string} canvasId
 * @param {Array} workEntries
 * @param {Array} workers
 */
function createWorkerComparisonChart(canvasId, workEntries, workers) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();
  const processed = processEarningsByWorker(workEntries, workers);

  // Destroy existing chart
  if (workerComparisonChart) {
    workerComparisonChart.destroy();
  }

  workerComparisonChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: processed.labels,
      datasets: [{
        label: 'Total Earnings',
        data: processed.data,
        backgroundColor: processed.colors.map(c => c + '99'), // Add transparency
        borderColor: processed.colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      ...getDefaultChartOptions(),
      plugins: {
        ...getDefaultChartOptions().plugins,
        title: {
          display: true,
          text: 'Earnings by Worker',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          display: false
        }
      }
    }
  });
}

/**
 * Create project breakdown chart
 * @param {string} canvasId
 * @param {Array} workEntries
 * @param {Array} projects
 */
function createProjectBreakdownChart(canvasId, workEntries, projects) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();
  const processed = processEarningsByProject(workEntries, projects);

  // Destroy existing chart
  if (projectBreakdownChart) {
    projectBreakdownChart.destroy();
  }

  projectBreakdownChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: processed.labels,
      datasets: [{
        data: processed.data,
        backgroundColor: processed.colors.map(c => c + 'CC'), // Add transparency
        borderColor: processed.colors,
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: colors.text,
            font: {
              size: 12,
              family: "'FK Grotesk Neue', 'Inter', sans-serif"
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: {
          display: true,
          text: 'Earnings by Project',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: {
            top: 10,
            bottom: 20
          }
        },
        tooltip: {
          backgroundColor: colors.background,
          titleColor: colors.text,
          bodyColor: colors.textSecondary,
          borderColor: colors.primary,
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value.toLocaleString('cs-CZ')} CZK (${percentage}%)`;
            }
          }
        }
      },
      cutout: '60%'
    }
  });
}

/**
 * Destroy all charts
 */
function destroyAllCharts() {
  if (earningsChart) {
    earningsChart.destroy();
    earningsChart = null;
  }
  if (workerComparisonChart) {
    workerComparisonChart.destroy();
    workerComparisonChart = null;
  }
  if (projectBreakdownChart) {
    projectBreakdownChart.destroy();
    projectBreakdownChart = null;
  }
}

/**
 * Initialize all charts for stats page
 * @param {Object} appState
 */
function initializeStatsCharts(appState) {
  // Small delay to ensure DOM is ready
  setTimeout(() => {
    if (appState.workEntries.length === 0) {
      console.log('[Charts] No data to display');
      return;
    }

    try {
      createEarningsChart('earningsChart', appState.workEntries);
      createWorkerComparisonChart('workerComparisonChart', appState.workEntries, appState.workers);
      createProjectBreakdownChart('projectBreakdownChart', appState.workEntries, appState.projects);
    } catch (error) {
      console.error('[Charts] Failed to initialize:', error);
      window.Toast?.error('Failed to load charts', 'Chart Error');
    }
  }, 100);
}

// Export API
window.Charts = {
  createEarningsChart,
  createWorkerComparisonChart,
  createProjectBreakdownChart,
  destroyAllCharts,
  initializeStatsCharts
};
