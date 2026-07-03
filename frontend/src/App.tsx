import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import HomePage      from './pages/Home';
import RegisterPage  from './pages/Register';
import LoginPage     from './pages/Login';
import DashboardPage from './pages/Dashboard';
import Nav from './components/Nav';
import { ToastProvider } from './components/Toast';
import { tokenStore } from './api/client';

function RequireAuth({ children }: { children: ReactNode }) {
  return tokenStore.getLogin() ? children : <Navigate to="/login" replace />;
}

function RedirectIfAuth({ children }: { children: ReactNode }) {
  return tokenStore.getLogin() ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/register"  element={<RedirectIfAuth><RegisterPage /></RedirectIfAuth>} />
          <Route path="/login"     element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />
          <Route path="/dashboard" element={
            <RequireAuth><DashboardPage /></RequireAuth>
          } />
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}