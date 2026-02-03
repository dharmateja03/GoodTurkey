// GoodTurkey - Standalone Popup Script

// Screens
const dashboard = document.getElementById('dashboard');
const settingsScreen = document.getElementById('settingsScreen');
const quotesScreen = document.getElementById('quotesScreen');
const scheduleScreen = document.getElementById('scheduleScreen');

// Current editing site
let currentEditingSiteId = null;

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
  animateStats();
});

function setupEventListeners() {
  // Navigation
  document.getElementById('settingsBtn').addEventListener('click', showSettings);
  document.getElementById('backBtn').addEventListener('click', showDashboard);
  document.getElementById('quotesBackBtn').addEventListener('click', showSettings);
  document.getElementById('manageQuotesBtn').addEventListener('click', showQuotes);
  document.getElementById('scheduleBackBtn').addEventListener('click', showDashboard);

  // Add site
  addSiteForm.addEventListener('submit', handleAddSite);

  // Settings
  unlockDelaySelect.addEventListener('change', saveSettings);
  notificationsToggle.addEventListener('change', saveSettings);
  document.getElementById('clearStatsBtn').addEventListener('click', handleClearStats);

  // Quotes
  document.getElementById('addQuoteForm').addEventListener('submit', handleAddQuote);

  // Schedule mode buttons
  document.getElementById('modeAlways').addEventListener('click', () => setScheduleMode('always'));
  document.getElementById('modeScheduled').addEventListener('click', () => setScheduleMode('scheduled'));

  // Day buttons
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => btn.classList.toggle('active'));
  });

  // Add schedule
  document.getElementById('addScheduleBtn').addEventListener('click', handleAddSchedule);
}

// Animate stats on load
function animateStats() {
  const statValues = document.querySelectorAll('.stat-value');
  statValues.forEach(el => {
    const finalValue = parseInt(el.textContent) || 0;
    animateNumber(el, 0, finalValue, 600);
  });
}

