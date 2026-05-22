const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ââ Credentials âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const USERS = {
  [process.env.ADMIN_USER || 'bren']:  process.env.ADMIN_PASS  || 'haus2026',
  [process.env.STAFF_USER || 'staff']: process.env.STAFF_PASS  || 'summer26',
};

// ââ Middleware âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hausofathletes-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 12 }
}));

// ââ PostgreSQL âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// ââ Create tables if they don't exist ââââââââââââââââââââââââââââââââââââââââ
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campers (
      id            SERIAL PRIMARY KEY,
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
      reg_date      TEXT DEFAULT '',
      status        TEXT DEFAULT 'lead',
      created_at    TIMESTAMP DEFAULT NOW(),
      updated_at    TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS comps (
      id        SERIAL PRIMARY KEY,
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
  console.log('Database tables ready.');
}

// ââ Row helper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function rowToCamper(r) {
  return {
    id: r.id, name: r.name, ptft: r.ptft||'', paid: r.paid||'',
    enrollment: r.enrollment||'', parent: r.parent||'', email: r.email||'',
    phone: r.phone||'', age: r.age||0, city: r.city||'', sex: r.sex||'',
    allergies: r.allergies||'', tshirt: r.tshirt||'', notes: r.notes||'',
    special_notes: r.special_notes||'', weeks: r.weeks||'',
    weeks_arr: [r.week1,r.week2,r.week3,r.week4,r.week5,r.week6,r.week7,r.week8],
    reg_date: r.reg_date||'', status: r.status||'lead',
    updated_at: r.updated_at,
  };
}

// ââ Auth âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
}

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

