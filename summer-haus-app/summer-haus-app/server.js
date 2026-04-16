const express  = require('express');
const Database = require('better-sqlite3');
const session  = require('express-session');
const cors     = require('cors');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Credentials (set these as environment variables when deploying) ──
const USERS = {
  [process.env.ADMIN_USER  || 'bren']:  process.env.ADMIN_PASS  || 'haus2026',
  [process.env.STAFF_USER  || 'staff']: process.env.STAFF_PASS  || 'summer26',
};

// ── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hausofathletes-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 12 } // 12 hour session
}));

// ── Auth middleware ─────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
}

// ── Database ────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'camp.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS campers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    ptft          TEXT DEFAULT '',
    paid          TEXT DEFAULT '',
    enrollment    TEXT DEFAULT '',
    parent        TEXT DEFAULT '',
    email         TEXT DEFAULT '',
    phone         TEXT DEFAULT '',
    age           INTEGER DEFAULT 0,
    city          TEXT DEFAULT '',
    sex           TEXT DEFAULT '',
    allergies     TEXT DEFAULT '',
    tshirt        TEXT DEFAULT '',
    notes         TEXT DEFAULT '',
    special_notes TEXT DEFAULT '',
    weeks         TEXT DEFAULT '',
    week1  INTEGER DEFAULT 0, week2 INTEGER DEFAULT 0,
    week3  INTEGER DEFAULT 0, week4 INTEGER DEFAULT 0,
    week5  INTEGER DEFAULT 0, week6 INTEGER DEFAULT 0,
    week7  INTEGER DEFAULT 0, week8 INTEGER DEFAULT 0,
    reg_date   TEXT DEFAULT '',
    status     TEXT DEFAULT 'lead',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS comps (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    paid      TEXT DEFAULT 'C',
    parent    TEXT DEFAULT '',
    email     TEXT DEFAULT '',
    phone     TEXT DEFAULT '',
    age       INTEGER DEFAULT 0,
    city      TEXT DEFAULT '',
    sex       TEXT DEFAULT '',
    allergies TEXT DEFAULT '',
    weeks     TEXT DEFAULT '',
    status    TEXT DEFAULT 'comp'
  );
