import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
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

  // ── Duplicate preview modal ──
  const [previewMcq, setPreviewMcq] = useState(null); // null=closed, {loading}|{error, dbMcq, uploadedRow}=open

  const openDuplicatePreview = async (id, uploadedRow) => {
    setPreviewMcq({ loading: true, uploadedRow });
    try {
      const { data } = await API.get(`/mcqs/${id}`);
      setPreviewMcq({ dbMcq: data, uploadedRow });
    } catch {
      setPreviewMcq({ error: true, uploadedRow });
    }
  };

  // ── Inline edit modal ──
  const [inlineEdit, setInlineEdit] = useState(null);   // null=closed, errorRow=open
  const [inlineForm, setInlineForm] = useState({});
  const [inlineTopics, setInlineTopics] = useState([]);
  const [inlineSubmitting, setInlineSubmitting] = useState(false);

  // ── Force Add for duplicate rows ──
  const [forceAdding, setForceAdding] = useState({}); // { rowIndex: true }

  const handleForceAdd = async (errorRow, rowIndex) => {
    setForceAdding(prev => ({ ...prev, [rowIndex]: true }));
    try {
      const matchedStack = techStacks.find(
        ts => ts.name.toLowerCase() === (errorRow.techStack || '').toLowerCase()
      );
      if (!matchedStack) { toast.error('Unknown tech stack: ' + errorRow.techStack); return; }
      // Find topic
      let topicId = null;
      if (errorRow.topic) {
        try {
          const { data: topics } = await API.get(`/master/tech-stacks/${matchedStack.id}/topics`);
          const matched = (Array.isArray(topics) ? topics : []).find(
            t => t.name.toLowerCase() === errorRow.topic.toLowerCase()
          );
          if (matched) topicId = matched.id;
        } catch { /* proceed without topic */ }
      }
      await API.post('/mcqs', {
        techStackId: matchedStack.id,
        topicId: topicId,
        questionStem: errorRow.questionStem,
        optionA: errorRow.optionA,
        optionB: errorRow.optionB,
        optionC: errorRow.optionC,
        optionD: errorRow.optionD,
        correctAnswer: errorRow.correctAnswer,
        difficulty: errorRow.difficulty || 'MEDIUM',
        skipDuplicateCheck: true,
        sendForReview: false,
      });
      // Move from errors to success
      setResult(prev => {
        const newErrors = prev.data.errors.filter((_, idx) => idx !== rowIndex);
        return { ...prev, data: { ...prev.data, errors: newErrors, failed: newErrors.length, success: (prev.data.success || 0) + 1 } };
      });
      toast.success(`Row ${errorRow.row}: Question force-added as draft!`, { autoClose: 8000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to force-add question.');
    } finally {
      setForceAdding(prev => ({ ...prev, [rowIndex]: false }));
    }
  };

  const openInlineEdit = (errorRow) => {
    const matchedStack = techStacks.find(
      ts => ts.name.toLowerCase() === (errorRow.techStack || '').toLowerCase()
    );
    const validDiffs = ['EASY', 'MEDIUM', 'HARD'];
    const rawDiff = (errorRow.difficulty || '').toUpperCase().trim();
    setInlineForm({
      questionStem: errorRow.questionStem || '',
      optionA: errorRow.optionA || '',
      optionB: errorRow.optionB || '',
      optionC: errorRow.optionC || '',
      optionD: errorRow.optionD || '',
      correctAnswer: errorRow.correctAnswer || '',
      difficulty: validDiffs.includes(rawDiff) ? rawDiff : 'MEDIUM',
      techStackId: matchedStack ? String(matchedStack.id) : '',
      topicId: '',
    });
    setInlineEdit(errorRow);
    if (matchedStack) {
      API.get(`/master/tech-stacks/${matchedStack.id}/topics`)
        .then(({ data }) => setInlineTopics(Array.isArray(data) ? data : []))
        .catch(() => setInlineTopics([]));
    } else {
      setInlineTopics([]);
    }
  };

  const submitInlineEdit = async () => {
    if (inlineSubmitting) return;
    setInlineSubmitting(true);
    try {
      const matchedTopic = inlineTopics.find(
        t => t.name.toLowerCase() === (inlineForm.topicName || '').toLowerCase()
      );
      await API.post('/mcqs', {
        techStackId: Number(inlineForm.techStackId),
        topicId: inlineForm.topicId ? Number(inlineForm.topicId) : (matchedTopic ? matchedTopic.id : null),
        questionStem: inlineForm.questionStem,
        optionA: inlineForm.optionA,
        optionB: inlineForm.optionB,
        optionC: inlineForm.optionC,
        optionD: inlineForm.optionD,
        correctAnswer: inlineForm.correctAnswer,
        difficulty: inlineForm.difficulty,
        sendForReview: false,
      });
      // Remove the fixed row from the error list
      setResult(prev => {
        const newErrors = prev.data.errors.filter(e => e !== inlineEdit);
        return {
          ...prev,
          data: {
            ...prev.data,
            errors: newErrors,
            failed: newErrors.length,
            success: (prev.data.success || 0) + 1,
          }
        };
      });
      setInlineEdit(null);
      toast.success('Question saved as draft successfully!', { autoClose: 15000 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit question.');
    } finally {
      setInlineSubmitting(false);
    }
  };

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

  const modalOverlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' };
  const modalBox = { background: 'var(--card-bg)', borderRadius: '12px', padding: '1.5rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' };
  const inputStyle = { width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box', fontSize: '0.85rem' };
  const labelStyle = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.82rem', color: 'var(--text-muted)' };

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
              {downloading ? t('bu.downloading') : t('bu.downloadTemplate')}
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
                                      <> &nbsp;<button
                                        onClick={() => openDuplicatePreview(linkedId, e)}
                                        style={{ color: '#f59e0b', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap' }}
                                      >
                                        👁 View
                                      </button></>
                                    )}
                                    {(isDup || isSimilar) && e.questionStem && (
                                      <> &nbsp;<button
                                        onClick={() => handleForceAdd(e, i)}
                                        disabled={forceAdding[i]}
                                        style={{ color: '#059669', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap' }}
                                      >
                                        {forceAdding[i] ? '⏳ Adding...' : '✓ Add Anyway'}
                                      </button></>
                                    )}
                                    {e.questionStem && (
                                      <> &nbsp;<button
                                        onClick={() => openInlineEdit(e)}
                                        style={{ color: '#60a5fa', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0, whiteSpace: 'nowrap' }}
                                      >
                                        ✏️ Edit &amp; Submit
                                      </button></>
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

      {/* ── Duplicate Comparison Modal ── */}
      {previewMcq && (() => {
        const { loading: pmLoading, error: pmError, dbMcq, uploadedRow } = previewMcq;
        // helper: returns true if two strings differ (case-insensitive trim)
        const diff = (a, b) => (a || '').trim().toLowerCase() !== (b || '').trim().toLowerCase();
        const uploadOptKey = (opt) => opt === 'A' ? 'optionA' : opt === 'B' ? 'optionB' : opt === 'C' ? 'optionC' : 'optionD';
        // Both columns share the same neutral base — only differing cells get amber
        const col = { flex: 1, minWidth: 0, padding: '0.85rem', borderRadius: '10px', background: 'var(--bg)', border: '1.5px solid var(--border)' };
        const colLabel = { fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem' };
        const stemBox  = (highlight) => ({
          padding: '0.6rem 0.75rem', borderRadius: '7px', fontSize: '0.88rem', lineHeight: 1.5,
          background: highlight ? 'rgba(245,158,11,0.18)' : 'transparent',
          border: highlight ? '1px solid #f59e0b' : '1px solid transparent',
        });
        const optBox = (isCorrect, highlight) => ({
          padding: '0.4rem 0.65rem', marginBottom: '0.3rem', borderRadius: '6px', fontSize: '0.84rem',
          background: isCorrect ? 'rgba(5,150,105,0.15)' : highlight ? 'rgba(245,158,11,0.15)' : 'transparent',
          border: isCorrect ? '1px solid #059669' : highlight ? '1px solid #f59e0b' : '1px solid transparent',
        });
        return (
          <div style={modalOverlay} onClick={() => setPreviewMcq(null)}>
            <div style={{ ...modalBox, maxWidth: '820px' }} onClick={ev => ev.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>🔁 Duplicate Question Comparison</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Differences are highlighted in <span style={{ color: '#f59e0b', fontWeight: 700 }}>amber</span></p>
                </div>
                <button onClick={() => setPreviewMcq(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, color: 'var(--text-muted)' }}>✕</button>
              </div>

              {pmLoading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Loading…</p>
              ) : pmError ? (
                <p style={{ color: 'var(--error)' }}>Could not load the existing question.</p>
              ) : (
                <>
                  {/* Column headers */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <div style={{ flex: 1, ...colLabel, color: '#d97706' }}>📤 Your Upload (Excel)</div>
                    <div style={{ flex: 1, ...colLabel, color: '#059669' }}>🗄 Already in Database</div>
                  </div>

                  {/* Question Stem */}
                  {(() => {
                    const stemDiff = diff(uploadedRow?.questionStem, dbMcq.questionStem);
                    return (
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.65rem' }}>
                        <div style={col}>
                          <div style={{ ...colLabel, color: '#d97706', marginBottom: '0.3rem' }}>QUESTION</div>
                          <div style={stemBox(stemDiff)}>
                            {uploadedRow?.questionStem || <em style={{ color: 'var(--text-muted)' }}>—</em>}
                            {stemDiff && <span style={{ float: 'right', color: '#d97706', fontSize: '0.72rem', fontWeight: 700 }}>CHANGED</span>}
                          </div>
                        </div>
                        <div style={col}>
                          <div style={{ ...colLabel, color: '#059669', marginBottom: '0.3rem' }}>QUESTION</div>
                          <div style={stemBox(stemDiff)}>{dbMcq.questionStem}</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Options A–D */}
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const uploadVal  = uploadedRow?.[uploadOptKey(opt)] || '';
                    const dbVal      = dbMcq[`option${opt}`] || '';
                    const isDiffVal  = diff(uploadVal, dbVal);
                    const uploadCorrect = (uploadedRow?.correctAnswer || '').toUpperCase().trim() === opt;
                    const dbCorrect    = dbMcq.correctAnswer === opt;
                    const isDiffAns    = uploadCorrect !== dbCorrect;
                    return (
                      <div key={opt} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.3rem' }}>
                        <div style={col}>
                          <div style={optBox(uploadCorrect, isDiffVal || isDiffAns)}>
                            <span style={{ fontWeight: 700, marginRight: '0.4rem', color: uploadCorrect ? '#059669' : (isDiffVal || isDiffAns) ? '#d97706' : 'var(--text-muted)' }}>{opt}.</span>
                            {uploadVal || <em style={{ color: 'var(--text-muted)' }}>—</em>}
                            {uploadCorrect && <span style={{ float: 'right', color: '#059669', fontWeight: 700, fontSize: '0.75rem' }}>✓ Correct</span>}
                            {isDiffAns && !uploadCorrect && dbCorrect && <span style={{ float: 'right', color: '#d97706', fontSize: '0.75rem' }}>⚠ was correct</span>}
                            {(isDiffVal || (isDiffAns && !uploadCorrect)) && !uploadCorrect && <span style={{ float: 'right', color: '#d97706', fontSize: '0.72rem', fontWeight: 700 }}>CHANGED</span>}
                          </div>
                        </div>
                        <div style={col}>
                          <div style={optBox(dbCorrect, isDiffVal || isDiffAns)}>
                            <span style={{ fontWeight: 700, marginRight: '0.4rem', color: dbCorrect ? '#059669' : (isDiffVal || isDiffAns) ? '#d97706' : 'var(--text-muted)' }}>{opt}.</span>
                            {dbVal}
                            {dbCorrect && <span style={{ float: 'right', color: '#059669', fontWeight: 700, fontSize: '0.75rem' }}>✓ Correct</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Metadata row */}
                  {(() => {
                    const diffDiff = diff(uploadedRow?.difficulty, dbMcq.difficulty);
                    const diffStack = diff(uploadedRow?.techStack, dbMcq.techStackName);
                    const diffTopic = diff(uploadedRow?.topic, dbMcq.topicName);
                    const metaTag = (label, hasDiff) => ({
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                      background: hasDiff ? 'rgba(245,158,11,0.18)' : 'transparent',
                      border: hasDiff ? '1px solid #f59e0b' : '1px solid transparent',
                      color: hasDiff ? '#d97706' : 'var(--text-muted)',
                    });
                    return (
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                        <div style={{ ...col, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={metaTag('diff', diffDiff)}>🎯 {uploadedRow?.difficulty || '—'}</span>
                          <span style={metaTag('stack', diffStack)}>📚 {uploadedRow?.techStack || '—'}</span>
                          {<span style={metaTag('topic', diffTopic)}>🏷 {uploadedRow?.topic || '—'}</span>}
                        </div>
                        <div style={{ ...col, display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <span style={metaTag('diff', diffDiff)}>🎯 {dbMcq.difficulty}</span>
                          <span style={metaTag('stack', diffStack)}>📚 {dbMcq.techStackName}</span>
                          {<span style={metaTag('topic', diffTopic)}>🏷 {dbMcq.topicName || '—'}</span>}
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>📋 {dbMcq.status}</span>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
              <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
                <button className="btn-secondary" onClick={() => setPreviewMcq(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Inline Edit & Submit Modal ── */}
      {inlineEdit && (
        <div style={modalOverlay} onClick={() => setInlineEdit(null)}>
          <div style={{ ...modalBox, maxWidth: '660px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>✏️ Edit &amp; Submit — Row {inlineEdit.row}</h3>
              <button onClick={() => setInlineEdit(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, color: 'var(--text-muted)' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Tech Stack *</label>
                <select
                  value={inlineForm.techStackId}
                  onChange={e => {
                    const val = e.target.value;
                    setInlineForm(f => ({ ...f, techStackId: val, topicId: '' }));
                    if (val) {
                      API.get(`/master/tech-stacks/${val}/topics`)
                        .then(({ data }) => setInlineTopics(Array.isArray(data) ? data : []))
                        .catch(() => setInlineTopics([]));
                    } else { setInlineTopics([]); }
                  }}
                  style={inputStyle}
                >
                  <option value="">Select Tech Stack</option>
                  {techStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Topic</label>
                <select
                  value={inlineForm.topicId}
                  onChange={e => setInlineForm(f => ({ ...f, topicId: e.target.value }))}
                  style={inputStyle}
                  disabled={!inlineForm.techStackId}
                >
                  <option value="">Select Topic</option>
                  {inlineTopics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '0.75rem' }}>
              <label style={labelStyle}>Question Stem *</label>
              <textarea
                value={inlineForm.questionStem}
                onChange={e => setInlineForm(f => ({ ...f, questionStem: e.target.value }))}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '0.75rem' }}>
              {['A', 'B', 'C', 'D'].map(opt => (
                <div key={opt}>
                  <label style={labelStyle}>Option {opt} *</label>
                  <input
                    type="text"
                    value={inlineForm[`option${opt}`] || ''}
                    onChange={e => setInlineForm(f => ({ ...f, [`option${opt}`]: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Correct Answer *</label>
                <select value={inlineForm.correctAnswer} onChange={e => setInlineForm(f => ({ ...f, correctAnswer: e.target.value }))} style={inputStyle}>
                  <option value="">Select</option>
                  {['A', 'B', 'C', 'D'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Difficulty *</label>
                <select value={inlineForm.difficulty} onChange={e => setInlineForm(f => ({ ...f, difficulty: e.target.value }))} style={inputStyle}>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button className="btn-secondary" onClick={() => setInlineEdit(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={submitInlineEdit}
                disabled={inlineSubmitting || !inlineForm.techStackId || !inlineForm.questionStem.trim() || !inlineForm.correctAnswer}
              >
                {inlineSubmitting ? 'Submitting…' : '✓ Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
