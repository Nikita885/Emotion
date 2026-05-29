import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { addDaysISO, isISODate, todayISODate } from '../lib/date';
import { useNavigate, useParams } from 'react-router-dom';

type EntryForm = {
  mood: number;
  colorHex: string;
  selectedEmotionIds: number[];
  note: string;
};

type Emotion = { id: number; title: string; defaultColorHex: string };

function isLight(hex: string) {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  // относительная яркость (приближение достаточно для UI)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62;
}

export function TodayPage() {
  const nav = useNavigate();
  const params = useParams();
  const initialDate = useMemo(() => {
    const p = params.date;
    return p && isISODate(p) ? p : todayISODate();
  }, [params.date]);

  const [date, setDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [paletteByEmotionId, setPaletteByEmotionId] = useState<Record<number, string>>({});

  const [form, setForm] = useState<EntryForm>({
    mood: 5,
    colorHex: '#A3A3A3',
    selectedEmotionIds: [],
    note: '',
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setSavedAt(null);

    Promise.all([api.entries.getByDate(date), api.emotions.list(), api.me.getEmotionColors()])
      .then(([entryRes, emotionsRes, paletteRes]) => {
        if (!alive) return;

        setEmotions(emotionsRes.emotions);
        setPaletteByEmotionId(Object.fromEntries(paletteRes.items.map((i) => [i.emotionId, i.colorHex])));

        const emotionsByTitle = new Map<string, number>(emotionsRes.emotions.map((e) => [e.title, e.id]));
        const selectedFromEntry =
          entryRes.entry?.emotions
            ?.map((title) => emotionsByTitle.get(title))
            .filter((x): x is number => typeof x === 'number') ?? [];

        setForm((f) => ({
          ...f,
          mood: entryRes.entry?.mood ?? 5,
          colorHex: entryRes.entry?.colorHex ?? '#A3A3A3',
          selectedEmotionIds: selectedFromEntry,
          note: entryRes.entry?.note ?? '',
        }));
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [date]);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const idToTitle = new Map(emotions.map((e) => [e.id, e.title] as const));
      const selectedTitles = form.selectedEmotionIds.map((id) => idToTitle.get(id)).filter(Boolean) as string[];

      await api.entries.upsert(date, {
        mood: form.mood,
        colorHex: form.colorHex,
        emotions: selectedTitles,
        note: form.note.trim() ? form.note : null,
      });
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">День: {date}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Заполните цвет дня, настроение, эмоции и заметку.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800"
            style={{ background: form.colorHex }}
            title={form.colorHex}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Загрузка…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="block">
                <div className="text-sm font-medium">Дата</div>
                <input
                  className="mt-1 h-10 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                  type="date"
                  value={date}
                  onChange={(e) => {
                    const next = e.target.value;
                    if (isISODate(next)) {
                      setDate(next);
                      nav(`/day/${next}`, { replace: true });
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  onClick={() => {
                    const next = addDaysISO(date, -1);
                    setDate(next);
                    nav(`/day/${next}`, { replace: true });
                  }}
                >
                  Вчера
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  onClick={() => {
                    const next = todayISODate();
                    setDate(next);
                    nav('/today', { replace: true });
                  }}
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  onClick={() => {
                    const next = addDaysISO(date, 1);
                    setDate(next);
                    nav(`/day/${next}`, { replace: true });
                  }}
                >
                  Завтра
                </button>
              </div>
            </div>

            <label className="block">
              <div className="text-sm font-medium">Цвет дня</div>
              <input
                className="mt-1 h-10 w-24 cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-950"
                type="color"
                value={form.colorHex}
                onChange={(e) => setForm((f) => ({ ...f, colorHex: e.target.value }))}
              />
            </label>

            <label className="block">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Настроение (0–10)</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-300">{form.mood}</div>
              </div>
              <input
                className="mt-2 w-full"
                type="range"
                min={0}
                max={10}
                step={1}
                value={form.mood}
                onChange={(e) => setForm((f) => ({ ...f, mood: Number(e.target.value) }))}
              />
            </label>

            <div>
              <div className="text-sm font-medium">Эмоции</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {emotions.map((e) => {
                  const selected = form.selectedEmotionIds.includes(e.id);
                  const color = paletteByEmotionId[e.id] ?? e.defaultColorHex;
                  const light = isLight(color);

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setForm((f) => {
                          const has = f.selectedEmotionIds.includes(e.id);
                          if (has) {
                            const next = f.selectedEmotionIds.filter((id) => id !== e.id);
                            const lastId = next[next.length - 1];
                            const nextColor =
                              next.length && typeof lastId === 'number'
                                ? paletteByEmotionId[lastId] ?? f.colorHex
                                : f.colorHex;
                            return { ...f, selectedEmotionIds: next, colorHex: nextColor };
                          }

                          const next = [...f.selectedEmotionIds, e.id];
                          return { ...f, selectedEmotionIds: next, colorHex: color };
                        });
                      }}
                      className={[
                        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition',
                        selected
                          ? 'border-transparent ring-2 ring-white/40 dark:ring-black/40'
                          : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200',
                      ].join(' ')}
                      aria-pressed={selected}
                      style={
                        selected
                          ? {
                              background: color,
                              color: light ? '#0A0A0A' : '#FFFFFF',
                            }
                          : undefined
                      }
                    >
                      <span className="min-w-0 truncate">{e.title}</span>
                      <span
                        className={[
                          'h-3.5 w-3.5 flex-none rounded-full border',
                          selected ? (light ? 'border-black/20' : 'border-white/30') : 'border-zinc-200 dark:border-zinc-800',
                        ].join(' ')}
                        style={{ background: color }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                Цвет дня автоматически подстраивается под последнюю выбранную эмоцию.
              </div>
            </div>

            <label className="block">
              <div className="text-sm font-medium">Заметка</div>
              <textarea
                className="mt-1 min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              />
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                Ошибка: {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <button
                className="rounded-lg bg-zinc-900 px-4 py-2 text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950"
                onClick={onSave}
                disabled={saving}
                type="button"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>

              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                {savedAt ? `Сохранено в ${savedAt}` : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

