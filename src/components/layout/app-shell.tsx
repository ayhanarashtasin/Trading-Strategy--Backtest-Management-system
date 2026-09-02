"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { X } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar className="hidden md:flex" />

      {/* Mobile navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-foreground/25 backdrop-blur-[2px] animate-in fade-in duration-150"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex w-60 max-w-xs flex-1 flex-col bg-card shadow-float animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3.5 z-10 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar className="h-full border-r-0" />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMobileMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
