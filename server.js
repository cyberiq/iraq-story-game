require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");

const {
  seedData,
  initDatabase,
  getCatalog,
  getGameDetailsById,
  getCompaniesList,
  createCompany,
  updateCompany,
  createGame,
  updateGame,
  deleteCompany,
  deleteGame
  ,getCoupons, createCoupon, deleteCoupon, validateCoupon
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "iraq-story-game-session-secret";
const fallbackDataPath = path.join(__dirname, "data", "fallback-data.json");
const adminSettingsPath = path.join(__dirname, "data", "admin-settings.json");
const couponsPath = path.join(__dirname, "data", "coupons.json");
const todayOffersPath = path.join(__dirname, "data", "today-offers.json");
let databaseReady = false;


function ensureDataFiles() {
  const dataDir = path.dirname(fallbackDataPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(fallbackDataPath)) {
    fs.writeFileSync(fallbackDataPath, JSON.stringify(seedData.map((company, companyIndex) => ({
      id: companyIndex + 1,
      slug: company.slug,
      name_ar: company.name_ar,
      name_en: company.name_en,
      games: company.games.map((game, gameIndex) => ({
        id: (companyIndex + 1) * 100 + gameIndex + 1,
          ...game,
          product_type: game.product_type || 'game',
          currency: game.currency || "IQD"
      }))
    })), null, 2));
  }

  if (!fs.existsSync(adminSettingsPath)) {
    fs.writeFileSync(adminSettingsPath, JSON.stringify({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD
    }, null, 2));
  }
  if (!fs.existsSync(couponsPath)) {
    fs.writeFileSync(couponsPath, JSON.stringify([], null, 2));
  }

  if (!fs.existsSync(todayOffersPath)) {
    fs.writeFileSync(todayOffersPath, JSON.stringify([], null, 2));
  }
}

function readJsonFile(filePath, fallbackValue) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content ? JSON.parse(content) : fallbackValue;
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

let runtimeAdminSettings = readJsonFile(adminSettingsPath, {
  username: ADMIN_USERNAME,
  password: ADMIN_PASSWORD
});

function saveAdminSettings() {
  writeJsonFile(adminSettingsPath, runtimeAdminSettings);
}

let runtimeCoupons = readJsonFile(couponsPath, []);
let runtimeTodayOffers = readJsonFile(todayOffersPath, []);

function saveCouponsFile() {
  writeJsonFile(couponsPath, runtimeCoupons);
}

function saveTodayOffersFile() {
  writeJsonFile(todayOffersPath, runtimeTodayOffers);
}

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeExt = extension || ".jpg";
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  }
});

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: String(process.env.NODE_ENV || '').toLowerCase() === 'production',
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);
// If running behind a proxy/load balancer in production, trust first proxy for secure cookies
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  app.set('trust proxy', 1);
}

