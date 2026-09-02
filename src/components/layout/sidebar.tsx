"use client";

import React from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  FlaskConical,
  GitCompare,
  Trophy,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  Shield,
  Eye,
  Activity,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/* Grouped by what the researcher is actually doing — recording work, drawing
   conclusions from it, and administering the record. */
const navGroups: NavGroup[] = [
  {
    label: "Record",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Strategies", href: "/strategies", icon: Layers },
      { name: "Backtests", href: "/backtests", icon: FlaskConical },
    ],
  },
  {
    label: "Analysis",
    items: [
      { name: "Compare", href: "/compare", icon: GitCompare },
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Administration",
    items: [
      { name: "Activity", href: "/activity", icon: Activity },
      { name: "Team", href: "/team", icon: Users, ownerOnly: true },
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

const roleMeta = {
  owner: { icon: ShieldCheck, className: "text-sun" },
  editor: { icon: Shield, className: "text-primary" },
  viewer: { icon: Eye, className: "text-muted-foreground" },
} as const;

function NavItemContent({
  icon: Icon,
  isActive,
  name,
}: {
  icon: React.ElementType;
  isActive: boolean;
  name: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive
            ? "text-primary"
            : "text-muted-foreground/70 group-hover:text-foreground"
        )}
      />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {pending ? (
        <LoaderCircle
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
        />
      ) : null}
    </>
  );
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { profile, role, isOwner, isLoading, signOut } = useAuth();

  const RoleIcon = roleMeta[role]?.icon ?? Eye;
  const roleClass = roleMeta[role]?.className ?? "text-muted-foreground";

  return (
    <aside
      className={cn(
        "flex h-screen w-60 shrink-0 select-none flex-col justify-between border-r border-border bg-card",
        className
      )}
    >
      <div>
        {/* Brand plate — sits in its own ruled band, like the header block of a
            lab notebook page. */}
        <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary font-mono text-[11px] font-semibold tracking-[0.08em] text-primary-foreground">
            ES
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-[13px] font-semibold tracking-tight text-foreground">
              Escanor
            </span>
            <span className="eyebrow block truncate">Strategy Lab</span>
          </div>
        </div>

        <nav className="space-y-6 px-3 py-5">
          {navGroups.map((group) => {
            const visible = group.items.filter(
              (item) => !item.ownerOnly || isOwner
            );
            if (visible.length === 0) return null;

            return (
              <div key={group.label} className="space-y-1">
                <p className="eyebrow px-2.5 pb-1.5">{group.label}</p>

                {visible.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-md py-1.5 pl-3 pr-2.5 text-[13px] transition-colors",
                        isActive
                          ? "bg-primary/[0.07] font-semibold text-primary"
                          : "font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {/* The active marker is a rule, not a pill. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-opacity",
                          isActive ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <NavItemContent
                        icon={Icon}
                        isActive={isActive}
                        name={item.name}
                      />
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Signed-in researcher */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          {/* Placeholders rather than a "User / viewer" guess that pops to the
              real name a moment later. */}
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </>
          ) : (
            <>
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-mono text-[11px] font-semibold uppercase text-foreground"
                )}
              >
                {(profile?.display_name || profile?.email || "U").charAt(0)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-semibold text-foreground">
                  {profile?.display_name || "User"}
                </p>
                <p className="flex items-center gap-1 truncate font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <RoleIcon className={cn("h-3 w-3 shrink-0", roleClass)} />
                  {role}
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={signOut}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/[0.08] hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
