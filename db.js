const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

const DB_PATH = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'database.sqlite');

const seedData = [
  {
    slug: 'activision',
    name_ar: 'اكتفجن',
    name_en: 'Activision',
    games: [
      {
        name_ar: 'كول اوف ديوتي: مودرن وورفير 3',
        name_en: 'Call of Duty: Modern Warfare III',
        genre: 'Shooter',
        release_year: 2023,
        price: 179,
        currency: 'IQD',
        cover_image_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/2519060/header.jpg',
        description: 'جزء جديد من سلسلة Call of Duty مع طور قصة وطور جماعي سريع.'
      },
      {
        name_ar: 'كراش بانديكوت 4',
        name_en: 'Crash Bandicoot 4',
        genre: 'Platform',
        release_year: 2020,
        price: 89,
        currency: 'IQD',
        cover_image_url: 'https://cdn.cloudflare.steamstatic.com/steam/apps/1378990/header.jpg',
        description: 'لعبة منصات كلاسيكية سريعة بإيقاع ممتع وتحديات متتالية.'
      }
    ]
  },
  {
    slug: 'yalla-tech',
    name_ar: 'يلا تكنولوجي',
    name_en: 'Yalla Technology',
    games: [
      {
        name_ar: 'يلا لودو',
        name_en: 'Yalla Ludo',
        genre: 'Board',
        release_year: 2018,
        price: 33,
        currency: 'IQD',
        cover_image_url: 'https://images.unsplash.com/photo-1606502713237-65a5a5ed2f4e?auto=format&fit=crop&w=800&q=80',
        description: 'لعبة اجتماعية أونلاين تعتمد على لودو والدردشة الصوتية.'
      }
    ]
  }
];

function ensureDataDir() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let SQL = null;
let db = null;
let usePg = Boolean(process.env.DATABASE_URL);
let pgPool = null;

