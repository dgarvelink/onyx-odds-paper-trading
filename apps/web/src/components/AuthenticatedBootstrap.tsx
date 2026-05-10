import { useAuth } from "@clerk/react";
import { useUserSync } from "../hooks/useUserSync.js";

export function AuthenticatedBootstrap() {
  const { isSignedIn } = useAuth();
  useUserSync(isSignedIn === true);
  return null;
}
