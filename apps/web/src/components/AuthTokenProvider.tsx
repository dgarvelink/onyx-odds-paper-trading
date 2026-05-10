import { useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";
import { setAuthToken } from "../lib/api";

export function AuthTokenProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) {
      setAuthToken(null);
      return;
    }

    const updateToken = async () => {
      const token = await getToken();
      setAuthToken(token);
    };

    updateToken();

    // Refresh every 50 s — Clerk tokens expire after 60 s
    const interval = setInterval(updateToken, 50000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  return <>{children}</>;
}
