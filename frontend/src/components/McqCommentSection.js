import React, { useState, useEffect, useRef } from 'react';
import API from '../api';
import { useAuth } from '../AuthContext';
import { useTranslation } from 'react-i18next';
import './McqCommentSection.css';

function buildInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(iso, t) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t('comments.justNow');
  if (diffMin < 60) return t('comments.mAgo', { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('comments.hAgo', { n: diffH });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parseContent(text) {
  return text.replace(/(@[\w.]+)/g, '<span class="comment-mention">$1</span>');
}

function CommentInput({ placeholder, onSubmit, submitting, onCancel }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (text.trim()) onSubmit(text.trim(), () => setText(''));
    }
    if (e.key === 'Escape' && onCancel) onCancel();
  };

  return (
    <div className="comment-input-wrap">
      <textarea
        ref={ref}
        className="comment-textarea"
        placeholder={placeholder || t('comments.placeholder')}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        rows={3}
        disabled={submitting}
      />
      <div className="comment-input-actions">
        {onCancel && (
          <button className="comment-btn-cancel" onClick={onCancel} disabled={submitting}>{t('comments.cancel')}</button>
        )}
        <button
          className="comment-btn-submit"
          onClick={() => text.trim() && onSubmit(text.trim(), () => setText(''))}
          disabled={!text.trim() || submitting}
        >
          {submitting ? t('comments.posting') : t('comments.post')}
        </button>
      </div>
    </div>
  );
}

function CommentItem({ comment, allComments, mcqId, currentUser, onReplyPosted, onDeleted }) {
  const { t } = useTranslation();
  const [showReply, setShowReply] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const replies = allComments.filter(c => c.parentId === comment.id);
  const isMe = comment.authorEnterpriseId === currentUser?.enterpriseId;

  const handleReply = async (text, reset) => {
    setSubmitting(true);
    try {
      const { data } = await API.post(`/mcqs/${mcqId}/comments/${comment.id}/reply`, { content: text });
      onReplyPosted(data);
      reset();
      setShowReply(false);
    } catch {}
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!window.confirm(t('comments.deleteConfirm'))) return;
    try {
      await API.delete(`/mcqs/${mcqId}/comments/${comment.id}`);
      onDeleted(comment.id);
    } catch {}
  };

  return (
    <div className="comment-item">
      <div className="comment-avatar">{buildInitials(comment.authorName)}</div>
      <div className="comment-body">
        <div className="comment-header-row">
          <span className="comment-author">{comment.authorName}</span>
          <span className="comment-eid">@{comment.authorEnterpriseId}</span>
          <span className="comment-time">{formatTime(comment.createdAt, t)}</span>
          {isMe && (
            <button className="comment-delete-btn" onClick={handleDelete} title="Delete">✕</button>
          )}
        </div>
        <div
          className="comment-content"
          dangerouslySetInnerHTML={{ __html: parseContent(comment.content) }}
        />
        <div className="comment-footer-row">
          <button className="comment-reply-btn" onClick={() => setShowReply(v => !v)}>
            {t('comments.reply')}
          </button>
          {replies.length > 0 && (
            <span className="comment-reply-count">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
          )}
        </div>

        {showReply && (
          <CommentInput
            placeholder={`Reply to ${comment.authorName}… @mention teammates · Ctrl+Enter to post`}
            onSubmit={handleReply}
            submitting={submitting}
            onCancel={() => setShowReply(false)}
          />
        )}

        {replies.length > 0 && (
          <div className="comment-replies">
            {replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                allComments={allComments}
                mcqId={mcqId}
                currentUser={currentUser}
                onReplyPosted={onReplyPosted}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function McqCommentSection({ mcqId }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!mcqId) return;
    API.get(`/mcqs/${mcqId}/comments`)
      .then(({ data }) => setComments(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mcqId]);

  const handlePost = async (text, reset) => {
    setSubmitting(true);
    try {
      const { data } = await API.post(`/mcqs/${mcqId}/comments`, { content: text });
      setComments(prev => [...prev, data]);
      reset();
    } catch {}
    setSubmitting(false);
  };

  const handleReplyPosted = (reply) => {
    setComments(prev => [...prev, reply]);
  };

  const handleDeleted = (id) => {
    setComments(prev => prev.filter(c => c.id !== id));
  };

  // Only top-level comments (parentId = null)
  const topLevel = comments.filter(c => c.parentId == null);
  const totalCount = comments.length;

  return (
    <div className="mcq-comment-section">
      <div className="mcs-header">
        <span className="mcs-title">💬 Discussion</span>
        {totalCount > 0 && (
          <span className="mcs-count">{totalCount} {totalCount === 1 ? 'comment' : 'comments'}</span>
        )}
      </div>

      <CommentInput
        placeholder="Start a discussion… @mention teammates · Ctrl+Enter to post"
        onSubmit={handlePost}
        submitting={submitting}
      />

      <div className="mcs-list">
        {loading && <div className="mcs-loading">Loading…</div>}
        {!loading && topLevel.length === 0 && (
          <div className="mcs-empty">
            <span>🗨️</span>
            <p>No discussion yet. Be the first to comment!</p>
          </div>
        )}
        {topLevel.map(c => (
          <CommentItem
            key={c.id}
            comment={c}
            allComments={comments}
            mcqId={mcqId}
            currentUser={user}
            onReplyPosted={handleReplyPosted}
            onDeleted={handleDeleted}
          />
        ))}
      </div>
    </div>
  );
}
