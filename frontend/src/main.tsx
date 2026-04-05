import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "@/lib/queryClient";
import Layout from "@/components/ui/Layout";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import "@/index.css";

const Home = lazy(() => import("@/routes/Home"));
const Onboarding = lazy(() => import("@/routes/Onboarding"));
const Dashboard = lazy(() => import("@/routes/Dashboard"));
const Results = lazy(() => import("@/routes/Results"));

const routeFallbackStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--pf-color-text-muted)",
  fontSize: "0.92rem",
};

function RouteFallback() {
  return <div style={routeFallbackStyle}>Loading screen...</div>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary label="application">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ErrorBoundary label="Home">
                      <Home />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/onboarding"
                  element={
                    <ErrorBoundary label="Onboarding">
                      <Onboarding />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ErrorBoundary label="Dashboard">
                      <Dashboard />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/results/:sessionId"
                  element={
                    <ErrorBoundary label="Results">
                      <Results />
                    </ErrorBoundary>
                  }
                />
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
