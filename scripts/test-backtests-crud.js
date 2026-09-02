require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testBacktestsCrud() {
  console.log('=== Testing Backtests CRUD, Duplicate Detection & Yearly Results ===\n');

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: loginErr } = await client.auth.signInWithPassword({
    email: 'editor@escanorcapital.com',
    password: process.env.INITIAL_EDITOR_PASSWORD || 'EscanorEditor2026!'
  });
  if (loginErr) throw loginErr;
  const user = authData.user;
  console.log('Logged in as Editor (ID:', user.id + ')');

  try {
    // 1. Get an existing strategy version
    const { data: versions } = await client.from('strategy_versions').select('id, strategy_id').limit(1);
    if (!versions || versions.length === 0) throw new Error('No strategy versions found for test');
    const versionId = versions[0].id;
    console.log('Using Strategy Version ID:', versionId);

    // 2. Create a Backtest
    console.log('1. Creating a standardized backtest record...');
    const testBacktest = {
      strategy_version_id: versionId,
      backtest_name: 'Freqtrade 15m Automated Test Run',
      test_type: 'Out of Sample',
      source: 'Freqtrade',
      status: 'Passed',
      exchange: 'Binance',
      market_type: 'USD-M Futures',
      symbol: 'BTCUSDT',
      direction: 'Long',
      timeframe: '15m',
      start_date: '2023-01-01',
      end_date: '2024-01-01',
      total_trades: 1250,
      profit_factor: 1.85,
      net_profit_percent: 64.50,
      max_drawdown_percent: 8.20,
      win_rate_percent: 48.00,
      average_trade_percent: 0.45,
      sharpe_ratio: 2.10,
      sortino_ratio: 2.80,
      calmar_ratio: 3.50,
      cagr_percent: 42.00,
      details: 'Automated test suite execution with 0.05% fee and 0.02% slippage assumption.',
      created_by: user.id
    };

    const { data: bt, error: btErr } = await client
      .from('backtests')
      .insert(testBacktest)
      .select()
      .single();

    if (btErr) throw btErr;
    console.log('  [PASS] Backtest created successfully (ID:', bt.id + ')');

    // 3. Test Duplicate Detection Query
    console.log('2. Testing Duplicate Backtest Detection...');
    const { data: duplicates } = await client
      .from('backtests')
      .select('id, backtest_name')
      .eq('strategy_version_id', versionId)
      .eq('symbol', 'BTCUSDT')
      .eq('timeframe', '15m')
      .eq('test_type', 'Out of Sample');

    if (duplicates && duplicates.length > 0) {
      console.log(`  [PASS] Duplicate detector identified ${duplicates.length} potential matching run(s)`);
    } else {
      throw new Error('Duplicate detector failed to identify test run');
    }

    // 4. Test Yearly Results Insertion
    console.log('3. Testing Yearly Results linked records...');
    const { data: yr, error: yrErr } = await client
      .from('backtest_yearly_results')
      .insert({
        backtest_id: bt.id,
        year: 2023,
        trades: 500,
        net_profit_percent: 45.60,
        profit_factor: 1.32,
        win_rate_percent: 41.50,
        max_drawdown_percent: 12.30
      })
      .select()
      .single();

    if (yrErr) throw yrErr;
    console.log('  [PASS] Yearly results record created for year', yr.year);

    // 5. Clean up test record
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from('backtests').delete().eq('id', bt.id);
      console.log('  [PASS] Test backtest cleaned up');
    } else {
      await client.from('backtests').delete().eq('id', bt.id);
      console.log('  [PASS] Test backtest cleanup requested');
    }

    console.log('\n=== Backtest CRUD & Duplicate Protection Tests PASSED! ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

testBacktestsCrud();
