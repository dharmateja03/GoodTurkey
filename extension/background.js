// API Configuration
const API_BASE = 'https://goodturkey-backend-production.up.railway.app/api';
const SYNC_INTERVAL_MINUTES = 15;

// State
let rules = [];
let blockedUrls = new Map();
let token = null;
let userId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('GoodTurkey extension installed');
  chrome.alarms.create('syncRules', { periodInMinutes: SYNC_INTERVAL_MINUTES });
  chrome.alarms.create('resetDailyStats', { periodInMinutes: 60 });
  initializeStats();
  syncRules();
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncRules') {
    syncRules();
  } else if (alarm.name === 'resetDailyStats') {
    checkAndResetDailyStats();
  }
});

// Initialize stats if not present
function initializeStats() {
  chrome.storage.sync.get(['stats', 'lastStatsDate'], (items) => {
    if (!items.stats) {
      chrome.storage.sync.set({
        stats: { blockedToday: 0, streak: 0, totalBlocked: 0 },
        lastStatsDate: new Date().toDateString()
      });
    }
  });
}

// Check and reset daily stats at midnight
function checkAndResetDailyStats() {
  const today = new Date().toDateString();
  chrome.storage.sync.get(['lastStatsDate', 'stats'], (items) => {
    if (items.lastStatsDate !== today) {
      const stats = items.stats || { blockedToday: 0, streak: 0, totalBlocked: 0 };

      // If user had blocks yesterday, increment streak; otherwise reset
      if (stats.blockedToday > 0) {
        stats.streak = (stats.streak || 0) + 1;
      }

      stats.blockedToday = 0;
      chrome.storage.sync.set({ stats, lastStatsDate: today });
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'setToken':
      token = request.token;
      userId = request.userId;
      chrome.storage.sync.set({ authToken: request.token, userId: request.userId });
      syncRules();
      sendResponse({ success: true });
      break;

    case 'getToken':
      sendResponse({ token, userId });
      break;

    case 'logout':
      token = null;
      userId = null;
      rules = [];
      blockedUrls.clear();
      chrome.storage.sync.remove(['authToken', 'userId', 'cachedRules', 'cachedQuotes']);
      sendResponse({ success: true });
      break;

    case 'getRules':
      sendResponse({ rules });
      break;

    case 'syncRules':
      syncRules().then(() => sendResponse({ success: true, rules }));
      return true; // Keep channel open for async

    case 'getStats':
      chrome.storage.sync.get(['stats'], (items) => {
        sendResponse({ stats: items.stats });
      });
      return true;
  }
});

// Load stored token on startup
async function loadStoredToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['authToken', 'userId'], (items) => {
      if (items.authToken) {
        token = items.authToken;
        userId = items.userId;
      }
      resolve();
    });
  });
}

// Sync rules from backend
async function syncRules() {
  if (!token) {
    console.log('Not logged in, skipping sync');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/sync`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      console.error('Sync failed:', response.status);
      if (response.status === 401) {
        token = null;
        chrome.storage.sync.remove(['authToken', 'userId']);
      }
      return;
    }

    const data = await response.json();
    rules = data.rules || [];

    blockedUrls.clear();
    rules.forEach((rule) => blockedUrls.set(rule.url, rule));

    console.log('Rules synced:', rules.length, 'sites');
    chrome.storage.sync.set({
      cachedRules: JSON.stringify(rules),
      lastSync: new Date().toISOString()
    });

    await syncQuotes();
  } catch (error) {
    console.error('Sync error:', error);
  }
}

// Sync quotes from backend
async function syncQuotes() {
  if (!token) return;

  try {
    const response = await fetch(`${API_BASE}/quotes`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) return;

    const quotes = await response.json();
    const activeQuotes = quotes.filter((q) => q.isActive);
    chrome.storage.sync.set({ cachedQuotes: JSON.stringify(activeQuotes) });
    console.log('Quotes synced:', activeQuotes.length, 'active quotes');
  } catch (error) {
    console.error('Quotes sync error:', error);
  }
}

// Check if URL is blocked
function isUrlBlocked(url) {
  try {
    const hostname = new URL(url).hostname;

    for (const [pattern, rule] of blockedUrls) {
      if (hostname.includes(pattern)) {
        if (!isInAllowedTimeWindow(rule.timeWindows)) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Error checking URL:', error);
  }
  return false;
}

// Check if current time falls in any allowed time window
function isInAllowedTimeWindow(timeWindows) {
  if (!timeWindows || timeWindows.length === 0) {
    return false; // No windows = blocked all time
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);

  for (const window of timeWindows) {
    if (window.dayOfWeek !== null && window.dayOfWeek !== dayOfWeek) {
      continue;
    }

    const startTime = window.startTime.slice(0, 5);
    const endTime = window.endTime.slice(0, 5);

    if (currentTime >= startTime && currentTime <= endTime) {
      return true;
    }
  }

  return false;
}

// Record access attempt and update stats
async function recordAccessAttempt(url) {
  // Update local stats
  chrome.storage.sync.get(['stats'], (items) => {
    const stats = items.stats || { blockedToday: 0, streak: 0, totalBlocked: 0 };
    stats.blockedToday++;
    stats.totalBlocked++;
    chrome.storage.sync.set({ stats });
  });

  // Record to backend
  if (!token) return;

  try {
    await fetch(`${API_BASE}/sites/attempt`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });
  } catch (error) {
    console.error('Failed to record access attempt:', error);
  }
}

// Block navigation to blocked sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    // Skip chrome:// and extension URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    if (isUrlBlocked(tab.url)) {
      recordAccessAttempt(tab.url);
      const blockedUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(tab.url);
      chrome.tabs.update(tabId, { url: blockedUrl });
    }
  }
});

// Initialize on startup
loadStoredToken().then(() => {
  checkAndResetDailyStats();

  if (token) {
    syncRules();
  } else {
    chrome.storage.sync.get(['cachedRules'], (items) => {
      if (items.cachedRules) {
        try {
          rules = JSON.parse(items.cachedRules);
          blockedUrls.clear();
          rules.forEach((rule) => blockedUrls.set(rule.url, rule));
          console.log('Loaded cached rules:', rules.length, 'sites');
        } catch (error) {
          console.error('Error loading cached rules:', error);
        }
      }
    });
  }
});
