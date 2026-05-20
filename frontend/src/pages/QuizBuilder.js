import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import API from '../api';
import Navbar from '../components/Navbar';
import './QuizBuilder.css';

export default function QuizBuilder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);

  const [form, setForm] = useState({
    title: '',
    techStackName: '',
    topicName: '',
    difficulty: '',
    questionCount: 10,
    timeLimitMinutes: 30,
    linkValidHours: 24,
  });

  useEffect(() => {
    // Cache static master data in sessionStorage — no need to reload every time
    const cached = key => { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } };
    const cache = (key, data) => { try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {} };

    const cachedTS = cached('master_techStacks');
    if (cachedTS) setTechStacks(cachedTS);
    else API.get('/master/tech-stacks').then(r => {
      const d = Array.isArray(r.data) ? r.data : (r.data.content || []);
      setTechStacks(d); cache('master_techStacks', d);
    }).catch(() => {});

    // Topics are loaded per tech stack — load all topics flat for filter
    const cachedTopics = cached('master_allTopics');
    if (cachedTopics) setTopics(cachedTopics);
    else API.get('/master/tech-stacks').then(async r => {
      const stacks = Array.isArray(r.data) ? r.data : (r.data.content || []);
      const all = [];
      for (const ts of stacks) {
        try {
          const t = await API.get(`/master/tech-stacks/${ts.id}/topics`);
          (Array.isArray(t.data) ? t.data : []).forEach(tp => { if (!all.find(x => x.name === tp.name)) all.push(tp); });
        } catch {}
      }
      setTopics(all); cache('master_allTopics', all);
    }).catch(() => {});

    loadSessions();
  }, []);

  const loadSessions = () => {
    API.get('/quiz-sessions').then(r => setSessions(r.data)).catch(() => {});
  };

  const handle = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const generate = async () => {
    if (!form.title.trim()) { toast.error('Please enter a quiz title.'); return; }
    setCreating(true);
    try {
      const res = await API.post('/quiz-sessions', {
        title: form.title.trim(),
        techStackName: form.techStackName || null,
        topicName: form.topicName || null,
        difficulty: form.difficulty || null,
        questionCount: Number(form.questionCount),
        timeLimitMinutes: Number(form.timeLimitMinutes),
        linkValidHours: Number(form.linkValidHours),
      });
      toast.success(`Quiz created with ${res.data.questionCount} questions!`);
      setForm(f => ({ ...f, title: '' }));
      loadSessions();
    } catch (e) {
      toast.error(e.response?.data?.error || t('quizBuilder.failedCreate'));
    } finally {
      setCreating(false);
    }
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/quiz/take/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (str) => {
    if (!str) return '';
    return new Date(str).toLocaleString();
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <div className="qb-page">
          <div className="qb-header">
            <h1 className="qb-title">{t('quizBuilder.title')}</h1>
            <p className="qb-subtitle">{t('quizBuilder.subtitle')}</p>
          </div>

          {/* Create Form */}
          <div className="qb-card qb-create-card">
            <h2 className="qb-card-title">{t('quizBuilder.createNew')}</h2>
            <div className="qb-form">
              <div className="qb-form-row qb-form-row-full">
                <label>{t('quizBuilder.quizTitle')}</label>
                <input
                  type="text"
                  placeholder={t('quizBuilder.titlePlaceholder')}
                  value={form.title}
                  onChange={e => handle('title', e.target.value)}
                  className="qb-input"
                />
              </div>

              <div className="qb-form-row">
                <label>{t('quizBuilder.techStack')} <span className="qb-opt">{t('quizBuilder.optionalFilter')}</span></label>
                <select value={form.techStackName} onChange={e => handle('techStackName', e.target.value)} className="qb-select">
                  <option value="">{t('quizBuilder.allTechStacks')}</option>
                  {techStacks.map(ts => <option key={ts.id} value={ts.name}>{ts.name}</option>)}
                </select>
              </div>

              <div className="qb-form-row">
                <label>{t('quizBuilder.topic')} <span className="qb-opt">{t('quizBuilder.optionalFilter')}</span></label>
                <select value={form.topicName} onChange={e => handle('topicName', e.target.value)} className="qb-select">
                  <option value="">{t('quizBuilder.allTopics')}</option>
                  {topics.map(tp => <option key={tp.id} value={tp.name}>{tp.name}</option>)}
                </select>
              </div>

              <div className="qb-form-row">
                <label>{t('quizBuilder.difficulty')}</label>
                <select value={form.difficulty} onChange={e => handle('difficulty', e.target.value)} className="qb-select">
                  <option value="">{t('quizBuilder.anyDifficulty')}</option>
                  <option value="EASY">{t('common.easy')}</option>
                  <option value="MEDIUM">{t('common.medium')}</option>
                  <option value="HARD">{t('common.hard')}</option>
                </select>
              </div>

              <div className="qb-form-row">
                <label>{t('quizBuilder.numQuestions')}</label>
                <select value={form.questionCount} onChange={e => handle('questionCount', e.target.value)} className="qb-select">
                  {[5, 10, 15, 20, 25, 30].map(n => <option key={n} value={n}>{t('quizBuilder.questions', { n })}</option>)}
                </select>
              </div>

              <div className="qb-form-row">
                <label>{t('quizBuilder.timeLimit')}</label>
                <select value={form.timeLimitMinutes} onChange={e => handle('timeLimitMinutes', e.target.value)} className="qb-select">
                  {[10, 15, 20, 30, 45, 60, 90].map(n => <option key={n} value={n}>{t('quizBuilder.minutes', { n })}</option>)}
                </select>
              </div>

              <div className="qb-form-row">
                <label>Link Valid For (hours)</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={form.linkValidHours}
                  onChange={e => handle('linkValidHours', Math.max(1, Number(e.target.value)))}
                  className="qb-input"
                  style={{ width: '120px' }}
                  placeholder="e.g. 24"
                />
                <span style={{ marginLeft: 8, fontSize: '0.85rem', color: 'var(--text-muted, #888)' }}>
                  {form.linkValidHours < 24
                    ? `${form.linkValidHours}h`
                    : form.linkValidHours % 24 === 0
                      ? `${form.linkValidHours / 24} day${form.linkValidHours / 24 > 1 ? 's' : ''}`
                      : `${Math.floor(form.linkValidHours / 24)}d ${form.linkValidHours % 24}h`}
                  {' '}— expires {new Date(Date.now() + form.linkValidHours * 3600000).toLocaleString()}
                </span>
              </div>

              <div className="qb-form-actions">
                <button className="qb-btn-primary" onClick={generate} disabled={creating}>
                  {creating ? t('quizBuilder.generating') : t('quizBuilder.generateLink')}
                </button>
              </div>
            </div>
          </div>

          {/* My Sessions */}
          {sessions.length > 0 && (
            <div className="qb-card">
              <h2 className="qb-card-title">{t('quizBuilder.mySessions')}</h2>
              <div className="qb-sessions-list">
                {sessions.map(s => (
                  <div key={s.id} className={`qb-session-row ${s.expired ? 'qb-session-expired' : ''}`}>
                    <div className="qb-session-info">
                      <span className="qb-session-title">
                        {s.title}
                        {s.expired && <span className="qb-expired-badge">Expired</span>}
                      </span>
                      <span className="qb-session-meta">
                        {t('quizBuilder.questions', { n: s.questionCount })} · {t('quizBuilder.minutes', { n: s.timeLimitMinutes })} · {s.attemptCount} {t('quizBuilder.attempts')}
                      </span>
                      <span className="qb-session-date">
                        {t('quizBuilder.created')}: {formatDate(s.createdAt)}
                        {s.expiresAt && (
                          <span className={`qb-expiry-label ${s.expired ? 'expired' : ''}`}>
                            &nbsp;·&nbsp;{s.expired ? 'Expired' : 'Expires'}: {formatDate(s.expiresAt)}
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="qb-session-actions">
                      <button
                        className={`qb-btn-copy ${copied === s.shareToken ? 'copied' : ''} ${s.expired ? 'qb-btn-disabled' : ''}`}
                        onClick={() => !s.expired && copyLink(s.shareToken)}
                        disabled={s.expired}
                        title={s.expired ? 'Link expired' : ''}
                      >
                        {copied === s.shareToken ? t('quizBuilder.copied') : t('quizBuilder.copyLink')}
                      </button>
                      <button
                        className="qb-btn-results"
                        onClick={() => navigate(`/quiz-sessions/${s.id}/attempts`)}
                      >
                        {t('quizBuilder.viewResults')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 && !creating && (
            <div className="qb-empty">
              <div className="qb-empty-icon">📝</div>
              <p>{t('quizBuilder.empty')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
