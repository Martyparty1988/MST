// ============================================
// Advanced Analytics Module
// Goals, metrics, and performance tracking
// ============================================

const GOAL_STORAGE_KEY = 'mst:goals';
const METRICS_STORAGE_KEY = 'mst:metrics';

/**
 * Goal structure:
 * {
 *   id: string,
 *   type: 'earnings' | 'tasks' | 'hours',
 *   target: number,
 *   period: 'daily' | 'weekly' | 'monthly',
 *   createdAt: string,
 *   active: boolean
 * }
 */

/**
 * Get all goals
 * @returns {Array} Goals
 */
function getGoals() {
  try {
    const stored = localStorage.getItem(GOAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : getDefaultGoals();
  } catch (error) {
    console.error('[Analytics] Failed to load goals:', error);
    return getDefaultGoals();
  }
}

/**
 * Get default goals
 * @returns {Array} Default goals
 */
function getDefaultGoals() {
  return [
    {
      id: 'goal_daily_earnings',
      type: 'earnings',
      target: 1000,
      period: 'daily',
      createdAt: new Date().toISOString(),
      active: true,
      name: 'Daily Earnings Goal',
      icon: '💰'
    },
    {
      id: 'goal_weekly_tasks',
      type: 'tasks',
      target: 10,
      period: 'weekly',
      createdAt: new Date().toISOString(),
      active: true,
      name: 'Weekly Tasks Goal',
      icon: '📋'
    },
    {
      id: 'goal_monthly_hours',
      type: 'hours',
      target: 160,
      period: 'monthly',
      createdAt: new Date().toISOString(),
      active: true,
      name: 'Monthly Hours Goal',
      icon: '⏱️'
    }
  ];
}

/**
 * Save goals
 * @param {Array} goals
 */
function saveGoals(goals) {
  try {
    localStorage.setItem(GOAL_STORAGE_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('[Analytics] Failed to save goals:', error);
  }
}

/**
 * Add or update goal
 * @param {Object} goal
 */
function setGoal(goal) {
  const goals = getGoals();
  const index = goals.findIndex(g => g.id === goal.id);

  if (index >= 0) {
    goals[index] = { ...goals[index], ...goal };
  } else {
    goals.push({
      id: goal.id || `goal_${Date.now()}`,
      createdAt: new Date().toISOString(),
      active: true,
      ...goal
    });
  }

  saveGoals(goals);
}

/**
 * Calculate goal progress
 * @param {Object} goal
 * @param {Array} workEntries
 * @returns {Object} Progress data
 */
function calculateGoalProgress(goal, workEntries) {
  const now = new Date();
  let periodStart;

  // Determine period start date
  switch (goal.period) {
    case 'daily':
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      periodStart = new Date(0);
  }

  // Filter entries for this period
  const periodEntries = workEntries.filter(e => new Date(e.timestamp) >= periodStart);

  // Calculate current value based on goal type
  let current = 0;

  switch (goal.type) {
    case 'earnings':
      current = periodEntries.reduce((sum, e) => {
        if (e.type === 'task') {
          return sum + e.rewardPerWorker * e.workers.length;
        }
        return sum + (e.totalEarned || 0);
      }, 0);
      break;

    case 'tasks':
      current = periodEntries.filter(e => e.type === 'task').length;
      break;

    case 'hours':
      current = periodEntries
        .filter(e => e.type === 'hourly')
        .reduce((sum, e) => sum + (e.totalHours || 0), 0);
      break;
  }

  const percentage = goal.target > 0 ? (current / goal.target) * 100 : 0;
  const remaining = Math.max(0, goal.target - current);

  return {
    current,
    target: goal.target,
    percentage: Math.min(100, percentage),
    remaining,
    achieved: current >= goal.target,
    periodStart: periodStart.toISOString(),
    periodEnd: getPeriodEnd(periodStart, goal.period).toISOString()
  };
}

/**
 * Get period end date
 * @param {Date} start
 * @param {string} period
 * @returns {Date}
 */
function getPeriodEnd(start, period) {
  const end = new Date(start);

  switch (period) {
    case 'daily':
      end.setDate(end.getDate() + 1);
      break;
    case 'weekly':
      end.setDate(end.getDate() + 7);
      break;
    case 'monthly':
      end.setMonth(end.getMonth() + 1);
      break;
  }

  return end;
}

/**
 * Get all goals with progress
 * @param {Array} workEntries
 * @returns {Array} Goals with progress
 */
function getGoalsWithProgress(workEntries) {
  const goals = getGoals().filter(g => g.active);

  return goals.map(goal => ({
    ...goal,
    progress: calculateGoalProgress(goal, workEntries)
  }));
}

/**
 * Calculate performance metrics
 * @param {Object} appState
 * @returns {Object} Performance metrics
 */
function calculatePerformanceMetrics(appState) {
  const { workers, projects, workEntries } = appState;

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  // Time-based filtering
  const last7Days = workEntries.filter(e => now - new Date(e.timestamp) <= oneWeek);
  const last30Days = workEntries.filter(e => now - new Date(e.timestamp) <= oneMonth);

  // Calculate metrics
  const metrics = {
    // Velocity metrics
    velocity: {
      tasksPerDay: calculateAverage(last7Days.filter(e => e.type === 'task'), 7),
      earningsPerDay: calculateDailyAverage(last7Days, 7),
      hoursPerDay: calculateHoursAverage(last7Days, 7)
    },

    // Efficiency metrics
    efficiency: {
      earningsPerHour: calculateEarningsPerHour(last30Days),
      earningsPerTask: calculateEarningsPerTask(last30Days),
      completionRate: calculateCompletionRate(last30Days)
    },

    // Consistency metrics
    consistency: {
      earningsConsistency: calculateConsistencyScore(last30Days, 'earnings'),
      taskConsistency: calculateConsistencyScore(last30Days, 'tasks'),
      activityDays: calculateActiveDays(last30Days)
    },

    // Growth metrics
    growth: {
      earningsGrowth: calculateGrowth(workEntries, 'earnings'),
      taskGrowth: calculateGrowth(workEntries, 'tasks'),
      productivityGrowth: calculateProductivityGrowth(workEntries)
    },

    // Quality metrics
    quality: {
      avgTaskValue: calculateEarningsPerTask(last30Days),
      highValueTasks: countHighValueTasks(last30Days),
      projectDiversity: calculateProjectDiversity(last30Days, projects)
    }
  };

  // Overall performance score (0-100)
  metrics.overallScore = calculateOverallScore(metrics);

  return metrics;
}

/**
 * Calculate average tasks per day
 * @param {Array} entries
 * @param {number} days
 * @returns {number}
 */
function calculateAverage(entries, days) {
  return entries.length / days;
}

/**
 * Calculate daily average earnings
 * @param {Array} entries
 * @param {number} days
 * @returns {number}
 */
function calculateDailyAverage(entries, days) {
  const total = entries.reduce((sum, e) => {
    if (e.type === 'task') return sum + e.rewardPerWorker * e.workers.length;
    return sum + (e.totalEarned || 0);
  }, 0);

  return total / days;
}

/**
 * Calculate average hours per day
 * @param {Array} entries
 * @param {number} days
 * @returns {number}
 */
function calculateHoursAverage(entries, days) {
  const total = entries
    .filter(e => e.type === 'hourly')
    .reduce((sum, e) => sum + (e.totalHours || 0), 0);

  return total / days;
}

/**
 * Calculate earnings per hour
 * @param {Array} entries
 * @returns {number}
 */
function calculateEarningsPerHour(entries) {
  const hourlyEntries = entries.filter(e => e.type === 'hourly');
  if (hourlyEntries.length === 0) return 0;

  const totalEarnings = hourlyEntries.reduce((sum, e) => sum + (e.totalEarned || 0), 0);
  const totalHours = hourlyEntries.reduce((sum, e) => sum + (e.totalHours || 0), 0);

  return totalHours > 0 ? totalEarnings / totalHours : 0;
}

/**
 * Calculate earnings per task
 * @param {Array} entries
 * @returns {number}
 */
function calculateEarningsPerTask(entries) {
  const taskEntries = entries.filter(e => e.type === 'task');
  if (taskEntries.length === 0) return 0;

  const total = taskEntries.reduce((sum, e) => sum + e.rewardPerWorker * e.workers.length, 0);
  return total / taskEntries.length;
}

/**
 * Calculate completion rate (placeholder - would need more data)
 * @param {Array} entries
 * @returns {number}
 */
function calculateCompletionRate(entries) {
  // Simplified: assume all logged tasks are completed
  return entries.length > 0 ? 95 : 0;
}

/**
 * Calculate consistency score
 * @param {Array} entries
 * @param {string} type
 * @returns {number}
 */
function calculateConsistencyScore(entries, type) {
  if (entries.length < 2) return 100;

  // Group by date
  const byDate = {};
  entries.forEach(e => {
    const date = new Date(e.timestamp).toDateString();
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(e);
  });

  // Calculate daily values
  const dailyValues = Object.values(byDate).map(dayEntries => {
    if (type === 'earnings') {
      return dayEntries.reduce((sum, e) => {
        if (e.type === 'task') return sum + e.rewardPerWorker * e.workers.length;
        return sum + (e.totalEarned || 0);
      }, 0);
    } else {
      return dayEntries.filter(e => e.type === 'task').length;
    }
  });

  // Calculate coefficient of variation
  const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
  const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : 0;

  // Lower CV = higher consistency
  return Math.max(0, Math.min(100, 100 * (1 - cv)));
}

/**
 * Calculate active days
 * @param {Array} entries
 * @returns {number}
 */
function calculateActiveDays(entries) {
  const uniqueDates = new Set(entries.map(e => new Date(e.timestamp).toDateString()));
  return uniqueDates.size;
}

/**
 * Calculate growth rate
 * @param {Array} entries
 * @param {string} type
 * @returns {number} Percentage growth
 */
function calculateGrowth(entries, type) {
  if (entries.length < 2) return 0;

  // Split into two halves
  const mid = Math.floor(entries.length / 2);
  const firstHalf = entries.slice(0, mid);
  const secondHalf = entries.slice(mid);

  const firstValue = type === 'earnings' ?
    firstHalf.reduce((sum, e) => {
      if (e.type === 'task') return sum + e.rewardPerWorker * e.workers.length;
      return sum + (e.totalEarned || 0);
    }, 0) :
    firstHalf.filter(e => e.type === 'task').length;

  const secondValue = type === 'earnings' ?
    secondHalf.reduce((sum, e) => {
      if (e.type === 'task') return sum + e.rewardPerWorker * e.workers.length;
      return sum + (e.totalEarned || 0);
    }, 0) :
    secondHalf.filter(e => e.type === 'task').length;

  return firstValue > 0 ? ((secondValue - firstValue) / firstValue) * 100 : 0;
}

/**
 * Calculate productivity growth
 * @param {Array} entries
 * @returns {number}
 */
function calculateProductivityGrowth(entries) {
  // Similar to growth but considers efficiency
  return calculateGrowth(entries, 'earnings');
}

/**
 * Count high-value tasks (above average)
 * @param {Array} entries
 * @returns {number}
 */
function countHighValueTasks(entries) {
  const taskEntries = entries.filter(e => e.type === 'task');
  if (taskEntries.length === 0) return 0;

  const avgValue = calculateEarningsPerTask(taskEntries);
  return taskEntries.filter(e =>
    e.rewardPerWorker * e.workers.length > avgValue
  ).length;
}

/**
 * Calculate project diversity
 * @param {Array} entries
 * @param {Array} projects
 * @returns {number} Percentage (0-100)
 */
function calculateProjectDiversity(entries, projects) {
  if (projects.length === 0) return 0;

  const uniqueProjects = new Set(entries.map(e => e.projectId));
  return (uniqueProjects.size / projects.length) * 100;
}

/**
 * Calculate overall performance score
 * @param {Object} metrics
 * @returns {number} Score (0-100)
 */
function calculateOverallScore(metrics) {
  const scores = [
    Math.min(100, metrics.velocity.earningsPerDay / 10), // /10 to scale to 0-100
    Math.min(100, metrics.efficiency.earningsPerHour / 5),
    metrics.consistency.earningsConsistency,
    Math.min(100, Math.max(0, metrics.growth.earningsGrowth + 50)), // Scale -50 to +50 → 0 to 100
    Math.min(100, metrics.quality.avgTaskValue / 5)
  ];

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Get performance insights
 * @param {Object} metrics
 * @returns {Array} Insights
 */
function getPerformanceInsights(metrics) {
  const insights = [];

  // Velocity insights
  if (metrics.velocity.tasksPerDay < 1) {
    insights.push({
      type: 'warning',
      title: 'Low Task Velocity',
      message: 'Consider increasing daily task completion rate',
      icon: '⚠️'
    });
  } else if (metrics.velocity.tasksPerDay > 3) {
    insights.push({
      type: 'success',
      title: 'High Productivity',
      message: 'Great task completion rate!',
      icon: '🚀'
    });
  }

  // Consistency insights
  if (metrics.consistency.earningsConsistency < 60) {
    insights.push({
      type: 'info',
      title: 'Variable Earnings',
      message: 'Try to maintain more consistent daily earnings',
      icon: '📊'
    });
  }

  // Growth insights
  if (metrics.growth.earningsGrowth > 10) {
    insights.push({
      type: 'success',
      title: 'Strong Growth',
      message: `${metrics.growth.earningsGrowth.toFixed(1)}% earnings growth`,
      icon: '📈'
    });
  } else if (metrics.growth.earningsGrowth < -10) {
    insights.push({
      type: 'warning',
      title: 'Declining Earnings',
      message: 'Focus on increasing productivity',
      icon: '📉'
    });
  }

  // Quality insights
  if (metrics.quality.highValueTasks > 5) {
    insights.push({
      type: 'success',
      title: 'Quality Work',
      message: `${metrics.quality.highValueTasks} high-value tasks completed`,
      icon: '⭐'
    });
  }

  return insights;
}

// Export API
window.Analytics = {
  getGoals,
  setGoal,
  saveGoals,
  getGoalsWithProgress,
  calculatePerformanceMetrics,
  getPerformanceInsights
};
