require('./load-env');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function seedUsers() {
  console.log('Seeding initial users for Escanor Strategy Lab...');

  const usersToCreate = [
    {
      email: 'owner@escanorcapital.com',
      password: process.env.INITIAL_OWNER_PASSWORD || 'EscanorOwner2026!',
      display_name: 'Lead Strategist (Owner)',
      role: 'owner'
    },
    {
      email: 'editor@escanorcapital.com',
      password: process.env.INITIAL_EDITOR_PASSWORD || 'EscanorEditor2026!',
      display_name: 'Quantitative Researcher (Editor)',
      role: 'editor'
    },
    {
      email: 'viewer@escanorcapital.com',
      password: process.env.INITIAL_VIEWER_PASSWORD || 'EscanorViewer2026!',
      display_name: 'Junior Analyst (Viewer)',
      role: 'viewer'
    }
  ];

  for (const u of usersToCreate) {
    console.log(`Checking user: ${u.email}...`);
    // Check if user already exists
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users?.find(user => user.email === u.email);

    let userId;
    if (!existing) {
      console.log(`Creating user ${u.email}...`);
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          display_name: u.display_name,
          role: u.role
        }
      });
      if (error) {
        console.error(`Error creating user ${u.email}:`, error);
        continue;
      }
      userId = data.user.id;
      console.log(`User created with ID: ${userId}`);
    } else {
      userId = existing.id;
      console.log(`User ${u.email} already exists with ID: ${userId}`);
      // Update metadata & password
      await supabase.auth.admin.updateUserById(userId, {
        password: u.password,
        user_metadata: {
          display_name: u.display_name,
          role: u.role
        }
      });
    }

    // Ensure profile entry exists with correct role
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: u.email,
        display_name: u.display_name,
        role: u.role,
        status: 'active',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error(`Error upserting profile for ${u.email}:`, profileError);
    } else {
      console.log(`Profile synced for ${u.email} as ${u.role}`);
    }
  }

  console.log('Seeding users complete!');
}

seedUsers();
