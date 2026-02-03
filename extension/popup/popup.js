// API Configuration
const API_BASE = 'https://goodturkey-backend-production.up.railway.app/api';
const FRONTEND_URL = 'https://goodturkey-frontend-production.up.railway.app';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const settingsPanel = document.getElementById('settingsPanel');
const loading = document.getElementById('loading');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('loginError');

const rulesList = document.getElementById('rulesList');
const syncBtn = document.getElementById('syncBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');
const backBtn = document.getElementById('backBtn');
const syncStatus = document.getElementById('syncStatus');

// Stats elements
const blockedCount = document.getElementById('blockedCount');
const streakCount = document.getElementById('streakCount');
const totalBlocked = document.getElementById('totalBlocked');

// Quick add elements
const addSiteForm = document.getElementById('addSiteForm');
const newSiteUrl = document.getElementById('newSiteUrl');

// Settings elements
const clearStatsBtn = document.getElementById('clearStatsBtn');

let currentToken = null;
let currentUserId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
  setupEventListeners();
});

function setupEventListeners() {
  // Login form
  document.getElementById('login').addEventListener('submit', handleLogin);

  // Dashboard buttons
  syncBtn?.addEventListener('click', handleSync);
  dashboardBtn?.addEventListener('click', () => chrome.tabs.create({ url: FRONTEND_URL }));
  logoutBtn?.addEventListener('click', handleLogout);
  settingsBtn?.addEventListener('click', showSettings);
  backBtn?.addEventListener('click', showDashboard);

  // Quick add form
  addSiteForm?.addEventListener('submit', handleAddSite);

  // Settings
  clearStatsBtn?.addEventListener('click', handleClearStats);
}

// Check authentication status
function checkAuthStatus() {
  chrome.runtime.sendMessage({ action: 'getToken' }, (response) => {
    if (response?.token) {
      currentToken = response.token;
      currentUserId = response.userId;
      showDashboard();
    } else {
      showLoginForm();
    }
  });
}

// Show screens
function showLoginForm() {
  loading.classList.add('hidden');
  loginForm.classList.remove('hidden');
  dashboard.classList.add('hidden');
  settingsPanel.classList.add('hidden');
}

function showDashboard() {
  loading.classList.add('hidden');
  loginForm.classList.add('hidden');
  dashboard.classList.remove('hidden');
  settingsPanel.classList.add('hidden');

  loadRules();
  loadStats();
  updateLastSync();
}

function showSettings() {
  dashboard.classList.add('hidden');
  settingsPanel.classList.remove('hidden');
  loadSettings();
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  loginError.classList.add('hidden');

  const email = emailInput.value;
  const password = passwordInput.value;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const btnText = submitBtn.querySelector('span');
  submitBtn.disabled = true;
  btnText.textContent = 'Signing in...';

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();

    chrome.runtime.sendMessage({
      action: 'setToken',
      token: data.token,
      userId: data.user.id,
    }, () => {
      currentToken = data.token;
      currentUserId = data.user.id;
      showDashboard();
    });
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Sign In';
  }
}

// Handle logout
function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      currentToken = null;
      currentUserId = null;
      emailInput.value = '';
      passwordInput.value = '';
      showLoginForm();
    });
  }
}

// Handle sync
function handleSync() {
  syncBtn.disabled = true;
  syncBtn.style.opacity = '0.6';

  chrome.runtime.sendMessage({ action: 'syncRules' }, () => {
    syncBtn.disabled = false;
    syncBtn.style.opacity = '1';
    loadRules();
    loadStats();
    updateLastSync();
  });
}

// Handle add site
async function handleAddSite(e) {
  e.preventDefault();

  let url = newSiteUrl.value.trim();
  if (!url) return;

  // Clean up URL
  url = url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  const submitBtn = addSiteForm.querySelector('button');
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${API_BASE}/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
      },
      body: JSON.stringify({ url, isActive: true }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add site');
    }

    newSiteUrl.value = '';

    // Sync rules to update the list
    chrome.runtime.sendMessage({ action: 'syncRules' }, () => {
      loadRules();
    });
  } catch (error) {
    alert(error.message);
  } finally {
    submitBtn.disabled = false;
  }
}

// Load and display rules
function loadRules() {
  chrome.runtime.sendMessage({ action: 'getRules' }, (response) => {
    const rules = response?.rules || [];

    if (rules.length === 0) {
      rulesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p>No blocked sites yet</p>
        </div>
      `;
      return;
    }

    rulesList.innerHTML = rules.map((rule) => {
      const timeWindows = rule.timeWindows || [];
      let badge = '';
      let meta = '';

      if (timeWindows.length === 0) {
        badge = '<span class="rule-badge">24/7</span>';
        meta = 'Blocked all day';
      } else {
        badge = '<span class="rule-badge time-window">Scheduled</span>';
        const times = timeWindows.slice(0, 2).map((tw) => {
          return `${tw.startTime.slice(0, 5)}-${tw.endTime.slice(0, 5)}`;
        }).join(', ');
        meta = times + (timeWindows.length > 2 ? ` +${timeWindows.length - 2} more` : '');
      }

      return `
        <div class="rule-item">
          <div class="rule-info">
            <div class="rule-url">${rule.url}</div>
            <div class="rule-meta">${meta}</div>
          </div>
          ${badge}
        </div>
      `;
    }).join('');
  });
}

// Load stats
function loadStats() {
  chrome.storage.sync.get(['stats'], (items) => {
    const stats = items.stats || { blockedToday: 0, streak: 0, totalBlocked: 0 };

    blockedCount.textContent = stats.blockedToday || 0;
    streakCount.textContent = stats.streak || 0;
    totalBlocked.textContent = stats.totalBlocked || 0;
  });

  // Also get today's blocked count from rules
  chrome.runtime.sendMessage({ action: 'getRules' }, (response) => {
    const rules = response?.rules || [];
    let total = 0;
    rules.forEach(rule => {
      total += rule.accessAttempts || 0;
    });
    if (total > 0) {
      totalBlocked.textContent = total;
    }
  });
}

// Load settings
function loadSettings() {
  chrome.storage.sync.get(['settings'], (items) => {
    const settings = items.settings || { notifications: true, sounds: false };
    document.getElementById('notificationsToggle').checked = settings.notifications;
    document.getElementById('soundToggle').checked = settings.sounds;
  });

  // Save settings on change
  document.getElementById('notificationsToggle')?.addEventListener('change', saveSettings);
  document.getElementById('soundToggle')?.addEventListener('change', saveSettings);
}

function saveSettings() {
  const settings = {
    notifications: document.getElementById('notificationsToggle').checked,
    sounds: document.getElementById('soundToggle').checked,
  };
  chrome.storage.sync.set({ settings });
}

// Clear stats
function handleClearStats() {
  if (confirm('Clear all statistics? This cannot be undone.')) {
    chrome.storage.sync.set({
      stats: { blockedToday: 0, streak: 0, totalBlocked: 0 }
    }, () => {
      loadStats();
    });
  }
}

// Update last sync time
function updateLastSync() {
  chrome.storage.sync.get(['lastSync'], (items) => {
    if (items.lastSync) {
      const date = new Date(items.lastSync);
      syncStatus.textContent = getTimeAgo(date);
    } else {
      syncStatus.textContent = 'Not synced';
    }
  });
}

// Get human-readable time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

// Update sync status periodically
setInterval(updateLastSync, 30000);
