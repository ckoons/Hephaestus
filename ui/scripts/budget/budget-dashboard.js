/**
 * Budget Dashboard JavaScript
 * Controller for the Budget Dashboard UI component in Hephaestus
 */

// Initialize the Rhetor client
let rhetorClient = null;
let budgetManager = null;

document.addEventListener('DOMContentLoaded', () => {
  initBudgetDashboard();
});

/**
 * Initialize the Budget Dashboard component
 */
function initBudgetDashboard() {
  setupTabNavigation();
  initRhetorClient();
  setupEventListeners();
  initCharts();
}

/**
 * Set up tab navigation for the Budget component
 */
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll('.budget-tabs .tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Deactivate all tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Activate selected tab
      button.classList.add('active');
      document.getElementById(`${tabName}-content`).classList.add('active');
    });
  });
}

/**
 * Initialize Rhetor client
 */
function initRhetorClient() {
  // Assuming RhetorClient class is available from rhetor-component.js
  rhetorClient = new RhetorClient({
    rhetorUrl: 'http://localhost:8300',
    componentId: 'hephaestus-budget',
    autoReconnect: true
  });
  
  // Connect to Rhetor
  connectToRhetor();
  
  // Create budget manager
  budgetManager = new BudgetManager(rhetorClient);
}

/**
 * Connect to the Rhetor service
 */
async function connectToRhetor() {
  try {
    await rhetorClient.connect();
    fetchBudgetData();
  } catch (error) {
    console.error('Failed to connect to Rhetor:', error);
    showConnectionError();
  }
}

/**
 * Show connection error message
 */
function showConnectionError() {
  // Display error in dashboard
  const dashboardContent = document.getElementById('dashboard-content');
  
  if (dashboardContent) {
    const errorMsg = document.createElement('div');
    errorMsg.className = 'connection-error';
    errorMsg.innerHTML = `
      <div class="error-container">
        <h3>Connection Error</h3>
        <p>Failed to connect to Rhetor service. Budget data cannot be displayed.</p>
        <button class="control-button" id="retry-connection">Retry Connection</button>
      </div>
    `;
    
    // Add to top of dashboard
    dashboardContent.insertBefore(errorMsg, dashboardContent.firstChild);
    
    // Add retry event listener
    document.getElementById('retry-connection')?.addEventListener('click', () => {
      errorMsg.remove();
      connectToRhetor();
    });
  }
}

/**
 * Set up event listeners for the dashboard
 */
function setupEventListeners() {
  // Period selector
  const periodSelect = document.getElementById('period-select');
  if (periodSelect) {
    periodSelect.addEventListener('change', () => {
      fetchBudgetData();
    });
  }
  
  // Refresh button
  const refreshButton = document.getElementById('refresh-dashboard');
  if (refreshButton) {
    refreshButton.addEventListener('click', () => {
      fetchBudgetData();
    });
  }
  
  // Chart selectors
  const chartSelects = document.querySelectorAll('.chart-select');
  chartSelects.forEach(select => {
    select.addEventListener('change', () => {
      updateCharts();
    });
  });
  
  // Budget settings save button
  const saveBudgetSettingsButton = document.getElementById('save-budget-settings');
  if (saveBudgetSettingsButton) {
    saveBudgetSettingsButton.addEventListener('click', saveBudgetSettings);
  }
  
  // Date filters in details tab
  const filterButton = document.getElementById('filter-usage');
  if (filterButton) {
    filterButton.addEventListener('click', fetchUsageDetails);
  }
  
  // Clear alerts button
  const clearAlertsButton = document.getElementById('clear-alerts');
  if (clearAlertsButton) {
    clearAlertsButton.addEventListener('click', clearAllAlerts);
  }
  
  // Save alert settings button
  const saveAlertSettingsButton = document.getElementById('save-alert-settings');
  if (saveAlertSettingsButton) {
    saveAlertSettingsButton.addEventListener('click', saveAlertSettings);
  }
  
  // Dismiss alert buttons
  const dismissButtons = document.querySelectorAll('.alert-item .alert-actions button');
  dismissButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const alertItem = e.target.closest('.alert-item');
      if (alertItem) {
        alertItem.remove();
      }
    });
  });
}

/**
 * Initialize chart placeholders
 */
