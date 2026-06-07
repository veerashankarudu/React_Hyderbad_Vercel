import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';
import ChangePasswordModal from './ChangePasswordModal';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import API from '../api';
import './Navbar.css';

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.dashboard', icon: '⊞', exact: true },
  { path: '/my-questions', labelKey: 'nav.myQuestions', icon: '✍️' },
  { path: '/kanban', labelKey: 'nav.kanban', icon: '📋' },
  { path: '/pending-reviews', labelKey: 'nav.pendingReviews', icon: '🔍' },
  { path: '/bulk-upload', labelKey: 'nav.bulkUpload', icon: '📤' },
  { path: '/quiz-builder', labelKey: 'nav.quizBuilder', icon: '🎯' },
  { path: '/live', labelKey: 'nav.liveQuiz', icon: '⚡' },
  { path: '/analytics', labelKey: 'nav.analytics', icon: '📊' },
  { path: '/reviewer-dashboard', labelKey: 'nav.myStats', icon: '📈' },
  { path: '/screenshot-mcq', labelKey: 'nav.screenshotMcq', icon: '📸' },
  { path: '/smart-interview-kit', labelKey: 'nav.resumeInterview', icon: '🧑‍💼' },
  { path: '/ai-studio', labelKey: 'nav.aiStudio', icon: '🧠' },
  { path: '/question-types', labelKey: 'nav.questionTypes', icon: '🎮' },
  { path: '/rulebook', labelKey: 'nav.ruleBook', icon: '📖' },
  { path: '/leaderboard', labelKey: 'nav.leaderboard', icon: '🏆' },
];

const ADMIN_ITEMS = [
  { path: '/master-data', labelKey: 'nav.masterData', icon: '🗂️' },
  { path: '/question-bank', labelKey: 'nav.questionBank', icon: '🏛️' },
  { path: '/user-management', labelKey: 'nav.users', icon: '👥' },
  { path: '/reviewer-metrics', labelKey: 'nav.reviewerMetrics', icon: '⭐' },
  { path: '/audit-log', labelKey: 'nav.auditLog', icon: '📑' },
];

function buildInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === 'true');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dashTheme') !== 'light');
  const [inboxUnread, setInboxUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = () => {
      API.get('/inbox/unread-count').then(r => {
        const val = r.data?.count ?? r.data ?? 0;
        setInboxUnread(typeof val === 'number' ? val : 0);
      }).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggle = () => {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('sb-collapsed', String(next));
      document.body.dataset.sb = next ? 'collapsed' : 'expanded';
      return next;
    });
  };

  // Sync body attribute on mount; remove it when Navbar unmounts (e.g. navigating to Login/Register)
  React.useEffect(() => {
    document.body.dataset.sb = collapsed ? 'collapsed' : 'expanded';
    return () => { delete document.body.dataset.sb; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('dashTheme', next ? 'dark' : 'light');
      document.body.classList.toggle('dark-mode', next);
      return next;
    });
  };

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <button className="sb-logo" onClick={() => { navigate('/'); setMobileOpen(false); }} type="button">
        <div className="sb-logo-icon">🧠</div>
        {!collapsed && (
          <div className="sb-logo-text">
            <span className="sb-logo-name">QuizHub AI</span>
            <span className="sb-logo-sub">Hack-N-Stack 2026</span>
          </div>
        )}
      </button>

      {/* App title visible on mobile between logo and hamburger */}
      <span className="sb-mobile-title">QuizHub AI</span>

      {/* Hamburger (mobile only) */}
      <button className="sb-hamburger" onClick={() => setMobileOpen(o => !o)} type="button" aria-label="Toggle menu">
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Collapse toggle */}
      <button className={`sb-toggle${collapsed ? ' collapsed' : ''}`} onClick={toggle} type="button" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        {collapsed ? '›' : '‹'}
      </button>

      {/* Navigation + Bottom wrapped for mobile scroll */}
      <div className="sb-drawer">
      <nav className="sb-nav">
        <span className="sb-section-label">{t('nav.main')}</span>
        {NAV_ITEMS.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`sb-link ${isActive(item.path, item.exact) ? 'active' : ''}`}
            title={collapsed ? t(item.labelKey) : ''}
            onClick={() => setMobileOpen(false)}
          >
            <span className="sb-link-icon">{item.icon}</span>
            {!collapsed && <span className="sb-link-label">{t(item.labelKey)}</span>}
          </Link>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <span className="sb-section-label" style={{ marginTop: '0.75rem' }}>{t('nav.admin')}</span>
            {ADMIN_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`sb-link ${isActive(item.path) ? 'active' : ''}`}
                title={collapsed ? t(item.labelKey) : ''}
                onClick={() => setMobileOpen(false)}
              >
                <span className="sb-link-icon">{item.icon}</span>
                {!collapsed && <span className="sb-link-label">{t(item.labelKey)}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: dark mode toggle + language + notifications + user */}
      <div className="sb-bottom">
        {/* Dark / Light mode toggle */}
        <button
          className="sb-dark-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
          type="button"
        >
          <span>{darkMode ? '☀️' : '🌙'}</span>
          {!collapsed && <span className="sb-dark-label">{darkMode ? t('nav.lightMode') : t('nav.darkMode')}</span>}
        </button>

        {/* Language Picker */}
        <div className="sb-lang-row">
          <button
            className="sb-lang-btn"
            onClick={() => setShowLangPicker(p => !p)}
            title="Language / भाषा"
            type="button"
          >
            <span>{LANGUAGES.find(l => l.code === i18n.language)?.flag || '🌐'}</span>
            {!collapsed && <span className="sb-lang-code">{(i18n.language || 'en').toUpperCase()}</span>}
          </button>
          {showLangPicker && (
            <div className="sb-lang-dropdown">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  type="button"
                  className={`sb-lang-option${i18n.language === lang.code ? ' active' : ''}`}
                  onClick={() => { i18n.changeLanguage(lang.code); setShowLangPicker(false); }}
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="sb-inbox-row"
          onClick={() => { navigate('/inbox'); setMobileOpen(false); }}
          title={t('nav.inbox')}
        >
          <span className="sb-inbox-icon-wrap">
            <span style={{ fontSize: '1rem' }}>✉️</span>
            {inboxUnread > 0 && (
              <span className="sb-inbox-badge">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
            )}
          </span>
          {!collapsed && <span className="sb-notif-label" style={{ pointerEvents: 'none' }}>{t('nav.inbox')}</span>}
        </button>
        <div className="sb-notif-row">
          <NotificationBell />
          {!collapsed && (
            <span
              className="sb-notif-label sb-notif-label-click"
              onClick={() => document.querySelector('.notif-bell-btn')?.click()}
            >
              {t('nav.notifications')}
            </span>
          )}
        </div>
        <button
          type="button"
          className="sb-inbox-row"
          onClick={() => setShowChangePwd(true)}
          title={t('nav.changePassword')}
        >
          <span className="sb-inbox-icon-wrap">
            <span style={{ fontSize: '1rem' }}>🔑</span>
          </span>
          {!collapsed && <span className="sb-notif-label" style={{ pointerEvents: 'none' }}>{t('nav.changePassword')}</span>}
        </button>

        {!collapsed && (
          <div className="sb-user">
            <div className="sb-avatar">{buildInitials(user?.fullName)}</div>
            <div className="sb-user-info">
              <span className="sb-user-name" title={user?.fullName}>
                {user?.enterpriseId || user?.fullName || '—'}
              </span>
              <span className={`sb-role ${user?.role?.toLowerCase()}`}>
                {user?.role === 'ADMIN' ? 'admin' : 'expert'}
              </span>
            </div>
            <button
              className="sb-logout"
              onClick={() => { logout(); navigate('/login'); }}
              title={t('nav.signOut')}
            >↪</button>
          </div>
        )}
        {collapsed && (
          <>
            <button className="sb-logout sb-logout-collapsed" onClick={() => { logout(); navigate('/login'); }} title={t('nav.signOut')}>↪</button>
          </>
        )}
      </div>
      </div>{/* end sb-drawer */}

      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </aside>
  );
}
