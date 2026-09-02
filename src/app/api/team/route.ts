import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ users: profiles });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, displayName, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Email, password, and role are required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Create auth user
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || email.split("@")[0],
      },
    });

    if (createErr) throw createErr;

    // 2. Update role in public.profiles
    if (newUser.user) {
      await admin
        .from("profiles")
        .update({
          role,
          display_name: displayName || email.split("@")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", newUser.user.id);
    }

    return NextResponse.json({ success: true, user: newUser.user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is owner
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
    }

    const body = await req.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole) {
      return NextResponse.json({ error: "targetUserId and newRole are required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
