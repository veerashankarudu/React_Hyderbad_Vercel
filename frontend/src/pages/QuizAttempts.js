import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import API from '../api';
import Navbar from '../components/Navbar';
import './QuizAttempts.css';

function fmtTime(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleString();
}

export default function QuizAttempts() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sessionTitle, setSessionTitle] = useState('');
  const [selected, setSelected] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState(null);

  // Filters
  const [filterName, setFilterName] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  useEffect(() => {
    API.get('/quiz-sessions')
      .then(r => {
        const s = r.data.find(s => String(s.id) === String(id));
        if (s) setSessionTitle(s.title);
      })
      .catch(() => {});

    API.get(`/quiz-sessions/${id}/attempts`)
      .then(r => setAttempts(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Filtered attempts
  const filtered = attempts.filter(a => {
    if (filterName && !((a.candidateName || '') + ' ' + (a.candidateEmail || '')).toLowerCase().includes(filterName.toLowerCase())) return false;
    if (filterDateFrom && a.submittedAt && new Date(a.submittedAt) < new Date(filterDateFrom)) return false;
    if (filterDateTo && a.submittedAt && new Date(a.submittedAt) > new Date(filterDateTo + 'T23:59:59')) return false;
    return true;
  });

  const avgPct = filtered.length
    ? Math.round(filtered.reduce((a, c) => a + (c.percent || 0), 0) / filtered.length)
    : 0;
  const terminated = filtered.filter(a => a.status === 'TERMINATED').length;

  // ── CSV Download ──────────────────────────────────────────────────────────
  const downloadCSV = () => {
    const headers = ['#', 'Name', 'Email', 'Score', 'Percent', 'Time Taken', 'Status', 'Violations', 'Submitted At'];
    const rows = filtered.map((a, i) => [
      i + 1,
      `"${(a.candidateName || '').replace(/"/g, '""')}"`,
      `"${(a.candidateEmail || '').replace(/"/g, '""')}"`,
      `${a.score}/${a.total}`,
      `${a.percent}%`,
      fmtTime(a.timeTakenSeconds),
      a.status,
      a.violationCount || 0,
      `"${formatDate(a.submittedAt)}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${sessionTitle || 'quiz'}_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── PDF Download (print window) ───────────────────────────────────────────
  const downloadPDF = () => {
    const rows = filtered.map((a, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${a.candidateName || ''}</td>
        <td>${a.candidateEmail || ''}</td>
        <td>${a.score}/${a.total}</td>
        <td>${a.percent}%</td>
        <td>${fmtTime(a.timeTakenSeconds)}</td>
        <td>${a.status}</td>
        <td>${a.violationCount || 0}</td>
        <td>${formatDate(a.submittedAt)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${sessionTitle || 'Quiz'} – Results</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 11px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #5b21b6; color: #fff; padding: 7px 6px; text-align: left; font-size: 11px; }
        td { padding: 6px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
        tr:nth-child(even) td { background: #f9f5ff; }
        .stat { display: inline-block; margin-right: 20px; font-size: 13px; }
        .stat strong { font-size: 18px; }
      </style></head><body>
      <h1>${sessionTitle || 'Quiz'} – Assessment Results</h1>
      <div class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total: ${filtered.length} attempts</div>
      <div style="margin-bottom:14px">
        <span class="stat"><strong>${filtered.length}</strong><br/>Total</span>
        <span class="stat"><strong>${avgPct}%</strong><br/>Avg Score</span>
        <span class="stat"><strong>${terminated}</strong><br/>Terminated</span>
        <span class="stat"><strong>${filtered.length - terminated}</strong><br/>Completed</span>
      </div>
      <table><thead><tr>
        <th>#</th><th>Name</th><th>Email</th><th>Score</th><th>%</th>
        <th>Time</th><th>Status</th><th>Violations</th><th>Submitted</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`;
    const printHtml = html.replace('</body>', `<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},300);});<\/script></body>`);
    const blob = new Blob([printHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <div className="qa-page">
          {/* Header */}
          <div className="qa-header">
            <button className="qa-back" onClick={() => navigate('/quiz-builder')}>{t('quizAttempts.back')}</button>
            <div>
              <h1 className="qa-title">{sessionTitle || t('quizAttempts.defaultTitle')}</h1>
              <p className="qa-subtitle">{t('quizAttempts.subtitle')}</p>
            </div>
          </div>

          {/* Filter bar */}
          <div className="qa-filter-bar">
            <input
              className="qa-filter-input"
              type="text"
              placeholder="Filter by name or email..."
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
            />
            <label className="qa-filter-label">From</label>
            <input className="qa-filter-date" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            <label className="qa-filter-label">To</label>
            <input className="qa-filter-date" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            {(filterName || filterDateFrom || filterDateTo) && (
              <button className="qa-btn-clear" onClick={() => { setFilterName(''); setFilterDateFrom(''); setFilterDateTo(''); }}>✕ Clear</button>
            )}
            <div className="qa-filter-spacer" />
            <button className="qa-btn-download csv" onClick={downloadCSV} title="Download Excel/CSV">⬇ Excel</button>
            <button className="qa-btn-download pdf" onClick={downloadPDF} title="Download PDF">⬇ PDF</button>
          </div>

          {/* Summary cards */}
          <div className="qa-summary-row">            <div className="qa-summary-card">
              <div className="qa-sc-value">{attempts.length}</div>
              <div className="qa-sc-label">{t('quizAttempts.totalAttempts')}</div>
            </div>
            <div className="qa-summary-card">
              <div className="qa-sc-value">{avgPct}%</div>
              <div className="qa-sc-label">{t('quizAttempts.avgScore')}</div>
            </div>
            <div className="qa-summary-card qa-sc-warn">
              <div className="qa-sc-value">{terminated}</div>
              <div className="qa-sc-label">{t('quizAttempts.terminated')}</div>
            </div>
            <div className="qa-summary-card qa-sc-ok">
              <div className="qa-sc-value">{attempts.length - terminated}</div>
              <div className="qa-sc-label">{t('quizAttempts.completed')}</div>
            </div>
          </div>

          {/* Attempts table */}
          {loading ? (
            <div className="qa-loading"><div className="qa-spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="qa-empty">
              <div className="qa-empty-icon">📭</div>
              <p>{attempts.length === 0 ? 'No attempts yet. Share the quiz link with candidates.' : 'No results match your filters.'}</p>
            </div>
          ) : (
            <div className="qa-table-wrapper">
              <table className="qa-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{t('quizAttempts.candidate')}</th>
                    <th>{t('quizAttempts.email')}</th>
                    <th>{t('quizAttempts.score')}</th>
                    <th>{t('quizAttempts.percent')}</th>
                    <th>{t('quizAttempts.timeTaken')}</th>
                    <th>{t('quizAttempts.status')}</th>
                    <th>{t('quizAttempts.violations')}</th>
                    <th>{t('quizAttempts.submitted')}</th>
                    <th>{t('quizAttempts.details')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a, i) => (
                    <tr
                      key={a.id}
                      className={a.status === 'TERMINATED' ? 'qa-row-terminated' : ''}
                    >
                      <td>{i + 1}</td>
                      <td className="qa-name">{a.candidateName}</td>
                      <td className="qa-email">{a.candidateEmail}</td>
                      <td><strong>{a.score}/{a.total}</strong></td>
                      <td>
                        <span className={`qa-pct qa-pct-${a.percent >= 70 ? 'good' : a.percent >= 40 ? 'avg' : 'low'}`}>
                          {a.percent}%
                        </span>
                      </td>
                      <td>{fmtTime(a.timeTakenSeconds)}</td>
                      <td>
                        <span className={`qa-status-badge qa-status-${(a.status || '').toLowerCase()}`}>
                          {a.status === 'TERMINATED' ? t('quizAttempts.terminatedStatus') : t('quizAttempts.completedStatus')}
                        </span>
                      </td>
                      <td>
                        {a.violationCount > 0 ? (
                          <span className="qa-violations">⚠️ {a.violationCount}</span>
                        ) : '—'}
                      </td>
                      <td className="qa-date">{formatDate(a.submittedAt)}</td>
                      <td>
                        <button className="qa-btn-detail" onClick={() => {
                          setSelected(selected?.id === a.id ? null : a);
                          setScreenshotUrl(null);
                        }}>
                          {selected?.id === a.id ? t('quizAttempts.close') : t('quizAttempts.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail panel */}
          {selected && (
            <div className="qa-detail-panel">
              <div className="qa-detail-header">
                <h3>{selected.candidateName} — {t('quizAttempts.attemptDetails')}</h3>
                <button className="qa-btn-close" onClick={() => setSelected(null)}>✕</button>
              </div>

              {/* Topic breakdown */}
              {selected.topicBreakdown && Object.keys(selected.topicBreakdown).length > 0 && (
                <div className="qa-breakdown">
                  <h4 className="qa-breakdown-title">{t('quizAttempts.topicBreakdown')}</h4>
                  <div className="qa-breakdown-bars">
                    {Object.entries(selected.topicBreakdown).map(([topic, data]) => {
                      const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                      return (
                        <div key={topic} className="qa-bar-row">
                          <div className="qa-bar-label">
                            <span>{topic}</span>
                            <span>{data.correct}/{data.total} ({pct}%)</span>
                          </div>
                          <div className="qa-bar-track">
                            <div
                              className={`qa-bar-fill ${pct >= 70 ? 'good' : pct >= 40 ? 'avg' : 'low'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Screenshot */}
              {selected.hasScreenshot && (
                <div className="qa-screenshot-section">
                  <h4 className="qa-breakdown-title">{t('quizAttempts.violationScreenshot')}</h4>
                  {!screenshotUrl ? (
                    <button className="qa-btn-load-ss" onClick={async () => {
                      try {
                        const r = await API.get(`/quiz-sessions/${id}/attempts/${selected.id}/screenshot`);
                        setScreenshotUrl(r.data.screenshot);
                      } catch {
                        toast?.error?.(t('common.screenshotNotAvailable'));
                      }
                    }}>
                      {t('quizAttempts.loadScreenshot')}
                    </button>
                  ) : (
                    <img src={screenshotUrl} alt="Violation screenshot" className="qa-screenshot" />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
