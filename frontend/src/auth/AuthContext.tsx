import { createContext, useContext } from 'react';

export type User = { id: number; email: string; emotionPaletteSetAt: string | null };

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'guest'; user: null }
  | { status: 'authed'; user: User };

export type AuthContextValue = {
  state: AuthState;
  refresh: () => Promise<void>;
  setGuest: () => void;
};

export const AuthContext = createContext<AuthContextValue>({
  state: { status: 'loading', user: null },
  refresh: async () => {},
  setGuest: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

