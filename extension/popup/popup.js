// Change this to your deployed backend URL
const API_BASE = 'https://your-backend.railway.app/api'; // TODO: Update after deployment

// DOM elements
const loginForm = document.getElementById('loginForm');
const dashboard = document.getElementById('dashboard');
const loading = document.getElementById('loading');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.querySelector('#login button');
const loginError = document.getElementById('loginError');

const rulesList = document.getElementById('rulesList');
const syncBtn = document.getElementById('syncBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const logoutBtn = document.getElementById('logoutBtn');
const syncStatus = document.getElementById('syncStatus');

let currentToken = null;
let currentUserId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuthStatus();
});

// Check if user is logged in
function checkAuthStatus() {
  chrome.runtime.sendMessage({ action: 'getToken' }, (response) => {
    if (response.token) {
      currentToken = response.token;
      currentUserId = response.userId;
      showDashboard();
    } else {
      showLoginForm();
    }
  });
}

// Show login form
function showLoginForm() {
  loading.classList.add('hidden');
  loginForm.classList.remove('hidden');
  dashboard.classList.add('hidden');

  document.getElementById('login').addEventListener('submit', handleLogin);
}

// Show dashboard
function showDashboard() {
  loading.classList.add('hidden');
  loginForm.classList.add('hidden');
  dashboard.classList.remove('hidden');

  loadRules();
  updateLastSync();

  syncBtn.addEventListener('click', () => {
    syncBtn.disabled = true;
    chrome.runtime.sendMessage({ action: 'syncRules' }, () => {
      syncBtn.disabled = false;
      loadRules();
      updateLastSync();
    });
  });

  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://your-frontend.vercel.app' }); // TODO: Update after deployment
  });

  logoutBtn.addEventListener('click', handleLogout);
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  loginError.classList.add('hidden');

  const email = emailInput.value;
  const password = passwordInput.value;

  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

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

    // Send token to background script
    chrome.runtime.sendMessage(
      {
        action: 'setToken',
        token: data.token,
        userId: data.user.id,
      },
      () => {
        currentToken = data.token;
        currentUserId = data.user.id;
        showDashboard();
      }
    );
  } catch (error) {
    loginError.textContent = error.message;
    loginError.classList.remove('hidden');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

// Handle logout
function handleLogout() {
  if (confirm('Logout from GoodTurkey?')) {
    chrome.runtime.sendMessage({ action: 'logout' }, () => {
      currentToken = null;
      currentUserId = null;
      emailInput.value = '';
      passwordInput.value = '';
      showLoginForm();
    });
  }
}

// Load and display rules
function loadRules() {
  chrome.runtime.sendMessage({ action: 'getRules' }, (response) => {
    const rules = response.rules || [];

    if (rules.length === 0) {
      rulesList.innerHTML = '<div class="empty">📝</div>';
      return;
    }

    rulesList.innerHTML = rules
      .map((rule) => {
        const timeWindows = rule.timeWindows || [];
        let timeText = '';

        if (timeWindows.length === 0) {
          timeText = '<span class="blocked">🔒 24/7</span>';
        } else {
          const times = timeWindows
            .map((tw) => {
              const day =
                tw.dayOfWeek !== null
                  ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][tw.dayOfWeek]
                  : 'Daily';
              return `${day} ${tw.startTime.slice(0, 5)}-${tw.endTime.slice(0, 5)}`;
            })
            .join(', ');
          timeText = `<span class="times">${times}</span>`;
        }

        return `
          <div class="rule-item">
            <div class="url">${rule.url}</div>
            <div class="times">${timeText}</div>
          </div>
        `;
      })
      .join('');
  });
}

// Update last sync time
function updateLastSync() {
  chrome.storage.sync.get(['lastSync'], (items) => {
    if (items.lastSync) {
      const date = new Date(items.lastSync);
      const timeAgo = getTimeAgo(date);
      syncStatus.textContent = `⏱️ ${timeAgo}`;
    }
  });
}

// Get human-readable time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  return Math.floor(seconds / 86400) + 'd ago';
}

// Update sync status periodically
setInterval(updateLastSync, 30000);