function initCharts() {
  // In a real implementation, this would initialize Chart.js or another library
  // For the demo, we'll just update the placeholders
  
  const providerChart = document.getElementById('provider-pie-chart');
  const trendChart = document.getElementById('trend-chart');
  
  if (providerChart) {
    providerChart.innerHTML = 'Provider Distribution Chart<br>(Placeholder)';
  }
  
  if (trendChart) {
    trendChart.innerHTML = 'Daily Spend Trend Chart<br>(Placeholder)';
  }
}

/**
 * Update charts based on selected options
 */
function updateCharts() {
  // In a real implementation, this would update the charts with new data
  console.log('Updating charts with new options');
}

/**
 * Fetch budget data from Rhetor
 */
async function fetchBudgetData() {
  if (!rhetorClient || !budgetManager) return;
  
  try {
    await budgetManager.fetchBudgetData();
  } catch (error) {
    console.error('Failed to fetch budget data:', error);
  }
}

/**
 * Fetch usage details for the selected date range
 */
async function fetchUsageDetails() {
  if (!rhetorClient || !budgetManager) return;
  
  const startDate = document.getElementById('start-date')?.value;
  const endDate = document.getElementById('end-date')?.value;
  
  if (startDate && endDate) {
    try {
      await budgetManager.fetchUsageDetails(startDate, endDate);
    } catch (error) {
      console.error('Failed to fetch usage details:', error);
    }
  }
}

/**
 * Save budget settings
 */
async function saveBudgetSettings() {
  if (!rhetorClient || !budgetManager) return;
  
  // Get form values
  const dailyLimit = document.getElementById('daily-limit')?.value;
  const weeklyLimit = document.getElementById('weekly-limit')?.value;
  const monthlyLimit = document.getElementById('monthly-limit')?.value;
  const enforcePolicy = document.getElementById('enforce-policy')?.value;
  
  const anthropicLimit = document.getElementById('anthropic-limit')?.value;
  const openaiLimit = document.getElementById('openai-limit')?.value;
  const enableProviderLimits = document.getElementById('enable-provider-limits')?.checked;
  
  const warningThreshold = document.getElementById('warning-threshold')?.value;
  const allowFreeModels = document.getElementById('allow-free-models')?.checked;
  const resetDay = document.getElementById('reset-day')?.value;
  
  const settings = {
    limits: {
      daily: parseFloat(dailyLimit),
      weekly: parseFloat(weeklyLimit),
      monthly: parseFloat(monthlyLimit)
    },
    enforcement_policy: enforcePolicy,
    provider_limits: {
      enabled: enableProviderLimits,
      anthropic: parseFloat(anthropicLimit),
      openai: parseFloat(openaiLimit)
    },
    warning_threshold: parseInt(warningThreshold, 10),
    allow_free_models: allowFreeModels,
    reset_day: resetDay
  };
  
  try {
    await budgetManager.saveBudgetSettings(settings);
    alert('Budget settings saved successfully.');
  } catch (error) {
    console.error('Failed to save budget settings:', error);
    alert('Failed to save budget settings: ' + error.message);
  }
}

/**
 * Clear all alerts
 */
function clearAllAlerts() {
  const alertList = document.querySelector('.alert-list');
  
  if (alertList) {
    alertList.innerHTML = '';
  }
}

/**
 * Save alert settings
 */
async function saveAlertSettings() {
  if (!rhetorClient || !budgetManager) return;
  
  const enableEmailAlerts = document.getElementById('enable-email-alerts')?.checked;
  const alertEmail = document.getElementById('alert-email')?.value;
  const alertFrequency = document.getElementById('alert-frequency')?.value;
  
  const settings = {
    email_alerts: {
      enabled: enableEmailAlerts,
      email: alertEmail,
      frequency: alertFrequency
    }
  };
  
  try {
    await budgetManager.saveAlertSettings(settings);
    alert('Alert settings saved successfully.');
  } catch (error) {
    console.error('Failed to save alert settings:', error);
    alert('Failed to save alert settings: ' + error.message);
  }
}

/**
 * Budget Manager class for handling budget data and operations
 */
class BudgetManager {
  constructor(rhetorClient) {
    this.rhetorClient = rhetorClient;
    this.budgetData = null;
    this.usageDetails = null;
  }
  
