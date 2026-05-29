import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { DisclaimerBar } from './DisclaimerBar';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { getPreferredTheme, setTheme, type ThemeMode } from '../lib/theme';

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      return getPreferredTheme();
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      setTheme(mode);
    } catch {
      // ignore (e.g. privacy mode)
    }
  }, [mode]);

  return (
    <button
      type="button"
      onClick={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
      className="group relative flex h-9 w-16 items-center rounded-full border border-zinc-300 bg-white px-1 dark:border-zinc-700 dark:bg-zinc-950"
      title={mode === 'dark' ? 'Темная тема' : 'Светлая тема'}
      aria-label="Переключить тему"
    >
      <SunIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-600" />
      <MoonIcon className="ml-auto h-4 w-4 text-zinc-600 dark:text-zinc-300" />
      <span
        className={[
          'absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-zinc-900 transition-transform dark:bg-white',
          mode === 'dark' ? 'translate-x-7' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const auth = useAuth();
  const [busy, setBusy] = useState(false);

  async function onLogout() {
    setBusy(true);
    try {
      await api.auth.logout();
    } finally {
      auth.setGuest();
      setBusy(false);
      nav('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <DisclaimerBar />
      <div className="border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="mr-2 text-sm font-semibold">Emotion</div>
            {auth.state.status === 'authed' ? (
              <nav className="flex items-center gap-1">
                <NavLink
                  to="/today"
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-3 py-1.5 text-sm',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40',
                    ].join(' ')
                  }
                >
                  Сегодня
                </NavLink>
                <NavLink
                  to="/week"
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-3 py-1.5 text-sm',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40',
                    ].join(' ')
                  }
                >
                  Неделя
                </NavLink>
                <NavLink
                  to="/year"
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-3 py-1.5 text-sm',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40',
                    ].join(' ')
                  }
                >
                  Год
                </NavLink>
                <NavLink
                  to="/analytics"
                  className={({ isActive }) =>
                    [
                      'rounded-lg px-3 py-1.5 text-sm',
                      isActive
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900/40',
                    ].join(' ')
                  }
                >
                  Аналитика
                </NavLink>
              </nav>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {auth.state.status === 'authed' ? (
              <button
                type="button"
                disabled={busy}
                onClick={onLogout}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
              >
                {busy ? 'Выход…' : 'Выйти'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  );
}

