import { Navigate, Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/LoginPage';
import { TodayPage } from './pages/TodayPage';
import { useAuth } from './auth/AuthContext';
import { SetupColorsPage } from './pages/SetupColorsPage';
import { YearPage } from './pages/YearPage';
import { WeekPage } from './pages/WeekPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="p-6">Загрузка…</div>;
  if (state.status !== 'authed') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePalette({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="p-6">Загрузка…</div>;
  if (state.status !== 'authed') return <Navigate to="/login" replace />;
  if (!state.user.emotionPaletteSetAt) return <Navigate to="/setup-colors" replace />;
  return <>{children}</>;
}

function SmartRedirect() {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="p-6">Загрузка…</div>;
  if (state.status === 'guest') return <Navigate to="/login" replace />;
  if (!state.user.emotionPaletteSetAt) return <Navigate to="/setup-colors" replace />;
  return <Navigate to="/today" replace />;
}

function LoginOrRedirect() {
  const { state } = useAuth();
  if (state.status === 'loading') return <div className="p-6">Загрузка…</div>;
  if (state.status === 'guest') return <LoginPage />;
  if (!state.user.emotionPaletteSetAt) return <Navigate to="/setup-colors" replace />;
  return <Navigate to="/today" replace />;
}

function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/login" element={<LoginOrRedirect />} />
        <Route
          path="/setup-colors"
          element={
            <RequireAuth>
              <SetupColorsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/today"
          element={
            <RequirePalette>
              <TodayPage />
            </RequirePalette>
          }
        />
        <Route
          path="/day/:date"
          element={
            <RequirePalette>
              <TodayPage />
            </RequirePalette>
          }
        />
        <Route
          path="/year"
          element={
            <RequirePalette>
              <YearPage />
            </RequirePalette>
          }
        />
        <Route
          path="/week"
          element={
            <RequirePalette>
              <WeekPage />
            </RequirePalette>
          }
        />
        <Route
          path="/analytics"
          element={
            <RequirePalette>
              <AnalyticsPage />
            </RequirePalette>
          }
        />
        <Route path="/" element={<SmartRedirect />} />
        <Route path="*" element={<SmartRedirect />} />
      </Routes>
    </Shell>
  );
}

export default App;