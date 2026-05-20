import React, { useEffect, useState, useCallback, useRef } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './Inbox.css';

const DRAFT_KEY = 'qh_inbox_draft';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function buildInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  return parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Inbox() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [tab, setTab] = useState('inbox'); // inbox | sent | starred | compose | drafts
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);

  // compose state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeSent, setComposeSent] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimerRef = useRef(null);

  // ── Load draft on mount ───────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.to) setComposeTo(d.to);
        if (d.subject) setComposeSubject(d.subject);
        if (d.body) setComposeBody(d.body);
      }
    } catch {}
  }, []);

  // ── Auto-save draft ───────────────────────────────────
  useEffect(() => {
    if (tab !== 'compose') return;
    clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (composeTo || composeSubject || composeBody) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ to: composeTo, subject: composeSubject, body: composeBody }));
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    }, 1500);
    return () => clearTimeout(draftTimerRef.current);
  }, [composeTo, composeSubject, composeBody, tab]);

  const hasDraft = !!(composeTo || composeSubject || composeBody) || !!localStorage.getItem(DRAFT_KEY);

  const loadMessages = useCallback(() => {
    if (tab === 'compose' || tab === 'drafts') return;
    setLoading(true);
    setSelected(null);
    setSearch('');
    const url = tab === 'sent' ? '/inbox/sent' : tab === 'starred' ? '/inbox/starred' : '/inbox';
    API.get(url)
      .then(r => {
        setMessages(r.data);
        if (tab === 'inbox') setTotalUnread(r.data.filter(m => !m.read).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useEffect(() => {
    API.get('/inbox/unread-count').then(r => setTotalUnread(r.data?.count ?? 0)).catch(() => {});
  }, []);

  const starMessage = (id) => {
    API.post(`/inbox/${id}/star`)
      .then(r => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: r.data.starred } : m));
        setSelected(prev => (prev?.id === id ? { ...prev, starred: r.data.starred } : prev));
      })
      .catch(() => {});
  };

  const openMessage = (msg) => {
    setSelected(msg);
    if (tab === 'inbox' && !msg.read) {
      API.post(`/inbox/${msg.id}/read`).catch(() => {});
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
      setTotalUnread(prev => Math.max(0, prev - 1));
    }
  };

  const deleteMessage = (id) => {
    API.delete(`/inbox/${id}`).then(() => {
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selected?.id === id) setSelected(null);
    }).catch(() => {});
  };

  const markAllRead = () => {
    API.post('/inbox/mark-all-read').then(() => {
      setMessages(prev => prev.map(m => ({ ...m, read: true })));
      setTotalUnread(0);
    }).catch(() => {});
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) return;
    setSending(true);
    setComposeError('');
    try {
      await API.post('/inbox/send', { to: composeTo.trim(), subject: composeSubject.trim(), body: composeBody.trim() });
      setComposeSent(true);
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
      localStorage.removeItem(DRAFT_KEY);
      setTimeout(() => { setComposeSent(false); setTab('sent'); }, 1500);
    } catch (err) {
      setComposeError(err.response?.data?.message || 'Failed to send. Check the recipient ID.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="inbox-container">
        <div className="inbox-header">
          <h1 className="inbox-title">{t('inboxPage.title')}</h1>
          <p className="inbox-subtitle">{t('inboxPage.subtitle')}</p>
        </div>

        <div className="inbox-layout">
          {/* Sidebar */}
          <div className="inbox-sidebar">
            <button
              className={`inbox-tab-btn${tab === 'inbox' ? ' active' : ''}`}
              onClick={() => setTab('inbox')}
            >
              <span>📥</span>
              <span>{t('inboxPage.tabInbox')}</span>
              {totalUnread > 0 && <span className="inbox-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>}
            </button>
            <button
              className={`inbox-tab-btn${tab === 'sent' ? ' active' : ''}`}
              onClick={() => setTab('sent')}
            >
              <span>📤</span>
              <span>{t('inboxPage.tabSent')}</span>
            </button>
            <button
              className={`inbox-tab-btn${tab === 'starred' ? ' active' : ''}`}
              onClick={() => setTab('starred')}
            >
              <span>⭐</span>
              <span>{t('inboxPage.tabStarred')}</span>
            </button>
            <button
              className={`inbox-tab-btn${tab === 'drafts' ? ' active' : ''}`}
              onClick={() => setTab('compose')}
            >
              <span>📝</span>
              <span>{t('inboxPage.tabDrafts')}</span>
              {hasDraft && <span className="inbox-badge draft-badge">1</span>}
            </button>
            <button
              className="inbox-compose-btn"
              onClick={() => setTab('compose')}
            >
              ✏️ {t('inboxPage.compose')}
            </button>

            {tab === 'inbox' && totalUnread > 0 && (
              <button className="inbox-mark-all" onClick={markAllRead}>
                {t('inboxPage.markAllRead')}
              </button>
            )}
          </div>

          {/* Message list */}
          {tab !== 'compose' && (
            <div className="inbox-list">
              <div className="inbox-list-header">
                <span className="inbox-list-title">
                  {tab === 'inbox' ? t('inboxPage.tabInbox') : tab === 'sent' ? t('inboxPage.tabSent') : t('inboxPage.tabStarred')}
                </span>
                {messages.length > 0 && <span className="inbox-list-count">{messages.length}</span>}
              </div>
              <div className="inbox-search-wrap">
                <input
                  className="inbox-search-input"
                  type="search"
                  placeholder={t('inboxPage.searchPlaceholder')}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {loading && (
                <div className="inbox-empty">
                  <span className="inbox-empty-icon">⏳</span>
                  <span className="inbox-empty-text">{t('inboxPage.loading')}</span>
                </div>
              )}
              {!loading && messages.length === 0 && (
                <div className="inbox-empty">
                  <span className="inbox-empty-icon">{tab === 'inbox' ? '✉️' : '📤'}</span>
                  <span className="inbox-empty-text">
                    {tab === 'inbox' ? t('inboxPage.emptyInbox') : tab === 'starred' ? t('inboxPage.emptyStarred') : t('inboxPage.emptySent')}
                  </span>
                </div>
              )}
              {messages.filter(m =>
                !search ||
                m.subject?.toLowerCase().includes(search.toLowerCase()) ||
                m.senderName?.toLowerCase().includes(search.toLowerCase()) ||
                m.recipientName?.toLowerCase().includes(search.toLowerCase())
              ).map(msg => {
                const isSystem = msg.messageType === 'SYSTEM';
                const avatarContent = isSystem
                    ? '🤖'
                    : buildInitials(tab === 'sent' ? msg.recipientName : msg.senderName);
                  return (
                <button
                  type="button"
                  key={msg.id}
                  className={`inbox-msg-row${selected?.id === msg.id ? ' selected' : ''}${!msg.read && tab === 'inbox' ? ' unread' : ''}`}
                  onClick={() => openMessage(msg)}
                >
                  <div className={`inbox-msg-avatar${isSystem ? ' system' : ''}`}>
                    {avatarContent}
                  </div>
                  <div className="inbox-msg-info">
                    <div className="inbox-msg-from">
                      {tab === 'sent' ? `${t('inboxPage.toPrefix')} ${msg.recipientName}` : msg.senderName}
                      {msg.messageType === 'SYSTEM' && <span className="inbox-system-tag">{t('inboxPage.systemTag')}</span>}
                    </div>
                    <div className="inbox-msg-subject">{msg.subject}</div>
                    <div className="inbox-msg-preview">{msg.body.slice(0, 60)}…</div>
                  </div>
                  <div className="inbox-msg-meta">
                    <span className="inbox-msg-time">{timeAgo(msg.sentAt)}</span>
                    <button
                      type="button"
                      className={`inbox-star-btn${msg.starred ? ' starred' : ''}`}
                      onClick={e => { e.stopPropagation(); starMessage(msg.id); }}
                      title={msg.starred ? 'Unstar' : 'Star'}
                    >★</button>
                    {!msg.read && tab === 'inbox' && <span className="inbox-unread-dot" />}
                  </div>
                </button>
              ); })}
            </div>
          )}

          {/* Compose panel */}
          {tab === 'compose' && (
            <div className="inbox-compose">
              <div className="inbox-compose-header">
                <span className="inbox-compose-header-title">{t('inboxPage.newMessage')}</span>
                {draftSaved && <span className="inbox-draft-saved">{t('inboxPage.draftSaved')}</span>}
                <button type="button" className="inbox-compose-header-close" onClick={() => { setTab('inbox'); }}>×</button>
              </div>
              <div className="inbox-compose-inner">
                {composeSent && <div className="inbox-compose-success">✅ Message sent successfully!</div>}
                {composeError && <div className="inbox-compose-error">{composeError}</div>}
                <form onSubmit={handleSend} className="inbox-compose-form">
                  <div className="inbox-compose-field">
                    <label>{t('inboxPage.from')}</label>
                    <span className="inbox-compose-from">{user?.fullName || user?.enterpriseId || 'Me'}</span>
                  </div>
                  <div className="inbox-compose-field">
                    <label htmlFor="compose-to">{t('inboxPage.toLabel')}</label>
                    <input
                      id="compose-to"
                      type="text"
                      placeholder={t('inboxPage.toPlaceholder')}
                      value={composeTo}
                      onChange={e => setComposeTo(e.target.value)}
                      disabled={sending}
                      required
                    />
                  </div>
                  <div className="inbox-compose-field">
                    <label htmlFor="compose-subject">{t('inboxPage.subject')}</label>
                    <input
                      id="compose-subject"
                      type="text"
                      placeholder={t('inboxPage.subjectPlaceholder')}
                      value={composeSubject}
                      onChange={e => setComposeSubject(e.target.value)}
                      disabled={sending}
                      required
                    />
                  </div>
                  <div className="inbox-compose-field body-field">
                    <label htmlFor="compose-body">{t('inboxPage.body')}</label>
                    <textarea
                      id="compose-body"
                      rows={9}
                      placeholder={t('inboxPage.bodyPlaceholder')}
                      value={composeBody}
                      onChange={e => setComposeBody(e.target.value)}
                      disabled={sending}
                      required
                    />
                  </div>
                  <div className="inbox-compose-actions">
                    <button type="submit" className="inbox-send-btn" disabled={sending}>
                      {sending ? t('inboxPage.sending') : t('inboxPage.send')}
                    </button>
                    <button
                      type="button"
                      className="inbox-discard-btn"
                      onClick={() => { setComposeTo(''); setComposeSubject(''); setComposeBody(''); localStorage.removeItem(DRAFT_KEY); setTab('inbox'); }}
                    >
                      {t('inboxPage.discard')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Message detail */}
          {tab !== 'compose' && selected && (
            <div className="inbox-detail">
              <div className="inbox-detail-toolbar">
                <button
                  className={`inbox-detail-action-btn${selected.starred ? ' starred' : ''}`}
                  onClick={() => starMessage(selected.id)}
                  title={selected.starred ? 'Unstar' : 'Star'}
                >
                  {selected.starred ? t('inboxPage.starred') : t('inboxPage.star')}
                </button>
                {tab === 'inbox' && selected.messageType === 'USER' && (
                  <button
                    className="inbox-detail-action-btn"
                    onClick={() => {
                      setComposeTo(selected.senderEnterpriseId);
                      setComposeSubject(`Re: ${selected.subject}`);
                      setComposeBody('');
                      setTab('compose');
                    }}
                  >
                    {t('inboxPage.reply')}
                  </button>
                )}
                <button
                  className="inbox-detail-action-btn danger"
                  onClick={() => deleteMessage(selected.id)}
                >
                  {t('inboxPage.delete')}
                </button>
              </div>
              <div className="inbox-detail-scroll">
                <h2 className="inbox-detail-subject">{selected.subject}</h2>
                <div className="inbox-detail-card">
                  <div className={`inbox-detail-avatar${selected.messageType === 'SYSTEM' ? ' system' : ''}`}>
                    {selected.messageType === 'SYSTEM' ? '🤖' : buildInitials(tab === 'sent' ? selected.recipientName : selected.senderName)}
                  </div>
                  <div className="inbox-detail-sender-info">
                    <div className="inbox-detail-sender-name">
                      {tab === 'sent'
                        ? `${t('inboxPage.toPrefix')} ${selected.recipientName}`
                        : selected.senderName}
                    </div>
                    <div className="inbox-detail-sender-id">
                      {tab === 'sent' ? selected.recipientEnterpriseId : selected.senderEnterpriseId}
                    </div>
                  </div>
                  <span className="inbox-detail-time">{new Date(selected.sentAt).toLocaleString()}</span>
                </div>
                {selected.mcqId && (
                  <div className="inbox-detail-mcqref">
                    {t('inboxPage.relatedMcq')} <a href={`/mcq/${selected.mcqId}`}>#{selected.mcqId}</a>
                  </div>
                )}
                <pre className="inbox-detail-body">{selected.body}</pre>
              </div>
            </div>
          )}

          {tab !== 'compose' && !selected && (
            <div className="inbox-detail inbox-detail-placeholder">
              <span className="inbox-detail-placeholder-icon">✉️</span>
              <p>{t('inboxPage.selectMessage')}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
