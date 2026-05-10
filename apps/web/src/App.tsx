import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { SignInPage } from "./pages/SignInPage.js";
import { SignUpPage } from "./pages/SignUpPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { AccountPage } from "./pages/AccountPage.js";
import { ErrorBoundary } from "./components/ErrorBoundary.js";

function App() {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0e1a]">
          <div className="text-center">
            <p className="text-xl font-bold text-white">Onyx Odds</p>
            <p className="mt-2 text-dim">Something went wrong. Please refresh.</p>
          </div>
        </div>
      }
    >
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
