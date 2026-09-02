require('./load-env');
const { Client } = require('pg');

async function testDatabase() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('Error: DIRECT_URL or DATABASE_URL environment variable is not defined.');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('--- Database Verification ---');

    // 1. Check tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Found tables (' + tables.length + '):', tables);

    const requiredTables = [
      'activity_logs', 'attachments', 'backtest_yearly_results', 'backtests',
      'profiles', 'research_notes', 'saved_views', 'strategies',
      'strategy_tags', 'strategy_versions', 'tags', 'user_table_preferences'
    ];

    const missing = requiredTables.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      console.error('FAIL: Missing tables:', missing);
      process.exit(1);
    } else {
      console.log('SUCCESS: All required tables exist!');
    }

    // 2. Check RLS enabled on all tables
    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    console.log('RLS Status:');
    let allRlsOn = true;
    for (const row of rlsRes.rows) {
      console.log(`  - ${row.tablename}: rowsecurity = ${row.rowsecurity}`);
      if (!row.rowsecurity) allRlsOn = false;
    }
    if (!allRlsOn) {
      console.error('FAIL: Not all public tables have Row Level Security enabled!');
      process.exit(1);
    } else {
      console.log('SUCCESS: Row Level Security is active on all tables!');
    }

    // 3. Check indexes
    const indexesRes = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);
    console.log(`Found ${indexesRes.rows.length} indexes across public tables.`);

    console.log('--- Database Verification Complete: All Checks Passed! ---');
  } catch (err) {
    console.error('Verification failed with error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

testDatabase();
