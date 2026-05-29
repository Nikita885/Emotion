import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext, type AuthState, type AuthContextValue } from './AuthContext';
import { api } from '../lib/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

  const refresh = useCallback(async () => {
    const r = await api.auth.me();
    if (r.user) setState({ status: 'authed', user: r.user });
    else setState({ status: 'guest', user: null });
  }, []);

  const setGuest = useCallback(() => setState({ status: 'guest', user: null }), []);

  useEffect(() => {
    let alive = true;
    refresh()
      .catch(() => {
        if (!alive) return;
        setState({ status: 'guest', user: null });
      });
    return () => {
      alive = false;
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(() => ({ state, refresh, setGuest }), [state, refresh, setGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

