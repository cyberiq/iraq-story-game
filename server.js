require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const multer = require("multer");
const helmet = require("helmet");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const csrf = require("csurf");

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
  deleteGame,
  getCoupons, createCoupon, deleteCoupon, validateCoupon
} = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin";
const SESSION_SECRET = process.env.SESSION_SECRET || "iraq-story-game-session-secret";
const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const allowedOrigins = [
  'https://www.iraqstorycard.tech',
  'https://iraqstorycard.tech',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
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

function normalizeOfferRecord(item) {
  return {
    id: item.id || String(Date.now() + Math.random()),
    title: String(item.title || 'عرض اليوم').trim() || 'عرض اليوم',
    product_type: String(item.product_type || 'game').trim() || 'game',
    percent: Number(item.percent || 0),
    price: Number(item.price || 0),
    active: item.active !== false,
    created_at: item.created_at || new Date().toISOString()
  };
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

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(
  session({
    name: 'igs_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 12
    }
  })
);
// If running behind a proxy/load balancer in production, trust first proxy for secure cookies
if (isProduction) {
  app.set('trust proxy', 1);
}

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز الحد المسموح للطلبات. حاول مرة أخرى بعد دقيقة.' },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تم تجاوز عدد محاولات تسجيل الدخول. حاول لاحقًا.' },
  keyGenerator: (req) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    return ipKeyGenerator(ip);
  }
});

// Use session-based CSRF protection (requires `express-session` middleware)
// Cookie-based mode was causing misconfiguration in production; session mode
// attaches `req.csrfToken()` reliably when session is present.
const csrfProtection = csrf();

// Safe wrapper: only invoke csurf when a session exists. If no session is
// present, log and return a 400 so we don't throw uncaught 'misconfigured csrf'.
function requireCsrf(req, res, next) {
  if (!req.session) {
    console.warn('[requireCsrf] skipping csrf for request without session', { method: req.method, path: req.path, ip: req.ip || req.socket?.remoteAddress });
    return res.status(400).json({ error: 'Session required for CSRF' });
  }

  return csrfProtection(req, res, next);
}

app.use('/api', apiRateLimiter);
app.use('/api/auth/login', authRateLimiter);

// NOTE: we intentionally do NOT apply csrfProtection globally because
// some probes and static requests can arrive without a session and
// csurf will throw 'misconfigured csrf'. Instead we apply `csrfProtection`
// explicitly to specific mutating routes below. This minimizes the attack
// surface while avoiding global errors in logs.

function requireAdminPage(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }

  return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
}

// Protect sensitive admin static files: only allow when session is admin
// Unauthenticated access to admin pages/assets should appear as a 404 instead of exposing the path.
app.get('/admin', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.html', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin.js', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

// new secured path for admin JS assets
app.get('/admin-assets/admin.js', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'server_assets', 'admin.js'));
});

app.get('/change-password.html', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

app.get('/change-password.js', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'change-password.js'));
});
// Friendly admin password URL
app.get('/admin/password', requireAdminPage, (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});
// Serve login page (friendly URL without .html)
app.get('/login', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index.html', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve game page without .html suffix (friendly URL: /game?id=123)
app.get('/game', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'game.html'));
});

// Serve the contact page from the public folder
app.get('/contact', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Serve the cart page from the public folder
app.get('/cart', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'cart.html'));
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

