const API_BASE = 'http://localhost:3000/api';
const SYNC_INTERVAL_MINUTES = 15;

// State
let rules = [];
let blockedUrls = new Map(); // Map of URL patterns to rules
let token = null;
let userId = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('HotTurkey extension installed');
  // Set up periodic sync
  chrome.alarms.create('syncRules', { periodInMinutes: SYNC_INTERVAL_MINUTES });
  // Sync immediately
  syncRules();
});

// Handle alarm for periodic sync
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncRules') {
    syncRules();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setToken') {
    token = request.token;
    userId = request.userId;
    chrome.storage.sync.set({ authToken: request.token, userId: request.userId });
    syncRules();
    sendResponse({ success: true });
  } else if (request.action === 'getToken') {
    sendResponse({ token, userId });
  } else if (request.action === 'logout') {
    token = null;
    userId = null;
    rules = [];
    chrome.storage.sync.remove(['authToken', 'userId']);
    sendResponse({ success: true });
  } else if (request.action === 'getRules') {
    sendResponse({ rules });
  } else if (request.action === 'syncRules') {
    syncRules().then(() => {
      sendResponse({ success: true, rules });
    });
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Sync failed:', response.status);
      if (response.status === 401) {
        // Token expired
        token = null;
        chrome.storage.sync.remove(['authToken', 'userId']);
      }
      return;
    }

    const data = await response.json();
    rules = data.rules || [];

    // Build URL pattern map
    blockedUrls.clear();
    rules.forEach((rule) => {
      blockedUrls.set(rule.url, rule);
    });

    console.log('Rules synced:', rules.length, 'sites');
    chrome.storage.sync.set({ cachedRules: JSON.stringify(rules), lastSync: new Date().toISOString() });
    
    // Also sync quotes
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
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      console.error('Quotes sync failed:', response.status);
      return;
    }
    
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

    // Check if this domain matches any blocked rule
    for (const [pattern, rule] of blockedUrls) {
      if (hostname.includes(pattern)) {
        // Check time windows
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
    // No time windows = blocked all the time
    return false;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

    for (const window of timeWindows) {
    // Check if window applies to today (null means every day)
    if (window.dayOfWeek !== null && window.dayOfWeek !== dayOfWeek) {
      continue;
    }

    // Check if current time is within window
    // Convert HH:MM:SS to HH:MM for comparison
    const startTime = window.startTime.slice(0, 5);
    const endTime = window.endTime.slice(0, 5);
    if (currentTime >= startTime && currentTime <= endTime) {
      return true; // In allowed window
    }
  }

  return false; // Not in any allowed window
}

// Block navigation to blocked sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    if (isUrlBlocked(tab.url)) {
      // Redirect to blocked page
      const blockedUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(tab.url);
      chrome.tabs.update(tabId, { url: blockedUrl });
    }
  }
});

// Initialize on startup
loadStoredToken().then(() => {
  if (token) {
    // Try to sync if we have a token
    syncRules();
  } else {
    // Try to load cached rules
    chrome.storage.sync.get(['cachedRules'], (items) => {
      if (items.cachedRules) {
        try {
          rules = JSON.parse(items.cachedRules);
          blockedUrls.clear();
          rules.forEach((rule) => {
            blockedUrls.set(rule.url, rule);
          });
          console.log('Loaded cached rules:', rules.length, 'sites');
        } catch (error) {
          console.error('Error loading cached rules:', error);
        }
      }
    });
  }
});
