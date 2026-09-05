require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testMonthlyResults() {
  console.log('=== Testing Monthly Results (CRUD, Upsert, RLS & Verification) ===\n');

  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: loginErr } = await client.auth.signInWithPassword({
    email: 'editor@escanorcapital.com',
    password: process.env.INITIAL_EDITOR_PASSWORD || 'EscanorEditor2026!'
  });
  if (loginErr) throw loginErr;
  console.log('1. Logged in as Editor:', authData.user.email);

  try {
    // Find an existing backtest
    const { data: backtests, error: btErr } = await client
      .from('backtests')
      .select('id, backtest_name')
      .limit(1);
    if (btErr) throw btErr;
    if (!backtests || backtests.length === 0) throw new Error('No backtests found in database.');

    const backtestId = backtests[0].id;
    console.log(`2. Found test backtest: "${backtests[0].backtest_name}" (${backtestId})`);

    // Clean up any existing test records for year 2029
    await client
      .from('backtest_monthly_results')
      .delete()
      .eq('backtest_id', backtestId)
      .eq('year', 2029);

    // Insert monthly results
    console.log('3. Inserting month-by-month results for 2029...');
    const monthlyData = [
      {
        backtest_id: backtestId,
        year: 2029,
        month: 1, // Jan
        trades: 22,
        winning_trades: 14,
        losing_trades: 8,
        net_profit_percent: 5.40,
        net_profit_amount: 540.00,
        profit_factor: 1.75,
        win_rate_percent: 63.64,
        average_trade_percent: 0.25,
        max_drawdown_percent: 2.10,
      },
      {
        backtest_id: backtestId,
        year: 2029,
        month: 2, // Feb
        trades: 18,
        winning_trades: 11,
        losing_trades: 7,
        net_profit_percent: 3.80,
        net_profit_amount: 380.00,
        profit_factor: 1.50,
        win_rate_percent: 61.11,
        average_trade_percent: 0.21,
        max_drawdown_percent: 1.85,
      },
      {
        backtest_id: backtestId,
        year: 2029,
        month: 3, // Mar
        trades: 25,
        winning_trades: 10,
        losing_trades: 15,
        net_profit_percent: -1.90,
        net_profit_amount: -190.00,
        profit_factor: 0.88,
        win_rate_percent: 40.00,
        average_trade_percent: -0.08,
        max_drawdown_percent: 3.40,
      },
    ];

    const { data: inserted, error: insertErr } = await client
      .from('backtest_monthly_results')
      .insert(monthlyData)
      .select();
    if (insertErr) throw insertErr;
    console.log(`   SUCCESS: Inserted ${inserted.length} monthly results.`);

    // Query back
    console.log('4. Querying monthly results ordered by year DESC, month DESC...');
    const { data: queried, error: qErr } = await client
      .from('backtest_monthly_results')
      .select('*')
      .eq('backtest_id', backtestId)
      .eq('year', 2029)
      .order('month', { ascending: true });
    if (qErr) throw qErr;

    if (queried.length !== 3) throw new Error(`Expected 3 records, got ${queried.length}`);
    console.log(`   SUCCESS: Retrieved 3 monthly records:`);
    queried.forEach((m) => {
      console.log(`   - Month ${m.month}/${m.year}: Return = ${m.net_profit_percent}%, PF = ${m.profit_factor}, Trades = ${m.trades} (W: ${m.winning_trades}, L: ${m.losing_trades})`);
    });

    // Test upsert on duplicate key (backtest_id, year, month)
    console.log('5. Testing upsert on duplicate key (editing Jan 2029)...');
    const updatedJan = {
      backtest_id: backtestId,
      year: 2029,
      month: 1,
      trades: 24,
      net_profit_percent: 6.20,
      profit_factor: 1.90,
    };
    const { data: upserted, error: upErr } = await client
      .from('backtest_monthly_results')
      .upsert(updatedJan, { onConflict: 'backtest_id,year,month' })
      .select()
      .single();
    if (upErr) throw upErr;
    console.log(`   SUCCESS: Upserted Jan 2029 -> new Return: ${upserted.net_profit_percent}%, new Trades: ${upserted.trades}`);

    // Clean up test data
    console.log('6. Cleaning up test monthly records...');
    const { error: delErr } = await client
      .from('backtest_monthly_results')
      .delete()
      .eq('backtest_id', backtestId)
      .eq('year', 2029);
    if (delErr) throw delErr;
    console.log('   SUCCESS: Test monthly records cleaned up.');

    console.log('\n=== All Monthly Results Verification Checks Passed! ===');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testMonthlyResults();
