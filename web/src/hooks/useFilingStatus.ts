import { useEffect, useState } from 'react';
import { api, type Filing } from '../api';

const POLL_MS = 4000;

export function useFilingStatus(filingId: string | null) {
  const [filing, setFiling] = useState<Filing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!filingId) {
      setFiling(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const poll = async () => {
      try {
        const result = await api.getFiling(filingId);
        if (cancelled) {
          return;
        }
        setFiling(result.filing);
        setError(null);
      } catch (err) {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load filing status');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void poll();
    window.setInterval(() => {
      void poll();
    }, POLL_MS);
  }, [filingId]);

  return { filing, error, loading };
}
