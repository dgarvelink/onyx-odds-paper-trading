import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/react";
import api from "../lib/api.js";

export function useUserSync() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSynced.current) return;
    hasSynced.current = true;
    api.post("/api/users/sync").catch((err) => {
      console.error("User sync failed:", err);
    });
  }, [isLoaded, user, getToken]);
}
