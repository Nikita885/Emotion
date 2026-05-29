import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type Emotion = { id: number; title: string };

export function SetupColorsPage() {
  const nav = useNavigate();
  const auth = useAuth();
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [colors, setColors] = useState<Record<number, string>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const [{ emotions }, { items }] = await Promise.all([api.emotions.list(), api.me.getEmotionColors()]);
        if (!alive) return;
        setEmotions(emotions.map((e) => ({ id: e.id, title: e.title })));
        setColors(Object.fromEntries(items.map((i) => [i.emotionId, i.colorHex])));
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
      } finally {
        if (!alive) return;
        setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows = useMemo(
    () =>
      emotions.map((e) => ({
        id: e.id,
        title: e.title,
        colorHex: colors[e.id] ?? '#999999',
      })),
    [emotions, colors],
  );

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await api.me.putEmotionColors(rows.map((r) => ({ emotionId: r.id, colorHex: r.colorHex })));
      await auth.refresh();
      nav('/today', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
    } finally {
      setSaving(false);
    }
  }

  async function onSkip() {
    setSaving(true);
    setError(null);
    try {
      // "Пропустить" = принять дефолтные цвета и больше не спрашивать.
      await api.me.putEmotionColors(rows.map((r) => ({ emotionId: r.id, colorHex: r.colorHex })));
      await auth.refresh();
      nav('/today', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
    } finally {
      setSaving(false);
    }
  }

  if (busy) return <div className="p-6">Загрузка…</div>;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold">Цвета эмоций</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
        Настройте, какой цвет соответствует каждой эмоции. Это можно изменить позже.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          Ошибка: {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <label
            key={r.id}
            className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="text-sm font-medium">{r.title}</div>
            <div className="flex items-center gap-3">
              <div className="text-xs font-mono text-zinc-500">{r.colorHex.toUpperCase()}</div>
              <input
                aria-label={`Цвет для эмоции ${r.title}`}
                type="color"
                value={r.colorHex}
                onChange={(e) => setColors((prev) => ({ ...prev, [r.id]: e.target.value }))}
              />
            </div>
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
          disabled={saving}
          onClick={onSave}
          type="button"
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
        <button
          className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
          disabled={saving}
          onClick={onSkip}
          type="button"
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}