// Return CSRF token for client-side requests.
// If the request has no session, respond with null and log details so
// we can diagnose why clients are not establishing sessions.
app.get('/api/csrf-token', (req, res, next) => {
  if (!req.session) {
    console.warn('[csrf-token] request without session', { ip: req.ip || req.socket?.remoteAddress, path: req.path });
    return res.json({ csrfToken: null, warning: 'no-session' });
  }
  return next();
}, requireCsrf, (req, res) => {
  try {
    return res.json({ csrfToken: req.csrfToken() });
  } catch (err) {
    console.error('[csrf-token] failed to generate token', { error: err && (err.stack || err.message) });
    return res.status(500).json({ error: 'failed to generate csrf token' });
  }
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

app.post("/api/auth/change-password", requireAdmin, requireCsrf, (req, res) => {
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

app.post("/api/auth/logout", requireCsrf, (req, res) => {
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

app.post('/api/coupons', requireAdmin, async (req, res) => {
  const { code, percent } = req.body || {};
  const cleanCode = String(code || '').trim();
  const numericPercent = Number(percent || 0);

  if (!cleanCode) {
    return res.status(400).json({ error: 'رمز الكوبون مطلوب.' });
  }

  if (!Number.isFinite(numericPercent) || numericPercent < 1 || numericPercent > 100) {
    return res.status(400).json({ error: 'نسبة الخصم يجب أن تكون بين 1 و 100.' });
  }

  try {
    if (!databaseReady) {
      const exists = runtimeCoupons.some((item) => String(item.code || '').trim().toLowerCase() === cleanCode.toLowerCase());
      if (exists) {
        return res.status(409).json({ error: 'الكوبون موجود بالفعل.' });
      }

      runtimeCoupons.push({ code: cleanCode, percent: numericPercent, active: 1 });
      saveCouponsFile();
      return res.json({ ok: true, coupon: { code: cleanCode, percent: numericPercent } });
    }

    const created = await createCoupon({ code: cleanCode, percent: numericPercent });
    return res.json({ ok: true, coupon: created });
  } catch (error) {
    console.error('Failed to create coupon', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/coupons/:code', requireAdmin, async (req, res) => {
  const code = decodeURIComponent(req.params.code || '');

  try {
    if (!databaseReady) {
      const before = runtimeCoupons.length;
      runtimeCoupons = runtimeCoupons.filter((item) => String(item.code || '').trim().toLowerCase() !== String(code || '').trim().toLowerCase());
      if (runtimeCoupons.length === before) {
        return res.status(404).json({ error: 'الكوبون غير موجود.' });
      }
      saveCouponsFile();
      return res.json({ ok: true });
    }

    const removed = await deleteCoupon(code);
    if (!removed) {
      return res.status(404).json({ error: 'الكوبون غير موجود.' });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete coupon', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/coupons/validate', requireCsrf, async (req, res) => {
  const code = String(req.body?.code || '').trim();
  if (!code) {
    return res.status(400).json({ error: 'رمز الكوبون مطلوب.' });
  }

  try {
    if (!databaseReady) {
      const item = runtimeCoupons.find((entry) => String(entry.code || '').trim().toLowerCase() === code.toLowerCase() && Number(entry.active || 1) === 1);
      if (!item) {
        return res.status(400).json({ error: 'الكوبون غير صالح أو غير فعال.' });
      }
      return res.json({ ok: true, percent: Number(item.percent || 0), code: item.code });
    }

    const coupon = await validateCoupon(code);
    if (!coupon) {
      return res.status(400).json({ error: 'الكوبون غير صالح أو غير فعال.' });
    }
    return res.json({ ok: true, percent: Number(coupon.percent || 0), code });
  } catch (error) {
    console.error('Failed to validate coupon', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/today-offers', (req, res) => {
  const adminMode = req.session && req.session.isAdmin === true;
  const includeAll = adminMode || req.query.admin === '1';
  const offers = runtimeTodayOffers
    .map(normalizeOfferRecord)
    .filter((offer) => includeAll || offer.active !== false)
    .sort((a, b) => Number(b.created_at && new Date(b.created_at).valueOf()) - Number(a.created_at && new Date(a.created_at).valueOf()));

  return res.json({ offers });
});

app.post('/api/today-offers', requireAdmin, (req, res) => {
  const { id, title, product_type, percent, price, active } = req.body || {};
  const cleanTitle = String(title || '').trim();
  const cleanProductType = String(product_type || 'game').trim() || 'game';
  const percentValue = Number(percent || 0);
  const priceValue = Number(price || 0);

  if (!cleanTitle) {
    return res.status(400).json({ error: 'عنوان العرض مطلوب.' });
  }

  if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 100) {
    return res.status(400).json({ error: 'نسبة الخصم غير صالحة.' });
  }

  const normalized = normalizeOfferRecord({
    id: id || `offer-${Date.now()}`,
    title: cleanTitle,
    product_type: cleanProductType,
    percent: percentValue,
    price: priceValue,
    active: active !== false,
    created_at: new Date().toISOString()
  });

  const existingIndex = runtimeTodayOffers.findIndex((entry) => String(entry.id) === String(normalized.id));
  if (existingIndex >= 0) {
    runtimeTodayOffers[existingIndex] = normalized;
  } else {
    runtimeTodayOffers.push(normalized);
  }

  saveTodayOffersFile();
  return res.json({ ok: true, offer: normalized });
});

app.delete('/api/today-offers/:id', requireAdmin, (req, res) => {
  const id = req.params.id;
  const before = runtimeTodayOffers.length;
  runtimeTodayOffers = runtimeTodayOffers.filter((entry) => String(entry.id) !== String(id));
  if (runtimeTodayOffers.length === before) {
    return res.status(404).json({ error: 'العرض غير موجود.' });
  }
  saveTodayOffersFile();
  return res.json({ ok: true });
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
      company_id: Number(body.company_id) || undefined,
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
      company_id: Number(body.company_id) || undefined,
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

async function startServer() {
  try {
    await initDatabase();
    databaseReady = true;
    console.log('Database initialized');
  } catch (error) {
    console.error('Database initialization failed:', error);
    databaseReady = false;
  }

  return app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || 'development'})`);
  });
}

let server;
startServer().then((instance) => {
  server = instance;
}).catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});

// Graceful shutdown handlers
function shutdown(signal) {
  console.log(`Received ${signal}, closing server...`);
  if (server && typeof server.close === 'function') {
    server.close(() => {
      console.log('Server closed, exiting');
      process.exit(0);
    });
    return;
  }
  process.exit(0);
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
app.post('/api/cart/add', requireCsrf, (req, res) => {
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
