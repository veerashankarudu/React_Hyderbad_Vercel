import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import API from '../api';
import { useAuth } from '../AuthContext';
import { translateText } from '../utils/translateContent';
import './ChatBot.css';

const POLL_INTERVAL = 3000;

function BotAvatar({ size = 32 }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="chatbot-bot-svg">
      {/* Head */}
      <rect x="8" y="10" width="24" height="20" rx="6" fill="url(#botGrad)" />
      {/* Eyes */}
      <circle cx="15" cy="18" r="3" fill="white" />
      <circle cx="25" cy="18" r="3" fill="white" />
      <circle cx="16" cy="18.5" r="1.4" fill="#1E1B4B" className="chatbot-bot-eye" />
      <circle cx="26" cy="18.5" r="1.4" fill="#1E1B4B" className="chatbot-bot-eye" />
      {/* Eye shine */}
      <circle cx="16.7" cy="17.7" r="0.5" fill="white" />
      <circle cx="26.7" cy="17.7" r="0.5" fill="white" />
      {/* Mouth */}
      <rect x="14" y="24" width="12" height="2.5" rx="1.25" fill="white" opacity="0.85" />
      {/* Antenna */}
      <line x1="20" y1="10" x2="20" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="4" r="2" fill="#A78BFA" className="chatbot-bot-antenna" />
      {/* Ears */}
      <rect x="4" y="16" width="4" height="6" rx="2" fill="url(#botGrad)" />
      <rect x="32" y="16" width="4" height="6" rx="2" fill="url(#botGrad)" />
      <defs>
        <linearGradient id="botGrad" x1="8" y1="10" x2="32" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
    </svg>
  );
}
const HEARTBEAT_INTERVAL = 20000;
const EMOJI_LIST = ['👍', '❤️', '😂', '🔥', '👏'];
const SLASH_COMMANDS = [
  { cmd: '/create',        descKey: 'chatbot.cmdCreateDesc',      path: '/mcq/create' },
  { cmd: '/quiz-builder',  descKey: 'chatbot.cmdQuizBuilderDesc', path: '/quiz-builder' },
  { cmd: '/leaderboard',   descKey: 'chatbot.cmdLeaderboardDesc', path: '/leaderboard' },
  { cmd: '/question-bank', descKey: 'chatbot.cmdQBankDesc',       path: '/question-bank' },
  { cmd: '/help',          descKey: 'chatbot.cmdHelpDesc',        action: 'help' },
];

function buildInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseContent(text) {
  return escapeHtml(text).replace(/(@[\w.]+)/g, '<span class="chat-mention">$1</span>');
}

function parseReactions(json) {
  try { return (json && json !== '{}') ? JSON.parse(json) : {}; } catch { return {}; }
}

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
  } catch (_ignored) { /* audio not available in this environment */ }
}

BotAvatar.propTypes = { size: PropTypes.number };

