import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { addDaysISO, todayISODate } from '../lib/date';

const BAD_MOOD_MAX = 4;

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

type Period = 'week' | 'month' | 'year';

type EntryLite = { mood: number; colorHex: string; emotions: string[] };

function mondayOfWeek(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0));
  const jsDow = dt.getUTCDay();
  const mondayBased = (jsDow + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - mondayBased);
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function monthBounds(year: number, month0: number): { from: string; to: string } {
  const from = new Date(Date.UTC(year, month0, 1));
  const to = new Date(Date.UTC(year, month0 + 1, 0));
  const f = `${from.getUTCFullYear()}-${String(from.getUTCMonth() + 1).padStart(2, '0')}-${String(from.getUTCDate()).padStart(2, '0')}`;
  const t = `${to.getUTCFullYear()}-${String(to.getUTCMonth() + 1).padStart(2, '0')}-${String(to.getUTCDate()).padStart(2, '0')}`;
  return { from: f, to: t };
}

function yearBounds(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to) {
    out.push(cur);
    cur = addDaysISO(cur, 1);
  }
  return out;
}

function entriesToMap(entries: { date: string; mood: number; colorHex: string; emotions: string[] }[]) {
  const m = new Map<string, EntryLite>();
  for (const e of entries) {
    const key = String(e.date).slice(0, 10);
    m.set(key, { mood: e.mood, colorHex: e.colorHex, emotions: e.emotions ?? [] });
  }
  return m;
}

function avgMood(dates: string[], map: Map<string, EntryLite>): number | null {
  let sum = 0;
  let n = 0;
  for (const d of dates) {
    const e = map.get(d);
    if (e) {
      sum += e.mood;
      n++;
    }
  }
  return n ? sum / n : null;
}

function findBadPeriods(dates: string[], map: Map<string, EntryLite>): { from: string; to: string; days: number; avgMood: number }[] {
  const periods: { from: string; to: string; days: number; avgMood: number }[] = [];
  let start: string | null = null;
  let moods: number[] = [];

  const flush = (end: string) => {
    if (!start || moods.length === 0) return;
    const sum = moods.reduce((a, b) => a + b, 0);
    periods.push({ from: start, to: end, days: moods.length, avgMood: sum / moods.length });
    start = null;
    moods = [];
  };

  for (const d of dates) {
    const e = map.get(d);
    const bad = e && e.mood <= BAD_MOOD_MAX;
    if (bad) {
      if (!start) start = d;
      moods.push(e!.mood);
    } else {
      if (start) flush(addDaysISO(d, -1));
    }
  }
  if (start && dates.length) flush(dates[dates.length - 1]!);

  return periods;
}

