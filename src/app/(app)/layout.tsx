import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { DetailSkeleton } from "@/components/ui/skeleton";
import { getInitialAuth } from "@/lib/server/auth";

/* Every signed-in route renders inside the shell. Keeping it here rather than
   in each page means the sidebar and header stay mounted across navigations —
   only the content slot swaps, so moving between sections doesn't tear down
   and rebuild the chrome. */
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<AppBootstrapFallback />}>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </Suspense>
  );
}

async function AuthenticatedAppShell({ children }: { children: React.ReactNode }) {
  const auth = await getInitialAuth();
  if (!auth) redirect("/login");

  return (
    <AuthProvider initialUser={auth.user} initialProfile={auth.profile}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}

function AppBootstrapFallback() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <DetailSkeleton />
      </div>
    </main>
  );
}
