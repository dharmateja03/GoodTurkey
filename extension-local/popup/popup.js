// GoodTurkey - Standalone Popup Script

// Screens
const dashboard = document.getElementById('dashboard');
const settingsScreen = document.getElementById('settingsScreen');
const quotesScreen = document.getElementById('quotesScreen');

// Elements
const sitesList = document.getElementById('sitesList');
const siteCount = document.getElementById('siteCount');
const addSiteForm = document.getElementById('addSiteForm');
const newSiteUrl = document.getElementById('newSiteUrl');

// Stats
const blockedToday = document.getElementById('blockedToday');
const streakCount = document.getElementById('streakCount');
const totalBlocked = document.getElementById('totalBlocked');

// Settings
const unlockDelaySelect = document.getElementById('unlockDelay');
const notificationsToggle = document.getElementById('notificationsToggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadSites();
  loadStats();
  loadSettings();
  setupEventListeners();
});

function setupEventListeners() {
  // Navigation
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('backBtn').addEventListener('click', showDashboard);
  document.getElementById('quotesBackBtn').addEventListener('click', showSettings);
  document.getElementById('manageQuotesBtn').addEventListener('click', showQuotes);

  // Add site
  addSiteForm.addEventListener('submit', handleAddSite);

  // Settings
  unlockDelaySelect.addEventListener('change', saveSettings);
  notificationsToggle.addEventListener('change', saveSettings);
  document.getElementById('clearStatsBtn').addEventListener('click', handleClearStats);

  // Quotes
  document.getElementById('addQuoteForm').addEventListener('submit', handleAddQuote);
}

// Screen navigation
function showDashboard() {
  dashboard.classList.remove('hidden');
  settingsScreen.classList.add('hidden');
  quotesScreen.classList.add('hidden');
  loadSites();
  loadStats();
}

function showSettings() {
  dashboard.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
  quotesScreen.classList.add('hidden');
  loadSettings();
}

function showQuotes() {
  settingsScreen.classList.add('hidden');
  quotesScreen.classList.remove('hidden');
  loadQuotes();
}

// Load sites
function loadSites() {
  chrome.runtime.sendMessage({ action: 'getSites' }, (response) => {
    const sites = response?.sites || [];
    siteCount.textContent = `${sites.length} site${sites.length !== 1 ? 's' : ''}`;

    if (sites.length === 0) {
      sitesList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <p>No sites blocked yet</p>
          <span>Add a site above to get started</span>
        </div>
      `;
      return;
    }

    sitesList.innerHTML = sites.map(site => {
      const isUnlocking = site.unlockRequestedAt !== null;
      let meta = site.isActive ? 'Active' : 'Paused';
      let unlockBtn = '';

      if (isUnlocking && site.isActive) {
        const remaining = getTimeRemaining(site.unlockRequestedAt);
        if (remaining > 0) {
          meta = `Unlocking in ${formatTime(remaining)}`;
        } else {
          meta = 'Ready to remove';
        }
      }

      if (site.isActive && !isUnlocking) {
        unlockBtn = `
          <button class="site-btn warning" data-action="unlock" data-id="${site.id}" title="Request unlock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
          </button>
        `;
      } else if (isUnlocking) {
        unlockBtn = `
          <button class="site-btn" data-action="cancelUnlock" data-id="${site.id}" title="Cancel unlock">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        `;
      }

      return `
        <div class="site-item ${isUnlocking ? 'unlocking' : ''} ${!site.isActive ? 'inactive' : ''}">
          <div class="site-info">
            <div class="site-url">${site.url}</div>
            <div class="site-meta ${isUnlocking ? 'warning' : ''}">${meta}</div>
          </div>
          <div class="site-actions">
            ${unlockBtn}
            <button class="site-btn danger" data-action="remove" data-id="${site.id}" title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners to buttons
    sitesList.querySelectorAll('.site-btn').forEach(btn => {
      btn.addEventListener('click', handleSiteAction);
    });
  });
}

// Handle site actions
function handleSiteAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;
  const id = btn.dataset.id;

  if (action === 'unlock') {
    chrome.runtime.sendMessage({ action: 'requestUnlock', id }, (response) => {
      if (response.success) {
        showToast('Unlock timer started', 'success');
        loadSites();
      }
    });
  } else if (action === 'cancelUnlock') {
    chrome.runtime.sendMessage({ action: 'cancelUnlock', id }, (response) => {
      if (response.success) {
        showToast('Unlock cancelled');
        loadSites();
      }
    });
  } else if (action === 'remove') {
    chrome.runtime.sendMessage({ action: 'removeSite', id }, (response) => {
      if (response.success) {
        showToast('Site removed', 'success');
        loadSites();
      } else if (response.needsUnlock) {
        showToast('Request unlock first', 'error');
      } else if (response.remaining) {
        showToast(`Wait ${formatTime(response.remaining)}`, 'error');
      } else {
        showToast(response.error || 'Failed to remove', 'error');
      }
    });
  }
}

