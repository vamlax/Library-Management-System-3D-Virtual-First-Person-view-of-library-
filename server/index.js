const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const initSqlJs = require('sql.js');
const seed = require('./seed');
const { SECTION_FILES, PER_SECTION } = require('./catalog');

// ---- Library rules (change here) -------------------------------------------
const LOAN_DAYS = 14;
const FINE_PER_DAY = 2; // rupees
const MAX_LOANS = 3;
const PORT = process.env.PORT || 3000;
// -----------------------------------------------------------------------------

const DAY = 86400000;
const DB_FILE = path.join(__dirname, 'library.db');
const SECRET_FILE = path.join(__dirname, '.secret');
let db;

// ---- tiny SQLite helpers (sql.js = SQLite compiled to WebAssembly, no native build) ----
function save() { fs.writeFileSync(DB_FILE, Buffer.from(db.export())); }
function all(sql, p = []) {
  const st = db.prepare(sql);
  st.bind(p);
  const rows = [];
  while (st.step()) rows.push(st.getAsObject());
  st.free();
  return rows;
}
const one = (sql, p) => all(sql, p)[0];
function run(sql, p = []) {
  db.run(sql, p);
  const id = one('SELECT last_insert_rowid() AS id').id;
  save();
  return id;
}

// ---- auth: password hashing + stateless signed token ----
const SECRET = fs.existsSync(SECRET_FILE) ? fs.readFileSync(SECRET_FILE, 'utf8') : (() => {
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, s);
  return s;
})();
function hash(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
}
function checkPw(pw, stored) {
  const [salt, h] = stored.split(':');
  const a = Buffer.from(crypto.scryptSync(pw, salt, 32).toString('hex'));
  const b = Buffer.from(h);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const mac = (id) => crypto.createHmac('sha256', SECRET).update(String(id)).digest('hex').slice(0, 32);
const makeToken = (id) => id + '.' + mac(id);
function userFromToken(tok) {
  if (!tok) return null;
  const [id, m] = tok.split('.');
  if (!id || !m || mac(id) !== m) return null;
  return one('SELECT userId,name,email,role FROM users WHERE userId=?', [Number(id)]) || null;
}

// ---- domain helpers ----
const overdueDays = (due) => Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / DAY));
const activeCount = (bookId) => one('SELECT COUNT(*) AS n FROM loans WHERE bookId=? AND returnDate IS NULL', [bookId]).n;
function enrich(l) {
  if (!l.returnDate) {
    l.overdueDays = overdueDays(l.dueDate);
    l.fineNow = l.overdueDays * FINE_PER_DAY;
  }
  return l;
}
const LOAN_COLS = `l.loanId,l.bookId,l.userId,l.issueDate,l.dueDate,l.returnDate,l.fineAmount,b.title,b.author,b.section`;

// ---- app ----
const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  const h = req.headers.authorization || '';
  req.user = h.startsWith('Bearer ') ? userFromToken(h.slice(7)) : null;
  next();
});
const needUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please sign in first.' }));
const needLibrarian = (req, res, next) => (req.user?.role === 'librarian' ? next() : res.status(403).json({ error: 'Librarian access only.' }));

