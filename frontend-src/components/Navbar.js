import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname.startsWith(path) ? 'nav-link active' : 'nav-link';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span className="nav-logo">🎯</span>
        <span>Smart Quiz AI Hub</span>
      </div>
      <div className="nav-links">
        <Link to="/my-questions" className={isActive('/my-questions')}>My Questions</Link>
        <Link to="/pending-reviews" className={isActive('/pending-reviews')}>Pending Reviews</Link>
        {user?.role === 'ADMIN' && (
          <>
            <Link to="/question-bank" className={isActive('/question-bank')}>Question Bank</Link>
            <Link to="/bulk-upload" className={isActive('/bulk-upload')}>Bulk Upload</Link>
          </>
        )}
      </div>
      <div className="nav-user">
        <span className="user-info">
          <span className={`role-badge ${user?.role?.toLowerCase()}`}>{user?.role}</span>
          {user?.enterpriseId}
        </span>
        <button onClick={handleLogout} className="btn-logout">Logout</button>
      </div>
    </nav>
  );
}
