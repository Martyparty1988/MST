// ============================================
// Advanced Charts Module
// Extended visualizations and analytics
// ============================================

let performanceRadarChart = null;
let correlationScatterChart = null;
let timeStackedBarChart = null;
let trendLineChart = null;

/**
 * Create worker performance radar chart
 * @param {string} canvasId
 * @param {Array} workEntries
 * @param {Array} workers
 */
function createPerformanceRadarChart(canvasId, workEntries, workers) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();

  // Calculate performance metrics for each worker
  const metrics = workers.map(worker => {
    const workerEntries = workEntries.filter(e => {
      if (e.type === 'task') {
        return e.workers.some(w => w.workerId === worker.id);
      }
      return e.workerId === worker.id;
    });

    const taskEntries = workerEntries.filter(e => e.type === 'task');
    const hourlyEntries = workerEntries.filter(e => e.type === 'hourly');

    const totalEarnings = workerEntries.reduce((sum, e) => {
      if (e.type === 'task') return sum + e.rewardPerWorker;
      return sum + (e.totalEarned || 0);
    }, 0);

    const totalHours = hourlyEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);
    const avgEarningsPerTask = taskEntries.length > 0 ? totalEarnings / taskEntries.length : 0;
    const consistency = calculateConsistency(workerEntries);

    return {
      worker: worker.name,
      color: worker.color,
      data: [
        Math.min(100, (totalEarnings / 10000) * 100), // Total earnings (max 10k)
        Math.min(100, (taskEntries.length / 20) * 100), // Task count (max 20)
        Math.min(100, (totalHours / 100) * 100), // Total hours (max 100)
        Math.min(100, (avgEarningsPerTask / 500) * 100), // Avg per task (max 500)
        consistency * 100 // Consistency (0-100)
      ]
    };
  });

  // Destroy existing chart
  if (performanceRadarChart) {
    performanceRadarChart.destroy();
  }

  performanceRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Total Earnings', 'Task Count', 'Total Hours', 'Avg/Task', 'Consistency'],
      datasets: metrics.map(m => ({
        label: m.worker,
        data: m.data,
        backgroundColor: m.color + '33',
        borderColor: m.color,
        borderWidth: 2,
        pointBackgroundColor: m.color,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: m.color,
        pointRadius: 4,
        pointHoverRadius: 6
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Worker Performance Radar',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: colors.text,
            font: { size: 11 },
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: colors.background,
          titleColor: colors.text,
          bodyColor: colors.textSecondary,
          borderColor: colors.primary,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            color: colors.textSecondary,
            font: { size: 10 },
            callback: function(value) {
              return value + '%';
            }
          },
          grid: {
            color: colors.grid
          },
          pointLabels: {
            color: colors.text,
            font: { size: 11, weight: '500' }
          }
        }
      }
    }
  });
}

/**
 * Calculate consistency score for worker
 * @param {Array} entries
 * @returns {number} Consistency score (0-1)
 */
function calculateConsistency(entries) {
  if (entries.length < 2) return 1;

  const earnings = entries.map(e => {
    if (e.type === 'task') return e.rewardPerWorker;
    return e.totalEarned || 0;
  });

  const mean = earnings.reduce((a, b) => a + b, 0) / earnings.length;
  const variance = earnings.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / earnings.length;
  const stdDev = Math.sqrt(variance);

  // Lower std dev = higher consistency
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
  return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
}

/**
 * Create hours vs earnings scatter plot
 * @param {string} canvasId
 * @param {Array} workEntries
 */
