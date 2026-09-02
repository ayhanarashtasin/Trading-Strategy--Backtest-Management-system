require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  process.exit(1);
}

async function testTeamRoles() {
  console.log('=== Testing Team Management & Role Security ===\n');

  // 1. Owner logs in and views team members
  const ownerClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: ownerAuth, error: ownerLoginErr } = await ownerClient.auth.signInWithPassword({
    email: 'owner@escanorcapital.com',
    password: process.env.INITIAL_OWNER_PASSWORD || 'EscanorOwner2026!'
  });
  if (ownerLoginErr) throw ownerLoginErr;
  console.log('Logged in as Owner (ID:', ownerAuth.user.id + ')');

  const { data: profiles, error: profErr } = await ownerClient.from('profiles').select('*');
  if (profErr) throw profErr;
  console.log(`  [PASS] Owner retrieved all ${profiles.length} team members from profiles table.`);

  // 2. Editor attempts to update role (Should fail RLS)
  const editorClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data: editorAuth } = await editorClient.auth.signInWithPassword({
    email: 'editor@escanorcapital.com',
    password: process.env.INITIAL_EDITOR_PASSWORD || 'EscanorEditor2026!'
  });
  console.log('Logged in as Editor (ID:', editorAuth.user.id + ')');

  const { data: hacked, error: hackErr } = await editorClient
    .from('profiles')
    .update({ role: 'owner' })
    .eq('id', editorAuth.user.id)
    .select();

  // RLS policy on profiles prevents non-owner from changing role column
  const { data: currentEditorProfile } = await ownerClient
    .from('profiles')
    .select('role')
    .eq('id', editorAuth.user.id)
    .single();

  if (currentEditorProfile.role === 'editor') {
    console.log('  [PASS] Security Check: Editor cannot elevate own role to Owner (Role preserved as editor)');
  } else {
    throw new Error('Security Breach: Editor was able to elevate role to Owner!');
  }

  console.log('\n=== Team Management & Role Security Tests PASSED! ===');
}

testTeamRoles();
