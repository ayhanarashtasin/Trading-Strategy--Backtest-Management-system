"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Attachment, EntityType } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  File,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatFileSize, formatDateTime } from "@/lib/utils";

const ALLOWED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".pdf",
  ".csv",
  ".json",
  ".md",
  ".txt",
  ".py",
  ".pine",
];

interface AttachmentsSectionProps {
  entityType: EntityType;
  entityId: string;
}

export function AttachmentsSection({
  entityType,
  entityId,
}: AttachmentsSectionProps) {
  const { user, canEdit, isOwner } = useAuth();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from("attachments")
        .select(`
          *,
          uploader:profiles!attachments_uploaded_by_fkey(display_name, email)
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setAttachments(data || []);
    } catch (err) {
      console.error("Fetch attachments error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [entityType, entityId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      setError(
        `${fileExt} files are not supported. Use one of: ${ALLOWED_EXTENSIONS.join(", ")}`
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("That file is over the 25 MB limit.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const storagePath = `${entityType}/${entityId}/${crypto.randomUUID()}${fileExt}`;

      // Upload to Supabase storage
      const { error: storageError } = await supabase.storage
        .from("attachments")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) throw storageError;

      // Insert record in attachments table
      const { data, error: insertErr } = await supabase
        .from("attachments")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type || "application/octet-stream",
          file_size: file.size,
          uploaded_by: user?.id,
        })
        .select(`
          *,
          uploader:profiles!attachments_uploaded_by_fkey(display_name, email)
        `)
        .single();

      if (insertErr) throw insertErr;

      // Activity log
      await supabase.from("activity_logs").insert({
        action: "attachment_uploaded",
        entity_type: entityType,
        entity_id: entityId,
        description: `Uploaded file "${file.name}" (${formatFileSize(file.size)})`,
        user_id: user?.id,
      });

      setAttachments([data, ...attachments]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    setError(null);
    try {
      const { data, error } = await supabase.storage
        .from("attachments")
        .createSignedUrl(attachment.storage_path, 60);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    } catch (err: any) {
      setError(err.message || "Failed to download attachment.");
    }
  };

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (deletingId) return;
    setDeletingId(attachment.id);
    setError(null);
    try {
      // 1. Delete from storage
      await supabase.storage.from("attachments").remove([attachment.storage_path]);

      // 2. Delete metadata
      const { error: delErr } = await supabase
        .from("attachments")
        .delete()
        .eq("id", attachment.id);

      if (delErr) throw delErr;

      // Activity log
      await supabase.from("activity_logs").insert({
        action: "attachment_deleted",
        entity_type: entityType,
        entity_id: entityId,
        description: `Deleted attachment "${attachment.file_name}"`,
        user_id: user?.id,
      });

      setAttachments(attachments.filter((a) => a.id !== attachment.id));
    } catch (err: any) {
      setError(err.message || "Failed to delete attachment.");
      console.error("Delete attachment error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "png":
      case "jpg":
      case "jpeg":
      case "webp":
        return <FileImage className="h-4 w-4 text-primary" />;
      case "csv":
        return <FileSpreadsheet className="h-4 w-4 text-profit" />;
      case "py":
      case "pine":
      case "json":
        return <FileCode className="h-4 w-4 text-chart-4" />;
      case "pdf":
      case "md":
      case "txt":
        return <FileText className="h-4 w-4 text-sun" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm">Attachments</CardTitle>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {attachments.length} {attachments.length === 1 ? "file" : "files"}
        </span>
      </div>

      {/* Upload Box */}
      {canEdit && (
        <div className="space-y-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(",")}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-muted disabled:opacity-60"
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              {uploading ? "Uploading..." : "Add a file"}
            </span>
            <span className="max-w-md text-[11px] leading-relaxed text-muted-foreground">
              Screenshots, equity curves, Freqtrade reports, CSV exports, Pine
              Script, Python strategies, PDFs. Up to 25&nbsp;MB.
            </span>
          </button>

          {error && (
            <div role="alert" className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Attachments List */}
      {loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">
          Loading files...
        </p>
      ) : attachments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/40 py-8 text-center text-xs text-muted-foreground">
          No files attached yet. Screenshots, equity curves, reports and
          strategy source all belong here.
        </p>
      ) : (
        <div className="divide-y divide-border text-xs">
          {attachments.map((file) => {
            const isUploader = file.uploaded_by === user?.id;
            const canDelete = isUploader || isOwner;

            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-4 rounded-md px-2 py-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1 mr-4">
                  {getFileIcon(file.file_name)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs font-medium text-foreground">
                      {file.file_name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {formatFileSize(file.file_size)} &middot;{" "}
                      {file.uploader?.display_name || "a team member"} &middot;{" "}
                      {formatDateTime(file.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => handleDownload(file)}
                    className="gap-1 text-[11px]"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </Button>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteAttachment(file)}
                      disabled={deletingId === file.id}
                      className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive disabled:opacity-50"
                      title="Delete file"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
