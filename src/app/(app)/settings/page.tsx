"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Settings, User, Key, Check, AlertCircle, Shield } from "lucide-react";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const supabase = createClient();

  // Profile Form
  const [displayName, setDisplayName] = useState(profile?.display_name || "");

  // The profile arrives after first render, so seed the field when it lands.
  useEffect(() => {
    if (profile?.display_name) setDisplayName(profile.display_name);
  }, [profile?.display_name]);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("Use a password of at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("The two passwords do not match.");
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Your name as the team sees it, and your password. Roles are set by an Owner on the Team page."
      />

      {/* Profile Card */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <User className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Profile</CardTitle>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="eyebrow">Email</p>
            <p className="mt-1 font-mono text-[13px] font-medium text-foreground">
              {user?.email}
            </p>
          </div>
          <div>
            <p className="eyebrow mb-1.5">Role</p>
            <Badge
              variant={
                profile?.role === "owner"
                  ? "success"
                  : profile?.role === "editor"
                  ? "info"
                  : "secondary"
              }
              className="capitalize"
            >
              {profile?.role || "viewer"}
            </Badge>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-3 pt-2">
          {profileError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-2.5 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}
          {profileSuccess && (
            <div role="status" className="flex items-start gap-2 rounded-md border border-profit/25 bg-profit/[0.07] p-2.5 text-xs leading-relaxed text-profit">
              <Check className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>Display name saved.</span>
            </div>
          )}

          <div className="space-y-1.5 max-w-sm">
            <label className="eyebrow block">Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>

          <Button type="submit" size="sm" disabled={profileSaving}>
            <Check className="h-3.5 w-3.5" />
            {profileSaving ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>

      {/* Change Password Card */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Key className="h-4 w-4 text-sun" />
          <CardTitle className="text-sm">Password</CardTitle>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
          {passwordError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-2.5 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="flex items-start gap-2 rounded-md border border-profit/25 bg-profit/[0.07] p-2.5 text-xs leading-relaxed text-profit">
              <Check className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>Password updated.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="eyebrow block">New password</label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow block">Confirm new password</label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Type it again"
              required
            />
          </div>

          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={passwordSaving || !newPassword}
          >
            <Key className="h-3.5 w-3.5" />
            {passwordSaving ? "Updating..." : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
