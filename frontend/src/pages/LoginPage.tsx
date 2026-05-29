import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const title = useMemo(() => (mode === 'login' ? 'Вход' : 'Регистрация'), [mode]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await api.auth.login(email, password);
      else await api.auth.register(email, password);
      const me = await api.auth.me();
      await auth.refresh();
      if (!me.user?.emotionPaletteSetAt) nav('/setup-colors', { replace: true });
      else nav('/today', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'UNKNOWN_ERROR');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Данные видны только вам. Сравнения с другими пользователями нет.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <div className="text-sm font-medium">Email</div>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <div className="text-sm font-medium">Пароль</div>
          <input
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            Ошибка: {error}
          </div>
        )}

        <button
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
          disabled={busy}
          type="submit"
        >
          {busy ? 'Подождите…' : title}
        </button>
      </form>

      <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
        {mode === 'login' ? (
          <>
            Нет аккаунта?{' '}
            <button className="underline" onClick={() => setMode('register')} type="button">
              Зарегистрироваться
            </button>
          </>
        ) : (
          <>
            Уже есть аккаунт?{' '}
            <button className="underline" onClick={() => setMode('login')} type="button">
              Войти
            </button>
          </>
        )}
      </div>
    </div>
  );
}