export default function ChatBot() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Core state ───────────────────────────────────────────────────────────
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [unread, setUnread]       = useState(0);

  // ── New feature state ────────────────────────────────────────────────────
  const [replyTo, setReplyTo]               = useState(null);
  const [editingId, setEditingId]           = useState(null);
  const [editContent, setEditContent]       = useState('');
  const [showSearch, setShowSearch]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [onlineSet, setOnlineSet]           = useState(new Set());
  const [onlineUsers, setOnlineUsers]       = useState([]);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);
  const [showHistory, setShowHistory]       = useState(false);
  const [pinnedMsg, setPinnedMsg]           = useState(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState(null);
  const [mentionSugs, setMentionSugs]       = useState([]);
  const [slashSugs, setSlashSugs]           = useState([]);
  const [hoveredId, setHoveredId]           = useState(null);
  const [knownUsers, setKnownUsers]         = useState([]);

  // ── Bot message translations ─────────────────────────────────────────────
  const [txBotMsgs, setTxBotMsgs] = useState({});
  const txBotMsgsRef = useRef({});

  // ── Drag state ────────────────────────────────────────────────────────────
  const [fabPos, setFabPos]       = useState({ right: 24, bottom: 24 });
  const [showGreeting, setShowGreeting] = useState(true);
  const isDragging  = useRef(false);
  const dragStart   = useRef({ x: 0, y: 0, right: 24, bottom: 24 });
  const fabRef      = useRef(null);

  // ── Refs ─────────────────────────────────────────────────────────────────
  const lastTsRef    = useRef(null);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const pollRef      = useRef(null);
  const hbRef        = useRef(null);
  const pollCntRef   = useRef(0);
  const openRef      = useRef(false);
  const seenIdsRef   = useRef(new Set());

  const isUserAdmin = user?.role === 'ADMIN';

  // ── Build known-users list from chat history ─────────────────────────────
  useEffect(() => {
    const map = new Map();
    map.set('bot', t('chatbot.botName'));
    messages.forEach(m => { if (m.senderEnterpriseId !== 'bot') map.set(m.senderEnterpriseId, m.senderName); });
    setKnownUsers([...map.entries()].map(([id, name]) => ({ enterpriseId: id, name })));
  }, [messages]);

  // ── Track pinned message ─────────────────────────────────────────────────
  useEffect(() => {
    setPinnedMsg(messages.find(m => m.pinned && !m.deleted) || null);
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // ── Translate bot messages when language changes ──────────────────────────
  useEffect(() => {
    const lang = i18n.language;
    if (!lang || lang === 'en') { txBotMsgsRef.current = {}; setTxBotMsgs({}); return; }
    const botMsgs = messages.filter(m => m.msgType === 'BOT' && m.content && !m.deleted);
    if (!botMsgs.length) return;
    const untranslated = botMsgs.filter(m => !txBotMsgsRef.current[`${lang}:${m.id}`]);
    if (!untranslated.length) return;
    untranslated.forEach(m => {
      translateText(m.content, lang).then(translated => {
        txBotMsgsRef.current[`${lang}:${m.id}`] = translated;
        setTxBotMsgs(prev => ({ ...prev, [`${lang}:${m.id}`]: translated }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, i18n.language]);

  // ── Fetch & merge messages ───────────────────────────────────────────────
  const fetchMessages = useCallback(async (since) => {
    try {
      const params = since ? { since } : {};
      const { data } = await API.get('/chat/messages', { params });
      if (!data?.length) return;

      const lastSeenKey  = user ? `quizhub_chat_seen_${user.enterpriseId}` : null;
      const lastSeenStr  = lastSeenKey ? localStorage.getItem(lastSeenKey) : null;
      const lastSeenDate = lastSeenStr ? new Date(lastSeenStr) : null;

      if (since) {
        // Incremental add of new messages
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !existingIds.has(m.id));
          if (!newMsgs.length) return prev;
          if (!openRef.current) {
            const fresh = newMsgs.filter(m => {
              if (m.senderEnterpriseId === user?.enterpriseId) return false;
              if (lastSeenDate && new Date(m.createdAt) <= lastSeenDate) return false;
              if (seenIdsRef.current.has(m.id)) return false;
              return true;
            });
            if (fresh.length > 0) { setUnread(u => u + fresh.length); playBeep(); }
            fresh.forEach(m => seenIdsRef.current.add(m.id));
          }
          const updated = [...prev, ...newMsgs];
          if (updated.length) lastTsRef.current = updated.at(-1).createdAt;
          return updated;
        });
      } else {
        // Full refresh — update existing messages (reactions, edits, pins) + add new
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !existingIds.has(m.id));
          if (!openRef.current && newMsgs.length > 0) {
            const fresh = newMsgs.filter(m => {
              if (m.senderEnterpriseId === user?.enterpriseId) return false;
              if (lastSeenDate && new Date(m.createdAt) <= lastSeenDate) return false;
              if (seenIdsRef.current.has(m.id)) return false;
              return true;
            });
            if (fresh.length > 0) { setUnread(u => u + fresh.length); playBeep(); }
            fresh.forEach(m => seenIdsRef.current.add(m.id));
          }
          // Merge server data over local state (picks up reactions/edits/pins by others)
          const serverMap = new Map(data.map(m => [m.id, m]));
          const merged = prev.map(m => serverMap.has(m.id) ? { ...m, ...serverMap.get(m.id) } : m);
          const combined = [...merged, ...newMsgs];
          if (combined.length) lastTsRef.current = combined.at(-1).createdAt;
          return combined;
        });
      }
    } catch { /* network error */ }
  }, [user]);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const { data } = await API.get('/chat/online-users');
      setOnlineSet(new Set(data.map(u => u.enterpriseId)));
      setOnlineUsers(data);
    } catch { /* ignore */ }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    try { await API.post('/chat/heartbeat'); } catch { /* ignore */ }
  }, []);

  // ── Init + polling ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const lsKey = `quizhub_chat_seen_${user.enterpriseId}`;
    if (!localStorage.getItem(lsKey)) localStorage.setItem(lsKey, new Date().toISOString());
    fetchMessages(null);
    fetchOnlineUsers();
    sendHeartbeat();
  }, [user, fetchMessages, fetchOnlineUsers, sendHeartbeat]);

  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(() => {
      pollCntRef.current++;
      // Full refresh every 30 s to pick up reactions/edits/pins from others
      const since = pollCntRef.current % 10 === 0 ? null : lastTsRef.current;
      fetchMessages(since);
      fetchOnlineUsers();
    }, POLL_INTERVAL);
    hbRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    return () => { clearInterval(pollRef.current); clearInterval(hbRef.current); };
  }, [user, fetchMessages, fetchOnlineUsers, sendHeartbeat]);

  useEffect(() => { if (open) scrollToBottom(); }, [messages, open, scrollToBottom]);

  // ── Open / close ─────────────────────────────────────────────────────────
  const handleOpen = () => {
    setOpen(true); openRef.current = true;
    setUnread(0);
    if (user) localStorage.setItem(`quizhub_chat_seen_${user.enterpriseId}`, new Date().toISOString());
    messages.forEach(m => seenIdsRef.current.add(m.id));
    setTimeout(() => inputRef.current?.focus(), 100);
  };
  const handleClose = () => {
    setOpen(false); openRef.current = false;
    setShowSearch(false); setSearchQuery('');
    setEmojiPickerFor(null); setHoveredId(null);
  };

  // ── Reactions ────────────────────────────────────────────────────────────
  const handleReact = async (msgId, emoji) => {
    setEmojiPickerFor(null);
    try {
      const { data } = await API.post(`/chat/messages/${msgId}/react`, { emoji });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: data.reactions } : m));
    } catch { /* ignore */ }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (msgId) => {
    if (!window.confirm(t('chatbot.deleteConfirm'))) return;
    try {
      await API.delete(`/chat/messages/${msgId}`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true, content: '[This message was deleted]' } : m));
    } catch { /* ignore */ }
  };

  // ── Edit ─────────────────────────────────────────────────────────────────
  const startEdit = (msg) => { setEditingId(msg.id); setEditContent(msg.content); };
  const saveEdit  = async (msgId) => {
    if (!editContent.trim()) return;
    try {
      const { data } = await API.put(`/chat/messages/${msgId}`, { content: editContent });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: data.content, editedAt: data.editedAt } : m));
      setEditingId(null);
    } catch { /* ignore */ }
  };

  // ── Pin ──────────────────────────────────────────────────────────────────
  const handlePin = async (msgId) => {
    try {
      const { data } = await API.put(`/chat/messages/${msgId}/pin`);
      setMessages(prev => prev.map(m => {
        if (m.pinned && m.id !== msgId) return { ...m, pinned: false };
        if (m.id === msgId) return { ...m, pinned: data.pinned };
        return m;
      }));
    } catch { /* ignore */ }
  };

  // ── Reply ────────────────────────────────────────────────────────────────
  const handleReply = (msg) => {
    setReplyTo({ id: msg.id, senderName: msg.senderName, content: msg.deleted ? '[deleted]' : msg.content });
    setEmojiPickerFor(null);
    inputRef.current?.focus();
  };

  // ── Input change (autocomplete) ──────────────────────────────────────────
  const handleInputChange = (value) => {
    setInput(value);
    if (value.startsWith('/')) {
      const q = value.toLowerCase();
      setSlashSugs(SLASH_COMMANDS.filter(c => c.cmd.startsWith(q)));
      setMentionSugs([]);
      return;
    }
    setSlashSugs([]);
    const lastAt = value.lastIndexOf('@');
    if (lastAt >= 0) {
      const afterAt = value.substring(lastAt + 1);
      if (!afterAt.includes(' ') && afterAt.length <= 20) {
        const q = afterAt.toLowerCase();
        setMentionSugs(knownUsers.filter(u => u.enterpriseId.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)).slice(0, 5));
        return;
      }
    }
    setMentionSugs([]);
  };

  const selectMention = (u) => {
    const lastAt = input.lastIndexOf('@');
    setInput(input.substring(0, lastAt) + '@' + u.enterpriseId + ' ');
    setMentionSugs([]);
    inputRef.current?.focus();
  };

  const selectSlash = (s) => {
    if (s.path) { navigate(s.path); handleClose(); }
    else if (s.action === 'help') setInput('@bot help');
    setSlashSugs([]);
  };

  const insertMention = (tag) => {
    setInput(prev => prev + (prev.endsWith(' ') || !prev ? '' : ' ') + tag);
    inputRef.current?.focus();
  };

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    // Slash command shortcut
    const slashMatch = SLASH_COMMANDS.find(c => content === c.cmd);
    if (slashMatch) {
      if (slashMatch.path) { navigate(slashMatch.path); setInput(''); return; }
      if (slashMatch.action === 'help') { setInput('@bot help'); return; }
    }
    setSending(true);
    const payload = { content, ...(replyTo ? { replyToId: replyTo.id } : {}) };
    setInput(''); setReplyTo(null);
    try {
      const { data } = await API.post('/chat/messages', payload);
      if (data?.length) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMsgs = data.filter(m => !existingIds.has(m.id));
          const updated = [...prev, ...newMsgs];
          if (updated.length) lastTsRef.current = updated.at(-1).createdAt;
          return updated;
        });
      }
    } catch { /* ignore */ }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mentionSugs.length > 0 || slashSugs.length > 0) return;
      if (editingId) { saveEdit(editingId); return; }
      handleSend();
    }
    if (e.key === 'Escape') {
      setMentionSugs([]); setSlashSugs([]);
      if (editingId) setEditingId(null);
      else if (replyTo) setReplyTo(null);
    }
    if (e.key === 'ArrowUp' && !input && !editingId) {
      const lastOwn = [...messages].reverse().find(m => m.senderEnterpriseId === user.enterpriseId && !m.deleted);
      if (lastOwn) startEdit(lastOwn);
    }
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()) || m.senderName?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleFabMouseDown = (e) => {
    isDragging.current = false;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      right: fabPos.right,
      bottom: fabPos.bottom,
    };
    const vw = document.documentElement.clientWidth;
    let latestPos = { right: fabPos.right, bottom: fabPos.bottom };
    const onMove = (mv) => {
      const dx = mv.clientX - dragStart.current.x;
      const dy = mv.clientY - dragStart.current.y;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging.current = true;
      if (!isDragging.current) return;
      const newRight  = Math.max(8, Math.min(vw - 70, dragStart.current.right  - dx));
      const newBottom = Math.max(8, Math.min(document.documentElement.clientHeight - 70, dragStart.current.bottom - dy));
      latestPos = { right: newRight, bottom: newBottom };
      setFabPos(latestPos);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (!isDragging.current) return;
      // Snap to nearest side (left or right) — never stay in the middle
      const fabLeft = vw - latestPos.right - 58;
      const snapToLeft = fabLeft < vw / 2;
      setFabPos(prev => ({
        bottom: prev.bottom,
        right: snapToLeft ? (vw - 58 - 16) : 16,
      }));
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleFabClick = (e) => {
    if (isDragging.current) { isDragging.current = false; return; }
    setShowGreeting(false);
    if (open) handleClose(); else handleOpen();
  };

  if (!user) return null;

  return (
    <>
      {/* ── Greeting bubble ─────────────────────────────────── */}
      {showGreeting && !open && (
        <div
          className="chatbot-greeting-bubble"
          style={{ right: fabPos.right + 66, bottom: fabPos.bottom + 8 }}
        >
          <span className="chatbot-greeting-wave">👋</span> {t('chatbot.greetingBubble')}
          <button className="chatbot-greeting-close" onClick={() => setShowGreeting(false)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ── Floating action button ───────────────────────────── */}
      <button
        ref={fabRef}
        className={`chatbot-fab ${open ? 'chatbot-fab-open' : ''}`}
        style={{ right: fabPos.right, bottom: fabPos.bottom }}
        onMouseDown={handleFabMouseDown}
        onClick={handleFabClick}
        title="AI Collab Hub — drag to move"
        aria-label="Open AI Collab Hub"
      >
        {open ? '✕' : <BotAvatar size={28} />}
        {!open && unread > 0 && <span className="chatbot-fab-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {/* ── Panel ────────────────────────────────────────────── */}
      {open && (
        <div className="chatbot-panel" role="presentation" onClick={() => { setEmojiPickerFor(null); setHoveredId(null); }} onKeyDown={() => {}}>

          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-header-bot-avatar">
                <BotAvatar size={34} />
                <span className="chatbot-header-bot-pulse" />
              </div>
              <div className="chatbot-header-text">
                <div className="chatbot-header-title">
                  {t('chatbot.title')}
                  {onlineSet.size > 0 && (
                    <button
                      className="chatbot-online-count chatbot-online-count-btn"
                      onClick={e => { e.stopPropagation(); setShowOnlinePanel(p => !p); }}
                      title="Click to see who's online"
                    >
                      🟢 {onlineSet.size} online
                      {showOnlinePanel && (
                        <div className="chatbot-online-panel" onClick={e => e.stopPropagation()}>
                          <div className="chatbot-online-panel-title">{t('chatbot.onlineNow')}</div>
                          {onlineUsers.map(u => (
                            <div key={u.enterpriseId} className="chatbot-online-user-row">
                              <div className="chatbot-online-avatar">
                                {(u.fullName || u.enterpriseId).split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()}
                              </div>
                              <div className="chatbot-online-user-info">
                                <span className="chatbot-online-user-name">{u.fullName || u.enterpriseId}</span>
                                {u.role === 'ADMIN' && <span className="chatbot-role-badge">Admin</span>}
                                <span className="chatbot-online-dot-inline">🟢</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  )}
                </div>
                {showSearch ? (
                  <input
                    className="chatbot-search-input"
                    placeholder={t('chatbot.searchPlaceholder')}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); } }}
                    autoFocus
                  />
                ) : (
                  <div className="chatbot-header-sub">
                    <code>@bot</code> AI · <code>@user</code> mention · <code>/</code> commands
                  </div>
                )}
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className={`chatbot-header-btn chatbot-header-history-btn${showHistory ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); setShowHistory(h => !h); setShowSearch(false); setSearchQuery(''); }}
                title={t('chatbot.chatHistory')}
              >📋 {t('chatbot.historyBtn')}</button>
              <button className="chatbot-header-btn" onClick={e => { e.stopPropagation(); setShowSearch(s => !s); if (showSearch) setSearchQuery(''); setShowHistory(false); }} title="Search">🔍</button>
              <button className="chatbot-close" onClick={handleClose}>✕</button>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="chatbot-shortcuts" onClick={e => e.stopPropagation()}>
            <button className="chatbot-shortcut" onClick={() => insertMention('@bot ')}>🤖 @bot</button>
            <button className="chatbot-shortcut chatbot-shortcut-help" onClick={() => setInput('🆘 Need help!')}>🆘 Help</button>
            <button className="chatbot-shortcut" onClick={() => insertMention('@bot difficulty ')} title="Rate difficulty">📊 Difficulty</button>
            <button className="chatbot-shortcut" onClick={() => insertMention('@bot bloom ')} title="Bloom's taxonomy">🌸 Bloom</button>
            <button className="chatbot-shortcut" onClick={() => insertMention('@bot proofread ')} title="Proofread MCQ">✏️ Proofread</button>
            <button className="chatbot-shortcut" onClick={() => insertMention('@bot check ')} title="Check distractors">🎯 Check</button>
          </div>

          {/* Pinned message banner */}
          {pinnedMsg && (
            <div className="chatbot-pin-banner" onClick={e => e.stopPropagation()}>
              <span className="chatbot-pin-icon">📌</span>
              <div className="chatbot-pin-content">
                <strong>{pinnedMsg.senderName}:</strong>{' '}
                {pinnedMsg.content.length > 65 ? pinnedMsg.content.substring(0, 65) + '…' : pinnedMsg.content}
              </div>
              {isUserAdmin && <button className="chatbot-pin-remove" onClick={() => handlePin(pinnedMsg.id)} title="Unpin">×</button>}
            </div>
          )}

          {/* Search result count */}
          {searchQuery && (
            <div className="chatbot-search-count">
              {filteredMessages.length} result{filteredMessages.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </div>
          )}

          {/* History overlay */}
          {showHistory && (
            <div className="chatbot-history-panel" onClick={e => e.stopPropagation()}>
              <div className="chatbot-history-header">
                <span>📋 {t('chatbot.chatHistory')}</span>
                <span className="chatbot-history-count">{messages.filter(m => !m.deleted).length} messages</span>
              </div>
              <div className="chatbot-history-list">
                {messages.filter(m => !m.deleted).map(m => (
                  <div key={m.id} className={`chatbot-history-row${m.msgType === 'BOT' ? ' chatbot-history-bot' : ''}`}>
                    <div className="chatbot-history-avatar">
                      {m.msgType === 'BOT' ? <BotAvatar size={24} /> : buildInitials(m.senderName)}
                    </div>
                    <div className="chatbot-history-body">
                      <div className="chatbot-history-meta">
                  <span className="chatbot-history-name">{m.msgType === 'BOT' ? t('chatbot.botName') : m.senderName}</span>
                        <span className="chatbot-history-time">{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="chatbot-history-text">{m.content.length > 80 ? m.content.substring(0, 80) + '…' : m.content}</div>
                    </div>
                  </div>
                ))}
                {messages.filter(m => !m.deleted).length === 0 && (
                  <div className="chatbot-history-empty">{t('chatbot.noMessages')}</div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="chatbot-messages" style={showHistory ? {display:'none'} : {}}>
            {filteredMessages.length === 0 && !searchQuery && (
              <div className="chatbot-empty">
                <span>👋</span>
                <p>{t('chatbot.noMessages')}</p>
              </div>
            )}
            {filteredMessages.length === 0 && searchQuery && (
              <div className="chatbot-empty">
                <span>🔍</span>
                <p>{t('chatbot.noResults', { q: searchQuery })}</p>
              </div>
            )}
            {filteredMessages.map((msg) => {
              const isBot  = msg.msgType === 'BOT';
              const isMe   = msg.senderEnterpriseId === user.enterpriseId;
              const isOnline = onlineSet.has(msg.senderEnterpriseId);
              const rxns   = parseReactions(msg.reactions);
              const hasRxns = Object.keys(rxns).length > 0;

              return (
                <div
                  key={msg.id}
                  className={`chatbot-msg${isMe ? ' chatbot-msg-me' : ''}${isBot ? ' chatbot-msg-bot' : ''}${msg.deleted ? ' chatbot-msg-deleted' : ''}`}
                  onMouseEnter={() => setHoveredId(msg.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Avatar */}
                  {!isMe && (
                    <div className="chatbot-avatar-wrap">
                      <div className={`chatbot-avatar${isBot ? ' chatbot-avatar-bot' : ''}`}>
                        {isBot ? <BotAvatar size={30} /> : buildInitials(msg.senderName)}
                      </div>
                      {!isBot && isOnline && <span className="chatbot-online-dot" />}
                    </div>
                  )}

                  {/* Bubble area */}
                  <div className="chatbot-bubble-wrap">
                    {!isMe && (
                      <div className="chatbot-sender">
                        {isBot ? t('chatbot.botName') : msg.senderName}
                        {!isBot && <span className="chatbot-eid"> @{msg.senderEnterpriseId}</span>}
                        {msg.senderRole === 'ADMIN' && <span className="chatbot-role-badge">Admin</span>}
                      </div>
                    )}

                    {/* Reply quote */}
                    {msg.replyToContent && (
                      <div className="chatbot-reply-quote">
                        <span className="chatbot-reply-sender">{msg.replyToSender}</span>
                        <span className="chatbot-reply-text">
                          {msg.replyToContent.length > 80 ? msg.replyToContent.substring(0, 80) + '…' : msg.replyToContent}
                        </span>
                      </div>
                    )}

                    {/* Inline edit */}
                    {editingId === msg.id ? (
                      <div className="chatbot-edit-form" onClick={e => e.stopPropagation()}>
                        <textarea
                          className="chatbot-edit-input"
                          value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(msg.id); } if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                        />
                        <div className="chatbot-edit-actions">
                          <button className="chatbot-edit-save" onClick={() => saveEdit(msg.id)}>{t('chatbot.save')}</button>
                          <button className="chatbot-edit-cancel" onClick={() => setEditingId(null)}>{t('chatbot.cancel')}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="chatbot-bubble" dangerouslySetInnerHTML={{ __html: parseContent(txBotMsgs[`${i18n.language}:${msg.id}`] || msg.content) }} />
                    )}

                    {/* Meta row */}
                    <div className="chatbot-meta">
                      <span className="chatbot-time">{formatTime(msg.createdAt)}</span>
                      {msg.editedAt && <span className="chatbot-edited-label">{t('chatbot.edited')}</span>}
                      {msg.pinned && <span className="chatbot-pin-label">📌</span>}
                    </div>

                    {/* Reactions row */}
                    {(hasRxns || emojiPickerFor === msg.id) && (
                      <div className="chatbot-reactions" onClick={e => e.stopPropagation()}>
                        {Object.entries(rxns).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            className={`chatbot-reaction${users.includes(user.enterpriseId) ? ' chatbot-reaction-me' : ''}`}
                            onClick={() => handleReact(msg.id, emoji)}
                            title={users.join(', ')}
                          >
                            {emoji} {users.length}
                          </button>
                        ))}
                        {emojiPickerFor === msg.id && (
                          <div className="chatbot-emoji-picker">
                            {EMOJI_LIST.filter(e => !rxns[e]).map(e => (
                              <button key={e} className="chatbot-emoji-opt" onClick={() => handleReact(msg.id, e)}>{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hover action toolbar — below bubble, anchored to bubble-wrap */}
                    {hoveredId === msg.id && !editingId && (
                      <div className={`chatbot-msg-actions${isMe ? ' chatbot-msg-actions-left' : ' chatbot-msg-actions-right'}`} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleReply(msg)} title="Reply">↩</button>
                        <button onClick={e => { e.stopPropagation(); setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id); }} title="React">😊</button>
                        {isMe && !msg.deleted && <button onClick={() => startEdit(msg)} title="Edit">✏️</button>}
                        {(isMe || isUserAdmin) && !msg.deleted && <button onClick={() => handleDelete(msg.id)} title="Delete">🗑️</button>}
                        {isUserAdmin && !msg.deleted && <button onClick={() => handlePin(msg.id)} title={msg.pinned ? 'Unpin' : 'Pin'}>{msg.pinned ? '📌' : '📍'}</button>}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div className="chatbot-reply-bar" onClick={e => e.stopPropagation()}>
              <div className="chatbot-reply-bar-content">
                <span className="chatbot-reply-bar-icon">↩</span>
                <div>
                  <div className="chatbot-reply-bar-name">{t('chatbot.replyPlaceholder', { name: replyTo.senderName })}</div>
                  <div className="chatbot-reply-bar-text">{replyTo.content.length > 60 ? replyTo.content.substring(0, 60) + '…' : replyTo.content}</div>
                </div>
              </div>
              <button className="chatbot-reply-bar-close" onClick={() => setReplyTo(null)}>×</button>
            </div>
          )}

          {/* Autocomplete suggestions (mentions + slash) */}
          {(mentionSugs.length > 0 || slashSugs.length > 0) && (
            <div className="chatbot-suggestions" onClick={e => e.stopPropagation()}>
              {mentionSugs.map(u => (
                <button key={u.enterpriseId} className="chatbot-suggestion-item" onClick={() => selectMention(u)}>
                  <span className="chatbot-suggestion-id">@{u.enterpriseId}</span>
                  <span className="chatbot-suggestion-name">{u.name}</span>
                  {onlineSet.has(u.enterpriseId) && <span className="chatbot-suggestion-online">🟢</span>}
                </button>
              ))}
              {slashSugs.map(s => (
                <button key={s.cmd} className="chatbot-suggestion-item chatbot-suggestion-slash" onClick={() => selectSlash(s)}>
                  <span className="chatbot-suggestion-cmd">{s.cmd}</span>
                  <span className="chatbot-suggestion-desc">{t(s.descKey)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chatbot-input-row" style={showHistory ? {display:'none'} : {}} onClick={e => e.stopPropagation()}>
            <textarea
              ref={inputRef}
              className="chatbot-input"
              rows={1}
              placeholder={replyTo ? t('chatbot.replyPlaceholder', { name: replyTo.senderName }) : t('chatbot.messagePlaceholder')}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button className="chatbot-send" onClick={handleSend} disabled={!input.trim() || sending} title="Send (Enter)">
              {sending ? '…' : '➤'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