`);

function rowToCamper(r) {
  return {
    id: r.id, name: r.name, ptft: r.ptft||'', paid: r.paid||'',
    enrollment: r.enrollment||'', parent: r.parent||'', email: r.email||'',
    phone: r.phone||'', age: r.age||0, city: r.city||'', sex: r.sex||'',
    allergies: r.allergies||'', tshirt: r.tshirt||'', notes: r.notes||'',
    special_notes: r.special_notes||'', weeks: r.weeks||'',
    weeks_arr: [r.week1,r.week2,r.week3,r.week4,r.week5,r.week6,r.week7,r.week8],
    reg_date: r.reg_date||'', status: r.status||'lead', updated_at: r.updated_at,
  };
}

// ── Auth routes (public) ────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session.loggedIn) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    req.session.loggedIn = true;
    req.session.username = username;
    req.session.isAdmin  = (username === (process.env.ADMIN_USER || 'bren'));
    return res.redirect('/');
  }
  res.redirect('/login?error=1');
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/me', requireAuth, (req, res) => {
  res.json({ username: req.session.username, isAdmin: req.session.isAdmin });
});

// ── Apply auth to everything below ─────────────────────────────────
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ── Camper API ──────────────────────────────────────────────────────
app.get('/api/campers', (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM campers ORDER BY name COLLATE NOCASE').all().map(rowToCamper));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/campers/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM campers WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(rowToCamper(row));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/campers', (req, res) => {
  try {
    const b=req.body, wa=b.weeks_arr||[0,0,0,0,0,0,0,0];
    const info = db.prepare(`
      INSERT INTO campers (name,ptft,paid,enrollment,parent,email,phone,age,city,sex,
        allergies,tshirt,notes,special_notes,weeks,week1,week2,week3,week4,week5,week6,week7,week8,reg_date,status)
      VALUES (@name,@ptft,@paid,@enrollment,@parent,@email,@phone,@age,@city,@sex,
        @allergies,@tshirt,@notes,@special_notes,@weeks,@week1,@week2,@week3,@week4,@week5,@week6,@week7,@week8,@reg_date,@status)
    `).run({
      name:b.name||'', ptft:b.ptft||'', paid:b.paid||'', enrollment:b.enrollment||'',
      parent:b.parent||'', email:b.email||'', phone:b.phone||'', age:parseInt(b.age)||0,
      city:b.city||'', sex:b.sex||'', allergies:b.allergies||'', tshirt:b.tshirt||'',
      notes:b.notes||'', special_notes:b.special_notes||'', weeks:b.weeks||'',
      week1:wa[0]||0, week2:wa[1]||0, week3:wa[2]||0, week4:wa[3]||0,
      week5:wa[4]||0, week6:wa[5]||0, week7:wa[6]||0, week8:wa[7]||0,
      reg_date:b.reg_date||new Date().toISOString().slice(0,10),
      status:b.ptft?'enrolled':'lead',
    });
    res.status(201).json(rowToCamper(db.prepare('SELECT * FROM campers WHERE id=?').get(info.lastInsertRowid)));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/campers/:id', (req, res) => {
  try {
    const b=req.body, wa=b.weeks_arr||[0,0,0,0,0,0,0,0];
    db.prepare(`
      UPDATE campers SET name=@name,ptft=@ptft,paid=@paid,enrollment=@enrollment,
        parent=@parent,email=@email,phone=@phone,age=@age,city=@city,sex=@sex,
        allergies=@allergies,tshirt=@tshirt,notes=@notes,special_notes=@special_notes,
        weeks=@weeks,week1=@week1,week2=@week2,week3=@week3,week4=@week4,
        week5=@week5,week6=@week6,week7=@week7,week8=@week8,
        reg_date=@reg_date,status=@status,updated_at=datetime('now')
      WHERE id=@id
    `).run({
      id:parseInt(req.params.id), name:b.name||'', ptft:b.ptft||'', paid:b.paid||'',
      enrollment:b.enrollment||'', parent:b.parent||'', email:b.email||'', phone:b.phone||'',
      age:parseInt(b.age)||0, city:b.city||'', sex:b.sex||'', allergies:b.allergies||'',
      tshirt:b.tshirt||'', notes:b.notes||'', special_notes:b.special_notes||'', weeks:b.weeks||'',
      week1:wa[0]||0, week2:wa[1]||0, week3:wa[2]||0, week4:wa[3]||0,
      week5:wa[4]||0, week6:wa[5]||0, week7:wa[6]||0, week8:wa[7]||0,
      reg_date:b.reg_date||'', status:b.ptft?'enrolled':'lead',
    });
    const updated = db.prepare('SELECT * FROM campers WHERE id=?').get(req.params.id);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(rowToCamper(updated));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/campers/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM campers WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/comps', (req, res) => {
  try { res.json(db.prepare('SELECT * FROM comps ORDER BY name').all()); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/stats', (req, res) => {
  try {
    const q = s => db.prepare(s).get().c;
    res.json({
      total:      q('SELECT COUNT(*) as c FROM campers'),
      enrolled:   q("SELECT COUNT(*) as c FROM campers WHERE status='enrolled'"),
      leads:      q("SELECT COUNT(*) as c FROM campers WHERE status='lead'"),
      ft:         q("SELECT COUNT(*) as c FROM campers WHERE ptft='FT'"),
      pt:         q("SELECT COUNT(*) as c FROM campers WHERE ptft='PT'"),
      confirmed:  q("SELECT COUNT(*) as c FROM campers WHERE paid='yes' AND enrollment='yes'"),
      withAllergy:q("SELECT COUNT(*) as c FROM campers WHERE status='enrolled' AND allergies!='' AND allergies IS NOT NULL"),
      weekCounts: Array.from({length:8},(_,i)=>q(`SELECT COUNT(*) as c FROM campers WHERE week${i+1}=1 AND status='enrolled'`)),
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`\n🏋️  Summer Haus 2026 → http://localhost:${PORT}`);
  console.log(`   Logins: bren / haus2026  |  staff / summer26`);
  console.log(`   (Change via ADMIN_USER, ADMIN_PASS, STAFF_USER, STAFF_PASS env vars)\n`);
});
