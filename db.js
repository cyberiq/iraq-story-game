const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_PATH = process.env.SQLITE_FILE || path.join(__dirname, 'data', 'game_catalog.sqlite');

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
  const term = `%${String(search || '').trim()}%`;
  const orderBy = buildOrderBy(sort);
  const sql = `
    SELECT
      c.id as company_id, c.slug, c.name_ar as company_name_ar, c.name_en as company_name_en,
      g.id as game_id, g.name_ar as game_name_ar, g.name_en as game_name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description
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
  const stmt = db.prepare(`
    SELECT g.id, g.name_ar, g.name_en, g.genre, g.release_year, g.price, g.currency, g.cover_image_url, g.description,
           c.id as company_id, c.slug as company_slug, c.name_ar as company_name_ar, c.name_en as company_name_en
    FROM games g JOIN companies c ON c.id = g.company_id WHERE g.id = ? LIMIT 1
  `);
  try {
    stmt.bind([Number(id)]);
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    return {
      id: row.id,
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

async function createCompany({ slug, name_ar, name_en }) {
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

async function createGame({ company_id, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description }) {
  const stmt = db.prepare('INSERT INTO games (company_id, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  try {
    stmt.run([
      Number(company_id),
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

async function updateGame(id, { company_id, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description }) {
  const stmt = db.prepare('UPDATE games SET company_id = ?, name_ar = ?, name_en = ?, genre = ?, release_year = ?, price = ?, currency = ?, cover_image_url = ?, description = ? WHERE id = ?');
  try {
    stmt.run([
      Number(company_id),
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
};
