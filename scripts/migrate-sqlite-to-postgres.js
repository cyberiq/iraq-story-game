const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { Pool } = require('pg');

async function loadSqlite(dbPath) {
  const SQL = await initSqlJs({ locateFile: (file) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file) });
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(new Uint8Array(buf));
  return { SQL, db };
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

async function migrate() {
  const dbPath = process.env.SQLITE_FILE || path.join(__dirname, '..', 'data', 'database.sqlite');
  if (!fs.existsSync(dbPath)) {
    console.error('SQLite file not found at', dbPath);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL env var to target Postgres connection string');
    process.exit(1);
  }

  const { db } = await loadSqlite(dbPath);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Creating tables in Postgres (if not exists)');
    await pool.query(`
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

    // read companies
    const companies = rowsFromResult(db.exec('SELECT id, slug, name_ar, name_en FROM companies'));
    for (const c of companies) {
      // insert company and preserve id mapping by slug
      const res = await pool.query('SELECT id FROM companies WHERE slug=$1', [c.slug]);
      let newId;
      if (res.rows.length) {
        newId = res.rows[0].id;
      } else {
        const ins = await pool.query('INSERT INTO companies (slug, name_ar, name_en) VALUES ($1,$2,$3) RETURNING id', [c.slug, c.name_ar, c.name_en]);
        newId = ins.rows[0].id;
      }
      // migrate games for this company
      const games = rowsFromResult(db.exec('SELECT id, product_type, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description FROM games WHERE company_id=' + c.id));
      for (const g of games) {
        // check existing by name+company
        const exists = await pool.query('SELECT id FROM games WHERE company_id=$1 AND name_en=$2 LIMIT 1', [newId, g.name_en]);
        if (exists.rows.length) continue;
        await pool.query('INSERT INTO games (company_id, product_type, name_ar, name_en, genre, release_year, price, currency, cover_image_url, description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [newId, g.product_type || 'game', g.name_ar, g.name_en, g.genre, g.release_year, g.price || 0, g.currency || 'IQD', g.cover_image_url || null, g.description || null]);
      }
    }

    // migrate coupons
    const coupons = rowsFromResult(db.exec('SELECT code, percent, active FROM coupons'));
    for (const cp of coupons) {
      const ex = await pool.query('SELECT code FROM coupons WHERE code=$1', [cp.code]);
      if (ex.rows.length) continue;
      await pool.query('INSERT INTO coupons (code, percent, active) VALUES ($1,$2,$3)', [cp.code, cp.percent, cp.active]);
    }

    console.log('Migration complete');
  } catch (err) {
    console.error('Migration failed', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

migrate();
