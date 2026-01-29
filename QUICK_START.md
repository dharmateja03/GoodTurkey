# HotTurkey - Quick Start Guide

## 📦 Project Structure

```
hotturkey/
├── backend/          # Node.js + Express API (running on port 3000)
├── frontend/         # React + Vite web UI (running on port 5173)
└── extension/        # Chrome extension (Manifest V3)
```

## 🚀 Getting Started

### 1. Start the Backend

```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3000`.

**Test the API:**
```bash
# Login (returns JWT token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

The web UI will be available at `http://localhost:5173`.

**Access with demo credentials:**
- Email: `test@example.com`
- Password: `password123`

### 3. Load Chrome Extension

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right corner)
3. Click "Load unpacked"
4. Select the `extension` folder
5. Click the HotTurkey extension icon to open the popup

## 🔄 How It Works

### Web Dashboard (Frontend)

1. Login with your email/password
2. Create categories (Social Media, Entertainment, etc.)
3. Add blocked sites (reddit.com, youtube.com, etc.)
4. Configure time windows:
   - Example: Allow Reddit from 2:00 PM - 2:30 PM every day
   - Example: Allow TikTok on Saturdays from 7:00 PM - 9:00 PM

### Chrome Extension

1. Login with your HotTurkey account in the extension popup
2. Extension automatically syncs rules from your dashboard every 15 minutes
3. When you try to visit a blocked site:
   - If **outside** allowed time window → blocked (redirected to error page)
   - If **inside** allowed time window → access granted

### Backend API

Handles:
- User authentication (login/register)
- Storing blocked sites, categories, and time windows
- Syncing rules to the extension

## 📝 Database Setup

The database is already set up with:

**Test User:**
- Email: `test@example.com`
- Password: `password123`

**Pre-configured Blocking Rules:**
- Reddit (blocked all day, except 2-2:30pm and 6-6:30pm)
- TikTok (blocked all day, except Saturday 7-9pm)
- YouTube (always blocked, no time windows)

## 🔑 Key Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login and get JWT token

### Sites
- `GET /api/sites` - Get all blocked sites (requires JWT)
- `POST /api/sites` - Add new blocked site
- `DELETE /api/sites/:id` - Remove site

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category

### Time Windows
- `POST /api/time-windows` - Add time window for a site
- `DELETE /api/time-windows/:id` - Remove time window

### Extension Sync
- `GET /api/sync` - Get all rules in extension-friendly format (requires JWT)

## 🧪 Testing Blocking Logic

1. **Add a test site** via the dashboard (e.g., `example.com`)
2. **Set a time window** for the current time (e.g., 3:00 PM - 3:30 PM if it's currently 3:15 PM)
3. **Try to visit** that site in Chrome - it should load normally
4. **Wait** until the time window ends or **edit** the time window to be in the past
5. **Try again** - the site should be blocked now

## 🔧 Configuration

### Backend Environment Variables
Edit `backend/.env`:
```
DATABASE_URL=your-neon-db-connection-string
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
PORT=3000
```

### API Base URL
Update `frontend/src/api/client.ts` and `extension/popup/popup.js` if you change the API URL.

## 📊 Database Schema

### Users
- `id`, `email`, `password_hash`, `created_at`

### Categories
- `id`, `user_id`, `name`, `color`, `created_at`

### Blocked Sites
- `id`, `user_id`, `category_id`, `url`, `is_active`, `created_at`

### Time Windows
- `id`, `blocked_site_id`, `day_of_week` (0-6 or null), `start_time`, `end_time`

## 🐛 Troubleshooting

### Extension won't block sites
- Check that backend is running on `http://localhost:3000`
- Login in the extension popup
- Click "Sync Now" to manually trigger sync
- Check extension logs: Open `chrome://extensions/` → HotTurkey → "Errors"

### Frontend can't connect to backend
- Ensure backend is running on port 3000
- Check that CORS is enabled (it is by default)
- Verify API endpoints in browser console

### Time windows not working
- Time windows use your **local timezone**
- Make sure you're using 24-hour format (14:00 = 2:00 PM)
- Check the day of week (0 = Sunday, 6 = Saturday)

## 🎯 Next Steps

1. **Customize**: Add your own blocked sites and time windows
2. **Deploy**: Deploy backend and frontend to production
3. **Publish**: Submit extension to Chrome Web Store
4. **Enhance**: Add features like:
   - Pause/resume blocking
   - Whitelist exceptions
   - Custom blocking pages
   - Statistics and analytics

## 📚 Technology Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js, Express, Drizzle ORM, Neon DB |
| Frontend | React, Vite, TailwindCSS, React Router |
| Extension | Manifest V3, Chrome APIs, Vanilla JS |
| Database | PostgreSQL (Neon) |
