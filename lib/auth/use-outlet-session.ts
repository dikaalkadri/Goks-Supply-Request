'use client';

import { useEffect, useState } from 'react';

export interface ClientOutletSession {
  username: string;
  outlet_id: string;
  outlet_name: string;
}

// One /api/auth/me call shared by every component on the page
let cached: Promise<ClientOutletSession | null> | null = null;

function fetchSession(): Promise<ClientOutletSession | null> {
  if (!cached) {
    cached = fetch('/api/auth/me', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { data: null }))
      .then((d) => d.data ?? null)
      .catch(() => null);
  }
  return cached;
}

/** Call after login/logout so the next read hits the server again. */
export function resetOutletSessionCache() {
  cached = null;
}

/**
 * `loading` is true until the session is known. `session` is null in public mode.
 */
export function useOutletSession() {
  const [state, setState] = useState<{ loading: boolean; session: ClientOutletSession | null }>({
    loading: true,
    session: null,
  });

  useEffect(() => {
    let alive = true;
    fetchSession().then((session) => {
      if (alive) setState({ loading: false, session });
    });
    return () => { alive = false; };
  }, []);

  return state;
}
