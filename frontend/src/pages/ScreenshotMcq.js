import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useContentTranslation } from '../hooks/useContentTranslation';
import API from '../api';
import Navbar from '../components/Navbar';
import './MyQuestions.css';
import './ScreenshotMcq.css';

export default function ScreenshotMcq() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedList, setExtractedList] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please upload an image file (PNG, JPG, JPEG, WebP).'); return; }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setExtractedList(null);
    setCurrentIdx(0);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleExtract = async () => {
    if (!image) return;
    setExtracting(true); setError(''); setExtractedList(null); setCurrentIdx(0);
    const formData = new FormData();
    formData.append('image', image);
    try {
      const { data } = await API.post('/ai/extract-from-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.available === false) {
        setError(data.error || 'AI extraction unavailable. Please ensure AI is configured.');
      } else if (data.questions && Array.isArray(data.questions)) {
        // Multiple questions returned
        setExtractedList(data.questions);
      } else {
        // Single question (backward compatible)
        setExtractedList([data]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extract MCQ from image.');
    } finally {
      setExtracting(false);
    }
  };

  const handleImport = () => {
    if (!extracted) return;
    navigate('/mcq/create', { state: { prefill: extracted } });
  };

  const extracted = extractedList ? extractedList[currentIdx] : null;
  const OPTIONS = ['A', 'B', 'C', 'D'];
  const optionText = (key) => extracted?.[`option${key}`] || '';
  const { t } = useTranslation();

  // Translate extracted MCQ content
  const extractedTexts = [
    extracted?.questionStem || '',
    extracted?.optionA || '',
    extracted?.optionB || '',
    extracted?.optionC || '',
    extracted?.optionD || '',
  ];
  const [txExtStem, txExtA, txExtB, txExtC, txExtD] = useContentTranslation(extractedTexts);
  const txOptionText = (key) => {
    const map = { A: txExtA, B: txExtB, C: txExtC, D: txExtD };
    return map[key] || optionText(key);
  };

  return (
    <>
      <Navbar />
      <div className="page-container smc-page">
        <div className="page-header">
          <h2>{t('scr.title')}</h2>
          <p className="page-subtitle">Upload a screenshot of any question — AI extracts and pre-fills the form</p>
        </div>

        <div className="screenshot-layout">
          {/* Upload panel */}
          <div className="screenshot-upload-card">
            <div className="upload-card-header">
              <h3>{t('scr.uploadTitle')}</h3>
              <p>{t('scr.uploadFormats')}</p>
            </div>
            <div className="upload-card-body">
              <div
                className={`screenshot-dropzone ${preview ? 'has-image' : ''}`}
                role="button"
                tabIndex={0}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Uploaded screenshot" className="screenshot-preview-img" />
                ) : (
                  <>
                    <div style={{ fontSize: '3rem' }}>📸</div>
                    <h4>{t('scr.dropzone')}</h4>
                    <p>{t('scr.orClick')}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{t('scr.uploadFormats')}</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(e.target.files[0])}
                  style={{ display: 'none' }}
                />
              </div>

              {image && (
                <div className="screenshot-file-info">
                  <span className="file-name-pill">📷 {image.name}</span>
                  <button className="btn-sm btn-outline" onClick={() => { setImage(null); setPreview(null); setExtractedList(null); setCurrentIdx(0); setError(''); }}>Remove</button>
                </div>
              )}

              {error && <div className="error-msg" style={{ marginTop: '0.75rem' }}>{error}</div>}

              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn-primary"
                  onClick={handleExtract}
                  disabled={!image || extracting}
                  style={{ flex: 1 }}
                >
                  {extracting ? '🤖 Extracting...' : '🤖 Extract MCQ with AI'}
                </button>
              </div>

              {extracting && (
                <div className="extraction-loading">
                  <div className="extraction-dots">
                    <span /><span /><span />
                  </div>
                  <p>{t('scr.aiReading')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Extracted result panel */}
          <div className="screenshot-result-card">
            <div className="upload-card-header">
              <h3>{t('scr.extractedMcq')}</h3>
              <p>{t('scr.reviewBeforeImport')}</p>
            </div>
            <div className="upload-card-body">
              {!extracted && !extracting && (
                <div className="screenshot-placeholder">
                  <span style={{ fontSize: '3rem' }}>🤖</span>
                  <p>{t('scr.extractPrompt')}</p>
                </div>
              )}

              {extracted && (
                <div className="extracted-mcq">
                  {extractedList && extractedList.length > 1 && (
                    <div className="extracted-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)' }}>
                      <button className="btn-sm btn-outline" onClick={() => setCurrentIdx(i => Math.max(0, i - 1))} disabled={currentIdx === 0}>&larr; Prev</button>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Question {currentIdx + 1} of {extractedList.length}</span>
                      <button className="btn-sm btn-outline" onClick={() => setCurrentIdx(i => Math.min(extractedList.length - 1, i + 1))} disabled={currentIdx === extractedList.length - 1}>Next &rarr;</button>
                    </div>
                  )}
                  <div className="extracted-question">
                    <span className="extracted-field-label">{t('common.question')}</span>
                    <p>{txExtStem || extracted.questionStem || '—'}</p>
                  </div>

                  <div className="extracted-options">
                    {OPTIONS.map((key) => (
                      <div
                        key={key}
                        className={`extracted-option ${extracted.correctAnswer === key ? 'correct' : ''}`}
                      >
                        <span className="opt-key">{key}</span>
                        <span className="opt-text">{txOptionText(key) || '—'}</span>
                        {extracted.correctAnswer === key && <span className="opt-correct-tag">&#10003; Correct</span>}
                      </div>
                    ))}
                  </div>

                  <div className="extracted-meta">
                    <span className="meta-pill">Difficulty: {extracted.difficulty || 'Unknown'}</span>
                    {extracted.correctAnswer && (
                      <span className="meta-pill correct-pill">Correct: Option {extracted.correctAnswer}</span>
                    )}
                  </div>

                  <div className="extracted-actions">
                    <p className="extracted-hint">
                      ℹ️ You can edit all fields after importing. Tech stack and topic must be selected manually.
                    </p>
                    <button className="btn-primary" onClick={handleImport} style={{ width: '100%' }}>
                      Import &amp; Edit in Form &rarr;
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