function createCorrelationScatterChart(canvasId, workEntries) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();

  // Get hourly entries only
  const hourlyEntries = workEntries.filter(e => e.type === 'hourly' && e.totalHours > 0);

  const data = hourlyEntries.map(e => ({
    x: e.totalHours,
    y: e.totalEarned || 0
  }));

  // Calculate trend line
  const trendLine = calculateTrendLine(data);

  // Destroy existing chart
  if (correlationScatterChart) {
    correlationScatterChart.destroy();
  }

  correlationScatterChart = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Hours vs Earnings',
          data: data,
          backgroundColor: colors.primary + '99',
          borderColor: colors.primary,
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          pointStyle: 'circle'
        },
        {
          label: 'Trend Line',
          data: trendLine,
          type: 'line',
          borderColor: colors.accent,
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Hours vs Earnings Correlation',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: colors.text,
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: colors.background,
          titleColor: colors.text,
          bodyColor: colors.textSecondary,
          borderColor: colors.primary,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return `${context.parsed.x}h → ${context.parsed.y.toLocaleString('cs-CZ')} CZK`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          position: 'bottom',
          title: {
            display: true,
            text: 'Hours Worked',
            color: colors.text,
            font: { size: 13, weight: '600' }
          },
          ticks: {
            color: colors.textSecondary,
            font: { size: 11 },
            callback: function(value) {
              return value + 'h';
            }
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        },
        y: {
          title: {
            display: true,
            text: 'Earnings (CZK)',
            color: colors.text,
            font: { size: 13, weight: '600' }
          },
          ticks: {
            color: colors.textSecondary,
            font: { size: 11 },
            callback: function(value) {
              return value.toLocaleString('cs-CZ');
            }
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        }
      }
    }
  });
}

/**
 * Calculate linear regression trend line
 * @param {Array} data - Array of {x, y} points
 * @returns {Array} Trend line points
 */
function calculateTrendLine(data) {
  if (data.length < 2) return [];

  const n = data.length;
  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const minX = Math.min(...data.map(p => p.x));
  const maxX = Math.max(...data.map(p => p.x));

  return [
    { x: minX, y: slope * minX + intercept },
    { x: maxX, y: slope * maxX + intercept }
  ];
}

/**
 * Create stacked bar chart for time periods
 * @param {string} canvasId
 * @param {Array} workEntries
 * @param {Array} projects
 */
