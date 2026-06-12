import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './KeyboardShortcuts.css';

// ═══════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS — Press ? to show cheatsheet
// Global shortcuts + context-aware per-page shortcuts
// ═══════════════════════════════════════════════════════════════

const GLOBAL_SHORTCUTS = [
  { keys: ['?'], description: 'Show this shortcuts panel' },
  { keys: ['Ctrl', 'K'], description: 'Quick search / command palette' },
  { keys: ['Ctrl', 'N'], description: 'Create new question' },
  { keys: ['Ctrl', '/'], description: 'Toggle sidebar' },
  { keys: ['Ctrl', 'D'], description: 'Go to Dashboard' },
  { keys: ['Ctrl', 'Shift', 'D'], description: 'Toggle dark/light mode' },
  { keys: ['Esc'], description: 'Close modal / panel' },
  { keys: ['Alt', 'T'], description: 'Toggle notifications' },
];

const PAGE_SHORTCUTS = {
  '/': [
    { keys: ['R'], description: 'Refresh dashboard stats' },
    { keys: ['W'], description: 'Toggle widget customizer' },
  ],
  '/my-questions': [
    { keys: ['N'], description: 'New question' },
    { keys: ['F'], description: 'Focus search/filter' },
    { keys: ['J'], description: 'Next question in list' },
    { keys: ['K'], description: 'Previous question in list' },
  ],
  '/pending-reviews': [
    { keys: ['A'], description: 'Approve selected' },
    { keys: ['R'], description: 'Reject selected' },
    { keys: ['J'], description: 'Next item' },
    { keys: ['K'], description: 'Previous item' },
  ],
  '/kanban': [
    { keys: ['←'], description: 'Move card left' },
    { keys: ['→'], description: 'Move card right' },
    { keys: ['F'], description: 'Filter cards' },
  ],
  '/question-bank': [
    { keys: ['F'], description: 'Focus search' },
    { keys: ['E'], description: 'Export questions' },
    { keys: ['B'], description: 'Bulk upload' },
  ],
  '/analytics': [
    { keys: ['1'], description: 'Overview tab' },
    { keys: ['2'], description: 'Trends tab' },
    { keys: ['3'], description: 'Breakdown tab' },
  ],
  '/live': [
    { keys: ['S'], description: 'Start new session' },
    { keys: ['J'], description: 'Join session' },
  ],
};

const NAV_SHORTCUTS = [
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'Q'], description: 'Go to My Questions' },
  { keys: ['G', 'K'], description: 'Go to Kanban Board' },
  { keys: ['G', 'R'], description: 'Go to Pending Reviews' },
  { keys: ['G', 'A'], description: 'Go to Analytics' },
  { keys: ['G', 'L'], description: 'Go to Leaderboard' },
  { keys: ['G', 'S'], description: 'Go to Settings' },
];

export default function KeyboardShortcuts() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingG, setPendingG] = useState(false);

  const close = useCallback(() => {
    setExiting(true);
    setTimeout(() => { setVisible(false); setExiting(false); }, 250);
  }, []);

  useEffect(() => {
    let gTimeout = null;

    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

      // Always allow Escape to close
      if (e.key === 'Escape' && visible) {
        close();
        return;
      }

      // Don't trigger shortcuts when typing in inputs (except Ctrl combos)
      if (isInput && !e.ctrlKey && !e.metaKey) return;

      // ? to open shortcuts
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setVisible(v => !v);
        return;
      }

      // Ctrl+K — Quick search (prevent default browser behavior)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus any search input on the page
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="earch"], input[placeholder*="ilter"]');
        if (searchInput) searchInput.focus();
        return;
      }

      // Ctrl+N — New question
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        navigate('/mcq/create');
        return;
      }

      // Ctrl+D — Dashboard
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
        e.preventDefault();
        navigate('/');
        return;
      }

      // Ctrl+Shift+D — Toggle dark mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('dashTheme', isDark ? 'dark' : 'light');
        return;
      }

      // Ctrl+/ — Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('collapsed');
        return;
      }

      // G + key navigation (vim-style "go to")
      if (!isInput) {
        if (e.key === 'g' && !pendingG) {
          setPendingG(true);
          gTimeout = setTimeout(() => setPendingG(false), 800);
          return;
        }

        if (pendingG) {
          setPendingG(false);
          clearTimeout(gTimeout);
          const routes = { d: '/', q: '/my-questions', k: '/kanban', r: '/pending-reviews', a: '/analytics', l: '/leaderboard', s: '/admin-settings' };
          const route = routes[e.key];
          if (route) { navigate(route); return; }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); clearTimeout(gTimeout); };
  }, [visible, close, navigate, pendingG]);

  if (!visible) return null;

  const currentPageShortcuts = PAGE_SHORTCUTS[location.pathname] || [];

  return (
    <div className={`kb-overlay ${exiting ? 'kb-exit' : 'kb-enter'}`} onClick={close}>
      <div className="kb-panel" onClick={e => e.stopPropagation()}>
        <div className="kb-header">
          <h2>⌨️ Keyboard Shortcuts</h2>
          <span className="kb-hint">Press <kbd>?</kbd> or <kbd>Esc</kbd> to close</span>
        </div>

        <div className="kb-body">
          {/* Global */}
          <div className="kb-section">
            <h3 className="kb-section-title">🌐 Global</h3>
            <div className="kb-grid">
              {GLOBAL_SHORTCUTS.map((s, i) => (
                <div key={i} className="kb-row">
                  <span className="kb-keys">{s.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}</span>
                  <span className="kb-desc">{s.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="kb-section">
            <h3 className="kb-section-title">🧭 Navigation (G + key)</h3>
            <div className="kb-grid">
              {NAV_SHORTCUTS.map((s, i) => (
                <div key={i} className="kb-row">
                  <span className="kb-keys">{s.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}</span>
                  <span className="kb-desc">{s.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Page-specific */}
          {currentPageShortcuts.length > 0 && (
            <div className="kb-section">
              <h3 className="kb-section-title">📄 This Page ({location.pathname})</h3>
              <div className="kb-grid">
                {currentPageShortcuts.map((s, i) => (
                  <div key={i} className="kb-row">
                    <span className="kb-keys">{s.keys.map((k, j) => <kbd key={j}>{k}</kbd>)}</span>
                    <span className="kb-desc">{s.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="kb-footer">
          <span>💡 Pro tip: Press <kbd>G</kbd> then a letter to navigate quickly</span>
        </div>
      </div>
    </div>
  );
}
