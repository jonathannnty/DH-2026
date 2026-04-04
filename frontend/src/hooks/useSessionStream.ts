import { useEffect, useRef, useState } from 'react';
import { sessionStreamUrl } from '@/lib/api';
import { StreamEventSchema, type StreamEvent } from '@/schemas/career';

interface UseSessionStreamResult {
  status: 'connecting' | 'open' | 'closed' | 'error';
  latestEvent: StreamEvent | null;
  error: string | null;
}

export function useSessionStream(
  sessionId: string | null,
): UseSessionStreamResult {
  const [status, setStatus] = useState<UseSessionStreamResult['status']>('connecting');
  const [latestEvent, setLatestEvent] = useState<StreamEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setStatus('closed');
      return;
    }

    const es = new EventSource(sessionStreamUrl(sessionId));
    sourceRef.current = es;

    es.onopen = () => setStatus('open');

    es.onmessage = (event: MessageEvent<string>) => {
      const parsed = StreamEventSchema.safeParse(JSON.parse(event.data));
      if (!parsed.success) {
        setError('Invalid SSE event shape');
        return;
      }

      const data = parsed.data;
      setLatestEvent(data);

      if (data.type === 'complete' || data.type === 'error') {
        es.close();
        setStatus(data.type === 'error' ? 'error' : 'closed');
      }
    };

    es.onerror = () => {
      setError('SSE connection error');
      setStatus('error');
      es.close();
    };

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [sessionId]);

  return { status, latestEvent, error };
}
