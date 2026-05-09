import { Show, SignInButton, SignOutButton, UserButton, useAuth } from "@clerk/react";
import { useEffect, useState } from "react";

function App() {
  const { getToken } = useAuth();
  const [authTest, setAuthTest] = useState<string | null>(null);

  useEffect(() => {
    async function testAuth() {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/test-auth`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setAuthTest(JSON.stringify(data));
    }
    testAuth();
  }, [getToken]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold tracking-tight">Onyx Odds</h1>

      <Show when="signed-out">
        <SignInButton mode="modal">
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Sign in
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <UserButton />
        <SignOutButton>
          <button className="text-sm text-muted-foreground underline">
            Sign out
          </button>
        </SignOutButton>
        {authTest && (
          <p className="rounded bg-muted px-3 py-2 font-mono text-sm">
            {authTest}
          </p>
        )}
      </Show>
    </main>
  );
}

export default App;