// Get time remaining for unlock
function getTimeRemaining(unlockRequestedAt) {
  chrome.storage.sync.get(['settings'], (items) => {
    const settings = items.settings || { unlockDelay: 6 };
    const delayMs = settings.unlockDelay * 60 * 60 * 1000;
    const unlockTime = new Date(unlockRequestedAt).getTime();
    return Math.max(0, (unlockTime + delayMs) - Date.now());
  });

  // Default calculation for sync display
  const delayMs = 6 * 60 * 60 * 1000;
  const unlockTime = new Date(unlockRequestedAt).getTime();
  return Math.max(0, (unlockTime + delayMs) - Date.now());
}

// Format time remaining
function formatTime(ms) {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Add site
async function handleAddSite(e) {
  e.preventDefault();

  let url = newSiteUrl.value.trim();
  if (!url) return;

  // Clean URL
  url = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  const btn = addSiteForm.querySelector('button');
  btn.disabled = true;

  chrome.runtime.sendMessage({ action: 'addSite', site: { url } }, (response) => {
    btn.disabled = false;

    if (response.success) {
      newSiteUrl.value = '';
      showToast(`${url} blocked`, 'success');
      loadSites();
    } else {
      showToast(response.error || 'Failed to add site', 'error');
    }
  });
}

// Load stats
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    const stats = response?.stats || { blockedToday: 0, streak: 0, totalBlocked: 0 };
    blockedToday.textContent = stats.blockedToday || 0;
    streakCount.textContent = stats.streak || 0;
    totalBlocked.textContent = stats.totalBlocked || 0;
  });
}

// Load settings
function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
    const settings = response?.settings || { unlockDelay: 6, notifications: true };
    unlockDelaySelect.value = settings.unlockDelay || 6;
    notificationsToggle.checked = settings.notifications !== false;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    unlockDelay: parseInt(unlockDelaySelect.value),
    notifications: notificationsToggle.checked
  };

  chrome.runtime.sendMessage({ action: 'updateSettings', settings }, () => {
    showToast('Settings saved', 'success');
  });
}

// Clear stats
function handleClearStats() {
  if (confirm('Reset all statistics? This cannot be undone.')) {
    chrome.runtime.sendMessage({ action: 'clearStats' }, () => {
      showToast('Statistics reset', 'success');
      loadStats();
    });
  }
}

// Load quotes
function loadQuotes() {
  chrome.runtime.sendMessage({ action: 'getQuotes' }, (response) => {
    const quotes = response?.quotes || [];
    const quotesList = document.getElementById('quotesList');

    quotesList.innerHTML = quotes.map(quote => `
      <div class="quote-item">
        <div class="quote-text">"${quote.text}"</div>
        <div class="quote-footer">
          <span class="quote-author">— ${quote.author}</span>
          ${quote.custom ? `
            <button class="quote-delete" data-id="${quote.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');

    // Add delete listeners
    quotesList.querySelectorAll('.quote-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        chrome.runtime.sendMessage({ action: 'removeQuote', id }, () => {
          loadQuotes();
        });
      });
    });
  });
}

// Add quote
function handleAddQuote(e) {
  e.preventDefault();

  const text = document.getElementById('quoteText').value.trim();
  const author = document.getElementById('quoteAuthor').value.trim();

  if (!text || !author) return;

  chrome.runtime.sendMessage({ action: 'addQuote', quote: { text, author } }, (response) => {
    if (response.success) {
      document.getElementById('quoteText').value = '';
      document.getElementById('quoteAuthor').value = '';
      showToast('Quote added', 'success');
      loadQuotes();
    }
  });
}

// Show toast notification
function showToast(message, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 2500);
}

// Refresh sites list periodically (for unlock timer updates)
setInterval(loadSites, 60000);
