"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";
import { Backtest, BacktestSource, TestType, DefaultDirection, StrategyVersion } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UnsavedChangesDialog } from "@/components/shared/unsaved-changes-dialog";
import { DuplicateWarningDialog } from "@/components/backtests/duplicate-warning-dialog";
import {
  FlaskConical,
  Layers,
  TrendingUp,
  ShieldCheck,
  FileText,
  AlertCircle,
  ArrowLeft,
  Check,
  Sliders,
  DollarSign,
  Calendar,
  Activity,
  CheckCircle2,
} from "lucide-react";

const BACKTEST_SOURCES: BacktestSource[] = [
  "AggTrades",
  "TradingView",
  "Freqtrade",
  "Python",
  "Codex",
  "Manual",
  "Other",
];

const TEST_TYPES: TestType[] = [
  "Development",
  "Optimization",
  "Prior Period",
  "Out of Sample",
  "Walk Forward",
  "Robustness",
  "Monte Carlo",
  "Paper Trading",
  "Live",
  "Other",
];

interface BacktestFormProps {
  initialBacktest?: Backtest | null;
  preselectedVersionId?: string;
  preselectedStrategyId?: string;
  isEdit?: boolean;
}

export function BacktestForm({
  initialBacktest,
  preselectedVersionId,
  preselectedStrategyId,
  isEdit = false,
}: BacktestFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  // Strategy & Version Selectors
  const [strategies, setStrategies] = useState<Array<{ id: string; name: string; strategy_family: string }>>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(preselectedStrategyId || "");
  const [strategyVersions, setStrategyVersions] = useState<StrategyVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    initialBacktest?.strategy_version_id || preselectedVersionId || ""
  );

  // Form Fields - General Identification
  const [backtestName, setBacktestName] = useState(initialBacktest?.backtest_name || "");
  const [source, setSource] = useState<BacktestSource>(initialBacktest?.source || "Freqtrade");
  const [testType, setTestType] = useState<TestType>(initialBacktest?.test_type || "Development");
  const [engineVersion, setEngineVersion] = useState(initialBacktest?.engine_version || "");
  const [status, setStatus] = useState(initialBacktest?.status || "Candidate");

  // Form Fields - Market Information
  const [exchange, setExchange] = useState(initialBacktest?.exchange || "Binance");
  const [marketType, setMarketType] = useState(initialBacktest?.market_type || "USD-M Futures");
  const [symbol, setSymbol] = useState(initialBacktest?.symbol || "BTCUSDT");
  const [baseAsset, setBaseAsset] = useState(initialBacktest?.base_asset || "BTC");
  const [quoteAsset, setQuoteAsset] = useState(initialBacktest?.quote_asset || "USDT");
  const [direction, setDirection] = useState<DefaultDirection | "">(initialBacktest?.direction || "Long");
  const [timeframe, setTimeframe] = useState(initialBacktest?.timeframe || "15m");
  const [higherTimeframe, setHigherTimeframe] = useState(initialBacktest?.higher_timeframe || "1h");
  const [intrabarTimeframe, setIntrabarTimeframe] = useState(initialBacktest?.intrabar_timeframe || "1m");
  const [dataSource, setDataSource] = useState(initialBacktest?.data_source || "Exchange API 1m Klines");
  const [startDate, setStartDate] = useState(initialBacktest?.start_date || "2022-01-01");
  const [endDate, setEndDate] = useState(initialBacktest?.end_date || "2026-08-31");

  // Form Fields - Execution assumptions
  const [feePerSide, setFeePerSide] = useState<string>(initialBacktest?.fee_per_side_percent?.toString() || "0.05");
  const [slippagePerSide, setSlippagePerSide] = useState<string>(initialBacktest?.slippage_per_side_percent?.toString() || "0.02");
  const [startingCapital, setStartingCapital] = useState<string>(initialBacktest?.starting_capital?.toString() || "10000");
  const [leverage, setLeverage] = useState<string>(initialBacktest?.leverage?.toString() || "1");
  const [positionSize, setPositionSize] = useState<string>(initialBacktest?.position_size_percent?.toString() || "100");
  const [compounding, setCompounding] = useState<boolean>(initialBacktest?.compounding ?? true);
  const [stopLossDesc, setStopLossDesc] = useState(initialBacktest?.stop_loss_description || "");
  const [takeProfitDesc, setTakeProfitDesc] = useState(initialBacktest?.take_profit_description || "");
  const [trailingStopDesc, setTrailingStopDesc] = useState(initialBacktest?.trailing_stop_description || "");
  const [fundingIncluded, setFundingIncluded] = useState<boolean>(initialBacktest?.funding_included ?? false);

  // Form Fields - Standard Performance Metrics (stored numerically)
  const [totalTrades, setTotalTrades] = useState<string>(initialBacktest?.total_trades?.toString() || "");
  const [profitFactor, setProfitFactor] = useState<string>(initialBacktest?.profit_factor?.toString() || "");
  const [netProfitPercent, setNetProfitPercent] = useState<string>(initialBacktest?.net_profit_percent?.toString() || "");
  const [netProfitAmount, setNetProfitAmount] = useState<string>(initialBacktest?.net_profit_amount?.toString() || "");
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState<string>(initialBacktest?.max_drawdown_percent?.toString() || "");
  const [winRatePercent, setWinRatePercent] = useState<string>(initialBacktest?.win_rate_percent?.toString() || "");
  const [averageTradePercent, setAverageTradePercent] = useState<string>(initialBacktest?.average_trade_percent?.toString() || "");
  const [medianTradePercent, setMedianTradePercent] = useState<string>(initialBacktest?.median_trade_percent?.toString() || "");
  const [cagrPercent, setCagrPercent] = useState<string>(initialBacktest?.cagr_percent?.toString() || "");
  const [payoffRatio, setPayoffRatio] = useState<string>(initialBacktest?.payoff_ratio?.toString() || "");
  const [expectancyPercent, setExpectancyPercent] = useState<string>(initialBacktest?.expectancy_percent?.toString() || "");
  const [averageWinPercent, setAverageWinPercent] = useState<string>(initialBacktest?.average_win_percent?.toString() || "");
  const [averageLossPercent, setAverageLossPercent] = useState<string>(initialBacktest?.average_loss_percent?.toString() || "");
  const [largestWinPercent, setLargestWinPercent] = useState<string>(initialBacktest?.largest_win_percent?.toString() || "");
  const [largestLossPercent, setLargestLossPercent] = useState<string>(initialBacktest?.largest_loss_percent?.toString() || "");
  const [sharpeRatio, setSharpeRatio] = useState<string>(initialBacktest?.sharpe_ratio?.toString() || "");
  const [sortinoRatio, setSortinoRatio] = useState<string>(initialBacktest?.sortino_ratio?.toString() || "");
  const [calmarRatio, setCalmarRatio] = useState<string>(initialBacktest?.calmar_ratio?.toString() || "");
  const [recoveryFactor, setRecoveryFactor] = useState<string>(initialBacktest?.recovery_factor?.toString() || "");
  const [exposurePercent, setExposurePercent] = useState<string>(initialBacktest?.exposure_percent?.toString() || "");
  const [avgTradeDuration, setAvgTradeDuration] = useState<string>(initialBacktest?.average_trade_duration || "");
  const [longTrades, setLongTrades] = useState<string>(initialBacktest?.long_trades?.toString() || "");
  const [shortTrades, setShortTrades] = useState<string>(initialBacktest?.short_trades?.toString() || "");
  const [winningTrades, setWinningTrades] = useState<string>(initialBacktest?.winning_trades?.toString() || "");
  const [losingTrades, setLosingTrades] = useState<string>(initialBacktest?.losing_trades?.toString() || "");

  // Form Fields - Backtest Integrity
  const [feesIncluded, setFeesIncluded] = useState<boolean>(initialBacktest?.fees_included ?? true);
  const [slippageIncluded, setSlippageIncluded] = useState<boolean>(initialBacktest?.slippage_included ?? true);
  const [intrabarSimulation, setIntrabarSimulation] = useState<boolean>(initialBacktest?.intrabar_simulation ?? true);
  const [lookaheadChecked, setLookaheadChecked] = useState<boolean>(initialBacktest?.lookahead_checked ?? true);
  const [lookaheadBiasDetected, setLookaheadBiasDetected] = useState<boolean>(initialBacktest?.lookahead_bias_detected ?? false);
  const [dataGapsChecked, setDataGapsChecked] = useState<boolean>(initialBacktest?.data_gaps_checked ?? true);
  const [warmupChecked, setWarmupChecked] = useState<boolean>(initialBacktest?.warmup_checked ?? true);
  const [liquidationModeled, setLiquidationModeled] = useState<boolean>(initialBacktest?.liquidation_modeled ?? true);
  const [sameBarExecutionChecked, setSameBarExecutionChecked] = useState<boolean>(initialBacktest?.same_bar_execution_checked ?? true);
  const [oosTested, setOosTested] = useState<boolean>(initialBacktest?.oos_tested ?? false);
  const [walkForwardTested, setWalkForwardTested] = useState<boolean>(initialBacktest?.walk_forward_tested ?? false);

  // Technical Details & Initial Note
  const [details, setDetails] = useState<string>(initialBacktest?.details || "");
  const [initialNote, setInitialNote] = useState<string>("");

  // Safety & State Controls
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Duplicate Warning Modal
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [existingDuplicate, setExistingDuplicate] = useState<Partial<Backtest> | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Strategies & Versions
  useEffect(() => {
    async function loadMetadata() {
      // The preselected version is known from the URL, so its lookup does not
      // need to wait on the strategy list — both go out at once.
      const [{ data: strats }, verResult] = await Promise.all([
        supabase
          .from("strategies")
          .select("id, name, strategy_family")
          .is("archived_at", null)
          .order("name"),
        preselectedVersionId
          ? supabase
              .from("strategy_versions")
              .select("id, strategy_id")
              .eq("id", preselectedVersionId)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      setStrategies(strats || []);

      const ver = verResult.data;
      if (ver) {
        setSelectedStrategyId(ver.strategy_id);
        setSelectedVersionId(ver.id);
      } else if (!preselectedVersionId && strats && strats.length > 0 && !selectedStrategyId) {
        setSelectedStrategyId(strats[0].id);
      }
    }
    loadMetadata();
  }, [preselectedVersionId]);

  // Load Versions when Selected Strategy Changes
  useEffect(() => {
    async function loadVersions() {
      if (!selectedStrategyId) {
        setStrategyVersions([]);
        return;
      }
      const { data: vers } = await supabase
        .from("strategy_versions")
        .select("*")
        .eq("strategy_id", selectedStrategyId)
        .order("version_number", { ascending: false });

      setStrategyVersions(vers || []);
      if (vers && vers.length > 0 && (!selectedVersionId || !vers.some((v) => v.id === selectedVersionId))) {
        const current = vers.find((v) => v.is_current) || vers[0];
        setSelectedVersionId(current.id);
      }
    }
    loadVersions();
  }, [selectedStrategyId]);

  const handleInputChange = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Helper to parse numbers safely without converting empty to 0
  const parseNullableNumber = (val: string): number | null => {
    const trimmed = val.trim();
    if (trimmed === "" || isNaN(Number(trimmed))) return null;
    return Number(trimmed);
  };

  const parseNullableInt = (val: string): number | null => {
    const trimmed = val.trim();
    if (trimmed === "" || isNaN(parseInt(trimmed, 10))) return null;
    return parseInt(trimmed, 10);
  };

  // Validate form inputs (Section 68)
  const validateInputs = (): string | null => {
    if (!selectedVersionId) return "Please select a Strategy Version.";
    if (!backtestName.trim()) return "Backtest Name is required.";
    if (!symbol.trim()) return "Market Symbol is required (e.g. BTCUSDT).";
    if (!timeframe.trim()) return "Timeframe is required (e.g. 15m).";
    if (!startDate) return "Start Date is required.";
    if (!endDate) return "End Date is required.";

    if (new Date(startDate) > new Date(endDate)) {
      return "Start Date must not occur after End Date.";
    }

    const pf = parseNullableNumber(profitFactor);
    if (pf !== null && pf < 0) return "Profit Factor cannot be negative.";

    const wr = parseNullableNumber(winRatePercent);
    if (wr !== null && (wr < 0 || wr > 100)) return "Win Rate % must be between 0 and 100.";

    const dd = parseNullableNumber(maxDrawdownPercent);
    if (dd !== null && (dd < 0 || dd > 100)) return "Max Drawdown % must be between 0 and 100.";

    const trades = parseNullableInt(totalTrades);
    if (trades !== null && trades < 0) return "Total Trades must be greater than or equal to 0.";

    const fee = parseNullableNumber(feePerSide);
    if (fee !== null && fee < 0) return "Fee per side cannot be negative.";

    const lev = parseNullableNumber(leverage);
    if (lev !== null && lev <= 0) return "Leverage must be greater than 0.";

    // Must provide at least one result metric (Section 33)
    const hasAtLeastOneMetric = [
      totalTrades,
      profitFactor,
      netProfitPercent,
      maxDrawdownPercent,
      winRatePercent,
    ].some((m) => m.trim() !== "");

    if (!hasAtLeastOneMetric) {
      return "Please enter at least one performance metric (e.g. Profit Factor, Total Trades, or Net Profit %).";
    }

    return null;
  };

  const checkDuplicate = async () => {
    try {
      const { data } = await supabase
        .from("backtests")
        .select("id, backtest_name, symbol, timeframe, source, test_type, start_date, end_date, profit_factor")
        .eq("strategy_version_id", selectedVersionId)
        .eq("source", source)
        .eq("symbol", symbol.trim().toUpperCase())
        .eq("timeframe", timeframe.trim())
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .eq("test_type", testType)
        .is("archived_at", null)
        .limit(1);

      if (data && data.length > 0 && (!initialBacktest || data[0].id !== initialBacktest.id)) {
        setExistingDuplicate(data[0]);
        setDuplicateModalOpen(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Duplicate check error:", err);
      return false;
    }
  };

  const handlePreSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationError = validateInputs();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Duplicate check on create
      if (!isEdit) {
        const hasDup = await checkDuplicate();
        if (hasDup) {
          setLoading(false);
          return;
        }
      }

      await executeSave();
    } catch (err: any) {
      setError(err.message || "Failed to save backtest.");
      setLoading(false);
    }
  };

  const executeSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload: Partial<Backtest> = {
        strategy_version_id: selectedVersionId,
        backtest_name: backtestName.trim(),
        source,
        test_type: testType,
        engine_version: engineVersion.trim() || null,
        status,

        // Market
        exchange: exchange.trim() || null,
        market_type: marketType.trim() || null,
        symbol: symbol.trim().toUpperCase(),
        base_asset: baseAsset.trim().toUpperCase() || null,
        quote_asset: quoteAsset.trim().toUpperCase() || null,
        direction: (direction as DefaultDirection) || null,
        timeframe: timeframe.trim(),
        higher_timeframe: higherTimeframe.trim() || null,
        intrabar_timeframe: intrabarTimeframe.trim() || null,
        data_source: dataSource.trim() || null,
        start_date: startDate,
        end_date: endDate,

        // Execution
        fee_per_side_percent: parseNullableNumber(feePerSide),
        slippage_per_side_percent: parseNullableNumber(slippagePerSide),
        starting_capital: parseNullableNumber(startingCapital),
        leverage: parseNullableNumber(leverage),
        position_size_percent: parseNullableNumber(positionSize),
        compounding,
        stop_loss_description: stopLossDesc.trim() || null,
        take_profit_description: takeProfitDesc.trim() || null,
        trailing_stop_description: trailingStopDesc.trim() || null,
        funding_included: fundingIncluded,

        // Standard Performance Metrics
        total_trades: parseNullableInt(totalTrades),
        profit_factor: parseNullableNumber(profitFactor),
        net_profit_percent: parseNullableNumber(netProfitPercent),
        net_profit_amount: parseNullableNumber(netProfitAmount),
        max_drawdown_percent: parseNullableNumber(maxDrawdownPercent),
        win_rate_percent: parseNullableNumber(winRatePercent),
        average_trade_percent: parseNullableNumber(averageTradePercent),
        median_trade_percent: parseNullableNumber(medianTradePercent),
        cagr_percent: parseNullableNumber(cagrPercent),
        payoff_ratio: parseNullableNumber(payoffRatio),
        expectancy_percent: parseNullableNumber(expectancyPercent),
        average_win_percent: parseNullableNumber(averageWinPercent),
        average_loss_percent: parseNullableNumber(averageLossPercent),
        largest_win_percent: parseNullableNumber(largestWinPercent),
        largest_loss_percent: parseNullableNumber(largestLossPercent),
        sharpe_ratio: parseNullableNumber(sharpeRatio),
        sortino_ratio: parseNullableNumber(sortinoRatio),
        calmar_ratio: parseNullableNumber(calmarRatio),
        recovery_factor: parseNullableNumber(recoveryFactor),
        exposure_percent: parseNullableNumber(exposurePercent),
        average_trade_duration: avgTradeDuration.trim() || null,
        long_trades: parseNullableInt(longTrades),
        short_trades: parseNullableInt(shortTrades),
        winning_trades: parseNullableInt(winningTrades),
        losing_trades: parseNullableInt(losingTrades),

        // Integrity
        fees_included: feesIncluded,
        slippage_included: slippageIncluded,
        intrabar_simulation: intrabarSimulation,
        lookahead_checked: lookaheadChecked,
        lookahead_bias_detected: lookaheadBiasDetected,
        data_gaps_checked: dataGapsChecked,
        warmup_checked: warmupChecked,
        liquidation_modeled: liquidationModeled,
        same_bar_execution_checked: sameBarExecutionChecked,
        oos_tested: oosTested,
        walk_forward_tested: walkForwardTested,

        // Details
        details: details.trim() || null,
      };

      let savedId = initialBacktest?.id;

      if (isEdit && savedId) {
        const { error: updateErr } = await supabase
          .from("backtests")
          .update({
            ...payload,
            updated_by: user?.id,
          })
          .eq("id", savedId);

        if (updateErr) throw updateErr;

        // Activity log
        await supabase.from("activity_logs").insert({
          action: "backtest_updated",
          entity_type: "backtest",
          entity_id: savedId,
          description: `Updated backtest "${backtestName}" (${symbol} ${timeframe})`,
          user_id: user?.id,
        });
      } else {
        const { data: newBt, error: insertErr } = await supabase
          .from("backtests")
          .insert({
            ...payload,
            created_by: user?.id,
            updated_by: user?.id,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        savedId = newBt.id;

        // Activity log
        await supabase.from("activity_logs").insert({
          action: "backtest_created",
          entity_type: "backtest",
          entity_id: savedId,
          description: `Added backtest "${backtestName}" (${symbol} ${timeframe}, PF: ${profitFactor || "N/A"})`,
          user_id: user?.id,
        });

        // Insert initial research note if provided
        if (initialNote.trim() && savedId) {
          await supabase.from("research_notes").insert({
            entity_type: "backtest",
            entity_id: savedId,
            content: initialNote.trim(),
            created_by: user?.id,
          });
        }
      }

      setIsDirty(false);
      setDuplicateModalOpen(false);

      if (savedId) {
        router.push(`/backtests/${savedId}`);
      } else {
        router.push("/backtests");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save backtest.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      setPendingNavigation(initialBacktest ? `/backtests/${initialBacktest.id}` : "/backtests");
      setShowDiscardDialog(true);
    } else {
      router.push(initialBacktest ? `/backtests/${initialBacktest.id}` : "/backtests");
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Header */}
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <Link href="/backtests" className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" />
            Backtests
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {isEdit ? `Edit "${initialBacktest?.backtest_name}"` : "Add a backtest"}
          </span>
        </div>

        <form onSubmit={handlePreSave} className="space-y-6">
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/[0.07] p-3 text-xs leading-relaxed text-destructive">
              <AlertCircle className="mt-px h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: GENERAL & STRATEGY SELECTION */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FlaskConical className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Strategy and version</CardTitle>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Select Strategy */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Trading Strategy{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedStrategyId}
                  onChange={(e) => {
                    setSelectedStrategyId(e.target.value);
                    handleInputChange();
                  }}
                  disabled={isEdit}
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.strategy_family})
                    </option>
                  ))}
                </Select>
              </div>

              {/* Select Version */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Strategy Version{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={selectedVersionId}
                  onChange={(e) => {
                    setSelectedVersionId(e.target.value);
                    handleInputChange();
                  }}
                  disabled={isEdit}
                >
                  {strategyVersions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.version_name} {v.is_current ? "(Current)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Backtest Name */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="eyebrow block">
                  Backtest Name{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={backtestName}
                  onChange={(e) => {
                    setBacktestName(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="e.g. Freqtrade 15m Development Test, TV 1h Donchian"
                  required
                />
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Source Platform{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value as BacktestSource);
                    handleInputChange();
                  }}
                >
                  {BACKTEST_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Test Type */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Test Type{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select
                  value={testType}
                  onChange={(e) => {
                    setTestType(e.target.value as TestType);
                    handleInputChange();
                  }}
                >
                  {TEST_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Engine Version */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Engine / Script Version
                </label>
                <Input
                  value={engineVersion}
                  onChange={(e) => {
                    setEngineVersion(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="e.g. Freqtrade 2024.5, Pine Script v5"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Experiment Status
                </label>
                <Input
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="Candidate, Validated, Archived..."
                />
              </div>
            </div>
          </Card>

          {/* SECTION 2: MARKET INFORMATION */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Market and timeframe</CardTitle>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Symbol{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={symbol}
                  onChange={(e) => {
                    setSymbol(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="BTCUSDT"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Timeframe{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  value={timeframe}
                  onChange={(e) => {
                    setTimeframe(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="15m, 1h, 5m..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Higher TF
                </label>
                <Input
                  value={higherTimeframe}
                  onChange={(e) => {
                    setHigherTimeframe(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1h, 4h, 1D..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Intrabar TF
                </label>
                <Input
                  value={intrabarTimeframe}
                  onChange={(e) => {
                    setIntrabarTimeframe(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1m, tick..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Exchange
                </label>
                <Input
                  value={exchange}
                  onChange={(e) => {
                    setExchange(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="Binance, Bybit..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Market Type
                </label>
                <Input
                  value={marketType}
                  onChange={(e) => {
                    setMarketType(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="USD-M Futures, Spot..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Start Date{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    handleInputChange();
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  End Date{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    handleInputChange();
                  }}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Duration (Days)
                </label>
                <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-xs text-muted-foreground">
                  {startDate && endDate ? (
                    (() => {
                      const days = Math.round(
                        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      );
                      if (isNaN(days) || days < 0) return "Invalid range";
                      const years = (days / 365.25).toFixed(1);
                      return `${days} d (~${years}y)`;
                    })()
                  ) : (
                    "Auto-calculated"
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* SECTION 3: EXECUTION ASSUMPTIONS */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-sun" />
              <CardTitle className="text-sm">Execution assumptions</CardTitle>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Fee Per Side (%)
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={feePerSide}
                  onChange={(e) => {
                    setFeePerSide(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="0.05"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Slippage (%)
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={slippagePerSide}
                  onChange={(e) => {
                    setSlippagePerSide(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="0.02"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Starting Capital ($)
                </label>
                <Input
                  type="number"
                  value={startingCapital}
                  onChange={(e) => {
                    setStartingCapital(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Leverage
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={leverage}
                  onChange={(e) => {
                    setLeverage(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1.0"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Stop Loss Logic
                </label>
                <Input
                  value={stopLossDesc}
                  onChange={(e) => {
                    setStopLossDesc(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1.5% hard stop"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Take Profit Logic
                </label>
                <Input
                  value={takeProfitDesc}
                  onChange={(e) => {
                    setTakeProfitDesc(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="2R or indicator flip"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Trailing Stop Logic
                </label>
                <Input
                  value={trailingStopDesc}
                  onChange={(e) => {
                    setTrailingStopDesc(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="ATR trail after 1R"
                />
              </div>
            </div>
          </Card>

          {/* SECTION 4: STANDARD PERFORMANCE METRICS */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                <CardTitle className="text-sm">Performance results</CardTitle>
              </div>
              <span className="text-[11px] text-muted-foreground">Leave a field empty when the platform did not report it</span>
            </div>

            {/* Core Required Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 font-mono">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Total Trades
                </label>
                <Input
                  type="number"
                  value={totalTrades}
                  onChange={(e) => {
                    setTotalTrades(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1043"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Profit Factor
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={profitFactor}
                  onChange={(e) => {
                    setProfitFactor(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1.24"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Net Profit %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={netProfitPercent}
                  onChange={(e) => {
                    setNetProfitPercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="142.50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Max Drawdown %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={maxDrawdownPercent}
                  onChange={(e) => {
                    setMaxDrawdownPercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="21.30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Win Rate %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={winRatePercent}
                  onChange={(e) => {
                    setWinRatePercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="37.20"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Avg Trade %
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={averageTradePercent}
                  onChange={(e) => {
                    setAverageTradePercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="0.082"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Median Trade %
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={medianTradePercent}
                  onChange={(e) => {
                    setMedianTradePercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="0.065"
                />
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2 font-mono">
              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Net Profit ($)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={netProfitAmount}
                  onChange={(e) => {
                    setNetProfitAmount(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="14250.00"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  CAGR %
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={cagrPercent}
                  onChange={(e) => {
                    setCagrPercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="21.4"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Payoff Ratio
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={payoffRatio}
                  onChange={(e) => {
                    setPayoffRatio(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="2.18"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Sharpe Ratio
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={sharpeRatio}
                  onChange={(e) => {
                    setSharpeRatio(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="1.45"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Sortino Ratio
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={sortinoRatio}
                  onChange={(e) => {
                    setSortinoRatio(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="2.10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="eyebrow block">
                  Exposure %
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={exposurePercent}
                  onChange={(e) => {
                    setExposurePercent(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="34.5"
                />
              </div>
            </div>
          </Card>

          {/* SECTION 5: INTEGRITY & AUDIT CHECKS */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Integrity checks</CardTitle>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={feesIncluded}
                  onChange={(e) => {
                    setFeesIncluded(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Fees Included</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={slippageIncluded}
                  onChange={(e) => {
                    setSlippageIncluded(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Slippage Included</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={intrabarSimulation}
                  onChange={(e) => {
                    setIntrabarSimulation(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Intrabar Simulation</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={lookaheadChecked}
                  onChange={(e) => {
                    setLookaheadChecked(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Lookahead Checked</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={dataGapsChecked}
                  onChange={(e) => {
                    setDataGapsChecked(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Data Gaps Checked</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={liquidationModeled}
                  onChange={(e) => {
                    setLiquidationModeled(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Liquidation Modeled</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={oosTested}
                  onChange={(e) => {
                    setOosTested(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">OOS Tested</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/50 p-2.5 transition-colors hover:border-input hover:bg-muted">
                <input
                  type="checkbox"
                  checked={walkForwardTested}
                  onChange={(e) => {
                    setWalkForwardTested(e.target.checked);
                    handleInputChange();
                  }}
                  className="h-3.5 w-3.5 shrink-0 rounded border-input accent-primary"
                />
                <span className="text-xs text-foreground">Walk Forward Tested</span>
              </label>
            </div>
          </Card>

          {/* SECTION 6: TECHNICAL DETAILS & NOTES */}
          <Card className="space-y-5 p-5">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <FileText className="h-4 w-4 text-chart-4" />
              <CardTitle className="text-sm">Technical Specification Details & Notes</CardTitle>
            </div>

            <div className="space-y-1.5">
              <label className="eyebrow block">
                  Technical Details Field
                </label>
              <Textarea
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  handleInputChange();
                }}
                placeholder="Store important technical configuration, exact indicator lengths, intrabar candle settings, execution anomalies..."
                rows={4}
                className="font-mono text-xs"
              />
            </div>

            {!isEdit && (
              <div className="space-y-1.5 pt-2">
                <label className="eyebrow block">
                  Initial Research Observation (Optional)
                </label>
                <Textarea
                  value={initialNote}
                  onChange={(e) => {
                    setInitialNote(e.target.value);
                    handleInputChange();
                  }}
                  placeholder="Record initial hypothesis or team notes to post alongside this backtest..."
                  rows={2}
                  className="text-xs"
                />
              </div>
            )}
          </Card>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={loading}
              
            >
              <Check className="h-4 w-4" />
              {loading ? "Saving..." : isEdit ? "Save changes" : "Save backtest"}
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved changes prompt */}
      <UnsavedChangesDialog
        open={showDiscardDialog}
        onStay={() => setShowDiscardDialog(false)}
        onDiscard={() => {
          setShowDiscardDialog(false);
          if (pendingNavigation) router.push(pendingNavigation);
        }}
      />

      {/* Duplicate warning modal */}
      <DuplicateWarningDialog
        open={duplicateModalOpen}
        duplicateData={existingDuplicate}
        onSaveAnyway={() => executeSave()}
        onCancel={() => {
          setDuplicateModalOpen(false);
          setLoading(false);
        }}
      />
    </>
  );
}
