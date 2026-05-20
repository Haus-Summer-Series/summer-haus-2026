# Summer Haus 2026 — v2 (PostgreSQL)

Built for Haus of Athletes. Full-stack web app with **PostgreSQL** — data survives restarts, plan changes, everything.

---

## What changed from v1

- **PostgreSQL instead of SQLite** — Database lives separately from the app. Cannot be wiped by a restart.
- **Export to CSV** — Green button in the header. One click downloads your full roster as a spreadsheet.
- **171 campers seeded** — All original + new additions from the 2026 Weekly Sign-In sheet.
- **Mobile-first** — Bottom nav, card views, tap-to-edit on any device.

---

## Deploy to Railway (Step by Step)

### Step 1 — Push to GitHub
If you already have a GitHub repo from v1, you can reuse it. Just replace all the files with these new ones and push.

If starting fresh:
```bash
cd summer-haus-v2
git init
git add .
git commit -m "v2 with postgres"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/summer-haus-2026.git
git push -u origin main
```

### Step 2 — Add PostgreSQL on Railway

1. Go to your project on Railway
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway creates a Postgres database and automatically adds `DATABASE_URL` to your environment
4. That's it — no configuration needed

### Step 3 — Connect your app

If deploying fresh:
1. Click **+ New** → **GitHub Repo** → select `summer-haus-2026`
2. Railway detects Node.js and deploys automatically

If updating existing service:
1. Click your existing service → **Settings** → **Source**
2. It will redeploy from your updated GitHub repo

### Step 4 — Seed the database

Once deployed, open the Railway shell:
1. Click your app service → **Settings** → find **Railway Shell** or use the CLI
2. Run: `node seed.js`
3. You'll see: `Done! Seeded 171 campers + 10 comps.`

Only run this ONCE. If you run it again it will skip (already seeded check is built in).

### Step 5 — Set your passwords

In Railway → your app service → **Variables**, add:

| Variable | Value |
|----------|-------|
| `ADMIN_USER` | `bren` |
| `ADMIN_PASS` | your strong password |
| `STAFF_USER` | `staff` |
| `STAFF_PASS` | password for staff |
| `SESSION_SECRET` | any random string (e.g. `haus2026xR9qT4mZ`) |

Railway restarts automatically with the new values.

---

## Default Logins (change before going live)

| Role | Username | Password |
|------|----------|----------|
| Admin | `bren` | `haus2026` |
| Staff | `staff` | `summer26` |

---

## Export Your Data

Click the green **↓ Export CSV** button in the top right of the app.  
Downloads a spreadsheet with every camper's info.  

**Do this regularly** — keep a copy on your computer. Your data lives in Railway's Postgres now, which is safe, but a local backup never hurts.

---

## File Structure

```
summer-haus-v2/
├── server.js          ← Express API + auth + static serving
├── seed.js            ← One-time database seed (171 campers)
├── package.json
├── README.md
└── public/
    ├── index.html     ← Full frontend dashboard
    └── login.html     ← Login page
```

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
| GET | `/api/export/csv` | Download full roster as CSV |
| GET | `/api/stats` | Summary stats |
