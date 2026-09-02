"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Plus, Layers, FlaskConical, Menu, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { Strategy, Backtest } from "@/types/database";

interface SearchResultsState {
  strategies: Array<Pick<Strategy, "id" | "name" | "strategy_family" | "status" | "default_direction">>;
  backtests: Array<Pick<Backtest, "id" | "backtest_name" | "symbol" | "timeframe" | "source" | "profit_factor" | "net_profit_percent">>;
}

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const { canEdit } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultsState>({
    strategies: [],
    backtests: [],
  });
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();
  const searchSeq = useRef(0);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults({ strategies: [], backtests: [] });
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const t = setTimeout(() => setDebouncedQuery(trimmed), 220);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults({ strategies: [], backtests: [] });
      setIsSearching(false);
      return;
    }

    const seq = ++searchSeq.current;
    let cancelled = false;

    (async () => {
      try {
        // `or()` takes a comma-separated filter grammar, so any comma,
        // parenthesis or ilike wildcard the user types has to be neutralised
        // before it reaches the query — otherwise the filter is malformed.
        const safe = debouncedQuery.replace(/[,()\\%_]/g, " ").trim();
        if (!safe) {
          if (!cancelled && seq === searchSeq.current) {
            setSearchResults({ strategies: [], backtests: [] });
            setIsSearching(false);
          }
          return;
        }

        const [{ data: stratData }, { data: btData }] = await Promise.all([
          supabase
            .from("strategies")
            .select("id, name, strategy_family, status, default_direction")
            .or(
              `name.ilike.%${safe}%,description.ilike.%${safe}%,strategy_family.ilike.%${safe}%`
            )
            .limit(5),
          supabase
            .from("backtests")
            .select(
              "id, backtest_name, symbol, timeframe, source, profit_factor, net_profit_percent"
            )
            .or(
              `backtest_name.ilike.%${safe}%,symbol.ilike.%${safe}%,details.ilike.%${safe}%`
            )
            .limit(5),
        ]);

        if (cancelled || seq !== searchSeq.current) return;
        setSearchResults({
          strategies: stratData || [],
          backtests: btData || [],
        });
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        if (!cancelled && seq === searchSeq.current) setIsSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const navigateTo = (url: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    router.push(url);
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMobileMenuToggle}
            aria-label="Open navigation"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 w-full max-w-xs items-center justify-between gap-3 rounded-md border border-input bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-card sm:w-72"
          >
            <span className="flex items-center gap-2 truncate">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search the record</span>
            </span>
            <kbd className="pointer-events-none hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-block">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canEdit && (
            <>
              <Link href="/strategies/new">
                <Button size="xs" variant="outline">
                  <Layers className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">New strategy</span>
                </Button>
              </Link>
              <Link href="/backtests/new">
                <Button size="xs" variant="default">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add backtest</span>
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Global search */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          className="max-w-2xl overflow-hidden p-0"
          onClose={() => setSearchOpen(false)}
        >
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3 pr-12">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Strategy, version, backtest, symbol — try BTCUSDT or Supertrend"
              className="h-auto border-0 bg-transparent p-0 text-sm shadow-none hover:border-0 focus-visible:border-0 focus-visible:ring-0"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch("")}
                aria-label="Clear search"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-96 space-y-5 overflow-y-auto p-4">
            {isSearching && (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Searching the record…
              </div>
            )}

            {!isSearching &&
              searchQuery.length >= 2 &&
              searchResults.strategies.length === 0 &&
              searchResults.backtests.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nothing in the record matches &quot;{searchQuery}&quot;.
                </div>
              )}

            {searchResults.strategies.length > 0 && (
              <div>
                <p className="eyebrow-ruled mb-2 px-1">Strategies</p>
                <div className="space-y-0.5">
                  {searchResults.strategies.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => navigateTo(`/strategies/${s.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-md p-2.5 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Layers className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">
                          <span className="font-semibold text-foreground">
                            {s.name}
                          </span>
                          <span className="ml-2 text-muted-foreground">
                            {s.strategy_family}
                          </span>
                        </span>
                      </span>
                      <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {s.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchResults.backtests.length > 0 && (
              <div>
                <p className="eyebrow-ruled mb-2 px-1">Backtests</p>
                <div className="space-y-0.5">
                  {searchResults.backtests.map((bt) => (
                    <button
                      key={bt.id}
                      onClick={() => navigateTo(`/backtests/${bt.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-md p-2.5 text-left text-xs transition-colors hover:bg-accent"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <FlaskConical className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">
                          <span className="font-semibold text-foreground">
                            {bt.backtest_name}
                          </span>
                          <span className="ml-2 font-mono text-muted-foreground">
                            {bt.symbol} {bt.timeframe} · {bt.source}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2.5 font-mono text-[11px]">
                        {bt.profit_factor != null && (
                          <span className="text-foreground">
                            PF {Number(bt.profit_factor).toFixed(2)}
                          </span>
                        )}
                        {bt.net_profit_percent != null && (
                          <span
                            className={
                              Number(bt.net_profit_percent) >= 0
                                ? "val-gain"
                                : "val-loss"
                            }
                          >
                            {Number(bt.net_profit_percent) >= 0 ? "+" : ""}
                            {Number(bt.net_profit_percent).toFixed(1)}%
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!searchQuery && (
              <div className="py-6 text-center text-xs leading-relaxed text-muted-foreground">
                Search strategy names, version rules, backtest results, symbols,
                notes, and technical details.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
