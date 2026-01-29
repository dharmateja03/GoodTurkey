# HotTurkey Chrome Extension

A Manifest V3 Chrome extension that blocks websites based on configurable time windows.

## Files

- **manifest.json** - Extension configuration
- **background.js** - Service worker handling blocking logic and syncing
- **popup/popup.html** - Popup UI
- **popup/popup.css** - Popup styling
- **popup/popup.js** - Popup functionality
- **blocked.html** - Page shown when a site is blocked

## How to Load the Extension

1. Open `chrome://extensions/` in Chrome
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `extension` folder
5. The HotTurkey extension should appear in your extensions list

## How It Works

1. **Login**: Click the extension icon and log in with your HotTurkey account
2. **Sync Rules**: The extension automatically syncs blocking rules every 15 minutes
3. **Blocking**: When you try to visit a blocked site outside allowed time windows, you're redirected to a blocked page
4. **Manage**: Visit the HotTurkey dashboard (http://localhost:5173) to configure sites and time windows

## Key Features

- ✅ Blocks websites based on configured rules
- ✅ Respects time windows (daily or per day of week)
- ✅ Periodic sync with backend API
- ✅ Works offline with cached rules
- ✅ Quick access to dashboard from popup
- ✅ Shows all active blocking rules

## Notes

- Backend must be running on `http://localhost:3000`
- Frontend dashboard on `http://localhost:5173`
- Rules are cached in `chrome.storage.sync` for offline use
- Extension checks time windows when blocking (based on current time)