function createTimeStackedBarChart(canvasId, workEntries, projects) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();

  // Group by month and project
  const monthlyData = {};

  workEntries.forEach(entry => {
    const date = new Date(entry.timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {};
    }

    const projectId = entry.projectId;
    if (!monthlyData[monthKey][projectId]) {
      monthlyData[monthKey][projectId] = 0;
    }

    if (entry.type === 'task') {
      monthlyData[monthKey][projectId] += entry.rewardPerWorker * entry.workers.length;
    } else {
      monthlyData[monthKey][projectId] += entry.totalEarned || 0;
    }
  });

  // Prepare data
  const sortedMonths = Object.keys(monthlyData).sort();
  const last6Months = sortedMonths.slice(-6);

  const projectColors = ['#32b8c6', '#2d96b2', '#ffa502', '#00c9a7', '#ff4757', '#8b5cf6'];

  const datasets = projects.map((project, index) => ({
    label: project.name,
    data: last6Months.map(month => monthlyData[month][project.id] || 0),
    backgroundColor: projectColors[index % projectColors.length] + 'CC',
    borderColor: projectColors[index % projectColors.length],
    borderWidth: 1
  }));

  // Destroy existing chart
  if (timeStackedBarChart) {
    timeStackedBarChart.destroy();
  }

  timeStackedBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: last6Months.map(m => {
        const [year, month] = m.split('-');
        return new Date(year, month - 1).toLocaleDateString('cs-CZ', { year: 'numeric', month: 'short' });
      }),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Monthly Earnings by Project',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: colors.text,
            font: { size: 11 },
            padding: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: colors.background,
          titleColor: colors.text,
          bodyColor: colors.textSecondary,
          borderColor: colors.primary,
          borderWidth: 1,
          padding: 12,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toLocaleString('cs-CZ')} CZK`;
            },
            footer: function(items) {
              const total = items.reduce((sum, item) => sum + item.parsed.y, 0);
              return `Total: ${total.toLocaleString('cs-CZ')} CZK`;
            }
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: colors.textSecondary,
            font: { size: 11 }
          },
          grid: {
            display: false
          }
        },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: {
            color: colors.textSecondary,
            font: { size: 11 },
            callback: function(value) {
              return value.toLocaleString('cs-CZ');
            }
          },
          grid: {
            color: colors.grid,
            drawBorder: false
          }
        }
      }
    }
  });
}

/**
 * Create earnings trend with prediction
 * @param {string} canvasId
 * @param {Array} workEntries
 */
function createTrendPredictionChart(canvasId, workEntries) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const colors = getChartColors();

  const processed = processEarningsByDate(workEntries);

  // Calculate trend and predict next 7 days
  const prediction = predictFutureTrend(processed.data, processed.rawDates, 7);

  // Destroy existing chart
  if (trendLineChart) {
    trendLineChart.destroy();
  }

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, colors.primaryLight);
  gradient.addColorStop(1, 'rgba(50, 184, 198, 0.01)');

  trendLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [...processed.labels, ...prediction.labels],
      datasets: [
        {
          label: 'Actual Earnings',
          data: [...processed.data, ...Array(prediction.labels.length).fill(null)],
          borderColor: colors.primary,
          backgroundColor: gradient,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: colors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        },
        {
          label: 'Predicted Earnings',
          data: [...Array(processed.data.length).fill(null), processed.data[processed.data.length - 1], ...prediction.data],
          borderColor: colors.accent,
          backgroundColor: 'rgba(255, 165, 2, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: colors.accent,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointStyle: 'star'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Earnings Trend with 7-Day Prediction',
          color: colors.text,
          font: {
            size: 16,
            weight: '600',
            family: "'FK Grotesk Neue', 'Inter', sans-serif"
          },
          padding: { top: 10, bottom: 20 }
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: colors.text,
            font: { size: 12 },
            padding: 15,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: colors.background,
          titleColor: colors.text,
          bodyColor: colors.textSecondary,
          borderColor: colors.primary,
          borderWidth: 1,
          padding: 12
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: colors.textSecondary,
            font: { size: 11 },
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
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

/**
 * Predict future trend using linear regression
 * @param {Array} data - Historical data
 * @param {Array} dates - Historical dates
 * @param {number} days - Number of days to predict
 * @returns {Object} Prediction data
 */
function predictFutureTrend(data, dates, days) {
  if (data.length < 2) {
    return { labels: [], data: [] };
  }

  // Simple moving average for smoothing
  const windowSize = Math.min(7, Math.floor(data.length / 2));
  const smoothed = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    smoothed.push(window.reduce((a, b) => a + b, 0) / window.length);
  }

  // Calculate trend
  const points = smoothed.map((val, idx) => ({ x: idx, y: val }));
  const trendLine = calculateTrendLine(points);
  const slope = trendLine.length > 1 ? (trendLine[1].y - trendLine[0].y) / (trendLine[1].x - trendLine[0].x) : 0;
  const lastValue = smoothed[smoothed.length - 1];

  // Generate predictions
  const predictions = [];
  const labels = [];
  const lastDate = new Date(dates[dates.length - 1]);

  for (let i = 1; i <= days; i++) {
    const predictedValue = Math.max(0, lastValue + slope * i);
    predictions.push(Math.round(predictedValue));

    const futureDate = new Date(lastDate);
    futureDate.setDate(futureDate.getDate() + i);
    labels.push(futureDate.toLocaleDateString('cs-CZ', { month: 'short', day: 'numeric' }));
  }

  return { labels, data: predictions };
}

/**
 * Destroy all advanced charts
 */
function destroyAdvancedCharts() {
  if (performanceRadarChart) {
    performanceRadarChart.destroy();
    performanceRadarChart = null;
  }
  if (correlationScatterChart) {
    correlationScatterChart.destroy();
    correlationScatterChart = null;
  }
  if (timeStackedBarChart) {
    timeStackedBarChart.destroy();
    timeStackedBarChart = null;
  }
  if (trendLineChart) {
    trendLineChart.destroy();
    trendLineChart = null;
  }
}

// Export API
window.AdvancedCharts = {
  createPerformanceRadarChart,
  createCorrelationScatterChart,
  createTimeStackedBarChart,
  createTrendPredictionChart,
  destroyAdvancedCharts
};
