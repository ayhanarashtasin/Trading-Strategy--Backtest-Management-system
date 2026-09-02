require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testTablePreferences() {
  console.log('=== Testing User Table Preferences Persistence & Numeric Sorting ===\n');

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
    // 1. Save custom table preferences
    console.log('1. Saving custom table layout preferences...');
    const customPrefs = {
      user_id: user.id,
      table_id: 'backtests',
      column_visibility: { strategy_name: true, profit_factor: true, cagr_percent: true, details: true },
      column_order: ['select', 'profit_factor', 'strategy_name', 'symbol', 'timeframe', 'net_profit_percent'],
      column_pinning: { left: ['select', 'profit_factor'], right: ['details'] },
      page_size: 100,
      updated_at: new Date().toISOString()
    };

    const { data: savedPref, error: saveErr } = await client
      .from('user_table_preferences')
      .upsert(customPrefs, { onConflict: 'user_id,table_id' })
      .select()
      .single();

    if (saveErr) throw saveErr;
    console.log('  [PASS] Preferences saved successfully');

    // 2. Fetch preferences and verify
    console.log('2. Verifying saved layout persistence...');
    const { data: loadedPref, error: loadErr } = await client
      .from('user_table_preferences')
      .select('*')
      .eq('user_id', user.id)
      .eq('table_id', 'backtests')
      .single();

    if (loadErr) throw loadErr;
    if (loadedPref.page_size === 100 && loadedPref.column_pinning.left.includes('profit_factor')) {
      console.log('  [PASS] Preferences correctly loaded and verified (Page Size:', loadedPref.page_size, 'Pinned:', loadedPref.column_pinning.left, ')');
    } else {
      throw new Error('Preferences do not match saved state!');
    }

    // 3. Test Numeric Sorting from database
    console.log('3. Testing Numeric Column Sorting on Backtests...');
    const { data: sortedByPF, error: sortErr } = await client
      .from('backtests')
      .select('backtest_name, profit_factor')
      .not('profit_factor', 'is', null)
      .order('profit_factor', { ascending: false });

    if (sortErr) throw sortErr;
    console.log('  [PASS] Backtests sorted by Profit Factor descending:');
    sortedByPF.slice(0, 3).forEach(b => {
      console.log(`    - ${b.backtest_name}: PF = ${b.profit_factor}`);
    });

    // Check that first >= second
    if (sortedByPF.length >= 2) {
      if (Number(sortedByPF[0].profit_factor) < Number(sortedByPF[1].profit_factor)) {
        throw new Error('Numeric sort failed: PF values not in descending order');
      }
      console.log('  [PASS] Numerical order verified (highest PF on top)');
    }

    console.log('\n=== User Table Preferences & Numeric Sorting Verification PASSED! ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

testTablePreferences();
