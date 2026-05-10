import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App.tsx";
import { AuthenticatedBootstrap } from "./components/AuthenticatedBootstrap.js";
import { ToastContainer } from "./components/ToastContainer.js";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error("Missing Clerk publishable key");

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <AuthenticatedBootstrap />
        <App />
        <ToastContainer />
      </QueryClientProvider>
    </ClerkProvider>
  </StrictMode>
);
