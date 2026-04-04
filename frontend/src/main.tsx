import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/queryClient';
import Layout from '@/components/ui/Layout';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import Home from '@/routes/Home';
import Onboarding from '@/routes/Onboarding';
import Dashboard from '@/routes/Dashboard';
import Results from '@/routes/Results';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary label="application">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<ErrorBoundary label="Home"><Home /></ErrorBoundary>} />
              <Route path="/onboarding" element={<ErrorBoundary label="Onboarding"><Onboarding /></ErrorBoundary>} />
              <Route path="/dashboard" element={<ErrorBoundary label="Dashboard"><Dashboard /></ErrorBoundary>} />
              <Route path="/results/:sessionId" element={<ErrorBoundary label="Results"><Results /></ErrorBoundary>} />
            </Routes>
          </Layout>
        </BrowserRouter>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
