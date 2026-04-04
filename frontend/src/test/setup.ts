import '@testing-library/jest-dom';
import { server } from './msw-server';
import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// jsdom doesn't implement scrollIntoView — stub it
HTMLElement.prototype.scrollIntoView = vi.fn();

// jsdom doesn't implement EventSource — stub it so useSessionStream is safe
if (!globalThis.EventSource) {
  const MockEventSource = vi.fn().mockImplementation(() => ({
    onopen: null,
    onmessage: null,
    onerror: null,
    close: vi.fn(),
  }));
  // @ts-expect-error — global stub for tests
  globalThis.EventSource = MockEventSource;
}

// Start MSW before all tests, reset handlers between tests, stop after all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
