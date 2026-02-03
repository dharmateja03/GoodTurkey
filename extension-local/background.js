// GoodTurkey - Standalone Background Script
// All data stored locally in Chrome storage

const UNLOCK_DELAY_MS = 6 * 60 * 60 * 1000; // 6 hours

// State
let blockedSites = [];

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('GoodTurkey installed');

  // Set up alarms
  chrome.alarms.create('checkUnlocks', { periodInMinutes: 1 });
  chrome.alarms.create('resetDailyStats', { periodInMinutes: 60 });

  // Initialize default data
  initializeData();
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyStats') {
    checkAndResetDailyStats();
  }
});

// Initialize default data if not present
function initializeData() {
  chrome.storage.sync.get(['sites', 'stats', 'quotes', 'settings'], (items) => {
    if (!items.sites) {
      chrome.storage.sync.set({ sites: [] });
    }

    if (!items.stats) {
      chrome.storage.sync.set({
        stats: {
          blockedToday: 0,
          streak: 0,
          totalBlocked: 0,
          lastDate: new Date().toDateString()
        }
      });
    }

    if (!items.quotes) {
      chrome.storage.sync.set({ quotes: getDefaultQuotes() });
    }

    if (!items.settings) {
      chrome.storage.sync.set({
        settings: {
          unlockDelay: 6, // hours
          notifications: true,
          sounds: false
        }
      });
    }

    loadSites();
  });
}

// Default motivational quotes
function getDefaultQuotes() {
  return [
    { id: '1', text: "Don't stop when you're tired. Stop when you're done.", author: "David Goggins", active: true },
    { id: '2', text: "You are stopping you. You are giving up instead of getting hard.", author: "David Goggins", active: true },
    { id: '3', text: "Suffering is the true test of life.", author: "David Goggins", active: true },
    { id: '4', text: "Nobody cares what you did yesterday. What have you done today?", author: "David Goggins", active: true },
    { id: '5', text: "The path to success is through discomfort.", author: "Naval Ravikant", active: true },
    { id: '6', text: "When something is important enough, you do it even if the odds are not in your favor.", author: "Elon Musk", active: true },
    { id: '7', text: "Your attention is your most valuable asset. Protect it.", author: "Dan Koe", active: true },
    { id: '8', text: "Stop consuming. Start creating.", author: "Dan Koe", active: true },
    { id: '9', text: "Clarity comes from action, not thought.", author: "Dan Koe", active: true },
    { id: '10', text: "The goal isn't to be busy. The goal is to be effective.", author: "Dan Koe", active: true },
  ];
}

// Load sites from storage
function loadSites() {
  chrome.storage.sync.get(['sites'], (items) => {
    blockedSites = items.sites || [];
    console.log('Loaded', blockedSites.length, 'blocked sites');
  });
}

