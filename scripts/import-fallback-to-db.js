const fs = require('fs');
const path = require('path');
const {
  initDatabase,
  getCompaniesList,
  getCatalog,
  createCompany,
  createGame
} = require('../db');

async function main() {
  await initDatabase();

  const file = path.join(__dirname, '..', 'data', 'fallback-data.json');
  if (!fs.existsSync(file)) {
    console.error('fallback-data.json not found at', file);
    process.exit(1);
  }

  const fallback = JSON.parse(fs.readFileSync(file, 'utf8'));
  const existing = await getCompaniesList();
  const slugToId = new Map(existing.map((c) => [String(c.slug).trim(), Number(c.id)]));

  for (const company of fallback) {
    const slug = String(company.slug || '').trim();
    if (!slug) continue;

    let companyId = slugToId.get(slug);
    if (!companyId) {
      const created = await createCompany({ slug, name_ar: company.name_ar || slug, name_en: company.name_en || slug });
      companyId = created.id;
      console.log('Created company:', slug, '->', companyId);
      slugToId.set(slug, companyId);
    } else {
      console.log('Company exists:', slug, '->', companyId);
    }

    // Refresh catalog to get current company games
    const catalog = await getCatalog({ search: '', sort: 'name_asc' });
    const dbCompany = catalog.find((c) => String(c.slug).trim() === slug);
    const existingGameNames = new Set((dbCompany && dbCompany.games ? dbCompany.games : []).map((g) => String(g.name_en).trim()));

    for (const game of company.games || []) {
      const nameEn = String(game.name_en || '').trim();
      if (!nameEn) continue;
      if (existingGameNames.has(nameEn)) {
        console.log('Skipping existing game:', nameEn);
        continue;
      }

      const createdGame = await createGame({
        company_id: companyId,
        product_type: game.product_type || 'game',
        product_subtype: game.product_subtype || '',
        name_ar: game.name_ar || nameEn,
        name_en: nameEn,
        genre: game.genre || 'Misc',
        release_year: Number(game.release_year || 0),
        price: Number(game.price || 0),
        currency: game.currency || 'IQD',
        cover_image_url: game.cover_image_url || '',
        description: game.description || ''
      });

      console.log('Created game:', nameEn, '->', createdGame.id || '(ok)');
    }
  }

  console.log('Import finished. Restart your server to see changes.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Import failed:', err && err.message ? err.message : err);
  process.exit(1);
});
