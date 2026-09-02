"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  Shield,
  Eye,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

/* The specimen: the canonical record from the lab's own documentation. It is
   the most characteristic object in this product's world, so it opens the
   page — you see what the lab holds before you sign in to it. */
const SPECIMEN = {
  strategy: "Supertrend MTF ADX",
  version: "V9",
  market: "BINANCE · BTCUSDT · 15m",
  window: "2022-01-01 → 2026-08-31",
  readings: [
    { label: "Trades", value: "1,043" },
    { label: "Profit factor", value: "1.24" },
    { label: "Avg trade", value: "0.082%" },
    { label: "Win rate", value: "37.2%" },
    { label: "Max DD", value: "21.3%", tone: "loss" as const },
    { label: "Net return", value: "+142.5%", tone: "gain" as const },
  ],
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password to sign in.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data?.user) {
        // Update last_seen_at
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", data.user.id);

        router.push(returnUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "Sign-in failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: the specimen record */}
      <aside className="relative hidden w-1/2 max-w-2xl flex-col justify-between overflow-hidden border-r border-border bg-paper p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary font-mono text-xs font-semibold tracking-[0.08em] text-primary-foreground">
            ES
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Escanor Strategy Lab
            </p>
            <p className="eyebrow">Private research record</p>
          </div>
        </div>

        <div className="max-w-lg">
          <p className="eyebrow mb-4">Specimen record · BT-001043</p>

          <div className="rounded-lg border border-border bg-card shadow-raised">
            <div className="border-b border-border px-5 py-4">
              <p className="text-base font-semibold tracking-tight text-foreground">
                {SPECIMEN.strategy}{" "}
                <span className="font-mono text-primary">
                  {SPECIMEN.version}
                </span>
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {SPECIMEN.market}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {SPECIMEN.window}
              </p>
            </div>

            <dl className="grid grid-cols-3 divide-x divide-y divide-border">
              {SPECIMEN.readings.map((r) => (
                <div key={r.label} className="px-4 py-3.5">
                  <dt className="eyebrow truncate">{r.label}</dt>
                  <dd
                    className={
                      "mt-1.5 font-mono text-[15px] font-semibold leading-none " +
                      (r.tone === "gain"
                        ? "text-profit"
                        : r.tone === "loss"
                          ? "text-loss"
                          : "text-foreground")
                    }
                  >
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            One uniform schema for every backtest, whatever ran it — TradingView,
            Freqtrade, Python. Results are entered once and never overwritten, so
            the team compares experiments instead of memories.
          </p>
        </div>

        <p className="eyebrow">Escanor Capital · Authorised access only</p>
      </aside>

      {/* Right: sign in */}
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Brand shows on small screens, where the specimen panel is hidden */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-primary font-mono text-xs font-semibold tracking-[0.08em] text-primary-foreground">
              ES
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Escanor Strategy Lab
              </p>
              <p className="eyebrow">Private research record</p>
            </div>
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            The research record is private to approved team members.
          </p>

          <form onSubmit={handleLogin} className="mt-7 space-y-4">
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
              <label
                htmlFor="email"
                className="eyebrow block"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@escanorcapital.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="eyebrow block"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Demo credentials — remove before production use */}
          <div className="mt-8 rounded-md border border-border bg-muted/50 p-3.5">
            <p className="eyebrow mb-2.5">Demo sign-in</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  handleQuickLogin(
                    "owner@escanorcapital.com",
                    "EscanorOwner2026!"
                  )
                }
              >
                <ShieldCheck className="h-3 w-3 text-sun" />
                Owner
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  handleQuickLogin(
                    "editor@escanorcapital.com",
                    "EscanorEditor2026!"
                  )
                }
              >
                <Shield className="h-3 w-3 text-primary" />
                Editor
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  handleQuickLogin(
                    "viewer@escanorcapital.com",
                    "EscanorViewer2026!"
                  )
                }
              >
                <Eye className="h-3 w-3 text-muted-foreground" />
                Viewer
              </Button>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Need access? Ask an Owner, or{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              register an account
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="eyebrow">Loading</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