// Protect sensitive admin static files: only allow when session is admin
// Serve admin assets through guarded routes to prevent accidental public access or cache bypass
app.get('/admin', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

// new secured path for admin JS assets
app.get('/admin-assets/admin.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

app.get('/change-password.html', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.get('/change-password.js', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.status(401).json({ error: 'Unauthorized' });
  return res.sendFile(path.join(__dirname, 'public', 'change-password.js'));
});
// Friendly admin password URL
app.get('/admin/password', (req, res) => {
  if (!req.session || req.session.isAdmin !== true) return res.redirect('/login');
  return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});
// Serve login page (friendly URL without .html)
app.get('/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
// Serve game page without .html suffix (friendly URL: /game?id=123)
app.get('/game', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

let fallbackCompanyState = [];

function loadFallbackState() {
  ensureDataFiles();
  const saved = readJsonFile(fallbackDataPath, []);
  if (Array.isArray(saved) && saved.length) {
    return JSON.parse(JSON.stringify(saved));
  }

  return JSON.parse(JSON.stringify(seedData.map((company, companyIndex) => ({
    id: companyIndex + 1,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en,
    games: company.games.map((game, gameIndex) => ({
      id: (companyIndex + 1) * 100 + gameIndex + 1,
      ...game,
      currency: game.currency || "IQD"
    }))
  }))));
}

function saveFallbackState() {
  ensureDataFiles();
  writeJsonFile(fallbackDataPath, JSON.parse(JSON.stringify(fallbackCompanyState)));
}

fallbackCompanyState = loadFallbackState();

function nextFallbackCompanyId() {
  return fallbackCompanyState.reduce((maxId, company) => Math.max(maxId, Number(company.id || 0)), 0) + 1;
}

function nextFallbackGameId() {
  return fallbackCompanyState.reduce((maxId, company) => {
    const companyMax = (company.games || []).reduce((innerMax, game) => Math.max(innerMax, Number(game.id || 0)), 0);
    return Math.max(maxId, companyMax);
  }, 0) + 1;
}

function findFallbackCompanyById(id) {
  return fallbackCompanyState.find((company) => Number(company.id) === Number(id));
}

function findFallbackGameById(id) {
  for (const company of fallbackCompanyState) {
    const game = (company.games || []).find((entry) => Number(entry.id) === Number(id));
    if (game) {
      return { company, game };
    }
  }
  return null;
}

function fallbackCompaniesList() {
  return fallbackCompanyState.map((company) => ({
    id: company.id,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en
  }));
}

function fallbackCatalog() {
  return fallbackCompanyState.map((company) => ({
    id: company.id,
    slug: company.slug,
    name_ar: company.name_ar,
    name_en: company.name_en,
    games: (company.games || []).map((game) => ({
      id: game.id,
      product_type: game.product_type || 'game',
      name_ar: game.name_ar,
      name_en: game.name_en,
      genre: game.genre,
      release_year: game.release_year,
      cover_image_url: game.cover_image_url,
      description: game.description,
      price: game.price ?? 0,
      currency: game.currency || "IQD"
    }))
  }));
}

function fallbackGameById(id) {
  const companies = fallbackCatalog();
  for (const company of companies) {
    const game = company.games.find((entry) => Number(entry.id) === Number(id));
    if (game) {
      return {
        id: game.id,
        product_type: game.product_type || 'game',
        name_ar: game.name_ar,
        name_en: game.name_en,
        genre: game.genre,
        release_year: game.release_year,
        cover_image_url: game.cover_image_url,
        description: game.description,
        price: game.price,
        currency: game.currency || "IQD",
        company: {
          id: company.id,
          slug: company.slug,
          name_ar: company.name_ar,
          name_en: company.name_en
        }
      };
    }
  }
  return null;
}

function isValidImageUrlCandidate(u) {
  if (!u || typeof u !== 'string') return false;
  try {
    const parsed = new URL(u);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    // basic extension check
    const extMatch = /\.(jpe?g|png|gif|webp|bmp|svg)(\?.*)?$/i.test(parsed.pathname + (parsed.search || ''));
    if (extMatch) return true;

    // If no extension, attempt a HEAD request to verify Content-Type without downloading body
    // Avoid long waits — use a short timeout
    const http = parsed.protocol === 'https:' ? require('https') : require('http');
    return new Promise((resolve) => {
      let finished = false;
      const req = http.request({
        method: 'HEAD',
        host: parsed.hostname,
        path: parsed.pathname + (parsed.search || ''),
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        timeout: 3000,
        headers: {
          'User-Agent': 'iraq-story-game/1.0 (+https://example)'
        }
      }, (res) => {
        if (finished) return;
        finished = true;
        const ct = String(res.headers['content-type'] || '').toLowerCase();
        resolve(ct.startsWith('image/'));
      });

      req.on('error', () => { if (!finished) { finished = true; resolve(false); } });
      req.on('timeout', () => { req.destroy(); if (!finished) { finished = true; resolve(false); } });
      req.end();
    });
  } catch (e) {
    return false;
  }
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "game-catalog", databaseReady });
});

app.get("/api/auth/status", (req, res) => {
  const authenticated = Boolean(req.session && req.session.isAdmin === true);
  res.json({ authenticated });
});

// Simple IP-based login attempt tracking to mitigate brute-force
const loginAttemptsByIp = {};
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const normalizedUsername = String(username || "").trim();
  const normalizedPassword = String(password || "").trim();

  const ip = (req.ip || req.connection.remoteAddress || 'unknown').toString();
  const now = Date.now();
  const LOCK_DURATION_MS = Number(process.env.LOGIN_LOCK_MS || 10 * 60 * 1000); // default 10 minutes
  const MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS || 5);

  if (!loginAttemptsByIp[ip]) {
    loginAttemptsByIp[ip] = { attempts: 0, lockUntil: 0 };
  }

  const record = loginAttemptsByIp[ip];
  if (record.lockUntil && now < record.lockUntil) {
    const waitSec = Math.ceil((record.lockUntil - now) / 1000);
    return res.status(429).json({ error: `ممنوع مؤقتًا. حاول مرة أخرى بعد ${waitSec} ثانية.` });
  }

  if (normalizedUsername === runtimeAdminSettings.username && normalizedPassword === runtimeAdminSettings.password) {
    req.session.isAdmin = true;
    // reset IP record
    record.attempts = 0;
    record.lockUntil = 0;
    return res.json({ ok: true });
  }

  // failed attempt
  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockUntil = Date.now() + LOCK_DURATION_MS;
    return res.status(429).json({ error: `تجاوزت الحد الأقصى من المحاولات. المحاولة مؤمّنة لمدة ${Math.ceil(LOCK_DURATION_MS/60000)} دقيقة.` });
  }

  return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