function animateNumber(el, start, end, duration) {
  if (start === end) return;
  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
    const current = Math.floor(start + (range * easeProgress));
    el.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// Screen navigation with transitions
function showDashboard() {
  settingsScreen.classList.add('hidden');
  quotesScreen.classList.add('hidden');
  scheduleScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  loadSites();
  loadStats();
}

function showSettings() {
  dashboard.classList.add('hidden');
  quotesScreen.classList.add('hidden');
  scheduleScreen.classList.add('hidden');
  settingsScreen.classList.remove('hidden');
  loadSettings();
}

function showQuotes() {
  settingsScreen.classList.add('hidden');
  scheduleScreen.classList.add('hidden');
  quotesScreen.classList.remove('hidden');
  loadQuotes();
}

function showSchedule(siteId) {
  currentEditingSiteId = siteId;
  dashboard.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  quotesScreen.classList.add('hidden');
  scheduleScreen.classList.remove('hidden');
  loadScheduleScreen(siteId);
}

function loadScheduleScreen(siteId) {
  chrome.runtime.sendMessage({ action: 'getSite', id: siteId }, (response) => {
    const site = response?.site;
    if (!site) return;

    // Update site info
    document.getElementById('scheduleSiteIcon').textContent = site.url.charAt(0).toUpperCase();
    document.getElementById('scheduleSiteName').textContent = site.url;

    // Set mode based on existing time windows
    const hasSchedules = site.timeWindows && site.timeWindows.length > 0;
    setScheduleMode(hasSchedules ? 'scheduled' : 'always', false);

    // Load existing schedules
    loadSchedulesList(site.timeWindows || []);
  });
}

function setScheduleMode(mode, save = true) {
  const alwaysBtn = document.getElementById('modeAlways');
  const scheduledBtn = document.getElementById('modeScheduled');
  const editor = document.getElementById('scheduleEditor');

  if (mode === 'always') {
    alwaysBtn.classList.add('active');
    scheduledBtn.classList.remove('active');
    editor.classList.add('hidden');

    if (save && currentEditingSiteId) {
      // Clear all schedules when switching to "always"
      chrome.runtime.sendMessage({
        action: 'updateSite',
        id: currentEditingSiteId,
        updates: { timeWindows: [] }
      }, () => {
        showToast('Blocking 24/7', 'success');
      });
    }
  } else {
    alwaysBtn.classList.remove('active');
    scheduledBtn.classList.add('active');
    editor.classList.remove('hidden');
  }
}

function loadSchedulesList(timeWindows) {
  const list = document.getElementById('schedulesList');

  if (!timeWindows || timeWindows.length === 0) {
    list.innerHTML = '<div class="no-schedules">No schedules added yet</div>';
    return;
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  list.innerHTML = timeWindows.map(tw => {
    const days = tw.days && tw.days.length > 0
      ? tw.days.map(d => dayNames[d]).join(', ')
      : 'Every day';

    return `
      <div class="schedule-item">
        <div class="schedule-info">
          <div class="schedule-time">${tw.startTime} - ${tw.endTime}</div>
          <div class="schedule-days">${days}</div>
        </div>
        <button class="schedule-delete" data-id="${tw.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
  }).join('');

  // Add delete listeners
  list.querySelectorAll('.schedule-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const windowId = btn.dataset.id;
      chrome.runtime.sendMessage({
        action: 'removeTimeWindow',
        siteId: currentEditingSiteId,
        windowId
      }, (response) => {
        if (response.success) {
          showToast('Schedule removed', 'success');
          loadScheduleScreen(currentEditingSiteId);
        }
      });
    });
  });
}

function handleAddSchedule() {
  const startTime = document.getElementById('scheduleStartTime').value;
  const endTime = document.getElementById('scheduleEndTime').value;

  // Get selected days
  const days = [];
  document.querySelectorAll('.day-btn.active').forEach(btn => {
    days.push(parseInt(btn.dataset.day));
  });

  if (!startTime || !endTime) {
    showToast('Select start and end time', 'error');
    return;
  }

  if (startTime >= endTime) {
    showToast('End time must be after start time', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'addTimeWindow',
    siteId: currentEditingSiteId,
    timeWindow: {
      startTime,
      endTime,
      days: days.length > 0 ? days : null // null means every day
    }
  }, (response) => {
    if (response.success) {
      showToast('Schedule added', 'success');
      loadScheduleScreen(currentEditingSiteId);
    } else {
      showToast(response.error || 'Failed to add schedule', 'error');
    }
  });
}

// Load sites
function loadSites() {
  chrome.runtime.sendMessage({ action: 'getSites' }, (response) => {
    const sites = response?.sites || [];
    siteCount.textContent = sites.length;

    if (sites.length === 0) {
      sitesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 21V9"/>
            </svg>
          </div>
          <p class="empty-title">No sites blocked</p>
          <p class="empty-desc">Add a website above to start your focus journey</p>
        </div>
      `;
      return;
    }

    sitesList.innerHTML = sites.map((site, index) => {
      const isUnlocking = site.unlockRequestedAt !== null;
      let meta = 'Protected';
      let unlockBtn = '';

      if (isUnlocking && site.isActive) {
        const remaining = getTimeRemaining(site.unlockRequestedAt);
        if (remaining > 0) {
          meta = `${formatTime(remaining)} remaining`;
        } else {
          meta = 'Ready to unlock';
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

      const initial = site.url.charAt(0).toUpperCase();

      const hasSchedule = site.timeWindows && site.timeWindows.length > 0;
      const scheduleIcon = hasSchedule ? `
        <button class="site-btn" data-action="schedule" data-id="${site.id}" title="Edit schedule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      ` : `
        <button class="site-btn" data-action="schedule" data-id="${site.id}" title="Add schedule">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
      `;

      return `
        <div class="site-item ${isUnlocking ? 'unlocking' : ''} ${!site.isActive ? 'inactive' : ''}" style="animation-delay: ${index * 0.05}s">
          <div class="site-favicon">${initial}</div>
          <div class="site-info">
            <div class="site-url">${site.url}</div>
            <div class="site-meta ${isUnlocking ? 'warning' : ''}">${meta}${hasSchedule ? ' · Scheduled' : ''}</div>
          </div>
          <div class="site-actions">
            ${scheduleIcon}
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

  // Add click feedback
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => btn.style.transform = '', 150);

  if (action === 'schedule') {
    showSchedule(id);
    return;
  } else if (action === 'unlock') {
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
  btn.style.transform = 'scale(0.95)';

  chrome.runtime.sendMessage({ action: 'addSite', site: { url } }, (response) => {
    btn.disabled = false;
    btn.style.transform = '';

    if (response.success) {
      newSiteUrl.value = '';
      showToast(`${url} blocked`, 'success');
      loadSites();

      // Animate the input
      newSiteUrl.style.transform = 'scale(0.98)';
      setTimeout(() => newSiteUrl.style.transform = '', 150);
    } else {
      showToast(response.error || 'Failed to add site', 'error');
    }
  });
}

// Load stats with animation
function loadStats() {
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    const stats = response?.stats || { blockedToday: 0, streak: 0, totalBlocked: 0 };

    const prevBlocked = parseInt(blockedToday.textContent) || 0;
    const prevStreak = parseInt(streakCount.textContent) || 0;
    const prevTotal = parseInt(totalBlocked.textContent) || 0;

    animateNumber(blockedToday, prevBlocked, stats.blockedToday || 0, 400);
    animateNumber(streakCount, prevStreak, stats.streak || 0, 400);
    animateNumber(totalBlocked, prevTotal, stats.totalBlocked || 0, 400);
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

    if (quotes.length === 0) {
      quotesList.innerHTML = `
        <div class="empty-state">
          <p class="empty-title">No quotes yet</p>
          <p class="empty-desc">Add your own motivational quotes above</p>
        </div>
      `;
      return;
    }

    quotesList.innerHTML = quotes.map(quote => `
      <div class="quote-item">
        <div class="quote-text">${quote.text}</div>
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
          showToast('Quote removed', 'success');
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
  if (existing) {
    existing.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(8px)';
    setTimeout(() => toast.remove(), 200);
  }, 2500);
}

// Refresh sites list periodically (for unlock timer updates)
setInterval(() => {
  if (!dashboard.classList.contains('hidden')) {
    loadSites();
  }
}, 30000);
