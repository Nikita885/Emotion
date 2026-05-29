export type ApiError = {
  error: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const data = (isJson ? await res.json() : null) as unknown;

  if (!res.ok) {
    let msg = `HTTP_${res.status}`;
    if (data && typeof data === 'object' && 'error' in (data as any)) {
      msg = String((data as any).error);
    }
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      request<{ user: { id: number; email: string; emotionPaletteSetAt?: string | null } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    login: (email: string, password: string) =>
      request<{ user: { id: number; email: string; emotionPaletteSetAt?: string | null } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () =>
      request<{ user: { id: number; email: string; emotionPaletteSetAt: string | null } | null }>('/auth/me'),
    logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  },
  emotions: {
    list: () =>
      request<{
        emotions: { id: number; slug: string; title: string; defaultColorHex: string }[];
      }>('/emotions'),
  },
  me: {
    getEmotionColors: () =>
      request<{ items: { emotionId: number; colorHex: string }[]; paletteSetAt: string | null }>(
        '/me/emotion-colors',
      ),
    putEmotionColors: (items: { emotionId: number; colorHex: string }[]) =>
      request<{ ok: true }>('/me/emotion-colors', {
        method: 'PUT',
        body: JSON.stringify({ items }),
      }),
  },
  entries: {
    listRange: (from: string, to: string) =>
      request<{
        entries: { date: string; mood: number; colorHex: string; emotions: string[]; note: string | null }[];
      }>(`/entries?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
    getByDate: (date: string) =>
      request<{
        entry:
          | { date: string; mood: number; colorHex: string; emotions: string[]; note: string | null }
          | null;
      }>(`/entries/${date}`),
    upsert: (
      date: string,
      body: { mood: number; colorHex: string; emotions: string[]; note?: string | null },
    ) =>
      request<{
        entry: { date: string; mood: number; colorHex: string; emotions: string[]; note: string | null };
      }>(`/entries/${date}`, { method: 'PUT', body: JSON.stringify(body) }),
  },
};