export function AnalyticsPage() {
  const nav = useNavigate();
  const [period, setPeriod] = useState<Period>('week');
  const [weekAnchor, setWeekAnchor] = useState(() => mondayOfWeek(todayISODate()));
  const [monthYear, setMonthYear] = useState(() => {
    const t = todayISODate();
    return { y: Number(t.slice(0, 4)), m0: Number(t.slice(5, 7)) - 1 };
  });
  const [year, setYear] = useState(() => new Date().getFullYear());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [map, setMap] = useState<Map<string, EntryLite>>(new Map());

  const currentRange = useMemo(() => {
    if (period === 'week') {
      const from = weekAnchor;
      const to = addDaysISO(weekAnchor, 6);
      return { from, to, label: `${from} — ${to}` };
    }
    if (period === 'month') {
      const { from, to } = monthBounds(monthYear.y, monthYear.m0);
      return { from, to, label: `${MONTH_NAMES[monthYear.m0]} ${monthYear.y}` };
    }
    const { from, to } = yearBounds(year);
    return { from, to, label: `Год ${year}` };
  }, [period, weekAnchor, monthYear, year]);

  const previousRange = useMemo(() => {
    if (period === 'week') {
      const from = addDaysISO(weekAnchor, -7);
      const to = addDaysISO(weekAnchor, -1);
      return { from, to };
    }
    if (period === 'month') {
      const prev = new Date(Date.UTC(monthYear.y, monthYear.m0, 1));
      prev.setUTCMonth(prev.getUTCMonth() - 1);
      const py = prev.getUTCFullYear();
      const pm0 = prev.getUTCMonth();
      return monthBounds(py, pm0);
    }
    return yearBounds(year - 1);
  }, [period, weekAnchor, monthYear, year]);

  const fetchRange = useMemo(() => {
    const from =
      currentRange.from < previousRange.from ? currentRange.from : previousRange.from;
    const to = currentRange.to > previousRange.to ? currentRange.to : previousRange.to;
    return { from, to };
  }, [currentRange, previousRange]);

  const currentDates = useMemo(
    () => enumerateDates(currentRange.from, currentRange.to),
    [currentRange.from, currentRange.to],
  );
  const prevDates = useMemo(
    () => enumerateDates(previousRange.from, previousRange.to),
    [previousRange.from, previousRange.to],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { entries } = await api.entries.listRange(fetchRange.from, fetchRange.to);
        if (!alive) return;
        setMap(entriesToMap(entries));
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
  }, [fetchRange.from, fetchRange.to]);

  const avgCurrent = useMemo(() => avgMood(currentDates, map), [currentDates, map]);
  const avgPrev = useMemo(() => avgMood(prevDates, map), [prevDates, map]);

  const trend = useMemo(() => {
    if (avgCurrent === null || avgPrev === null) return { text: 'Недостаточно данных', delta: null as number | null };
    const delta = avgCurrent - avgPrev;
    const eps = 0.15;
    if (delta > eps) return { text: 'Настроение улучшается', delta };
    if (delta < -eps) return { text: 'Настроение ухудшается', delta };
    return { text: 'Настроение стабильно', delta };
  }, [avgCurrent, avgPrev]);

  const badDaysCount = useMemo(() => {
    return currentDates.filter((d) => {
      const e = map.get(d);
      return e && e.mood <= BAD_MOOD_MAX;
    }).length;
  }, [currentDates, map]);

  const recordedDays = useMemo(() => currentDates.filter((d) => map.has(d)).length, [currentDates, map]);

  const badPeriods = useMemo(() => findBadPeriods(currentDates, map), [currentDates, map]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Аналитика</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Тренд настроения и «плохие периоды» (настроение ≤ {BAD_MOOD_MAX}).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={[
                'rounded-lg px-3 py-2 text-sm',
                period === p
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-950',
              ].join(' ')}
            >
              {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{currentRange.label}</div>
        <div className="flex items-center gap-2">
          {period === 'week' ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setWeekAnchor((a) => addDaysISO(a, -7))}
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setWeekAnchor(mondayOfWeek(todayISODate()))}
              >
                Текущая
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setWeekAnchor((a) => addDaysISO(a, 7))}
              >
                →
              </button>
            </>
          ) : null}
          {period === 'month' ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() =>
                  setMonthYear(({ y, m0 }) => {
                    if (m0 === 0) return { y: y - 1, m0: 11 };
                    return { y, m0: m0 - 1 };
                  })
                }
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => {
                  const t = todayISODate();
                  setMonthYear({ y: Number(t.slice(0, 4)), m0: Number(t.slice(5, 7)) - 1 });
                }}
              >
                Сейчас
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() =>
                  setMonthYear(({ y, m0 }) => {
                    if (m0 === 11) return { y: y + 1, m0: 0 };
                    return { y, m0: m0 + 1 };
                  })
                }
              >
                →
              </button>
            </>
          ) : null}
          {period === 'year' ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setYear((y) => y - 1)}
              >
                ←
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setYear(new Date().getFullYear())}
              >
                Текущий
              </button>
              <button
                type="button"
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                onClick={() => setYear((y) => y + 1)}
              >
                →
              </button>
            </>
          ) : null}
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
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="text-xs text-zinc-600 dark:text-zinc-300">Среднее настроение</div>
                <div className="mt-1 text-2xl font-semibold">
                  {avgCurrent !== null ? avgCurrent.toFixed(1) : '—'}
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Записей: {recordedDays} / {currentDates.length}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="text-xs text-zinc-600 dark:text-zinc-300">Тренд к прошлому периоду</div>
                <div className="mt-1 text-lg font-semibold">{trend.text}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  {trend.delta !== null
                    ? `Δ среднего: ${trend.delta > 0 ? '+' : ''}${trend.delta.toFixed(2)} (было ${avgPrev !== null ? avgPrev.toFixed(1) : '—'})`
                    : 'Нужны записи в текущем и прошлом периоде.'}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
                <div className="text-xs text-zinc-600 dark:text-zinc-300">Плохие дни (≤ {BAD_MOOD_MAX})</div>
                <div className="mt-1 text-2xl font-semibold">{badDaysCount}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  {recordedDays ? `${Math.round((badDaysCount / recordedDays) * 100)}% от дней с записями` : 'Нет записей'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold">Настроение по дням</div>
              <div className="mt-2 flex h-24 items-end gap-px overflow-x-auto rounded-xl border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
                {currentDates.map((d) => {
                  const e = map.get(d);
                  const h = e ? Math.max(8, (e.mood / 10) * 100) : 6;
                  return (
                    <button
                      key={d}
                      type="button"
                      title={e ? `${d}: ${e.mood}` : `${d}: нет записи`}
                      onClick={() => nav(`/day/${d}`)}
                      className="group flex min-w-[6px] flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className="w-full max-w-[14px] rounded-sm border border-zinc-200/80 dark:border-zinc-800/80"
                        style={{
                          height: `${h}%`,
                          background: e ? e.colorHex : 'transparent',
                          borderStyle: e ? 'solid' : 'dashed',
                        }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-zinc-500">Клик по столбику — открыть день.</div>
            </div>

            <div>
              <div className="text-sm font-semibold">Плохие периоды (подряд)</div>
              {badPeriods.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                  Нет подряд идущих «плохих» дней с записями в выбранном периоде.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {badPeriods.map((p) => (
                    <li
                      key={`${p.from}_${p.to}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950/40"
                    >
                      <div className="text-sm">
                        <span className="font-medium">
                          {p.from === p.to ? p.from : `${p.from} — ${p.to}`}
                        </span>
                        <span className="ml-2 text-zinc-600 dark:text-zinc-300">
                          ({p.days} {p.days === 1 ? 'день' : p.days < 5 ? 'дня' : 'дней'}, ср. {p.avgMood.toFixed(1)})
                        </span>
                      </div>
                      <button
                        type="button"
                        className="text-sm underline"
                        onClick={() => nav(`/day/${p.from}`)}
                      >
                        Открыть
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
