import { useState, useEffect, useCallback } from 'react';
import { subDays, addDays, startOfDay, endOfDay, formatISO } from 'date-fns';
import api from '@/lib/api';
import type { Meeting } from '@/types/meeting';

interface UseCalendarResult {
  meetings: Meeting[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL_MS = 30_000;

export function useCalendar(
  center: Date = new Date(),
  rangeDays = 7,
): UseCalendarResult {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = formatISO(startOfDay(subDays(center, rangeDays)));
  const to = formatISO(endOfDay(addDays(center, rangeDays)));

  const fetchMeetings = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get<{ data: Meeting[] }>('/meetings/calendar', {
        params: { from, to },
      });
      setMeetings(res.data.data ?? []);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number }; message?: string };
      if (axiosErr?.response?.status === 401) {
        // auth interceptor already handles redirect; swallow the error here
        return;
      }
      setError(axiosErr?.message ?? 'Failed to load meetings.');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchMeetings();
  }, [fetchMeetings]);

  // Polling every 30 s
  useEffect(() => {
    const id = window.setInterval(fetchMeetings, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fetchMeetings]);

  return { meetings, loading, error, refetch: fetchMeetings };
}
