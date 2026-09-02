require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testAttachmentsAndNotes() {
  console.log('=== Testing Notes, Attachments Metadata, & Activity Logging ===\n');

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
    // 1. Get an existing backtest
    const { data: bts } = await client.from('backtests').select('id').limit(1);
    if (!bts || bts.length === 0) throw new Error('No backtests found');
    const backtestId = bts[0].id;

    // 2. Add Research Note
    console.log('1. Adding Research Note...');
    const { data: note, error: noteErr } = await client
      .from('research_notes')
      .insert({
        entity_type: 'backtest',
        entity_id: backtestId,
        content: 'Automated test note: 15m VWAP execution exhibits strong stability in 2024.',
        created_by: user.id
      })
      .select()
      .single();

    if (noteErr) throw noteErr;
    console.log('  [PASS] Note added with ID:', note.id);

    // 3. Edit Research Note
    console.log('2. Updating Research Note...');
    const { error: editErr } = await client
      .from('research_notes')
      .update({ content: 'Updated automated test note.' })
      .eq('id', note.id);

    if (editErr) throw editErr;
    console.log('  [PASS] Note updated successfully');

    // 4. Add Attachment metadata
    console.log('3. Inserting Attachment metadata...');
    const { data: att, error: attErr } = await client
      .from('attachments')
      .insert({
        entity_type: 'backtest',
        entity_id: backtestId,
        file_name: 'test_report.pdf',
        storage_path: `backtest/${backtestId}/test_report.pdf`,
        mime_type: 'application/pdf',
        file_size: 102400,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (attErr) throw attErr;
    console.log('  [PASS] Attachment metadata created with ID:', att.id);

    // 5. Query Activity Logs
    console.log('4. Checking Activity Logs...');
    const { data: logs, error: logErr } = await client
      .from('activity_logs')
      .select('*')
      .limit(5);

    if (logErr) throw logErr;
    console.log(`  [PASS] Successfully retrieved ${logs.length} activity records`);

    // Clean up test note and attachment
    await client.from('research_notes').delete().eq('id', note.id);
    await client.from('attachments').delete().eq('id', att.id);
    console.log('  [PASS] Cleaned up test artifacts');

    console.log('\n=== Attachments & Notes Verification Complete: ALL TESTS PASSED! ===');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

testAttachmentsAndNotes();