// ââ Protected routes âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ââ GET all campers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get('/api/campers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campers ORDER BY name');
    res.json(rows.map(rowToCamper));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ GET single camper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get('/api/campers/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campers WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rowToCamper(rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ POST new camper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.post('/api/campers', async (req, res) => {
  try {
    const b = req.body;
    const wa = b.weeks_arr || [0,0,0,0,0,0,0,0];
    const { rows } = await pool.query(`
      INSERT INTO campers
        (name,ptft,paid,enrollment,parent,email,phone,age,city,sex,
         allergies,tshirt,notes,special_notes,weeks,
         week1,week2,week3,week4,week5,week6,week7,week8,reg_date,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
              $16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
      RETURNING *`,
      [b.name||'', b.ptft||'', b.paid||'', b.enrollment||'',
       b.parent||'', b.email||'', b.phone||'', parseInt(b.age)||0,
       b.city||'', b.sex||'', b.allergies||'', b.tshirt||'',
       b.notes||'', b.special_notes||'', b.weeks||'',
       wa[0]||0,wa[1]||0,wa[2]||0,wa[3]||0,
       wa[4]||0,wa[5]||0,wa[6]||0,wa[7]||0,
       b.reg_date||new Date().toISOString().slice(0,10),
       b.ptft?'enrolled':'lead']
    );
    res.status(201).json(rowToCamper(rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ PUT update camper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.put('/api/campers/:id', async (req, res) => {
  try {
    const b = req.body;
    const wa = b.weeks_arr || [0,0,0,0,0,0,0,0];
    const { rows } = await pool.query(`
      UPDATE campers SET
        name=$1, ptft=$2, paid=$3, enrollment=$4, parent=$5, email=$6,
        phone=$7, age=$8, city=$9, sex=$10, allergies=$11, tshirt=$12,
        notes=$13, special_notes=$14, weeks=$15,
        week1=$16,week2=$17,week3=$18,week4=$19,
        week5=$20,week6=$21,week7=$22,week8=$23,
        reg_date=$24, status=$25, updated_at=NOW()
      WHERE id=$26 RETURNING *`,
      [b.name||'', b.ptft||'', b.paid||'', b.enrollment||'',
       b.parent||'', b.email||'', b.phone||'', parseInt(b.age)||0,
       b.city||'', b.sex||'', b.allergies||'', b.tshirt||'',
       b.notes||'', b.special_notes||'', b.weeks||'',
       wa[0]||0,wa[1]||0,wa[2]||0,wa[3]||0,
       wa[4]||0,wa[5]||0,wa[6]||0,wa[7]||0,
       b.reg_date||'', b.ptft?'enrolled':'lead',
       parseInt(req.params.id)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rowToCamper(rows[0]));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ DELETE camper âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.delete('/api/campers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM campers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ Comps âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get('/api/comps', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM comps ORDER BY name');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ Export CSV ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// ── Comps CRUD ─────────────────────────────────────────────
app.post('/api/comps', async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(`
      INSERT INTO comps
        (name, paid, parent, email, phone, age, city, sex, allergies, weeks, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      b.name || '', b.paid || '', b.parent || '', b.email || '', b.phone || '',
      b.age || null, b.city || '', b.sex || '', b.allergies || '', b.weeks || '',
      b.status || 'comp'
    ]);
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.put('/api/comps/:id', async (req, res) => {
  try {
    const b = req.body || {};
    const { rows } = await pool.query(`
      UPDATE comps SET
        name=$1, paid=$2, parent=$3, email=$4, phone=$5,
        age=$6, city=$7, sex=$8, allergies=$9, weeks=$10, status=$11
      WHERE id=$12
      RETURNING *
    `, [
      b.name || '', b.paid || '', b.parent || '', b.email || '', b.phone || '',
      b.age || null, b.city || '', b.sex || '', b.allergies || '', b.weeks || '',
      b.status || 'comp', req.params.id
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Comp not found' });
    res.json(rows[0]);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.delete('/api/comps/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM comps WHERE id=$1', [req.params.id]);
    res.json({ success: true, deleted: result.rowCount });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.get('/api/export/csv', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM campers ORDER BY name');
    const headers = [
      'Name','Status','FT/PT','Paid','Enrolled','Age','City','Sex',
      'Parent','Email','Phone','T-Shirt','Allergies','Medical Notes',
      'Special Notes','Weeks','Wk1','Wk2','Wk3','Wk4','Wk5','Wk6','Wk7','Wk8','Reg Date'
    ];
    const escape = v => {
      const s = String(v||'');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const csvRows = rows.map(r => [
      r.name, r.status, r.ptft, r.paid, r.enrollment, r.age, r.city, r.sex,
      r.parent, r.email, r.phone, r.tshirt, r.allergies, r.notes,
      r.special_notes, r.weeks,
      r.week1,r.week2,r.week3,r.week4,r.week5,r.week6,r.week7,r.week8,
      r.reg_date
    ].map(escape).join(','));
    const csv = [headers.join(','), ...csvRows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="SummerHaus2026_${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(csv);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ Stats âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get('/api/stats', async (req, res) => {
  try {
    const q = async (sql) => (await pool.query(sql)).rows[0].c;
    const weekCounts = await Promise.all(
      Array.from({length:8}, (_,i) =>
        pool.query(`SELECT COUNT(*) as c FROM campers WHERE week${i+1}=1 AND status='enrolled'`)
          .then(r => parseInt(r.rows[0].c))
      )
    );
    res.json({
      total:       parseInt(await q("SELECT COUNT(*) as c FROM campers")),
      enrolled:    parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE status='enrolled'")),
      leads:       parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE status='lead'")),
      ft:          parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE ptft='FT'")),
      pt:          parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE ptft='PT'")),
      confirmed:   parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE paid='yes' AND enrollment='yes'")),
      withAllergy: parseInt(await q("SELECT COUNT(*) as c FROM campers WHERE status='enrolled' AND allergies!='' AND allergies IS NOT NULL")),
      weekCounts,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ââ Catch-all âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ââ Start âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\nðï¸  Summer Haus 2026 v2 â http://localhost:${PORT}`);
    console.log(`   Logins: bren / haus2026  |  staff / summer26`);
    console.log(`   Change via env vars: ADMIN_USER, ADMIN_PASS, STAFF_USER, STAFF_PASS\n`);
  });
}).catch(err => {
  console.error('Database connection failed:', err.message);
  console.error('Make sure DATABASE_URL is set.');
  process.exit(1);
});
