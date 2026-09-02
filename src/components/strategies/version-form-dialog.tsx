"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { StrategyVersion } from "@/types/database";
import { AlertCircle, Code, Layers } from "lucide-react";

interface VersionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: string;
  versionToEdit?: StrategyVersion | null;
  onSuccess: (newVersion?: StrategyVersion) => void;
  currentUserId?: string;
}

export function VersionFormDialog({
  open,
  onOpenChange,
  strategyId,
  versionToEdit,
  onSuccess,
  currentUserId,
}: VersionFormDialogProps) {
  const [versionName, setVersionName] = useState("");
  const [versionNumber, setVersionNumber] = useState(1);
  const [description, setDescription] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [exitRules, setExitRules] = useState("");
  const [riskRules, setRiskRules] = useState("");
  const [paramSummary, setParamSummary] = useState("");
  const [parametersJson, setParametersJson] = useState("{}");
  const [isCurrent, setIsCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (versionToEdit) {
      setVersionName(versionToEdit.version_name);
      setVersionNumber(versionToEdit.version_number);
      setDescription(versionToEdit.description || "");
      setEntryRules(versionToEdit.entry_rules || "");
      setExitRules(versionToEdit.exit_rules || "");
      setRiskRules(versionToEdit.risk_rules || "");
      setParamSummary(versionToEdit.parameter_summary || "");
      setParametersJson(
        versionToEdit.parameters_json
          ? JSON.stringify(versionToEdit.parameters_json, null, 2)
          : "{}"
      );
      setIsCurrent(versionToEdit.is_current);
    } else {
      setVersionName("V1");
      setVersionNumber(1);
      setDescription("");
      setEntryRules("");
      setExitRules("");
      setRiskRules("");
      setParamSummary("");
      setParametersJson("{\n  \"timeframe\": \"15m\"\n}");
      setIsCurrent(true);
    }
    setError(null);
  }, [versionToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionName.trim()) {
      setError("Version Name is required (e.g. V1, V2, V9).");
      return;
    }

    let parsedJson = {};
    if (parametersJson.trim()) {
      try {
        parsedJson = JSON.parse(parametersJson);
      } catch (err: any) {
        setError(`Invalid Parameters JSON: ${err.message}`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // If setting this version as is_current, unset on other versions first
      if (isCurrent) {
        await supabase
          .from("strategy_versions")
          .update({ is_current: false })
          .eq("strategy_id", strategyId);
      }

      if (versionToEdit) {
        const { data, error: updateErr } = await supabase
          .from("strategy_versions")
          .update({
            version_name: versionName.trim(),
            version_number: Number(versionNumber) || 1,
            description: description.trim() || null,
            entry_rules: entryRules.trim() || null,
            exit_rules: exitRules.trim() || null,
            risk_rules: riskRules.trim() || null,
            parameter_summary: paramSummary.trim() || null,
            parameters_json: parsedJson,
            is_current: isCurrent,
            updated_by: currentUserId,
          })
          .eq("id", versionToEdit.id)
          .select()
          .single();

        if (updateErr) throw updateErr;

        // Log activity
        await supabase.from("activity_logs").insert({
          action: "strategy_version_updated",
          entity_type: "strategy_version",
          entity_id: versionToEdit.id,
          description: `Updated version ${versionName}`,
          user_id: currentUserId,
        });

        onSuccess(data as StrategyVersion);
      } else {
        const { data, error: insertErr } = await supabase
          .from("strategy_versions")
          .insert({
            strategy_id: strategyId,
            version_name: versionName.trim(),
            version_number: Number(versionNumber) || 1,
            description: description.trim() || null,
            entry_rules: entryRules.trim() || null,
            exit_rules: exitRules.trim() || null,
            risk_rules: riskRules.trim() || null,
            parameter_summary: paramSummary.trim() || null,
            parameters_json: parsedJson,
            is_current: isCurrent,
            created_by: currentUserId,
            updated_by: currentUserId,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;

        // Log activity
        await supabase.from("activity_logs").insert({
          action: "strategy_version_created",
          entity_type: "strategy_version",
          entity_id: data.id,
          description: `Created new version ${versionName}`,
          user_id: currentUserId,
        });

        onSuccess(data as StrategyVersion);
      }

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to save strategy version.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Layers className="h-5 w-5 text-primary" />
            <DialogTitle>
              {versionToEdit ? `Edit Version: ${versionToEdit.version_name}` : "Add New Strategy Version"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Specify rules, execution criteria, risk constraints, and parameters for this strategy version.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-3 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="eyebrow block">Version Name <span className="text-destructive">*</span></label>
              <Input
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g. V9, V2.1, 15m_Supertrend_ADX"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Version Number</label>
              <Input
                type="number"
                value={versionNumber}
                onChange={(e) => setVersionNumber(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow block">Version Description / Rationale</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Added ADX momentum confirmation and tightened stop loss to 1.5%"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="eyebrow block">Entry Rules</label>
              <Textarea
                value={entryRules}
                onChange={(e) => setEntryRules(e.target.value)}
                placeholder="15m Supertrend green&#10;1h Supertrend bullish&#10;ADX14 > 18"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Exit Rules</label>
              <Textarea
                value={exitRules}
                onChange={(e) => setExitRules(e.target.value)}
                placeholder="15m Supertrend green to red flip&#10;or 2R target"
                rows={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="eyebrow block">Risk Management & Sizing Rules</label>
              <Textarea
                value={riskRules}
                onChange={(e) => setRiskRules(e.target.value)}
                placeholder="1.5% hard stop from entry&#10;Max 2x leverage&#10;No martingale"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">Human-Readable Parameter Summary</label>
              <Textarea
                value={paramSummary}
                onChange={(e) => setParamSummary(e.target.value)}
                placeholder="ST 15m (10, 2.5), ST 1h (10, 3.0), ADX > 18, Stop 1.5%"
                rows={3}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="eyebrow flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                Structured Parameters (JSON)
              </span>
              <span className="text-[10px] text-muted-foreground">Valid JSON object</span>
            </label>
            <Textarea
              value={parametersJson}
              onChange={(e) => setParametersJson(e.target.value)}
              className="font-mono text-xs"
              rows={4}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="is_current"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
            />
            <label htmlFor="is_current" className="cursor-pointer select-none text-xs font-medium text-foreground">
              Set as Current / Active Strategy Version
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving..." : versionToEdit ? "Update Version" : "Create Version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
