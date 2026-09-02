require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testStrategiesCrud() {
  console.log('=== Testing Strategy & Version CRUD + Soft Delete / Restore ===\n');

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
    // 1. Create Strategy
    console.log('1. Creating Strategy...');
    const { data: strat, error: stratErr } = await client
      .from('strategies')
      .insert({
        name: 'VWAP Mean Reversion Multi-TF',
        strategy_family: 'VWAP',
        description: 'Mean reversion strategy exploiting deviations from 1D anchor VWAP on 15m candles with RSI confirmation.',
        default_direction: 'Both',
        status: 'Candidate',
        created_by: user.id
      })
      .select()
      .single();

    if (stratErr) throw stratErr;
    console.log('  [PASS] Strategy created successfully (ID:', strat.id + ')');

    // 2. Create Strategy Version
    console.log('2. Creating Strategy Version V1...');
    const { data: ver, error: verErr } = await client
      .from('strategy_versions')
      .insert({
        strategy_id: strat.id,
        version_name: 'V1 Initial Baseline',
        version_number: 1,
        description: 'First version using default 2.0 standard deviation bands.',
        entry_rules: 'Price touches Lower 2.0 Band AND 14-period RSI < 30',
        exit_rules: 'Price crosses Mean VWAP OR 1.5% profit target reached',
        risk_rules: '1.0% hard stop loss per trade. Max 2 concurrent positions.',
        parameter_summary: 'Band: 2.0 std, RSI: 14 (<30), Stop: 1.0%',
        parameters_json: { band_multiplier: 2.0, rsi_period: 14, rsi_oversold: 30, stop_loss_pct: 1.0 },
        is_current: true,
        created_by: user.id
      })
      .select()
      .single();

    if (verErr) throw verErr;
    console.log('  [PASS] Strategy Version created successfully (ID:', ver.id + ')');

    // 3. Create Strategy Version V2
    console.log('3. Creating Strategy Version V2...');
    const { data: ver2, error: ver2Err } = await client
      .from('strategy_versions')
      .insert({
        strategy_id: strat.id,
        version_name: 'V2 Dynamic ATR Bands',
        version_number: 2,
        description: 'Second version replacing static bands with ATR-adjusted bands.',
        entry_rules: 'Price touches ATR adjusted band AND RSI < 25',
        exit_rules: 'Price crosses Mean VWAP',
        risk_rules: '1.2% trailing stop.',
        parameter_summary: 'Band: ATR(14)*2, RSI: 14 (<25), Stop: 1.2% trail',
        parameters_json: { band_atr_period: 14, band_atr_mult: 2.0, rsi_period: 14, rsi_oversold: 25, trailing_stop_pct: 1.2 },
        is_current: false,
        created_by: user.id
      })
      .select()
      .single();

    if (ver2Err) throw ver2Err;
    console.log('  [PASS] Strategy Version V2 created successfully (ID:', ver2.id + ')');

    // 4. Archive Strategy (Soft delete)
    console.log('4. Archiving Strategy (Soft-delete)...');
    const { error: archErr } = await client
      .from('strategies')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', strat.id);
    if (archErr) throw archErr;

    const { data: checkArch } = await client.from('strategies').select('archived_at').eq('id', strat.id).single();
    if (!checkArch.archived_at) throw new Error('Strategy failed to archive!');
    console.log('  [PASS] Strategy successfully archived');

    // 5. Restore Strategy
    console.log('5. Restoring Strategy...');
    const { error: restErr } = await client
      .from('strategies')
      .update({ archived_at: null })
      .eq('id', strat.id);
    if (restErr) throw restErr;

    const { data: checkRest } = await client.from('strategies').select('archived_at').eq('id', strat.id).single();
    if (checkRest.archived_at !== null) throw new Error('Strategy failed to restore!');
    console.log('  [PASS] Strategy successfully restored');

    // Clean up test strategy
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      await adminClient.from('strategies').delete().eq('id', strat.id);
      console.log('  [PASS] Test strategy cleaned up');
    }

    console.log('\n=== Strategy & Version CRUD Verification Complete: ALL TESTS PASSED! ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

testStrategiesCrud();
