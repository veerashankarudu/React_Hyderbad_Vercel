import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, CheckCircle2, XCircle, Send, MessageSquare, Download, Bell } from 'lucide-react';
import API from '../api';
import './NotificationBell.css';

const TYPE_FILTERS = [
  { value: '', labelKey: 'nb.typeAll' },
  { value: 'ASSIGNED', labelKey: 'nb.typeAssigned' },
  { value: 'APPROVED', labelKey: 'nb.typeApproved' },
  { value: 'REJECTED', labelKey: 'nb.typeRejected' },
  { value: 'SUBMITTED', labelKey: 'nb.typeSubmitted' },
  { value: 'MENTION', labelKey: 'nb.typeMention' },
  { value: 'DOWNLOAD', labelKey: 'nb.typeDownloads' },
];

const TYPE_META = {
  ASSIGNED:  { icon: <ClipboardCheck size={16} />, labelKey: 'nb2.typeAssigned',  color: '#6983FF' },
  APPROVED:  { icon: <CheckCircle2 size={16} />, labelKey: 'nb2.typeApproved',   color: '#059669' },
  REJECTED:  { icon: <XCircle size={16} />, labelKey: 'nb2.typeRejected',   color: '#DC2626' },
  SUBMITTED: { icon: <Send size={16} />, labelKey: 'nb2.typeSubmitted',  color: '#0284C7' },
  MENTION:   { icon: <MessageSquare size={16} />, labelKey: 'nb2.typeMention',    color: '#D97706' },
  DOWNLOAD:  { icon: <Download size={16} />, labelKey: 'nb2.typeDownload',   color: '#0284C7' },
};

function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function groupByDate(notifications) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const groups = { Today: [], Yesterday: [], Older: [] };
  for (const n of notifications) {
    const d = new Date(n.createdAt); d.setHours(0, 0, 0, 0);
    if (d >= today) groups.Today.push(n);
    else if (d >= yesterday) groups.Yesterday.push(n);
    else groups.Older.push(n);
  }
  return groups;
}

