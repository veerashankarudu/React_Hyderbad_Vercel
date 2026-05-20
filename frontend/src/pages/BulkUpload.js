import React, { useState, useRef, useEffect } from 'react';
import API from '../api';
import Navbar from '../components/Navbar';
import { useTranslation } from 'react-i18next';
import './MyQuestions.css';
import './BulkUpload.css';

export default function BulkUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState(null);
  const [techStacks, setTechStacks] = useState([]);
  const [stackTopics, setStackTopics] = useState({});
  const [expandedStack, setExpandedStack] = useState(null);
  const [copied, setCopied] = useState(null);
  const fileRef = useRef();
  const { t } = useTranslation();

  useEffect(() => {
    API.get('/master/tech-stacks')
      .then(({ data }) => setTechStacks(Array.isArray(data) ? data : (data.content || [])))
      .catch(() => {});
  }, []);

  const toggleStack = (ts) => {
    if (expandedStack === ts.id) { setExpandedStack(null); return; }
    setExpandedStack(ts.id);
    if (!stackTopics[ts.id]) {
      API.get(`/master/tech-stacks/${ts.id}/topics`)
        .then(({ data }) => setStackTopics(prev => ({ ...prev, [ts.id]: Array.isArray(data) ? data : [] })))
        .catch(() => setStackTopics(prev => ({ ...prev, [ts.id]: [] })));
    }
  };

  const copyName = (name) => {
    navigator.clipboard.writeText(name).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await API.post('/upload/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult({ success: true, data });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || err.response?.data?.error || 'Upload failed.' });
    } finally { setUploading(false); }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      const response = await API.get('/upload/template', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_MCQs.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template:', err);
    } finally { setDownloading(false); }
  };

  const formatSize = (bytes) => bytes < 1024 * 1024 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1024/1024).toFixed(1)} MB`;

  const COLUMNS = [
    { col: 'Col 1', reqKey: 'bu.colAny', descKey: 'bu.col1desc' },
    { col: 'Col 2', reqKey: 'bu.colYes', descKey: 'bu.col2desc' },
    { col: 'Col 3', reqKey: 'bu.colNo',  descKey: 'bu.col3desc' },
    { col: 'Col 4', reqKey: 'bu.colYes', descKey: 'bu.col4desc' },
    { col: 'Col 5', reqKey: 'bu.colYes', descKey: 'bu.col5desc' },
    { col: 'Col 6', reqKey: 'bu.colYes', descKey: 'bu.col6desc' },
    { col: 'Col 7', reqKey: 'bu.colYes', descKey: 'bu.col7desc' },
    { col: 'Col 8', reqKey: 'bu.colYes', descKey: 'bu.col8desc' },
    { col: 'Col 9', reqKey: 'bu.colYes', descKey: 'bu.col9desc' },
    { col: 'Col 10', reqKey: 'bu.colYes', descKey: 'bu.col10desc' },
  ];

  return (
    <>
      <Navbar />
      <div className="page-container bu-page">
        <div className="page-header">
          <h2>{t('bu.title')}</h2>
        </div>

        <div className="upload-card">
          <div className="upload-card-header">
            <h3>{t('bu.importTitle')}</h3>
            <p>{t('bu.importSubtitle')}</p>
            <button
              className="btn-secondary"
              onClick={handleDownloadTemplate}
              disabled={downloading}
              style={{ marginTop: '0.75rem' }}
            >
              {downloading ? t('bu.downloading') : `⬇ ${t('bu.downloadTemplate')}`}
            </button>
          </div>
          <div className="upload-card-body">
            <button
              type="button"
              className="upload-dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">📤</div>
              <h4>{t('bu.dropzone')}</h4>
              <p>{t('bu.dropzoneOr')}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '0.35rem' }}>{t('bu.dropzoneFormats')}</p>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
            </button>

            {file && (
              <div className="file-selected">
                <span className="file-icon">{file.name.endsWith('.csv') ? '📄' : '📊'}</span>
                <span className="file-name">{file.name}</span>
                <span className="file-size">{formatSize(file.size)}</span>
                <button className="file-remove" onClick={() => { setFile(null); setResult(null); fileRef.current.value = ''; }}>✕</button>
              </div>
            )}

            {result && (
              <div className={`upload-result ${result.success && (!result.data?.failed || result.data.failed === 0) ? 'success' : result.success ? 'partial' : 'error'}`}>
                <div className="upload-result-title">
                  {result.success
                    ? (result.data?.failed > 0
                        ? `⚠ ${t('bu.uploadSuccess')} (with errors)`
                        : `✓ ${t('bu.uploadSuccess')}`)
                    : `✗ ${t('bu.uploadFailed')}`}
                </div>
                {result.success ? (
                  <>
                    <div className="upload-result-stats">
                      <span className="result-stat result-stat-total">Total: {result.data?.totalRows ?? (result.data?.success + result.data?.failed)}</span>
                      <span className="result-stat result-stat-ok">✓ Imported: {result.data?.success || 0}</span>
                      {result.data?.failed > 0 && (
                        <span className="result-stat result-stat-fail">✗ Failed: {result.data.failed}</span>
                      )}
                    </div>
                    {result.data?.errors?.length > 0 && (
                      <div className="upload-error-table-wrap">
                        <p className="upload-error-heading">❌ Failed rows — fix and re-upload:</p>
                        <table className="upload-error-table">
                          <thead>
                            <tr><th>{t('bu.rowNum')}</th><th>{t('bu.error')}</th></tr>
                          </thead>
                          <tbody>
                            {result.data.errors.map((e, i) => {
                              const raw = e.error || '';
                              const isDup = raw.startsWith('DUPLICATE:');
                              const isSimilar = raw.startsWith('SIMILAR:');
                              let displayMsg = raw;
                              let linkedId = null;
                              if (isDup) {
                                const parts = raw.split(':');
                                linkedId = parts[1];
                                displayMsg = parts.slice(2).join(':');
                              } else if (isSimilar) {
                                const parts = raw.split(':');
                                linkedId = parts[1];
                                displayMsg = parts.slice(3).join(':');
                              }
                              return (
                                <tr key={i} className={isDup ? 'err-row-duplicate' : isSimilar ? 'err-row-similar' : ''}>
                                  <td className="err-row-num">{e.row}</td>
                                  <td className={isDup ? 'err-row-msg err-msg-dup' : isSimilar ? 'err-row-msg err-msg-similar' : 'err-row-msg'}>
                                    {isDup ? '🔁 ' : isSimilar ? '⚠️ ' : ''}{displayMsg}
                                    {linkedId && (
                                      <> &nbsp;<a href={`/mcq/${linkedId}`} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                                        🔗 View
                                      </a></>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {result.data?.importedRows?.length > 0 && (
                      <div className="upload-error-table-wrap" style={{ marginTop: '0.75rem' }}>
                        <p className="upload-error-heading" style={{ color: '#065f46' }}>✅ Successfully imported rows:</p>
                        <table className="upload-error-table">
                          <thead>
                            <tr><th>{t('bu.rowNum')}</th><th>{t('common.techStack')}</th><th>{t('common.topic')}</th><th>{t('bu.questionPreview')}</th></tr>
                          </thead>
                          <tbody>
                            {result.data.importedRows.map((r, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#f0fdf4' : '#fff' }}>
                                <td className="err-row-num" style={{ color: '#065f46' }}>{r.row}</td>
                                <td style={{ fontSize: '0.78rem' }}>{r.techStack}</td>
                                <td style={{ fontSize: '0.78rem' }}>{r.topic || '—'}</td>
                                <td style={{ fontSize: '0.78rem', color: '#374151' }}>{r.stem}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                ) : (
                  <p>{result.message}</p>
                )}
              </div>
            )}

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {file && <button className="btn-secondary" onClick={() => { setFile(null); setResult(null); fileRef.current.value = ''; }}>{t('common.clear')}</button>}
              <button className="btn-primary" onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? t('bu.uploading') : t('bu.uploadFile')}
              </button>
            </div>
          </div>
        </div>

        <div className="upload-card">
          <div className="upload-card-header">
            <h3>{t('bu.formatTitle')}</h3>
            <p>{t('bu.formatSubtitle')}</p>
          </div>
          <div className="upload-card-body">
            <table className="format-table">
              <thead>
                <tr><th>{t('bu.fmtColumn')}</th><th>{t('bu.fmtRequired')}</th><th>{t('bu.fmtDescription')}</th></tr>
              </thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.col}>
                    <td><code>{c.col}</code></td>
                    <td style={{ color: c.reqKey === 'bu.colYes' ? 'var(--error)' : 'var(--text-muted)', fontWeight: 600 }}>{t(c.reqKey)}</td>
                    <td>{t(c.descKey)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Available tech stacks reference ── */}
        {techStacks.length > 0 && (
          <div className="upload-card">
            <div className="upload-card-header">
              <h3>{t('bu.techStacksTitle')}</h3>
              <p>{t('bu.techStacksHint')}</p>
            </div>
            <div className="upload-card-body">
              <div className="bu-stacks-grid">
                {techStacks.map(ts => (
                  <div key={ts.id} className={`bu-stack-item${expandedStack === ts.id ? ' expanded' : ''}`}>
                    <div className="bu-stack-header">
                      <button
                        className={`bu-stack-name-btn${copied === ts.name ? ' copied' : ''}`}
                        onClick={() => copyName(ts.name)}
                        title={t('bu.clickToCopy')}
                      >
                        <span className="bu-stack-icon">⚡</span>
                        <span className="bu-stack-name">{ts.name}</span>
                        <span className="bu-copy-hint">{copied === ts.name ? `✓ ${t('bu.copied')}` : '📋'}</span>
                      </button>
                      <button
                        className="bu-topics-toggle"
                        onClick={() => toggleStack(ts)}
                        title="View topics"
                      >
                      {expandedStack === ts.id ? `▲ ${t('bu.topics')}` : `▼ ${t('bu.topics')}`}
                      </button>
                    </div>
                    {expandedStack === ts.id && (
                      <div className="bu-topics-list">
                        {stackTopics[ts.id] === undefined ? (
                          <span className="bu-topics-loading">Loading…</span>
                        ) : stackTopics[ts.id].length === 0 ? (
                          <span className="bu-topics-empty">{t('bu.noTopics')}</span>
                        ) : (
                          stackTopics[ts.id].map(tp => (
                            <button
                              key={tp.id}
                              className={`bu-topic-chip${copied === tp.name ? ' copied' : ''}`}
                              onClick={() => copyName(tp.name)}
                              title={t('bu.clickToCopy')}
                            >
                              {tp.name}{copied === tp.name ? ' ✓' : ''}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
