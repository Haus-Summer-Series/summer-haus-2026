# Summer Haus 2026 — Camp Management App

Built for Haus of Athletes. Full-stack web app — Node.js backend, SQLite database, lives on any server.

---

## Quick Start (Local)

```bash
# 1. Install dependencies
npm install

# 2. Seed the database with all 157 campers
node seed.js

# 3. Run the app
npm start
```

Open **http://localhost:3000** in your browser.

---

## What It Does

- **Dashboard** — Live stats, week capacity, 6 charts (ages, towns, FT/PT, shirts, payment, leads)
- **Full Roster** — All 157 names, searchable and filterable. Click any row to view or edit.
- **Edit / Delete** — Click a camper → Edit button → change anything → Save. Saved to database instantly.
- **Action Items** — Auto-flagged: failed payments, unpaid, missing info
- **Week View** — Select any week, see exactly who's there with allergy flags
- **Allergies & Medical** — Every medical flag with parent contact
- **Leads Pipeline** — 47 names not yet officially enrolled
- **Comps** — 8 approved comps + 3 Alicandros
- **Add Camper** — Saved directly to database

---

## Deploy to Railway (Free — Recommended)

Railway is the easiest way to get this live so your staff can access it from any device.

1. Create a free account at **railway.app**
2. Install the Railway CLI: `npm install -g @railway/cli`
3. In the app folder, run:
   ```bash
   railway login
   railway init
   railway up
   ```
4. Railway will give you a URL like `https://summer-haus-2026.up.railway.app`
5. Run the seed once after deploy:
   ```bash
   railway run node seed.js
   ```

That's it. Share the URL with your staff.

---

## Deploy to Render (Also Free)

1. Push this folder to a GitHub repo
2. Go to **render.com** → New Web Service → connect your repo
3. Build command: `npm install`
4. Start command: `node server.js`
5. After deploy, open the Shell tab and run: `node seed.js`

---

## Deploy to a VPS / Your Own Server

```bash
# On your server
git clone <your-repo>
cd summer-haus-app
npm install
node seed.js

# Run with PM2 so it stays up
npm install -g pm2
pm2 start server.js --name "summer-haus"
pm2 save
pm2 startup
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server runs on |
| `DB_PATH` | `./camp.db` | Path to SQLite database file |

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/campers` | All campers |
| GET | `/api/campers/:id` | Single camper |
| POST | `/api/campers` | Add camper |
| PUT | `/api/campers/:id` | Update camper |
| DELETE | `/api/campers/:id` | Delete camper |
| GET | `/api/comps` | All comps |
| GET | `/api/stats` | Summary stats |

---

## File Structure

```
summer-haus-app/
├── server.js          ← Express API + static file serving
├── seed.js            ← One-time database seed (157 campers)
├── package.json
├── camp.db            ← SQLite database (auto-created on first run)
├── README.md
└── public/
    └── index.html     ← Full frontend dashboard
```

---

## Backup Your Data

The entire database is a single file: `camp.db`

Copy it anywhere to back it up. That's it.

```bash
cp camp.db camp-backup-$(date +%Y%m%d).db
```

---

## Default Logins

| Role | Username | Password |
|------|----------|----------|
| Admin (you) | `bren` | `haus2026` |
| Staff | `staff` | `summer26` |

**Change these before going live** — set environment variables:
```
ADMIN_USER=bren
ADMIN_PASS=your-strong-password
STAFF_USER=staff
STAFF_PASS=your-staff-password
SESSION_SECRET=some-random-string-here
```

On Railway: Settings → Variables → add each one above.

Sessions last 12 hours — staff stays logged in all day without re-entering credentials.
