require('./load-env');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMonthlyMigration() {
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

    const migrationPath = path.join(__dirname, '../supabase/migrations/20260905000000_add_backtest_monthly_results.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Executing monthly migration SQL...');
    await client.query(sql);
    console.log('Monthly migration executed successfully!');

    // Verify created table
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'backtest_monthly_results'
      ORDER BY ordinal_position;
    `);
    console.log('backtest_monthly_results columns:', res.rows.map(r => `${r.column_name} (${r.data_type})`));

  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMonthlyMigration();