// Check and reset daily stats
function checkAndResetDailyStats() {
  const today = new Date().toDateString();

  chrome.storage.sync.get(['stats'], (items) => {
    const stats = items.stats || { blockedToday: 0, streak: 0, totalBlocked: 0, lastDate: today };

    if (stats.lastDate !== today) {
      // New day - update streak
      if (stats.blockedToday > 0) {
        stats.streak++;
      } else {
        stats.streak = 0;
      }
      stats.blockedToday = 0;
      stats.lastDate = today;
      chrome.storage.sync.set({ stats });
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getSites':
      chrome.storage.sync.get(['sites'], (items) => {
        sendResponse({ sites: items.sites || [] });
      });
      return true;

    case 'getSite':
      chrome.storage.sync.get(['sites'], (items) => {
        const site = (items.sites || []).find(s => s.id === request.id);
        sendResponse({ site });
      });
      return true;

    case 'addSite':
      addSite(request.site).then(sendResponse);
      return true;

    case 'updateSite':
      updateSite(request.id, request.updates).then(sendResponse);
      return true;

    case 'removeSite':
      removeSite(request.id).then(sendResponse);
      return true;

    case 'requestUnlock':
      requestUnlock(request.id).then(sendResponse);
      return true;

    case 'cancelUnlock':
      cancelUnlock(request.id).then(sendResponse);
      return true;

    case 'toggleSite':
      toggleSite(request.id).then(sendResponse);
      return true;

    case 'addTimeWindow':
      addTimeWindow(request.siteId, request.timeWindow).then(sendResponse);
      return true;

    case 'removeTimeWindow':
      removeTimeWindow(request.siteId, request.windowId).then(sendResponse);
      return true;

    case 'getStats':
      chrome.storage.sync.get(['stats'], (items) => {
        sendResponse({ stats: items.stats });
      });
      return true;

    case 'getQuotes':
      chrome.storage.sync.get(['quotes'], (items) => {
        sendResponse({ quotes: items.quotes || getDefaultQuotes() });
      });
      return true;

    case 'addQuote':
      addQuote(request.quote).then(sendResponse);
      return true;

    case 'removeQuote':
      removeQuote(request.id).then(sendResponse);
      return true;

    case 'getSettings':
      chrome.storage.sync.get(['settings'], (items) => {
        sendResponse({ settings: items.settings });
      });
      return true;

    case 'updateSettings':
      chrome.storage.sync.set({ settings: request.settings }, () => {
        sendResponse({ success: true });
      });
      return true;

    case 'clearStats':
      chrome.storage.sync.set({
        stats: { blockedToday: 0, streak: 0, totalBlocked: 0, lastDate: new Date().toDateString() }
      }, () => sendResponse({ success: true }));
      return true;
  }
});

// Add a new blocked site
async function addSite(site) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];

      // Check if already exists
      const exists = sites.some(s => s.url.toLowerCase() === site.url.toLowerCase());
      if (exists) {
        resolve({ success: false, error: 'Site already blocked' });
        return;
      }

      const newSite = {
        id: Date.now().toString(),
        url: site.url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0],
        isActive: true,
        createdAt: new Date().toISOString(),
        unlockRequestedAt: null,
        timeWindows: site.timeWindows || []
      };

      sites.push(newSite);
      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, site: newSite });
      });
    });
  });
}

// Request unlock for a site (starts 6-hour timer)
async function requestUnlock(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];
      const site = sites.find(s => s.id === id);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      site.unlockRequestedAt = new Date().toISOString();

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, site });
      });
    });
  });
}

// Cancel unlock request
async function cancelUnlock(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];
      const site = sites.find(s => s.id === id);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      site.unlockRequestedAt = null;

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, site });
      });
    });
  });
}

// Toggle site active status (only if unlock period complete)
async function toggleSite(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites', 'settings'], (items) => {
      const sites = items.sites || [];
      const settings = items.settings || { unlockDelay: 6 };
      const site = sites.find(s => s.id === id);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      // If trying to deactivate, check unlock timer
      if (site.isActive) {
        if (!site.unlockRequestedAt) {
          resolve({ success: false, error: 'Request unlock first', needsUnlock: true });
          return;
        }

        const unlockTime = new Date(site.unlockRequestedAt).getTime();
        const delayMs = settings.unlockDelay * 60 * 60 * 1000;
        const remaining = (unlockTime + delayMs) - Date.now();

        if (remaining > 0) {
          resolve({ success: false, error: 'Unlock not ready', remaining });
          return;
        }
      }

      site.isActive = !site.isActive;
      site.unlockRequestedAt = null;

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, site });
      });
    });
  });
}

// Remove a site (only if unlock period complete)
async function removeSite(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites', 'settings'], (items) => {
      const sites = items.sites || [];
      const settings = items.settings || { unlockDelay: 6 };
      const siteIndex = sites.findIndex(s => s.id === id);

      if (siteIndex === -1) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      const site = sites[siteIndex];

      // Check unlock timer
      if (site.isActive) {
        if (!site.unlockRequestedAt) {
          resolve({ success: false, error: 'Request unlock first', needsUnlock: true });
          return;
        }

        const unlockTime = new Date(site.unlockRequestedAt).getTime();
        const delayMs = settings.unlockDelay * 60 * 60 * 1000;
        const remaining = (unlockTime + delayMs) - Date.now();

        if (remaining > 0) {
          resolve({ success: false, error: 'Unlock not ready', remaining });
          return;
        }
      }

      sites.splice(siteIndex, 1);

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true });
      });
    });
  });
}

