import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const MONTHS_RU = [
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

const WEEKDAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

function isLight(hex: string) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return true;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62;
}

function iso(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function startOfYear(year: number) {
  return new Date(Date.UTC(year, 0, 1, 0, 0, 0));
}

function endOfYear(year: number) {
  return new Date(Date.UTC(year, 11, 31, 0, 0, 0));
}

function getMondayBasedDow(date: Date) {
  // JS: 0=Вс..6=Сб -> нужно 0=Пн..6=Вс
  const js = date.getUTCDay();
  return (js + 6) % 7;
}

function daysInMonthUTC(year: number, month0: number) {
  // month0: 0..11
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function YearPage() {
  const nav = useNavigate();
  const nowYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState(nowYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emotions, setEmotions] = useState<Array<{ id: number; title: string; defaultColorHex: string }>>([]);
  const [paletteByEmotionId, setPaletteByEmotionId] = useState<Record<number, string>>({});
  const [filterEmotionId, setFilterEmotionId] = useState<number | null>(null);

  const [byDate, setByDate] = useState<Record<string, { colorHex: string; mood: number; emotions: string[] }>>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const from = iso(startOfYear(year));
        const to = iso(endOfYear(year));
        const [{ entries }, emotionsRes, paletteRes] = await Promise.all([
          api.entries.listRange(from, to),
          api.emotions.list(),
          api.me.getEmotionColors(),
        ]);
        if (!alive) return;

        setEmotions(emotionsRes.emotions);
        setPaletteByEmotionId(Object.fromEntries(paletteRes.items.map((i) => [i.emotionId, i.colorHex])));

        const next: Record<string, { colorHex: string; mood: number; emotions: string[] }> = {};
        for (const e of entries) {
          // backend отдаёт date как ISO; берём YYYY-MM-DD
          const key = String(e.date).slice(0, 10);
          next[key] = { colorHex: e.colorHex, mood: e.mood, emotions: e.emotions ?? [] };
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
  }, [year]);

  const filterTitle = useMemo(() => {
    if (!filterEmotionId) return null;
    return emotions.find((e) => e.id === filterEmotionId)?.title ?? null;
  }, [filterEmotionId, emotions]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Год: {year}</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Календарь записей с цветовым обозначением.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={() => setYear(nowYear)}
          >
            Сегодня
          </button>
          <button
            type="button"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            onClick={() => setYear((y) => y + 1)}
          >
            →
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {emotions.length > 0 ? (
          <div className="mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">Обозначение цветов</div>
              {filterEmotionId ? (
                <button
                  type="button"
                  className="text-sm text-zinc-600 underline dark:text-zinc-300"
                  onClick={() => setFilterEmotionId(null)}
                >
                  Сбросить фильтр
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {emotions.map((e) => {
                const color = paletteByEmotionId[e.id] ?? e.defaultColorHex;
                const active = filterEmotionId === e.id;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setFilterEmotionId((cur) => (cur === e.id ? null : e.id))}
                    className={[
                      'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition',
                      active
                        ? 'border-transparent ring-2 ring-zinc-900/20 dark:ring-white/20'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-950',
                    ].join(' ')}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-zinc-200 dark:border-zinc-800"
                      style={{ background: color }}
                    />
                    <span className="max-w-[10rem] truncate">{e.title}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              Нажмите на эмоцию, чтобы показать дни, где она отмечена (остальные приглушатся).
            </div>
          </div>
        ) : null}

        {loading ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Загрузка…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
            Ошибка: {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {MONTHS_RU.map((title, month0) => {
              const days = daysInMonthUTC(year, month0);
              const first = new Date(Date.UTC(year, month0, 1));
              const offset = getMondayBasedDow(first); // 0..6

              const cells: Array<{ day?: number; key: string }> = [];
              for (let i = 0; i < offset; i++) cells.push({ key: `e-${year}-${month0}-${i}` });
              for (let d = 1; d <= days; d++) cells.push({ day: d, key: `d-${year}-${month0}-${d}` });

              return (
                <div key={month0} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold">{title}</div>
                  </div>

                  <div className="mb-2 grid grid-cols-7 gap-1">
                    {WEEKDAYS_RU.map((d) => (
                      <div key={`${month0}-${d}`} className="text-center text-[11px] font-medium text-zinc-500">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((c) => {
                      if (!c.day) {
                        return <div key={c.key} className="h-9 w-9" />;
                      }

                      const d = new Date(Date.UTC(year, month0, c.day));
                      const key = iso(d);
                      const entry = byDate[key];
                      const bg = entry?.colorHex ?? 'transparent';
                      const has = Boolean(entry);
                      const matchesFilter = !filterTitle || (entry?.emotions ?? []).includes(filterTitle);

                      const tooltip = has
                        ? `${key}\nНастроение: ${entry!.mood}\nЭмоции: ${(entry!.emotions ?? []).join(', ')}`
                        : key;

                      const textColor = has ? (isLight(bg) ? '#0A0A0A' : '#FFFFFF') : undefined;

                      return (
                        <button
                          key={c.key}
                          title={tooltip}
                          type="button"
                          onClick={() => nav(`/day/${key}`)}
                          className={[
                            'h-9 w-9 select-none rounded-lg border px-1.5 py-1 text-[11px] leading-none',
                            has
                              ? 'border-zinc-200 dark:border-zinc-800'
                              : 'border-zinc-200/70 text-zinc-400 dark:border-zinc-800/70 dark:text-zinc-500',
                          ].join(' ')}
                          style={{
                            background: has ? bg : undefined,
                            color: textColor,
                            opacity: filterTitle && has && !matchesFilter ? 0.18 : 1,
                          }}
                        >
                          <div className="flex h-full items-start justify-start">
                            <span className="font-medium">{c.day}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

