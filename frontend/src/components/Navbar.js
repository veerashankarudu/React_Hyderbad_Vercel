import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationBell from './NotificationBell';
import ChangePasswordModal from './ChangePasswordModal';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import API from '../api';
import {
  LayoutDashboard, PenLine, Columns3, ClipboardCheck, Target,
  Zap, BarChart3, TrendingUp, UserRound, Brain, Gamepad2,
  BookOpen, Trophy, FolderCog, Library, Users, Star, ScrollText,
  Sun, Moon, Mail, KeyRound, ImagePlus, LogOut, ChevronDown, Settings
} from 'lucide-react';
import './Navbar.css';

const ICON_SIZE = 18;

const NAV_ITEMS = [
  { path: '/', labelKey: 'nav.dashboard', icon: <LayoutDashboard size={ICON_SIZE} />, exact: true },
  { path: '/my-questions', labelKey: 'nav.myQuestions', icon: <PenLine size={ICON_SIZE} /> },
  { path: '/kanban', labelKey: 'nav.kanban', icon: <Columns3 size={ICON_SIZE} /> },
  { path: '/pending-reviews', labelKey: 'nav.pendingReviews', icon: <ClipboardCheck size={ICON_SIZE} /> },
  { path: '/quiz-builder', labelKey: 'nav.quizBuilder', icon: <Target size={ICON_SIZE} /> },
  { path: '/live', labelKey: 'nav.liveQuiz', icon: <Zap size={ICON_SIZE} /> },
  { path: '/analytics', labelKey: 'nav.analytics', icon: <BarChart3 size={ICON_SIZE} /> },
  { path: '/reviewer-dashboard', labelKey: 'nav.myStats', icon: <TrendingUp size={ICON_SIZE} /> },
  { path: '/smart-interview-kit', labelKey: 'nav.resumeInterview', icon: <UserRound size={ICON_SIZE} /> },
  { path: '/ai-studio', labelKey: 'nav.aiStudio', icon: <Brain size={ICON_SIZE} /> },
  { path: '/question-types', labelKey: 'nav.questionTypes', icon: <Gamepad2 size={ICON_SIZE} /> },
  { path: '/rulebook', labelKey: 'nav.ruleBook', icon: <BookOpen size={ICON_SIZE} /> },
  { path: '/leaderboard', labelKey: 'nav.leaderboard', icon: <Trophy size={ICON_SIZE} /> },
];