// Update a site
async function updateSite(id, updates) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];
      const site = sites.find(s => s.id === id);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      Object.assign(site, updates);

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, site });
      });
    });
  });
}

// Add time window to a site
async function addTimeWindow(siteId, timeWindow) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];
      const site = sites.find(s => s.id === siteId);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      if (!site.timeWindows) {
        site.timeWindows = [];
      }

      const newWindow = {
        id: Date.now().toString(),
        ...timeWindow
      };

      site.timeWindows.push(newWindow);

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true, timeWindow: newWindow });
      });
    });
  });
}

// Remove time window from a site
async function removeTimeWindow(siteId, windowId) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['sites'], (items) => {
      const sites = items.sites || [];
      const site = sites.find(s => s.id === siteId);

      if (!site) {
        resolve({ success: false, error: 'Site not found' });
        return;
      }

      site.timeWindows = (site.timeWindows || []).filter(w => w.id !== windowId);

      chrome.storage.sync.set({ sites }, () => {
        blockedSites = sites;
        resolve({ success: true });
      });
    });
  });
}

// Add a custom quote
async function addQuote(quote) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['quotes'], (items) => {
      const quotes = items.quotes || getDefaultQuotes();

      const newQuote = {
        id: Date.now().toString(),
        text: quote.text,
        author: quote.author,
        active: true,
        custom: true
      };

      quotes.push(newQuote);
      chrome.storage.sync.set({ quotes }, () => {
        resolve({ success: true, quote: newQuote });
      });
    });
  });
}

// Remove a custom quote
async function removeQuote(id) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['quotes'], (items) => {
      let quotes = items.quotes || [];
      quotes = quotes.filter(q => q.id !== id);

      chrome.storage.sync.set({ quotes }, () => {
        resolve({ success: true });
      });
    });
  });
}

// Check if URL is blocked
function isUrlBlocked(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    for (const site of blockedSites) {
      if (!site.isActive) continue;

      if (hostname.includes(site.url) || hostname === site.url || hostname === 'www.' + site.url) {
        // Check time windows - if no windows, blocked 24/7
        // If windows exist, only blocked during those times
        if (shouldBlockNow(site.timeWindows)) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('Error checking URL:', error);
  }
  return false;
}

// Check if site should be blocked right now based on time windows
function shouldBlockNow(timeWindows) {
  // No windows = blocked 24/7
  if (!timeWindows || timeWindows.length === 0) {
    return true;
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM

  for (const window of timeWindows) {
    // Check if this window applies to today
    // days is an array like [1,2,3,4,5] for weekdays, or null/empty for every day
    const days = window.days;

    if (days && days.length > 0) {
      if (!days.includes(dayOfWeek)) {
        continue; // This window doesn't apply today
      }
    }

    // Check if current time is within the block window
    if (currentTime >= window.startTime && currentTime <= window.endTime) {
      return true; // Should block now
    }
  }

  // Not in any block window
  return false;
}

// Record blocked attempt
function recordBlockedAttempt() {
  chrome.storage.sync.get(['stats'], (items) => {
    const stats = items.stats || { blockedToday: 0, streak: 0, totalBlocked: 0, lastDate: new Date().toDateString() };
    stats.blockedToday++;
    stats.totalBlocked++;
    chrome.storage.sync.set({ stats });
  });
}

// Block navigation to blocked sites
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    // Skip browser internal pages
    if (tab.url.startsWith('chrome://') ||
        tab.url.startsWith('chrome-extension://') ||
        tab.url.startsWith('about:')) {
      return;
    }

    if (isUrlBlocked(tab.url)) {
      recordBlockedAttempt();
      const blockedUrl = chrome.runtime.getURL('blocked.html') + '?url=' + encodeURIComponent(tab.url);
      chrome.tabs.update(tabId, { url: blockedUrl });
    }
  }
});

// Load sites on startup
chrome.storage.sync.get(['sites'], (items) => {
  blockedSites = items.sites || [];
  console.log('GoodTurkey loaded with', blockedSites.length, 'blocked sites');
});
