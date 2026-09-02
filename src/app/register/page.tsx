"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, ArrowRight, CheckCircle2, Eye } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email || !password) {
      setError("Fill in every field to create your account.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password of at least 8 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Account creation failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
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

        <div className="rounded-lg border border-border bg-card p-6 shadow-raised">
          {success ? (
            <div className="space-y-3 py-6 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-profit" />
              <h1 className="text-sm font-semibold text-foreground">
                Account created
              </h1>
              <p className="text-xs text-muted-foreground">
                Taking you to the dashboard…
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Create an account
              </h1>
              <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                New accounts start with Viewer access. An Owner grants edit
                rights.
              </p>

              <form onSubmit={handleRegister} className="mt-6 space-y-4">
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
                  <label htmlFor="name" className="eyebrow block">
                    Display name
                  </label>
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How the team will see you"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="eyebrow block">
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
                  <label htmlFor="password" className="eyebrow block">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating account…" : "Create account"}
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