const ADMIN_ITEMS = [
  { path: '/master-data', labelKey: 'nav.masterData', icon: <FolderCog size={ICON_SIZE} /> },
  { path: '/question-bank', labelKey: 'nav.questionBank', icon: <Library size={ICON_SIZE} /> },
  { path: '/user-management', labelKey: 'nav.users', icon: <Users size={ICON_SIZE} /> },
  { path: '/reviewer-metrics', labelKey: 'nav.reviewerMetrics', icon: <Star size={ICON_SIZE} /> },
  { path: '/audit-log', labelKey: 'nav.auditLog', icon: <ScrollText size={ICON_SIZE} /> },
  { path: '/admin-settings', labelKey: 'nav.settings', icon: <Settings size={ICON_SIZE} /> },
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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('dashTheme') !== 'light');
  const [inboxUnread, setInboxUnread] = useState(0);
  const profileMenuRef = React.useRef(null);
  const profilePicInputRef = React.useRef(null);
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('profilePic') || null);

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

  // Close profile menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleProfilePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem('profilePic', dataUrl);
      setProfilePic(dataUrl);
    };
    reader.readAsDataURL(file);
    setShowProfileMenu(false);
  };

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <button className="sb-logo" onClick={() => { navigate('/'); setMobileOpen(false); }} type="button">
        <div className="sb-logo-icon"><Brain size={20} /></div>
        {!collapsed && (
          <div className="sb-logo-text">
            <span className="sb-logo-name">QuizHub AI</span>
            <span className="sb-logo-sub">by Bumble Bee 2026</span>
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

      {/* Navigation */}
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

      {/* Mobile-only: show bottom items in drawer */}
      <div className="sb-bottom sb-bottom-mobile-only">
        <button
          className="sb-dark-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
          type="button"
        >
          <span>{darkMode ? <Sun size={16} /> : <Moon size={16} />}</span>
          <span className="sb-dark-label">{darkMode ? t('nav.lightMode') : t('nav.darkMode')}</span>
        </button>
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
          ><LogOut size={14} /></button>
        </div>
      </div>
      </div>{/* end sb-drawer */}
    </aside>

    {/* ─── TOP BAR (fixed top-right) ──────────────────── */}
    <header className={`topbar${collapsed ? ' topbar-collapsed' : ''}`}>
      <div className="topbar-actions">
        {/* Dark / Light mode pill toggle */}
        <button
          className="topbar-theme-toggle"
          onClick={toggleDarkMode}
          title={darkMode ? t('nav.lightMode') : t('nav.darkMode')}
          type="button"
          aria-label="Toggle theme"
        >
          <span className={`topbar-theme-opt${!darkMode ? ' active' : ''}`}><Sun size={14} /></span>
          <span className={`topbar-theme-opt${darkMode ? ' active' : ''}`}><Moon size={14} /></span>
        </button>

        {/* Language Picker */}
        <div className="topbar-lang-wrap">
          <button
            className="topbar-btn"
            onClick={() => { setShowLangPicker(p => !p); setShowProfileMenu(false); }}
            title="Language / भाषा"
            type="button"
          >
            {LANGUAGES.find(l => l.code === i18n.language)?.flag || '🌐'}
            <span className="topbar-lang-code">{(i18n.language || 'en').toUpperCase()}</span>
          </button>
          {showLangPicker && (
            <div className="topbar-lang-dropdown">
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

        <div className="topbar-divider" />

        {/* Inbox */}
        <button
          type="button"
          className="topbar-btn"
          onClick={() => { navigate('/inbox'); setMobileOpen(false); }}
          title={t('nav.inbox')}
        >
          <span className="topbar-icon-wrap">
            <Mail size={18} />
            {inboxUnread > 0 && (
              <span className="topbar-badge">{inboxUnread > 99 ? '99+' : inboxUnread}</span>
            )}
          </span>
        </button>

        {/* Notifications */}
        <div className="topbar-notif-wrap">
          <NotificationBell />
        </div>

        <div className="topbar-divider" />

        {/* Profile Avatar + Dropdown */}
        <div className="topbar-profile-wrap" ref={profileMenuRef}>
          <button
            className="topbar-avatar-btn"
            onClick={() => { setShowProfileMenu(p => !p); setShowLangPicker(false); }}
            type="button"
            aria-label="Profile menu"
          >
            {profilePic ? (
              <img src={profilePic} alt="Profile" className="topbar-avatar-img" />
            ) : (
              <div className="topbar-avatar">{buildInitials(user?.fullName)}</div>
            )}
            <div className="topbar-avatar-info">
              <span className="topbar-user-name">{user?.enterpriseId || user?.fullName || '—'}</span>
              <span className={`sb-role ${user?.role?.toLowerCase()}`}>
                {user?.role === 'ADMIN' ? 'admin' : 'expert'}
              </span>
            </div>
            <span className={`topbar-chevron${showProfileMenu ? ' open' : ''}`}><ChevronDown size={14} /></span>
          </button>

          {showProfileMenu && (
            <div className="topbar-profile-dropdown">
              <div className="topbar-dropdown-header">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="topbar-dropdown-avatar-img" />
                ) : (
                  <div className="topbar-dropdown-avatar">{buildInitials(user?.fullName)}</div>
                )}
                <div>
                  <div className="topbar-dropdown-name">{user?.fullName || user?.enterpriseId || '—'}</div>
                  <div className="topbar-dropdown-email">{user?.enterpriseId}</div>
                </div>
              </div>
              <div className="topbar-dropdown-divider" />
              <button
                className="topbar-dropdown-item"
                onClick={() => { profilePicInputRef.current?.click(); }}
                type="button"
              >
                <span className="topbar-dropdown-icon"><ImagePlus size={16} /></span>
                Update Profile Picture
              </button>
              <button
                className="topbar-dropdown-item"
                onClick={() => { setShowChangePwd(true); setShowProfileMenu(false); }}
                type="button"
              >
                <span className="topbar-dropdown-icon"><KeyRound size={16} /></span>
                {t('nav.changePassword')}
              </button>
              {location.pathname === '/' && (
                <button
                  className="topbar-dropdown-item"
                  onClick={() => { window.dispatchEvent(new CustomEvent('open-dashboard-customize')); setShowProfileMenu(false); }}
                  type="button"
                >
                  <span className="topbar-dropdown-icon"><Settings size={16} /></span>
                  Customize Dashboard
                </button>
              )}
              <div className="topbar-dropdown-divider" />
              <button
                className="topbar-dropdown-item topbar-dropdown-danger"
                onClick={() => { logout(); navigate('/login'); setShowProfileMenu(false); }}
                type="button"
              >
                <span className="topbar-dropdown-icon"><LogOut size={16} /></span>
                {t('nav.signOut')}
              </button>
            </div>
          )}
          <input
            ref={profilePicInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleProfilePicChange}
          />
        </div>
      </div>
    </header>

    {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}
    </>
  );
}