app.get('/api/config', (_req, res) => res.json({ LOAN_DAYS, FINE_PER_DAY, MAX_LOANS }));

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 4) return res.status(400).json({ error: 'Name, email and a password (4+ characters) are required.' });
  if (one('SELECT 1 FROM users WHERE email=?', [email.toLowerCase()])) return res.status(409).json({ error: 'That email is already registered.' });
  const id = run('INSERT INTO users(name,email,passwordHash,role) VALUES (?,?,?,?)', [name.trim(), email.toLowerCase(), hash(password), 'student']);
  res.json({ token: makeToken(id), user: { userId: id, name: name.trim(), email: email.toLowerCase(), role: 'student' } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = email && one('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
  if (!u || !checkPw(password || '', u.passwordHash)) return res.status(401).json({ error: 'Wrong email or password.' });
  res.json({ token: makeToken(u.userId), user: { userId: u.userId, name: u.name, email: u.email, role: u.role } });
});

// All books, with live availability (derived from active loans) + per-user flags
app.get('/api/books', (req, res) => {
  const books = all(`SELECT b.*, b.totalCopies - (SELECT COUNT(*) FROM loans l WHERE l.bookId=b.bookId AND l.returnDate IS NULL) AS available
                     FROM books b ORDER BY b.section, b.shelf, b.slot`);
  if (req.user) {
    const loans = all('SELECT loanId,bookId FROM loans WHERE userId=? AND returnDate IS NULL', [req.user.userId]);
    const resv = all("SELECT resId,bookId FROM reservations WHERE userId=? AND status IN ('waiting','ready')", [req.user.userId]);
    for (const b of books) {
      b.myLoanId = loans.find((l) => l.bookId === b.bookId)?.loanId ?? null;
      b.myReservationId = resv.find((r) => r.bookId === b.bookId)?.resId ?? null;
    }
  }
  res.json(books);
});

// Borrow
app.post('/api/loans', needUser, (req, res) => {
  const bookId = Number(req.body?.bookId);
  const b = one('SELECT * FROM books WHERE bookId=?', [bookId]);
  if (!b) return res.status(404).json({ error: 'Book not found.' });
  const uid = req.user.userId;
  if (one('SELECT 1 FROM loans WHERE bookId=? AND userId=? AND returnDate IS NULL', [bookId, uid])) return res.status(400).json({ error: 'You already have this book.' });
  const mine = all('SELECT dueDate FROM loans WHERE userId=? AND returnDate IS NULL', [uid]);
  if (mine.some((l) => overdueDays(l.dueDate) > 0)) return res.status(400).json({ error: 'You have an overdue book. Return it before borrowing more.' });
  if (mine.length >= MAX_LOANS) return res.status(400).json({ error: `Limit reached: you can borrow ${MAX_LOANS} books at a time.` });
  if (b.totalCopies - activeCount(bookId) <= 0) return res.status(409).json({ error: 'No copies available. You can reserve it.' });
  const due = new Date(Date.now() + LOAN_DAYS * DAY).toISOString();
  const loanId = run('INSERT INTO loans(bookId,userId,issueDate,dueDate,fineAmount) VALUES (?,?,?,?,0)', [bookId, uid, new Date().toISOString(), due]);
  run("UPDATE reservations SET status='fulfilled' WHERE bookId=? AND userId=? AND status IN ('waiting','ready')", [bookId, uid]);
  res.json({ loanId, dueDate: due });
});

// Return (fine is calculated here)
app.post('/api/loans/:id/return', needUser, (req, res) => {
  const l = one('SELECT * FROM loans WHERE loanId=?', [Number(req.params.id)]);
  if (!l || l.returnDate) return res.status(404).json({ error: 'Active loan not found.' });
  if (l.userId !== req.user.userId && req.user.role !== 'librarian') return res.status(403).json({ error: 'Not your loan.' });
  const od = overdueDays(l.dueDate);
  const fine = od * FINE_PER_DAY;
  run('UPDATE loans SET returnDate=?, fineAmount=? WHERE loanId=?', [new Date().toISOString(), fine, l.loanId]);
  const next = one("SELECT resId FROM reservations WHERE bookId=? AND status='waiting' ORDER BY createdAt LIMIT 1", [l.bookId]);
  if (next) run("UPDATE reservations SET status='ready' WHERE resId=?", [next.resId]);
  res.json({ fine, overdueDays: od });
});

// Reservations
app.post('/api/reservations', needUser, (req, res) => {
  const bookId = Number(req.body?.bookId);
  const uid = req.user.userId;
  if (!one('SELECT 1 FROM books WHERE bookId=?', [bookId])) return res.status(404).json({ error: 'Book not found.' });
  if (one("SELECT 1 FROM reservations WHERE bookId=? AND userId=? AND status IN ('waiting','ready')", [bookId, uid])) return res.status(400).json({ error: 'Already reserved.' });
  if (one('SELECT 1 FROM loans WHERE bookId=? AND userId=? AND returnDate IS NULL', [bookId, uid])) return res.status(400).json({ error: 'You already have this book.' });
  const resId = run('INSERT INTO reservations(bookId,userId,createdAt,status) VALUES (?,?,?,?)', [bookId, uid, new Date().toISOString(), 'waiting']);
  res.json({ resId });
});
app.delete('/api/reservations/:id', needUser, (req, res) => {
  run("UPDATE reservations SET status='cancelled' WHERE resId=? AND userId=?", [Number(req.params.id), req.user.userId]);
  res.json({ ok: true });
});

// Profile
app.get('/api/me', needUser, (req, res) => {
  const uid = req.user.userId;
  const loans = all(`SELECT ${LOAN_COLS} FROM loans l JOIN books b ON b.bookId=l.bookId WHERE l.userId=? AND l.returnDate IS NULL ORDER BY l.dueDate`, [uid]).map(enrich);
  const history = all(`SELECT ${LOAN_COLS} FROM loans l JOIN books b ON b.bookId=l.bookId WHERE l.userId=? AND l.returnDate IS NOT NULL ORDER BY l.returnDate DESC LIMIT 15`, [uid]);
  const reservations = all(`SELECT r.resId,r.bookId,r.status,r.createdAt,b.title,b.author FROM reservations r JOIN books b ON b.bookId=r.bookId WHERE r.userId=? AND r.status IN ('waiting','ready') ORDER BY r.createdAt`, [uid]);
  const fineDue = loans.reduce((s, l) => s + (l.fineNow || 0), 0);
  res.json({ user: req.user, loans, history, reservations, fineDue, rules: { LOAN_DAYS, FINE_PER_DAY, MAX_LOANS } });
});

// Librarian
app.get('/api/admin/overdue', needUser, needLibrarian, (_req, res) => {
  const rows = all(`SELECT ${LOAN_COLS}, u.name AS userName, u.email FROM loans l JOIN books b ON b.bookId=l.bookId JOIN users u ON u.userId=l.userId WHERE l.returnDate IS NULL AND l.dueDate < ? ORDER BY l.dueDate`, [new Date().toISOString()]).map(enrich);
  res.json(rows.filter((r) => r.overdueDays > 0));
});
app.post('/api/admin/books/:id/copies', needUser, needLibrarian, (req, res) => {
  const id = Number(req.params.id);
  const b = one('SELECT * FROM books WHERE bookId=?', [id]);
  if (!b) return res.status(404).json({ error: 'Book not found.' });
  const next = Math.max(activeCount(id), b.totalCopies + (Number(req.body?.delta) || 0));
  run('UPDATE books SET totalCopies=? WHERE bookId=?', [next, id]);
  res.json({ totalCopies: next });
});

// Serve the built 3D client
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
} else {
  app.get('/', (_req, res) => res.send('API is running, but client/dist is missing. Run: npm run build'));
}

