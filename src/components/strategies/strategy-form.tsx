"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Strategy, StrategyFamily, StrategyStatus, DefaultDirection, Tag } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { Layers, Plus, X, AlertCircle, ArrowLeft, Check } from "lucide-react";

const PREDEFINED_FAMILIES: StrategyFamily[] = [
  "Supertrend",
  "Momentum",
  "Trend Following",
  "Mean Reversion",
  "Breakout",
  "Scalping",
  "Swing",
  "Moving Average",
  "RSI",
  "MACD",
  "VWAP",
  "Volume",
  "Multi-Timeframe",
  "Custom",
  "Other",
];

const PREDEFINED_STATUSES: StrategyStatus[] = [
  "Idea",
  "Baseline",
  "Experimental",
  "Candidate",
  "Validation",
  "OOS Passed",
  "Paper Trading",
  "Production Candidate",
  "Live",
  "Rejected",
  "Archived",
];

interface StrategyFormProps {
  initialStrategy?: Strategy | null;
  initialTags?: Tag[];
  isEdit?: boolean;
}

export function StrategyForm({
  initialStrategy,
  initialTags = [],
  isEdit = false,
}: StrategyFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState(initialStrategy?.name || "");
  const [family, setFamily] = useState<string>(initialStrategy?.strategy_family || "Supertrend");
  const [customFamily, setCustomFamily] = useState("");
  const [description, setDescription] = useState(initialStrategy?.description || "");
  const [direction, setDirection] = useState<DefaultDirection>(initialStrategy?.default_direction || "Long");
  const [status, setStatus] = useState<StrategyStatus>(initialStrategy?.status || "Idea");

  // Tags state
  const [allAvailableTags, setAllAvailableTags] = useState<Tag[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(
    initialTags.map((t) => t.name)
  );
  const [newTagInput, setNewTagInput] = useState("");

  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTags() {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (data) setAllAvailableTags(data);
    }
    loadTags();
  }, []);

  const handleInputChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !selectedTagNames.includes(trimmed)) {
      setSelectedTagNames([...selectedTagNames, trimmed]);
      setNewTagInput("");
      setIsDirty(true);
    }
  };

  const removeTag = (tagName: string) => {
    setSelectedTagNames(selectedTagNames.filter((t) => t !== tagName));
    setIsDirty(true);
  };

  const handleCancel = () => {
    if (isDirty) {
      setPendingNavigation(initialStrategy ? `/strategies/${initialStrategy.id}` : "/strategies");
      setShowDiscardDialog(true);
    } else {
      router.push(initialStrategy ? `/strategies/${initialStrategy.id}` : "/strategies");
    }
  };

  const handleSave = async (andAddVersion: boolean = false) => {
    if (!name.trim()) {
      setError("Strategy Name is required.");
      return;
    }

    const selectedFamily = family === "Other" && customFamily.trim() ? customFamily.trim() : family;
    if (!selectedFamily) {
      setError("Strategy Family is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let strategyId = initialStrategy?.id;

      if (isEdit && strategyId) {
        const { data, error: updateError } = await supabase
          .from("strategies")
          .update({
            name: name.trim(),
            strategy_family: selectedFamily,
            description: description.trim() || null,
            default_direction: direction,
            status,
            updated_by: user?.id,
          })
          .eq("id", strategyId)
          .select()
          .single();

        if (updateError) throw updateError;

        // Log activity
        await supabase.from("activity_logs").insert({
          action: "strategy_updated",
          entity_type: "strategy",
          entity_id: strategyId,
          description: `Updated strategy "${name}"`,
          user_id: user?.id,
        });
      } else {
        const { data, error: insertError } = await supabase
          .from("strategies")
          .insert({
            name: name.trim(),
            strategy_family: selectedFamily,
            description: description.trim() || null,
            default_direction: direction,
            status,
            created_by: user?.id,
            updated_by: user?.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        strategyId = data.id;

        // Log activity
        await supabase.from("activity_logs").insert({
          action: "strategy_created",
          entity_type: "strategy",
          entity_id: strategyId,
          description: `Created new strategy "${name}"`,
          user_id: user?.id,
        });
      }

      // Handle tags association in batch
      if (strategyId && selectedTagNames.length > 0) {
        if (isEdit) {
          await supabase.from("strategy_tags").delete().eq("strategy_id", strategyId);
        }

        const tagIdsToLink: string[] = [];
        const missingTagNames: string[] = [];

        for (const tagName of selectedTagNames) {
          const existing = allAvailableTags.find((t) => t.name.toLowerCase() === tagName.toLowerCase());
          if (existing) {
            tagIdsToLink.push(existing.id);
          } else {
            missingTagNames.push(tagName);
          }
        }

        if (missingTagNames.length > 0) {
          const { data: createdTags } = await supabase
            .from("tags")
            .insert(missingTagNames.map((name) => ({ name })))
            .select();

          (createdTags || []).forEach((t: { id: string }) => {
            if (t?.id) tagIdsToLink.push(t.id);
          });
        }

        if (tagIdsToLink.length > 0) {
          await supabase.from("strategy_tags").insert(
            tagIdsToLink.map((tagId) => ({
              strategy_id: strategyId!,
              tag_id: tagId,
            }))
          );
        }
      } else if (strategyId && isEdit && selectedTagNames.length === 0) {
        await supabase.from("strategy_tags").delete().eq("strategy_id", strategyId);
      }

      setIsDirty(false);

      if (andAddVersion && strategyId) {
        router.push(`/strategies/${strategyId}?openNewVersion=true`);
      } else if (strategyId) {
        router.push(`/strategies/${strategyId}`);
      } else {
        router.push("/strategies");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save strategy.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link href="/strategies" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Strategies
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {isEdit ? `Edit "${initialStrategy?.name}"` : "New strategy"}
          </span>
        </div>

        <Card>
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-start gap-2.5">
              <span className="rounded-md bg-primary/[0.08] p-2 text-primary">
                <Layers className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-base">
                  {isEdit ? "Edit strategy" : "New strategy"}
                </CardTitle>
                <CardDescription>
                  A strategy holds the trading idea. Rule versions and backtests
                  attach to it.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 pt-5">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-3 text-xs leading-relaxed text-destructive">
                <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Strategy Name */}
            <div className="space-y-1.5">
              <label className="eyebrow block">
                  Strategy name{" "}
                  <span className="text-destructive">*</span>
                </label>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  handleInputChange();
                }}
                placeholder="e.g. Supertrend MTF ADX, Momentum Breakout Volatility"
                required
              />
            </div>

            {/* Strategy Family & Custom Family */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Strategy family{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={family}
                  onChange={(e) => {
                    setFamily(e.target.value);
                    handleInputChange();
                  }}
                >
                  {PREDEFINED_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>

              {family === "Other" || family === "Custom" ? (
                <div className="space-y-1.5">
                  <label className="eyebrow block">
                  Custom Family Name
                </label>
                  <Input
                    value={customFamily}
                    onChange={(e) => {
                      setCustomFamily(e.target.value);
                      handleInputChange();
                    }}
                    placeholder="e.g. Order Flow Delta"
                  />
                </div>
              ) : null}

              {/* Default Direction */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Default direction{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={direction}
                  onChange={(e) => {
                    setDirection(e.target.value as DefaultDirection);
                    handleInputChange();
                  }}
                >
                  <option value="Long">Long</option>
                  <option value="Short">Short</option>
                  <option value="Both">Both (Long & Short)</option>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="eyebrow block">
                  Research status{" "}
                  <span className="text-destructive">*</span>
                </label>
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StrategyStatus);
                  handleInputChange();
                }}
              >
                {PREDEFINED_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="eyebrow block">
                  Description & Thesis
                </label>
              <Textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  handleInputChange();
                }}
                placeholder="Describe the underlying market anomaly, rationale, and indicators (e.g. 15m trend-following strategy using 1h Supertrend confirmation and ADX momentum filtering)..."
                rows={4}
              />
            </div>

            {/* Tags Management */}
            <div className="space-y-2">
              <label className="eyebrow block">
                  Strategy Tags
                </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTagNames.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 text-xs py-1 px-2.5 bg-muted hover:bg-secondary"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-muted-foreground hover:text-foreground ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(newTagInput);
                    }
                  }}
                  placeholder="Type a tag and press Add (e.g. BTC, 15m, Robust)"
                  className="max-w-xs text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addTag(newTagInput)}
                  disabled={!newTagInput.trim()}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Tag
                </Button>
              </div>

              {/* Quick suggestions from existing tags */}
              {allAvailableTags.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] text-muted-foreground mr-2">Suggested:</span>
                  <div className="inline-flex flex-wrap gap-1">
                    {allAvailableTags
                      .filter((t) => !selectedTagNames.includes(t.name))
                      .slice(0, 8)
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => addTag(t.name)}
                          className="rounded border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        >
                          + {t.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-4 bg-muted">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <div className="flex items-center space-x-2">
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => handleSave(true)}
                  className="text-xs"
                >
                  Save and Add Version
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={loading}
                onClick={() => handleSave(false)}
                className="gap-1.5 text-xs font-semibold shadow-plate"
              >
                <Check className="h-3.5 w-3.5" />
                {loading ? "Saving..." : isEdit ? "Save changes" : "Save strategy"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <UnsavedChangesDialog
        open={showDiscardDialog}
        onStay={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          setShowDiscardDialog(false);
          if (pendingNavigation) router.push(pendingNavigation);
        }}
      />
    </>
  );
}
