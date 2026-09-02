require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testRolePermissions() {
  console.log('=== Testing Role & RLS Permissions (Viewer, Editor, Owner) ===\n');

  // Helper to create client and login
  async function getClientFor(email, password) {
    const client = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Login failed for ${email}: ${error.message}`);
    return { client, user: data.user };
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Viewer Permissions
    // -------------------------------------------------------------
    console.log('1. Testing VIEWER permissions...');
    const { client: viewerClient } = await getClientFor('viewer@escanorcapital.com', process.env.INITIAL_VIEWER_PASSWORD || 'EscanorViewer2026!');

    // Read strategies (allowed)
    const { data: viewerRead, error: viewerReadErr } = await viewerClient.from('strategies').select('id, name').limit(1);
    if (viewerReadErr) throw new Error(`Viewer read failed: ${viewerReadErr.message}`);
    console.log('  [PASS] Viewer can read strategies (Count: ' + viewerRead.length + ')');

    // Insert strategy (MUST FAIL)
    const { data: viewerInsert, error: viewerInsertErr } = await viewerClient.from('strategies').insert({
      name: 'Unauthorized Viewer Strategy',
      strategy_family: 'Custom',
      default_direction: 'Long',
      status: 'Idea'
    }).select();

    if (viewerInsertErr) {
      console.log('  [PASS] Viewer INSERT was correctly rejected by RLS:', viewerInsertErr.message);
    } else {
      throw new Error('SECURITY VIOLATION: Viewer was able to INSERT a strategy!');
    }

    // -------------------------------------------------------------
    // TEST 2: Editor Permissions
    // -------------------------------------------------------------
    console.log('\n2. Testing EDITOR permissions...');
    const { client: editorClient, user: editorUser } = await getClientFor('editor@escanorcapital.com', process.env.INITIAL_EDITOR_PASSWORD || 'EscanorEditor2026!');

    // Insert strategy (allowed)
    const { data: editorInsert, error: editorInsertErr } = await editorClient.from('strategies').insert({
      name: 'Editor Created Test Strategy',
      strategy_family: 'Trend Following',
      default_direction: 'Long',
      status: 'Experimental',
      created_by: editorUser.id
    }).select().single();

    if (editorInsertErr) throw new Error(`Editor insert failed: ${editorInsertErr.message}`);
    console.log('  [PASS] Editor can create strategy (ID:', editorInsert.id + ')');

    // Update strategy (allowed)
    const { error: editorUpdateErr } = await editorClient
      .from('strategies')
      .update({ description: 'Updated by editor' })
      .eq('id', editorInsert.id);

    if (editorUpdateErr) throw new Error(`Editor update failed: ${editorUpdateErr.message}`);
    console.log('  [PASS] Editor can update strategy');

    // Hard Delete strategy (MUST FAIL for Editor)
    const { error: editorDeleteErr } = await editorClient
      .from('strategies')
      .delete()
      .eq('id', editorInsert.id);

    if (editorDeleteErr) {
      console.log('  [PASS] Editor DELETE was correctly rejected by RLS:', editorDeleteErr.message);
    } else {
      // Check if row actually deleted or 0 rows affected
      const { data: checkDeleted } = await editorClient.from('strategies').select('id').eq('id', editorInsert.id);
      if (checkDeleted && checkDeleted.length > 0) {
        console.log('  [PASS] Editor DELETE had no effect (protected by RLS)');
      } else {
        throw new Error('SECURITY VIOLATION: Editor was able to hard DELETE a strategy!');
      }
    }

    // -------------------------------------------------------------
    // TEST 3: Owner Permissions
    // -------------------------------------------------------------
    console.log('\n3. Testing OWNER permissions...');
    const { client: ownerClient } = await getClientFor('owner@escanorcapital.com', process.env.INITIAL_OWNER_PASSWORD || 'EscanorOwner2026!');

    // Delete strategy created in test (allowed for owner)
    const { error: ownerDeleteErr } = await ownerClient
      .from('strategies')
      .delete()
      .eq('id', editorInsert.id);

    if (ownerDeleteErr) throw new Error(`Owner delete failed: ${ownerDeleteErr.message}`);
    console.log('  [PASS] Owner can delete strategy');

    console.log('\n=== All Role & RLS Permission Tests Passed Successfully! ===');
  } catch (err) {
    console.error('\nFAIL: RLS permission test failed:', err);
    process.exit(1);
  }
}

testRolePermissions();