app.post("/api/auth/change-password", requireAdmin, (req, res) => {
  const { currentPassword = "", newPassword = "", confirmPassword = "" } = req.body || {};
  const current = String(currentPassword).trim();
  const next = String(newPassword).trim();
  const confirm = String(confirmPassword).trim();

  if (!current || !next || !confirm) {
    return res.status(400).json({ error: "يجب إدخال كلمة المرور الحالية والجديدة وتأكيدها." });
  }

  if (next.length < 4) {
    return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل." });
  }

  if (next !== confirm) {
    return res.status(400).json({ error: "تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة." });
  }

  if (current !== runtimeAdminSettings.password) {
    return res.status(400).json({ error: "كلمة المرور الحالية غير صحيحة." });
  }

  runtimeAdminSettings.password = next;
  saveAdminSettings();
  return res.json({ ok: true, message: "تم تحديث كلمة المرور بنجاح." });
});

app.post("/api/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({ ok: true });
  }

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

// Coupons - admin management
app.get('/api/coupons', requireAdmin, async (req, res) => {
  if (!databaseReady) {
    return res.json({ coupons: runtimeCoupons });
  }

  try {
    const coupons = await getCoupons();
    res.json({ coupons });
  } catch (error) {
    console.error('Failed to fetch coupons', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Companies (admin) - list, create, update, delete
app.get('/api/companies', requireAdmin, async (req, res) => {
  if (!databaseReady) {
    return res.json({ companies: fallbackCompaniesList() });
  }

  try {
    const companies = await getCompaniesList();
    return res.json({ companies });
  } catch (error) {
    console.error('Failed to fetch companies', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/companies', requireAdmin, async (req, res) => {
  const { slug, name_ar, name_en } = req.body || {};
  if (!slug || !name_en) return res.status(400).json({ error: 'Missing required fields' });
  try {
    const created = await createCompany({ slug, name_ar, name_en });
    return res.json({ ok: true, id: created.id });
  } catch (error) {
    console.error('Failed to create company', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/companies/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { slug, name_ar, name_en } = req.body || {};
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const changed = await updateCompany(id, { slug, name_ar, name_en });
    return res.json({ ok: true, changed });
  } catch (error) {
    console.error('Failed to update company', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/companies/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const removed = await deleteCompany(id);
    return res.json({ ok: true, removed });
  } catch (error) {
    console.error('Failed to delete company', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Public catalog endpoint used by storefront and admin UI
app.get('/api/catalog', async (req, res) => {
  const { search = '', sort = '', product_type } = req.query || {};
  if (!databaseReady) {
    let data = fallbackCatalog();
    if (product_type) {
      data = data.map(c => ({ ...c, games: (c.games || []).filter(g => (g.product_type || 'game') === String(product_type) ) })).filter(c => (c.games || []).length);
    }
    return res.json({ companies: data });
  }

  try {
    const catalog = await getCatalog({ search, sort });
    // optional server-side filter by product_type
    let out = catalog;
    if (product_type) {
      out = catalog.map(c => ({ ...c, games: (c.games || []).filter(g => (g.product_type || 'game') === String(product_type) ) })).filter(c => (c.games || []).length);
    }
    return res.json({ companies: out });
  } catch (error) {
    console.error('Failed to fetch catalog', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Game endpoints
app.get('/api/games/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  if (!databaseReady) {
    const g = fallbackGameById(id);
    if (!g) return res.status(404).json({ error: 'Not found' });
    return res.json({ game: g });
  }

  try {
    const game = await getGameDetailsById(id);
    if (!game) return res.status(404).json({ error: 'Not found' });
    return res.json({ game });
  } catch (error) {
    console.error('Failed to fetch game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/games', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : (body.cover_image_url || null);
    const payload = {
      company_id: Number(body.company_id),
      product_type: body.product_type || 'game',
      product_subtype: body.product_subtype || null,
      name_ar: body.name_ar || '',
      name_en: body.name_en || '',
      genre: body.genre || '',
      release_year: Number(body.release_year) || 0,
      price: Number(body.price) || 0,
      currency: (body.currency || 'IQD').toUpperCase(),
      cover_image_url: coverImageUrl,
      description: body.description || ''
    };
    const created = await createGame(payload);
    return res.json({ ok: true, id: created.id });
  } catch (error) {
    console.error('Failed to create game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/games/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const body = req.body || {};
    const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : (body.cover_image_url || body.current_cover_image_url || null);
    const payload = {
      company_id: Number(body.company_id),
      product_type: body.product_type || 'game',
      product_subtype: body.product_subtype || null,
      name_ar: body.name_ar || '',
      name_en: body.name_en || '',
      genre: body.genre || '',
      release_year: Number(body.release_year) || 0,
      price: Number(body.price) || 0,
      currency: (body.currency || 'IQD').toUpperCase(),
      cover_image_url: coverImageUrl,
      description: body.description || ''
    };
    const changed = await updateGame(id, payload);
    return res.json({ ok: true, changed });
  } catch (error) {
    console.error('Failed to update game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/games/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid id' });
  try {
    const removed = await deleteGame(id);
    return res.json({ ok: true, removed });
  } catch (error) {
    console.error('Failed to delete game', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || 'development'})`);
});

// Graceful shutdown handlers
function shutdown(signal) {
  console.log(`Received ${signal}, closing server...`);
  server.close(() => {
    console.log('Server closed, exiting');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

// Expose friendly 403 page
app.get('/403', (req, res) => {
  return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
});

// Catch-all 404 handler (HTML clients get 404 page, others get JSON)
app.use((req, res) => {
  if (req.accepts && req.accepts('html')) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  return res.status(404).json({ error: 'Not found' });
});

// --- Simple cart API using server-side session ---
app.post('/api/cart/add', (req, res) => {
  try {
    const payload = req.body || {};
    if (!req.session) return res.status(500).json({ error: 'Session missing' });
    if (!req.session.cart) req.session.cart = [];
    req.session.cart.push(payload);
    return res.json({ ok: true, cart: req.session.cart });
  } catch (err) {
    console.error('Failed to add to cart', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/cart', (req, res) => {
  return res.json({ cart: (req.session && req.session.cart) || [] });
});

app.post('/api/cart/clear', (req, res) => {
  if (req.session) req.session.cart = [];
  return res.json({ ok: true });
});

app.get('/cart', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'cart.html'));
});