(async () => {
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(`
    CREATE TABLE IF NOT EXISTS users(userId INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, passwordHash TEXT, role TEXT DEFAULT 'student');
    CREATE TABLE IF NOT EXISTS books(bookId INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, author TEXT, category TEXT, section TEXT, shelf INTEGER, slot INTEGER,
      description TEXT, isbn TEXT, publishedYear INTEGER, coverImage TEXT, totalCopies INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS loans(loanId INTEGER PRIMARY KEY AUTOINCREMENT, bookId INTEGER, userId INTEGER, issueDate TEXT, dueDate TEXT, returnDate TEXT, fineAmount REAL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS reservations(resId INTEGER PRIMARY KEY AUTOINCREMENT, bookId INTEGER, userId INTEGER, createdAt TEXT, status TEXT DEFAULT 'waiting');
  `);
  const bookCount = one('SELECT COUNT(*) AS n FROM books').n;
  const catalogSize = Object.keys(SECTION_FILES).length * PER_SECTION;
  if (bookCount === 0) {
    seed({ run, one, hash });
    console.log(`Database created with ${catalogSize} catalog books and sample users.`);
  } else if (bookCount < catalogSize) {
    console.log(`\n  Note: this library.db has ${bookCount} books but the catalog now defines ${catalogSize}.\n  Run "npm run reset-db" and restart to rebuild it (this deletes existing loans/users).\n`);
  }
  app.listen(PORT, () => console.log(`\n  Library running at http://localhost:${PORT}\n`));
})();