  /**
   * Fetch budget data from Rhetor
   */
  async fetchBudgetData() {
    if (!this.rhetorClient) return;
    
    const period = document.getElementById('period-select')?.value || 'monthly';
    
    try {
      const data = await this.rhetorClient._get(`/budget?period=${period}`);
      this.budgetData = data;
      this.updateBudgetUI();
      return data;
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      throw error;
    }
  }
  
  /**
   * Fetch usage details for a date range
   */
  async fetchUsageDetails(startDate, endDate) {
    if (!this.rhetorClient) return;
    
    try {
      const data = await this.rhetorClient._get(`/budget/usage?start=${startDate}&end=${endDate}`);
      this.usageDetails = data;
      this.updateUsageDetails();
      return data;
    } catch (error) {
      console.error('Failed to fetch usage details:', error);
      throw error;
    }
  }
  
  /**
   * Save budget settings
   */
  async saveBudgetSettings(settings) {
    if (!this.rhetorClient) return;
    
    try {
      const result = await this.rhetorClient._post('/budget/settings', settings);
      return result;
    } catch (error) {
      console.error('Failed to save budget settings:', error);
      throw error;
    }
  }
  
  /**
   * Save alert settings
   */
  async saveAlertSettings(settings) {
    if (!this.rhetorClient) return;
    
    try {
      const result = await this.rhetorClient._post('/budget/alerts/settings', settings);
      return result;
    } catch (error) {
      console.error('Failed to save alert settings:', error);
      throw error;
    }
  }
  
  /**
   * Update the budget UI with fetched data
   */
  updateBudgetUI() {
    if (!this.budgetData) return;
    
    // Update budget summary cards
    this.updateBudgetSummary();
    
    // Update charts
    this.updateCharts();
    
    // Update top usage table
    this.updateTopUsage();
  }
  
  /**
   * Update budget summary cards
   */
  updateBudgetSummary() {
    const { daily, weekly, monthly, tokens } = this.budgetData || {};
    
    // Update daily card
    if (daily) {
      this.updateBudgetCard('Daily Spend', 'Today', daily.current, daily.limit, daily.percentage);
    }
    
    // Update weekly card
    if (weekly) {
      const weekRange = this.formatDateRange(weekly.start_date, weekly.end_date);
      this.updateBudgetCard('Weekly Spend', 'This Week', weekly.current, weekly.limit, weekly.percentage, weekRange);
    }
    
    // Update monthly card
    if (monthly) {
      const monthName = new Date().toLocaleString('default', { month: 'long' });
      const year = new Date().getFullYear();
      const monthRange = this.formatDateRange(monthly.start_date, monthly.end_date);
      this.updateBudgetCard('Monthly Spend', `${monthName} ${year}`, monthly.current, monthly.limit, monthly.percentage, monthRange);
    }
    
    // Update token usage card
    if (tokens) {
      const summaryCards = document.querySelectorAll('.budget-summary-card');
      const tokenCard = summaryCards[3]; // Fourth card
      
      if (tokenCard) {
        const amountElem = tokenCard.querySelector('.budget-amount');
        const footerElem = tokenCard.querySelector('.budget-card-footer');
        
        if (amountElem) {
          amountElem.textContent = this.formatTokens(tokens.total);
        }
        
        if (footerElem) {
          footerElem.innerHTML = `
            <div>Input: ${this.formatTokens(tokens.input)}</div>
            <div>Output: ${this.formatTokens(tokens.output)}</div>
          `;
        }
      }
    }
  }
  
  /**
   * Update a specific budget card
   */
  updateBudgetCard(title, period, current, limit, percentage, dateRange = null) {
    const summaryCards = document.querySelectorAll('.budget-summary-card');
    let targetCard = null;
    
    for (const card of summaryCards) {
      const titleElem = card.querySelector('.budget-card-title');
      if (titleElem && titleElem.textContent === title) {
        targetCard = card;
        break;
      }
    }
    
    if (!targetCard) return;
    
    const periodElem = targetCard.querySelector('.budget-card-period');
    const amountElem = targetCard.querySelector('.budget-amount');
    const limitElem = targetCard.querySelector('.budget-limit');
    const progressBar = targetCard.querySelector('.budget-progress-bar');
    const footerElem = targetCard.querySelector('.budget-card-footer');
    
    if (periodElem) periodElem.textContent = period;
    if (amountElem) amountElem.textContent = `$${current.toFixed(2)}`;
    if (limitElem) limitElem.textContent = `/ $${limit.toFixed(2)}`;
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      
      // Add warning/danger classes
      progressBar.classList.remove('warning', 'danger');
      if (percentage >= 90) {
        progressBar.classList.add('danger');
      } else if (percentage >= 70) {
        progressBar.classList.add('warning');
      }
    }
    
