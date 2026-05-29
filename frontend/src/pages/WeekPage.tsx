import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { addDaysISO, todayISODate } from '../lib/date';

const WEEKDAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'] as const;
const WEEKDAYS_SHORT_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

function mondayOfWeek(isoDate: string): string {
  // isoDate: YYYY-MM-DD, работаем в UTC
  const [y, m, d] = isoDate.split('-').map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  const jsDow = dt.getUTCDay(); // 0=Вс..6=Сб
  const mondayBased = (jsDow + 6) % 7; // 0=Пн..6=Вс
  dt.setUTCDate(dt.getUTCDate() - mondayBased);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function shortDate(isoDate: string) {
  return isoDate.slice(8, 10) + '.' + isoDate.slice(5, 7);
}

export function WeekPage() {
  const nav = useNavigate();
  const [anchor, setAnchor] = useState(() => mondayOfWeek(todayISODate()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [byDate, setByDate] = useState<
    Record<string, { colorHex: string; mood: number; emotions: string[]; note: string | null }>
  >({});

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(anchor, i)), [anchor]);
  const rangeLabel = useMemo(() => `${days[0]} — ${days[6]}`, [days]);
  const chart = useMemo(() => {
    return days.map((d, idx) => {
      const entry = byDate[d];
      const mood = entry?.mood ?? null;
      const heightPct = mood === null ? 8 : Math.max(6, Math.round((mood / 10) * 100));
      const color = entry?.colorHex ?? '#A3A3A3';
      return {
        date: d,
        weekdayShort: WEEKDAYS_SHORT_RU[idx],
        mood,
        heightPct,
        color,
        has: Boolean(entry),
      };
    });
  }, [days, byDate]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const from = days[0];
        const to = days[6];
        const { entries } = await api.entries.listRange(from, to);
        if (!alive) return;
        const next: Record<string, { colorHex: string; mood: number; emotions: string[]; note: string | null }> = {};
        for (const e of entries) {
          const key = String(e.date).slice(0, 10);
          next[key] = { colorHex: e.colorHex, mood: e.mood, emotions: e.emotions ?? [], note: e.note ?? null };
        }
        setByDate(next);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : 'UNKNOWN_ERROR');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [days]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Неделя</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{rangeLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onClick={() => setAnchor((a) => addDaysISO(a, -7))}
          >
            ←
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onClick={() => setAnchor(mondayOfWeek(todayISODate()))}
          >
            Текущая
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onClick={() => setAnchor((a) => addDaysISO(a, 7))}
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {loading ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Загрузка…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            Ошибка: {error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Динамика настроения</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-300">0–10</div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2">
                {chart.map((c) => (
                  <button
                    key={`chart-${c.date}`}
                    type="button"
                    onClick={() => nav(`/day/${c.date}`)}
                    className="group flex flex-col items-center gap-2"
                    title={c.mood === null ? `${c.date}\nНет записи` : `${c.date}\nНастроение: ${c.mood}`}
                  >
                    <div className="relative h-24 w-full rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
                      <div
                        className="absolute bottom-1 left-1 right-1 rounded-md transition-opacity group-hover:opacity-90"
                        style={{
                          height: `${c.heightPct}%`,
                          background: c.has ? c.color : 'transparent',
                          border: c.has ? 'none' : '1px dashed rgba(161,161,170,0.6)',
                        }}
                      />
                      <div className="absolute top-1 left-1 right-1 text-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                        {c.mood ?? '—'}
                      </div>
                    </div>
                    <div className="text-center text-[10px] font-medium text-zinc-600 dark:text-zinc-300">
                      {c.weekdayShort}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {days.map((d, idx) => {
                const entry = byDate[d];
                const has = Boolean(entry);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => nav(`/day/${d}`)}
                    className="flex items-start gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-left hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
                  >
                    <div
                      className="h-12 w-12 flex-none rounded-xl border border-zinc-200 dark:border-zinc-800"
                      style={{ background: has ? entry!.colorHex : 'transparent' }}
                      title={has ? entry!.colorHex : 'Нет записи'}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">
                          {WEEKDAYS_RU[idx]} • {shortDate(d)}
                        </div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-300">
                          {has ? `Настроение: ${entry!.mood}` : '—'}
                        </div>
                      </div>
                      <div className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">
                        {has && entry!.emotions.length ? entry!.emotions.join(', ') : 'Нет эмоций'}
                      </div>
                      {has && entry!.note ? (
                        <div className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">
                          {entry!.note}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

