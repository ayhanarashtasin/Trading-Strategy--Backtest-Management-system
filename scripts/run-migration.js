require('./load-env');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigration() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DIRECT_URL or DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260901000000_init_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('Migration executed successfully!');

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Public tables in database:', res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
