require('dotenv').config();

const { initDatabase } = require('../db');

(async () => {
  try {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set. Add your Render PostgreSQL connection string first.');
      process.exit(1);
    }

    console.log('Preparing PostgreSQL database and seeding starter data...');
    await initDatabase();
    console.log('Database is ready.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
    process.exit(1);
  }
})();
