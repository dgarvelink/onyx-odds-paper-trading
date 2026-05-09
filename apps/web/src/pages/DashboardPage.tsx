import { useAuth, useUser } from "@clerk/react";
import { useUserSync } from "../hooks/useUserSync.js";

export function DashboardPage() {
  useUserSync();
  const { user } = useUser();
  const { signOut } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">Welcome, {user?.firstName}</h1>
      <p className="text-muted-foreground">Onyx Odds Dashboard — coming soon</p>
      <button
        onClick={() => signOut()}
        className="text-sm text-muted-foreground underline"
      >
        Sign out
      </button>
    </main>
  );
}
