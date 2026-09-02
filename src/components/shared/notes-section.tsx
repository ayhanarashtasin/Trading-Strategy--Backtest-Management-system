"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { ResearchNote, EntityType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Trash2, Edit2, Clock, Check, X, AlertCircle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface NotesSectionProps {
  entityType: EntityType;
  entityId: string;
}

export function NotesSection({ entityType, entityId }: NotesSectionProps) {
  const { user, profile, canEdit, isOwner } = useAuth();
  const supabase = createClient();

  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [newContent, setNewContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Note editing state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("research_notes")
        .select(`
          *,
          creator:profiles!research_notes_created_by_fkey(display_name, email, role)
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });

      if (fetchErr) throw fetchErr;
      setNotes(data || []);
    } catch (err) {
      console.error("Fetch notes error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [entityType, entityId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: insertErr } = await supabase
        .from("research_notes")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          content: newContent.trim(),
          created_by: user?.id,
        })
        .select(`
          *,
          creator:profiles!research_notes_created_by_fkey(display_name, email, role)
        `)
        .single();

      if (insertErr) throw insertErr;

      // Activity log
      await supabase.from("activity_logs").insert({
        action: "note_created",
        entity_type: entityType,
        entity_id: entityId,
        description: `Added research note on ${entityType}`,
        user_id: user?.id,
      });

      setNotes([...notes, data]);
      setNewContent("");
    } catch (err: any) {
      setError(err.message || "Failed to add note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim() || actionInProgressId) return;

    setActionInProgressId(noteId);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from("research_notes")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", noteId);

      if (updateErr) throw updateErr;

      setNotes(
        notes.map((n) =>
          n.id === noteId ? { ...n, content: editContent.trim() } : n
        )
      );
      setEditingNoteId(null);
    } catch (err: any) {
      setError(err.message || "Failed to update note.");
      console.error("Update note error:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (actionInProgressId) return;

    setActionInProgressId(noteId);
    setError(null);

    try {
      const { error: delErr } = await supabase
        .from("research_notes")
        .delete()
        .eq("id", noteId);

      if (delErr) throw delErr;

      setNotes(notes.filter((n) => n.id !== noteId));
    } catch (err: any) {
      setError(err.message || "Failed to delete note.");
      console.error("Delete note error:", err);
    } finally {
      setActionInProgressId(null);
    }
  };

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Research notes</CardTitle>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {notes.length} {notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      {/* Add New Note Input */}
      {canEdit && (
        <form
          onSubmit={handleAddNote}
          className="space-y-2.5 rounded-lg border border-border bg-muted/50 p-3.5"
        >
          <label htmlFor="new-note" className="eyebrow block">
            Add a note
          </label>
          <Textarea
            id="new-note"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What did you observe? What should be tested next?"
            rows={3}
            className="text-xs"
          />
          {error && (
            <div role="alert" className="flex items-start gap-2 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="xs"
              disabled={submitting || !newContent.trim()}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              {submitting ? "Adding..." : "Add note"}
            </Button>
          </div>
        </form>
      )}

      {/* Notes Feed */}
      {loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Loading notes...
        </p>
      ) : notes.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 py-8 text-center text-xs text-muted-foreground">
          No notes yet. Details describe the backtest; notes are where the team
          argues about what it means.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const isAuthor = note.created_by === user?.id;
            const canModify = isAuthor || isOwner;
            const isEditing = editingNoteId === note.id;

            return (
              <div
                key={note.id}
                className="space-y-2.5 rounded-lg border border-border bg-muted/40 p-4"
              >
                {/* Note Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-foreground">
                      {note.creator?.display_name || "Analyst"}
                    </span>
                    <Badge variant="outline" className="capitalize">
                      {note.creator?.role || "viewer"}
                    </Badge>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(note.created_at)}
                    </span>

                    {canModify && !isEditing && (
                      <div className="flex items-center space-x-1 pl-2 border-l border-border">
                        <button
                          onClick={() => {
                            setEditingNoteId(note.id);
                            setEditContent(note.content);
                          }}
                          disabled={actionInProgressId === note.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                          title="Edit note"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={actionInProgressId === note.id}
                          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                          title="Delete note"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note Body */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                    <div className="flex justify-end space-x-1.5">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setEditingNoteId(null)}
                      >
                        <X className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        disabled={actionInProgressId === note.id || !editContent.trim()}
                        onClick={() => handleUpdateNote(note.id)}
                      >
                        <Check className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