function ActorAvatar({ initials, name, type }) {
  const color = TYPE_META[type]?.color || '#6983FF';
  return (
    <span
      className="notif-avatar"
      title={name || 'System'}
      style={{ background: color }}
    >
      {initials || 'SY'}
    </span>
  );
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('direct');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const fetchCount = useCallback(async () => {
    try {
      const { data } = await API.get('/notifications/unread-count');
      setUnreadCount(data.count || 0);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async (type) => {
    setLoading(true);
    try {
      const params = type ? `?type=${type}` : '';
      const { data } = await API.get(`/notifications${params}`);
      setNotifications(data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const openDropdown = async () => {
    if (!open) await fetchNotifications(typeFilter);
    setOpen((v) => !v);
  };

  const handleTypeFilter = async (t) => {
    setTypeFilter(t);
    await fetchNotifications(t);
  };

  const handleMarkAllRead = async () => {
    try {
      await API.post('/notifications/mark-all-read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleMarkOne = async (e, n) => {
    e.stopPropagation();
    try {
      await API.post(`/notifications/${n.id}/read`);
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const handleNotifClick = async (n) => {
    if (!n.read) {
      try {
        await API.post(`/notifications/${n.id}/read`);
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {}
    }
    if (n.mcqId) navigate(`/mcq/${n.mcqId}`);
    setOpen(false);
  };

  const displayed = notifications.filter((n) => !onlyUnread || !n.read);
  const groups = groupByDate(displayed);
  const unreadInView = notifications.filter((n) => !n.read).length;

  return (
    <div className="notif-bell-wrap" ref={wrapRef}>
      <button className="notif-bell-btn" onClick={openDropdown} aria-label="Notifications">
        <span className="notif-bell-icon"><Bell size={20} /></span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-dropdown">
          {/* Header */}
          <div className="notif-header">
            <span className="notif-title">{t('nb.title')}</span>
            <label className="notif-unread-toggle">
              <span>{t('nb.onlyUnread')}</span>
              <span
                className={`toggle-switch ${onlyUnread ? 'on' : ''}`}
                role="switch"
                aria-checked={onlyUnread}
                tabIndex={0}
                onClick={() => setOnlyUnread((v) => !v)}
                onKeyDown={(e) => e.key === 'Enter' && setOnlyUnread((v) => !v)}
              >
                <span className="toggle-thumb" />
              </span>
            </label>
          </div>

          {/* Tabs */}
          <div className="notif-tabs">
            <button
              className={`notif-tab ${tab === 'direct' ? 'active' : ''}`}
              onClick={() => setTab('direct')}
            >
              {t('nb.tabDirect')}
            </button>
            <button
              className={`notif-tab ${tab === 'watching' ? 'active' : ''}`}
              onClick={() => setTab('watching')}
            >
              {t('nb.tabWatching')}
            </button>
          </div>

          {tab === 'watching' ? (
            <div className="notif-empty">
              <span style={{ fontSize: '2rem' }}>👁️</span>
              <p>{t('nb.noWatched')}</p>
              <span className="notif-empty-sub">{t('nb.watchedSub')}</span>
            </div>
          ) : (
            <>
              {/* Type filter chips */}
              <div className="notif-filters">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    className={`notif-chip ${typeFilter === f.value ? 'active' : ''}`}
                    onClick={() => handleTypeFilter(f.value)}
                  >
                    {t(f.labelKey)}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                {unreadInView > 0 && (
                  <button className="notif-mark-all" onClick={handleMarkAllRead}>
                    {t('nb.markAllRead')}
                  </button>
                )}
              </div>

              {/* Notification list */}
              <div className="notif-list">
                {loading && (
                  <div className="notif-empty">
                    <div className="notif-spinner" />
                  </div>
                )}
                {!loading && displayed.length === 0 && (
                  <div className="notif-empty">
                    <span style={{ fontSize: '2rem' }}>🔕</span>
                    <p>{onlyUnread ? t('nb.noUnread') : t('nb.no30Days')}</p>
                  </div>
                )}
                {!loading && ['Today', 'Yesterday', 'Older'].map((groupName) => {
                  const items = groups[groupName];
                  if (!items.length) return null;
                  return (
                    <div key={groupName} className="notif-group">
                      <div className="notif-group-label">{t(`nb.group${groupName}`)}</div>
                      {items.map((n) => {
                        const meta = TYPE_META[n.type] || { icon: <Bell size={16} />, label: n.type, color: '#6B7280' };
                        return (
                          <div
                            key={n.id}
                            className={`notif-item ${n.read ? '' : 'unread'}`}
                            onClick={() => handleNotifClick(n)}
                          >
                            <ActorAvatar initials={n.actorInitials} name={n.actorName} type={n.type} />
                            <div className="notif-body">
                              <div className="notif-actor-row">
                                <span className="notif-actor">{n.actorName || 'System'}</span>
                                <span className="notif-action-label" style={{ color: meta.color }}>
                                  {n.type === 'ASSIGNED'  ? t('nb.assignedAction')
                                  : n.type === 'APPROVED' ? t('nb.approvedAction')
                                  : n.type === 'REJECTED' ? t('nb.rejectedAction')
                                  : n.type === 'SUBMITTED' ? t('nb.submittedAction')
                                  : n.type === 'DOWNLOAD' ? t('nb.downloadAction')
                                  : t(meta.labelKey)}
                                </span>
                                <span className="notif-time">{formatTime(n.createdAt)}</span>
                              </div>
                              <p className="notif-message">{n.message}</p>
                              {n.mcqRef && (
                                <div className="notif-ref-row">
                                  <span className="notif-type-icon">{meta.icon}</span>
                                  <span className="notif-ref">{n.mcqRef}</span>
                                  <span className="notif-status-pill" style={{ color: meta.color }}>
                                    {n.type === 'ASSIGNED' ? t('nb.pendingReview')
                                    : n.type === 'APPROVED' ? t('common.approved')
                                    : n.type === 'REJECTED' ? t('common.rejected')
                                    : n.type === 'SUBMITTED' ? t('nb.pendingReview')
                                    : n.type === 'MENTION' ? 'Mention'
                                    : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="notif-right">
                              {!n.read && (
                                <button
                                  className="notif-unread-dot"
                                  title="Mark as read"
                                  onClick={(e) => handleMarkOne(e, n)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
