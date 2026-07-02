import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import RegisterPage  from './pages/Register';
import LoginPage     from './pages/Login';
import DashboardPage from './pages/Dashboard';
import { tokenStore } from './api/client';

function RequireAuth({ children }: { children: ReactNode }) {
  return tokenStore.getLogin() ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  return tokenStore.getLogin() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<Navigate to="/login" replace />} />
        <Route path="/register"  element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
        <Route path="/login"     element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
        <Route path="/dashboard" element={
          <RequireAuth><DashboardPage /></RequireAuth>
        } />
        <Route path="*"          element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