async function initPg() {
  if (!process.env.DATABASE_URL) return;
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  // create tables if not exists
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS games (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      product_type TEXT NOT NULL DEFAULT 'game',
      product_subtype TEXT,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      genre TEXT NOT NULL,
      release_year INTEGER NOT NULL,
      price NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'IQD',
      cover_image_url TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS coupons (
      code TEXT PRIMARY KEY,
      percent INTEGER NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  // Ensure compatible columns exist for older DBs that may lack newer fields
  try {
    await pgPool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS product_subtype TEXT`);
    await pgPool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS product_type TEXT`);
    await pgPool.query(`ALTER TABLE games ADD COLUMN IF NOT EXISTS currency TEXT`);
  } catch (e) {
    // Non-fatal: log but continue — queries above should be idempotent
    console.warn('Error ensuring optional columns exist:', e && e.message);
  }
}

function rowsFromResult(res) {
  if (!res || !res.length) return [];
  const { columns, values } = res[0];
  return values.map((r) => {
    const obj = {};
    columns.forEach((c, i) => (obj[c] = r[i]));
    return obj;
  });
}

async function saveDatabaseFile() {
  ensureDataDir();
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDatabase() {
  SQL = await initSqlJs({ locateFile: (file) => path.join(__dirname, 'node_modules', 'sql.js', 'dist', file) });
  ensureDataDir();
  if (usePg) {
    await initPg();
    // no local sqlite DB needed when using Postgres
    db = null;
    return;
  }

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(new Uint8Array(buf));
  } else {
    db = new SQL.Database();
    db.run(`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER NOT NULL,
        product_type TEXT NOT NULL DEFAULT 'game',
        product_subtype TEXT,
        name_ar TEXT NOT NULL,
        name_en TEXT NOT NULL,
        genre TEXT NOT NULL,
        release_year INTEGER NOT NULL,
        price REAL NOT NULL DEFAULT 0,
        currency TEXT NOT NULL DEFAULT 'IQD',
        cover_image_url TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS coupons (
        code TEXT PRIMARY KEY,
        percent INTEGER NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // seed
    const insertCompany = db.prepare('INSERT INTO companies (slug, name_ar, name_en) VALUES (?, ?, ?)');
    const insertGame = db.prepare('INSERT INTO games (company_id, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');

    for (const company of seedData) {
      insertCompany.run([company.slug, company.name_ar, company.name_en]);
      const idRes = db.exec('SELECT last_insert_rowid() as id');
      const companyId = rowsFromResult(idRes)[0].id;
      for (const game of company.games || []) {
        insertGame.run([
          companyId,
          game.name_ar,
          game.name_en,
          game.genre,
          game.release_year,
          Number(game.price || 0),
          String(game.currency || 'IQD').toUpperCase(),
          game.cover_image_url || null,
          game.description || null
        ]);
      }
    }

    insertCompany.free();
    insertGame.free();
    await saveDatabaseFile();
  }
}

// Helper: run query on pg and return rows
async function pgQueryRows(text, params = []) {
  if (!pgPool) throw new Error('pgPool not initialized');
  const res = await pgPool.query(text, params);
  return res.rows;
}

function buildOrderBy(sort) {
  switch (sort) {
    case 'name_desc': return 'g.name_en DESC';
    case 'year_asc': return 'g.release_year ASC';
    case 'year_desc': return 'g.release_year DESC';
    case 'company_asc': return 'c.name_en ASC, g.name_en ASC';
    default: return 'g.name_en ASC';
  }
}

async function getCatalog({ search = '', sort = 'name_asc' } = {}) {
  if (usePg) {
    const term = `%${String(search || '').trim()}%`;
    const orderBy = buildOrderBy(sort);
    const rows = await pgQueryRows(
      `SELECT c.id as company_id, c.slug, c.name_ar as company_name_ar, c.name_en as company_name_en,
              g.id as game_id, g.product_type as game_product_type, g.product_subtype as game_product_subtype, g.name_ar as game_name_ar, g.name_en as game_name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description
       FROM companies c JOIN games g ON g.company_id = c.id
       WHERE $1 = '%' OR c.name_ar ILIKE $2 OR c.name_en ILIKE $2 OR g.name_ar ILIKE $2 OR g.name_en ILIKE $2
       ORDER BY ${orderBy}`,
      [term, term]
    );

    const companyMap = new Map();
    for (const row of rows) {
      if (!companyMap.has(row.company_id)) {
        companyMap.set(row.company_id, {
          id: row.company_id,
          slug: row.slug,
          name_ar: row.company_name_ar,
          name_en: row.company_name_en,
          games: []
        });
      }
      companyMap.get(row.company_id).games.push({
        id: row.game_id,
        product_type: row.game_product_type || 'game',
        product_subtype: row.game_product_subtype || null,
        name_ar: row.game_name_ar,
        name_en: row.game_name_en,
        genre: row.genre,
        release_year: row.release_year,
        price: Number(row.price || 0),
        currency: row.currency || 'IQD',
        cover_image_url: row.cover_image_url,
        description: row.description
      });
    }
    return Array.from(companyMap.values());
  }

  const term = `%${String(search || '').trim()}%`;
  const orderBy = buildOrderBy(sort);
  const sql = `
    SELECT
      c.id as company_id, c.slug, c.name_ar as company_name_ar, c.name_en as company_name_en,
      g.id as game_id, g.product_type as game_product_type, g.product_subtype as game_product_subtype, g.name_ar as game_name_ar, g.name_en as game_name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description
    FROM companies c
    JOIN games g ON g.company_id = c.id
    WHERE (? = '%%') OR c.name_ar LIKE ? OR c.name_en LIKE ? OR g.name_ar LIKE ? OR g.name_en LIKE ?
    ORDER BY ${orderBy}
  `;

  const stmt = db.prepare(sql);
  const rows = [];
  try {
    stmt.bind([term, term, term, term, term]);
    while (stmt.step()) {
      const obj = stmt.getAsObject();
      rows.push(obj);
    }
  } finally {
    stmt.free();
  }

  const companyMap = new Map();
  for (const row of rows) {
    if (!companyMap.has(row.company_id)) {
      companyMap.set(row.company_id, {
        id: row.company_id,
        slug: row.slug,
        name_ar: row.company_name_ar,
        name_en: row.company_name_en,
        games: []
      });
    }

    companyMap.get(row.company_id).games.push({
      id: row.game_id,
      product_type: row.game_product_type || 'game',
      product_subtype: row.game_product_subtype || null,
      name_ar: row.game_name_ar,
      name_en: row.game_name_en,
      genre: row.genre,
      release_year: row.release_year,
      price: Number(row.price || 0),
      currency: row.currency || 'IQD',
      cover_image_url: row.cover_image_url,
      description: row.description
    });
  }

  return Array.from(companyMap.values());
}

async function getGameDetailsById(id) {
  if (usePg) {
    const rows = await pgQueryRows(
      `SELECT g.id, g.product_type, g.product_subtype, g.name_ar, g.name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description,
              c.id as company_id, c.slug as company_slug, c.name_ar as company_name_ar, c.name_en as company_name_en
       FROM games g JOIN companies c ON c.id = g.company_id WHERE g.id = $1 LIMIT 1`,
      [Number(id)]
    );
    if (!rows || !rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      product_type: row.product_type || 'game',
      product_subtype: row.product_subtype || null,
      name_ar: row.name_ar,
      name_en: row.name_en,
      genre: row.genre,
      release_year: row.release_year,
      price: Number(row.price || 0),
      currency: row.currency || 'IQD',
      cover_image_url: row.cover_image_url,
      description: row.description,
      company: {
        id: row.company_id,
        slug: row.company_slug,
        name_ar: row.company_name_ar,
        name_en: row.company_name_en
      }
    };
  }

  const stmt = db.prepare(`
    SELECT g.id, g.product_type, g.product_subtype, g.name_ar, g.name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description,
           c.id as company_id, c.slug as company_slug, c.name_ar as company_name_ar, c.name_en as company_name_en
    FROM games g JOIN companies c ON c.id = g.company_id WHERE g.id = ? LIMIT 1
  `);
  try {
    stmt.bind([Number(id)]);
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    return {
      id: row.id,
      product_type: row.product_type || 'game',
      product_subtype: row.product_subtype || null,
      name_ar: row.name_ar,
      name_en: row.name_en,
      genre: row.genre,
      release_year: row.release_year,
      price: Number(row.price || 0),
      currency: row.currency || 'IQD',
      cover_image_url: row.cover_image_url,
      description: row.description,
      company: {
        id: row.company_id,
        slug: row.company_slug,
        name_ar: row.company_name_ar,
        name_en: row.company_name_en
      }
    };
  } finally {
    stmt.free();
  }
}

async function getCompaniesList() {
  if (usePg) {
    return await pgQueryRows('SELECT id, slug, name_ar, name_en FROM companies ORDER BY name_en ASC');
  }
  const stmt = db.prepare('SELECT id, slug, name_ar, name_en FROM companies ORDER BY name_en ASC');
  const rows = [];
  try {
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
  } finally {
    stmt.free();
  }
  return rows;
}

async function getCoupons() {
  if (usePg) {
    return await pgQueryRows('SELECT code, percent, active FROM coupons ORDER BY created_at DESC');
  }
  const stmt = db.prepare('SELECT code, percent, active FROM coupons ORDER BY created_at DESC');
  const rows = [];
  try {
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
  } finally {
    stmt.free();
  }
  return rows;
}

async function createCoupon({ code, percent }) {
  if (usePg) {
    await pgQueryRows('INSERT INTO coupons (code, percent, active) VALUES ($1, $2, 1)', [String(code).trim(), Number(percent || 0)]);
    return { code: String(code).trim() };
  }
  const stmt = db.prepare('INSERT INTO coupons (code, percent, active) VALUES (?, ?, 1)');
  try {
    stmt.run([String(code).trim(), Number(percent || 0)]);
  } finally {
    stmt.free();
  }

  await saveDatabaseFile();
  return { code: String(code).trim() };
}

async function deleteCoupon(code) {
  if (usePg) {
    const res = await pgPool.query('DELETE FROM coupons WHERE code = $1', [String(code).trim()]);
    return res.rowCount || 0;
  }
  const stmt = db.prepare('DELETE FROM coupons WHERE code = ?');
  try {
    stmt.run([String(code).trim()]);
  } finally {
    stmt.free();
  }

  const changes = rowsFromResult(db.exec('SELECT changes() as changes'))[0].changes || 0;
  if (changes) await saveDatabaseFile();
  return Number(changes);
}

async function validateCoupon(code) {
  if (usePg) {
    const rows = await pgQueryRows('SELECT percent, active FROM coupons WHERE code = $1 LIMIT 1', [String(code).trim()]);
    if (!rows || !rows.length) return null;
    const row = rows[0];
    if (!row || Number(row.active || 0) !== 1) return null;
    return { percent: Number(row.percent || 0) };
  }
  const stmt = db.prepare('SELECT percent, active FROM coupons WHERE code = ? LIMIT 1');
  try {
    stmt.bind([String(code).trim()]);
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    if (!row || Number(row.active || 0) !== 1) return null;
    return { percent: Number(row.percent || 0) };
  } finally {
    stmt.free();
  }
}

async function createCompany({ slug, name_ar, name_en }) {
  if (usePg) {
    const res = await pgPool.query('INSERT INTO companies (slug, name_ar, name_en) VALUES ($1, $2, $3) RETURNING id', [String(slug).trim(), String(name_ar).trim(), String(name_en).trim()]);
    return { id: res.rows[0].id };
  }
  const stmt = db.prepare('INSERT INTO companies (slug, name_ar, name_en) VALUES (?, ?, ?)');
  try {
    stmt.run([String(slug).trim(), String(name_ar).trim(), String(name_en).trim()]);
  } finally {
    stmt.free();
  }

  const id = rowsFromResult(db.exec('SELECT last_insert_rowid() as id'))[0].id;
  await saveDatabaseFile();
  return { id };
}

async function updateCompany(id, { slug, name_ar, name_en }) {
  if (usePg) {
    const res = await pgPool.query('UPDATE companies SET slug=$1, name_ar=$2, name_en=$3 WHERE id=$4', [String(slug).trim(), String(name_ar).trim(), String(name_en).trim(), Number(id)]);
    return res.rowCount || 0;
  }
  const stmt = db.prepare('UPDATE companies SET slug = ?, name_ar = ?, name_en = ? WHERE id = ?');
  try {
    stmt.run([String(slug).trim(), String(name_ar).trim(), String(name_en).trim(), Number(id)]);
  } finally {
    stmt.free();
  }

  const changes = rowsFromResult(db.exec('SELECT changes() as changes'))[0].changes || 0;
  if (changes) await saveDatabaseFile();
  return Number(changes);
}

async function createGame({ company_id, product_type = 'game', product_subtype = null, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description }) {
  if (usePg) {
    const res = await pgPool.query(
      'INSERT INTO games (company_id, product_type, product_subtype, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
      [Number(company_id), String(product_type || 'game'), product_subtype || null, String(name_ar).trim(), String(name_en).trim(), String(genre).trim(), Number(release_year), Number(price || 0), String(currency || 'IQD').toUpperCase(), (cover_image_url || '').trim() || null, (description || '').trim() || null]
    );
    return { id: res.rows[0].id };
  }
  const stmt = db.prepare('INSERT INTO games (company_id, product_type, product_subtype, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  try {
    stmt.run([
      Number(company_id),
      String(product_type || 'game'),
      product_subtype || null,
      String(name_ar).trim(),
      String(name_en).trim(),
      String(genre).trim(),
      Number(release_year),
      Number(price || 0),
      String(currency || 'IQD').toUpperCase(),
      (cover_image_url || '').trim() || null,
      (description || '').trim() || null
    ]);
  } finally {
    stmt.free();
  }

  const id = rowsFromResult(db.exec('SELECT last_insert_rowid() as id'))[0].id;
  await saveDatabaseFile();
  return { id };
}

async function updateGame(id, { company_id, product_type = 'game', product_subtype = null, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description }) {
  if (usePg) {
    const res = await pgPool.query('UPDATE games SET company_id=$1, product_type=$2, product_subtype=$3, name_ar=$4, name_en=$5, genre=$6, release_year=$7, price=$8, currency=$9, cover_image_url=$10, description=$11 WHERE id=$12', [Number(company_id), String(product_type || 'game'), product_subtype || null, String(name_ar).trim(), String(name_en).trim(), String(genre).trim(), Number(release_year), Number(price || 0), String(currency || 'IQD').toUpperCase(), (cover_image_url || '').trim() || null, (description || '').trim() || null, Number(id)]);
    return res.rowCount || 0;
  }
  const stmt = db.prepare('UPDATE games SET company_id = ?, product_type = ?, product_subtype = ?, name_ar = ?, name_en = ?, genre = ?, release_year = ?, price = ?, currency = ?, cover_image_url = ?, description = ? WHERE id = ?');
  try {
    stmt.run([
      Number(company_id),
      String(product_type || 'game'),
      product_subtype || null,
      String(name_ar).trim(),
      String(name_en).trim(),
      String(genre).trim(),
      Number(release_year),
      Number(price || 0),
      String(currency || 'IQD').toUpperCase(),
      (cover_image_url || '').trim() || null,
      (description || '').trim() || null,
      Number(id)
    ]);
  } finally {
    stmt.free();
  }

  const changes = rowsFromResult(db.exec('SELECT changes() as changes'))[0].changes || 0;
  if (changes) await saveDatabaseFile();
  return Number(changes);
}

async function deleteCompany(id) {
  if (usePg) {
    const res = await pgPool.query('DELETE FROM companies WHERE id = $1', [Number(id)]);
    return res.rowCount || 0;
  }
  const stmt = db.prepare('DELETE FROM companies WHERE id = ?');
  try {
    stmt.run([Number(id)]);
  } finally {
    stmt.free();
  }

  const changes = rowsFromResult(db.exec('SELECT changes() as changes'))[0].changes || 0;
  if (changes) await saveDatabaseFile();
  return Number(changes);
}

async function deleteGame(id) {
  const stmt = db.prepare('DELETE FROM games WHERE id = ?');
  try {
    stmt.run([Number(id)]);
  } finally {
    stmt.free();
  }

  const changes = rowsFromResult(db.exec('SELECT changes() as changes'))[0].changes || 0;
  if (changes) await saveDatabaseFile();
  return Number(changes);
}

module.exports = {
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
};
