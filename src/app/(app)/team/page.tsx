"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Check,
  Clock,
  Mail,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { TableRowsSkeleton } from "@/components/ui/skeleton";

export default function TeamPage() {
  const { user, profile, isOwner } = useAuth();

  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New Member Form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newRole, setNewRole] = useState("editor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load team");
      }
      const data = await res.json();
      setTeamMembers(data.users || []);
    } catch (err: any) {
      console.error("Load team error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadTeam();
    } else {
      setLoading(false);
    }
  }, [isOwner]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          displayName: newDisplayName.trim(),
          role: newRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");

      setAddModalOpen(false);
      setNewEmail("");
      setNewPassword("");
      setNewDisplayName("");
      loadTeam();
    } catch (err: any) {
      setError(err.message || "Failed to create member");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRoleValue: string) => {
    if (updatingUserId) return;
    setUpdatingUserId(targetUserId);
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          newRole: newRoleValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setTeamMembers(
        teamMembers.map((m) =>
          m.id === targetUserId ? { ...m, role: newRoleValue } : m
        )
      );
    } catch (err) {
      console.error("Update role error:", err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!profile) {
    return (
      <p className="py-20 text-center text-xs text-muted-foreground">
        Checking your permissions...
      </p>
    );
  }

  if (!isOwner) {
    return (
      <Card className="mx-auto my-12 max-w-md space-y-3 border-destructive/25 bg-destructive/[0.04] p-6 text-center">
        <ShieldAlert className="mx-auto h-8 w-8 text-destructive" />
        <h2 className="text-sm font-semibold text-foreground">
          Owners only
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Managing team members needs the Owner role. You are signed in as a{" "}
          {profile?.role || "viewer"}. Ask an Owner if you need access.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Administration"
          title="Team"
          description="Who can reach the research record, and what each of them may change."
          actions={
            <Button size="sm" onClick={() => setAddModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          }
        />

        {/* What each role may do */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              variant: "success" as const,
              name: "Owner",
              can: "Manages the team and roles, and is the only role that can permanently delete a record.",
            },
            {
              variant: "info" as const,
              name: "Editor",
              can: "Creates and edits strategies, versions, backtests, notes and attachments, and archives records.",
            },
            {
              variant: "secondary" as const,
              name: "Viewer",
              can: "Reads everything, compares, filters and exports. Changes nothing.",
            },
          ].map((r) => (
            <Card key={r.name} className="space-y-2 p-4">
              <Badge variant={r.variant}>{r.name}</Badge>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {r.can}
              </p>
            </Card>
          ))}
        </div>

        {/* Team Members List */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border p-4">
            <CardTitle className="text-sm">
              Members ({teamMembers.length})
            </CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="pl-5">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="pr-5 text-right">Change role</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={5} cols={5} />
                ) : (
                  teamMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="pl-5 font-medium text-foreground">
                        {member.display_name || "Analyst"}
                        {member.id === user?.id && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-primary">
                            You
                          </span>
                        )}
                      </td>
                      <td className="font-mono text-muted-foreground">
                        {member.email}
                      </td>
                      <td>
                        <Badge
                          variant={
                            member.role === "owner"
                              ? "success"
                              : member.role === "editor"
                              ? "info"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {member.role}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap font-mono text-muted-foreground">
                        {formatDateTime(member.created_at)}
                      </td>
                      <td className="pr-5 text-right">
                        <Select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="ml-auto h-7 w-28 text-xs"
                          disabled={member.id === user?.id || updatingUserId === member.id} // Don't demote self accidentally or allow double update
                          aria-label={`Role for ${member.display_name || member.email}`}
                        >
                          <option value="owner">Owner</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Invite Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md" onClose={() => setAddModalOpen(false)}>
          <DialogHeader>
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              Creates the account straight away with the role you choose. Share
              the password with them privately and ask them to change it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMember} className="space-y-4 pt-2">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-3 text-xs leading-relaxed text-destructive"
              >
                <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="eyebrow block">Display name</label>
              <Input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                placeholder="How the team will see them"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Email</label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="analyst@escanorcapital.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Initial password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Role</label>
              <Select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="text-xs"
              >
                <option value="editor">Editor - creates and edits research</option>
                <option value="viewer">Viewer - read only</option>
                <option value="owner">Owner - full control</option>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={submitting || !newEmail || !newPassword}
              >
                <Check className="h-3.5 w-3.5" />
                {submitting ? "Adding..." : "Add member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
