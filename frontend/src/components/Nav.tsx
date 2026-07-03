import { NavLink, useNavigate } from 'react-router-dom';
import { tokenStore } from '../api/client';

export default function Nav() {
  const navigate = useNavigate();
  const isAuthed = Boolean(tokenStore.getLogin());

  function handleLogout() {
    tokenStore.clearLogin();
    navigate('/');
  }

  return (
    <nav className="app-nav">
      <NavLink to="/" className="logo" style={{ color: 'inherit' }}>
        <div className="logo-mark">I</div>
        Ignition
      </NavLink>
      <div className="nav-links">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Home
        </NavLink>
        {isAuthed ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
              Dashboard
            </NavLink>
            <button onClick={handleLogout}>Log out</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'active' : '')}>
              Login
            </NavLink>
            <NavLink to="/register" className="nav-cta">
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}