    if (footerElem) {
      footerElem.innerHTML = `
        <div>${percentage.toFixed(1)}% of ${title.toLowerCase()} limit</div>
        ${dateRange ? `<div>${dateRange}</div>` : ''}
      `;
    }
  }
  
  /**
   * Update charts with budget data
   */
  updateCharts() {
    // In a real implementation, this would update Chart.js or another charting library
    // For the demo, we'll just update the legends
    
    if (!this.budgetData || !this.budgetData.breakdown) return;
    
    const { by_provider } = this.budgetData.breakdown;
    
    if (by_provider) {
      const legend = document.querySelector('.chart-legend');
      
      if (legend) {
        const legendHTML = Object.entries(by_provider).map(([provider, amount]) => {
          const colorClass = provider.toLowerCase();
          return `
            <div class="legend-item">
              <span class="legend-color" style="background-color: ${this.getProviderColor(provider)};"></span>
              <span>${provider}: $${amount.toFixed(2)}</span>
            </div>
          `;
        }).join('');
        
        legend.innerHTML = legendHTML;
      }
    }
  }
  
  /**
   * Update top usage table
   */
  updateTopUsage() {
    if (!this.budgetData || !this.budgetData.top_usage) return;
    
    const { by_model } = this.budgetData.top_usage;
    
    if (by_model) {
      const tableBody = document.querySelector('.budget-detail-table tbody');
      
      if (tableBody) {
        const totalCost = by_model.reduce((sum, item) => sum + item.cost, 0);
        
        const rowsHTML = by_model.map(item => {
          const percentage = (item.cost / totalCost * 100).toFixed(1);
          return `
            <tr>
              <td>${item.model}</td>
              <td><span class="model-badge ${item.provider.toLowerCase()}">${item.provider}</span></td>
              <td>${this.formatTokens(item.tokens)}</td>
              <td>$${item.cost.toFixed(2)}</td>
              <td>${percentage}%</td>
            </tr>
          `;
        }).join('');
        
        tableBody.innerHTML = rowsHTML;
      }
    }
  }
  
  /**
   * Update usage details table
   */
  updateUsageDetails() {
    if (!this.usageDetails) return;
    
    const tableBody = document.querySelector('#details-content .budget-detail-table tbody');
    
    if (tableBody && this.usageDetails.items) {
      const rowsHTML = this.usageDetails.items.map(item => {
        const timestamp = new Date(item.timestamp).toLocaleString();
        const tokensFormatted = this.formatTokens(item.input_tokens + item.output_tokens);
        
        return `
          <tr>
            <td>${timestamp}</td>
            <td>${item.component}</td>
            <td><span class="model-badge ${item.provider.toLowerCase()}">${item.model}</span></td>
            <td>${item.task_type}</td>
            <td>${tokensFormatted}</td>
            <td>$${item.cost.toFixed(2)}</td>
          </tr>
        `;
      }).join('');
      
      tableBody.innerHTML = rowsHTML;
      
      // Update pagination
      const pagination = document.querySelector('.pagination');
      if (pagination) {
        const span = pagination.querySelector('span');
        if (span) {
          span.textContent = `Page ${this.usageDetails.page} of ${this.usageDetails.total_pages}`;
        }
      }
    }
  }
  
  /**
   * Format tokens for display (e.g., 1.2M, 542K)
   */
  formatTokens(tokens) {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    } else if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(0)}K`;
    } else {
      return tokens.toString();
    }
  }
  
  /**
   * Format date range for display
   */
  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const format = (date) => {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };
    
    return `${format(start)} - ${format(end)}`;
  }
  
  /**
   * Get color for provider
   */
  getProviderColor(provider) {
    const colors = {
      anthropic: '#7356BF',
      openai: '#10A283',
      ollama: '#FF6600',
      default: '#AAAAAA'
    };
    
    return colors[provider.toLowerCase()] || colors.default;
  }
}