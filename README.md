# GoodTurkey

A distraction-blocking app that helps you stay focused by blocking websites with time-based access windows and a 6-hour unlock delay to prevent impulsive unblocking.

## Why GoodTurkey?

Going "cold turkey" on distracting websites is hard. GoodTurkey makes it easier by:

1. **Blocking sites you choose** - Reddit, Twitter, YouTube, etc.
2. **Allowing scheduled access** - Set time windows when you CAN access blocked sites
3. **Preventing impulse unblocking** - Want to delete a block? Wait 6 hours first
4. **Motivating you** - Shows quotes from David Goggins, Dan Koe, Elon Musk when you try to access blocked sites

## Features

### Website Blocking
- Add any website URL to your block list
- Organize sites into color-coded categories
- Toggle sites active/inactive (with 6-hour delay for deactivating)

### Time Windows
- Allow access during specific hours (e.g., 6-7 PM only)
- Set different windows for different days
- Quick presets: Work hours, Morning, Afternoon, Evening

### 6-Hour Unlock Delay
The core feature that makes GoodTurkey effective:
- Can't instantly delete or deactivate a blocked site
- Must click the lock icon to request unlock
- Wait 6 hours before you can actually remove it
- Can cancel the unlock request anytime (resets the timer)

This prevents those "I'll just check it for a second" moments.

### Motivational Quotes
- 30 pre-loaded system quotes from David Goggins, Dan Koe, Elon Musk
- Add your own custom quotes
- Displayed when you try to access a blocked site

### Browser Extension
- Chrome extension that enforces blocks
- Syncs with your account
- Shows motivational quotes on blocked pages

## Screenshots

```
┌─────────────────────────────────────────────────────────────┐
│  GoodTurkey                                       [Logout]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────┐ ┌─────┐ ┌─────┐                                   │
│  │  5  │ │  4  │ │  2  │   Stats                           │
│  │Sites│ │Activ│ │Wind.│                                   │
│  └─────┘ └─────┘ └─────┘                                   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │ ADD BLOCKED SITE│  │ BLOCKED SITES                   │  │
│  │                 │  │                                 │  │
│  │ [reddit.com   ] │  │ ● reddit.com          [ACTIVE]  │  │
│  │ [Category  v  ] │  │   Daily | 18:00-18:30    ⏱ 5h   │  │
│  │ [+ Add Site   ] │  │                                 │  │
│  │                 │  │ ● twitter.com         [ACTIVE]  │  │
│  │ CATEGORIES      │  │   Blocked 24/7           🔒     │  │
│  │ ● Social Media  │  │                                 │  │
│  │ ● Entertainment │  │ ○ youtube.com            [OFF]  │  │
│  │                 │  │   Sat | 19:00-21:00      🔒     │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Neon serverless) |
| ORM | Drizzle |
| Auth | JWT + bcrypt |
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Extension | Chrome Manifest V3 |

## Project Structure

```
goodturkey/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts      # Database schema
│   │   │   ├── index.ts       # DB connection
│   │   │   ├── migrate.ts     # Migration runner
│   │   │   ├── seed.ts        # Test data seeder
│   │   │   └── seedQuotes.ts  # System quotes seeder
│   │   ├── routes/
│   │   │   ├── auth.ts        # Login/register
│   │   │   ├── sites.ts       # Blocked sites CRUD
│   │   │   ├── categories.ts  # Categories CRUD
│   │   │   ├── timeWindows.ts # Time windows CRUD
│   │   │   ├── quotes.ts      # Quotes CRUD
│   │   │   └── sync.ts        # Extension sync
│   │   ├── middleware/
│   │   │   └── auth.ts        # JWT middleware
│   │   └── index.ts           # Express app
│   ├── drizzle/               # SQL migrations
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── SiteList.tsx
│   │   │   ├── CategoryManager.tsx
│   │   │   ├── TimeWindowForm.tsx
│   │   │   └── QuotesManager.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── api/
│   │   │   └── client.ts      # API functions
│   │   └── index.css          # Styles
│   └── package.json
│
├── extension/                  # Chrome extension
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   └── blocked.html
│
└── README.md
```

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database (or free Neon account)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/goodturkey.git
cd goodturkey

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
JWT_SECRET=your-secret-key-min-32-chars
```

### 3. Setup Database

```bash
cd backend

# Run migrations
npm run migrate

# Seed motivational quotes
npm run seed:quotes

# (Optional) Seed test data
npm run seed
```

### 4. Run

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Runs on http://localhost:3000

# Terminal 2 - Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 5. Test Account

If you ran `npm run seed`:
- Email: `test@example.com`
- Password: `password123`

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |

### Blocked Sites

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List all blocked sites |
| POST | `/api/sites` | Add new blocked site |
| PUT | `/api/sites/:id` | Update site |
| DELETE | `/api/sites/:id` | Delete (requires unlock) |
| POST | `/api/sites/:id/request-unlock` | Start 6h countdown |
| POST | `/api/sites/:id/cancel-unlock` | Cancel unlock |

### Time Windows

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/time-windows` | Add time window |
| DELETE | `/api/time-windows/:id` | Remove time window |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category |
| DELETE | `/api/categories/:id` | Delete category |

### Quotes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/quotes` | List all quotes |
| GET | `/api/quotes/random` | Random active quote |
| POST | `/api/quotes` | Add custom quote |
| DELETE | `/api/quotes/:id` | Delete (user quotes only) |

## Database Schema

```sql
users
  id            UUID PRIMARY KEY
  email         VARCHAR(255) UNIQUE
  password_hash VARCHAR(255)
  created_at    TIMESTAMP

categories
  id            UUID PRIMARY KEY
  user_id       UUID → users.id (CASCADE)
  name          VARCHAR(100)
  color         VARCHAR(7)
  created_at    TIMESTAMP

blocked_sites
  id                  UUID PRIMARY KEY
  user_id             UUID → users.id (CASCADE)
  category_id         UUID → categories.id (SET NULL)
  url                 VARCHAR(500)
  is_active           BOOLEAN DEFAULT true
  unlock_requested_at TIMESTAMP
  created_at          TIMESTAMP

time_windows
  id              UUID PRIMARY KEY
  blocked_site_id UUID → blocked_sites.id (CASCADE)
  day_of_week     INTEGER (0-6, NULL = daily)
  start_time      TIME
  end_time        TIME
  created_at      TIMESTAMP

quotes
  id         UUID PRIMARY KEY
  user_id    UUID → users.id (CASCADE, nullable)
  text       VARCHAR(1000)
  author     VARCHAR(100)
  is_active  BOOLEAN DEFAULT true
  is_system  BOOLEAN DEFAULT false
  created_at TIMESTAMP
```

## Contributing

1. Fork the repo
2. Create feature branch (`git checkout -b feature/thing`)
3. Commit changes (`git commit -m 'Add thing'`)
4. Push (`git push origin feature/thing`)
5. Open PR

## License

MIT
