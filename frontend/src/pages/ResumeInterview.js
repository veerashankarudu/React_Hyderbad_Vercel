import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import API from '../api';
import './ResumeInterview.css';

export default function ResumeInterview() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [includeJd, setIncludeJd] = useState(false);
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('technical');

  const handleUpload = async () => {
    if (!file) { toast.error(t('interviewKit.selectFile')); return; }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (includeJd && jd.trim()) formData.append('jobDescription', jd.trim());
      const res = await API.post('/resume/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      if (res.data.error) {
        toast.error(res.data.error);
      } else {
        setResult(res.data);
        toast.success(t('interviewKit.successToast'));
      }
    } catch (e) {
      toast.error(e.response?.data?.error || t('interviewKit.errorToast'));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'technical', label: t('interviewKit.tabTechnical'), count: result?.questions?.technical?.length },
    { key: 'coding', label: t('interviewKit.tabCoding', 'Coding'), count: result?.questions?.coding?.length },
    { key: 'sql', label: t('interviewKit.tabSql', 'SQL'), count: result?.questions?.sql?.length },
    { key: 'projectBased', label: t('interviewKit.tabProjectBased'), count: result?.questions?.projectBased?.length },
    { key: 'behavioral', label: t('interviewKit.tabBehavioral'), count: result?.questions?.behavioral?.length },
    { key: 'scenario', label: t('interviewKit.tabScenario'), count: result?.questions?.scenario?.length },
  ];

  const diffClass = (d) => {
    if (!d) return '';
    const l = d.toLowerCase();
    if (l === 'easy') return 'ri-diff-easy';
    if (l === 'medium') return 'ri-diff-medium';
    return 'ri-diff-hard';
  };

  const typeLabel = (tp) => {
    if (!tp) return null;
    if (tp === 'positive') return { cls: 'ri-type-positive', text: t('interviewKit.typePositive') };
    if (tp === 'negative') return { cls: 'ri-type-negative', text: t('interviewKit.typeNegative') };
    if (tp === 'edge_case') return { cls: 'ri-type-edge', text: t('interviewKit.typeEdge') };
    return null;
  };

  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        <div className="ri-page">
          {/* Header */}
          <div className="ri-header">
            <span className="ri-icon">🎯</span>
            <div>
              <h1 className="ri-title">{t('interviewKit.title')}</h1>
              <p className="ri-subtitle">{t('interviewKit.subtitle')}</p>
            </div>
          </div>

          {/* Upload Section */}
          <div className="ri-upload-card">
            <div className="ri-upload-form">
              <div className="ri-form-row">
                <label htmlFor="ri-file">{t('interviewKit.uploadLabel')}</label>
                <div className="ri-file-input-wrap">
                  <input
                    id="ri-file"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={e => setFile(e.target.files[0] || null)}
                    className="ri-file-input"
                  />
                  <span className="ri-file-label">
                    {file ? `📎 ${file.name}` : t('interviewKit.dropHint')}
                  </span>
                </div>
              </div>
              {/* JD Checkbox Toggle */}
              <div className="ri-form-row">
                <label className="ri-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeJd}
                    onChange={e => setIncludeJd(e.target.checked)}
                    className="ri-checkbox"
                  />
                  <span>{t('interviewKit.includeJd')}</span>
                  <span className="ri-opt">{t('interviewKit.jdOptional')}</span>
                </label>
              </div>

              {/* JD Textarea - shown only when checkbox is checked */}
              {includeJd && (
                <div className="ri-form-row ri-jd-section">
                  <label htmlFor="ri-jd">{t('interviewKit.pasteJd')}</label>
                  <textarea
                    id="ri-jd"
                    className="ri-textarea"
                    rows="5"
                    placeholder={t('interviewKit.jdPlaceholder')}
                    value={jd}
                    onChange={e => setJd(e.target.value)}
                  />
                </div>
              )}

              <button className="ri-analyze-btn" onClick={handleUpload} disabled={loading || !file}>
                {loading
                  ? (includeJd && jd.trim() ? t('interviewKit.loadingJd') : t('interviewKit.loadingResume'))
                  : t('interviewKit.generateBtn')}
              </button>
              {loading && <p className="ri-loading-hint">{t('interviewKit.loadingHint')}</p>}
            </div>
          </div>

          {/* Results */}
          {result && result.profile && (
            <>
              {/* Profile Summary */}
              <div className="ri-profile-card">
                <h2 className="ri-section-title">{t('interviewKit.candidateProfile')}</h2>
                <div className="ri-profile-grid">
                  <div className="ri-profile-item">
                    <span className="ri-profile-label">{t('interviewKit.name')}</span>
                    <span className="ri-profile-value">{result.profile.name}</span>
                  </div>
                  <div className="ri-profile-item">
                    <span className="ri-profile-label">{t('interviewKit.experience')}</span>
                    <span className="ri-profile-value">{result.profile.experience}</span>
                  </div>
                  {result.profile.level && (
                    <div className="ri-profile-item">
                      <span className="ri-profile-label">{t('interviewKit.level')}</span>
                      <span className="ri-profile-value ri-level-badge">{result.profile.level}</span>
                    </div>
                  )}
                  <div className="ri-profile-item ri-profile-full">
                    <span className="ri-profile-label">{t('interviewKit.summary')}</span>
                    <span className="ri-profile-value">{result.profile.summary}</span>
                  </div>
                  <div className="ri-profile-item ri-profile-full">
                    <span className="ri-profile-label">{t('interviewKit.skillsDetected')}</span>
                    <div className="ri-tags">
                      {(result.profile.skills || []).map((s, i) => (
                        <span key={i} className="ri-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                  {result.profile.strengths && result.profile.strengths.length > 0 && (
                    <div className="ri-profile-item ri-profile-full">
                      <span className="ri-profile-label">{t('interviewKit.strengths')}</span>
                      <div className="ri-tags ri-tags-green">
                        {result.profile.strengths.map((s, i) => (
                          <span key={i} className="ri-tag ri-tag-green">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.profile.gaps && result.profile.gaps.length > 0 && (
                    <div className="ri-profile-item ri-profile-full">
                      <span className="ri-profile-label">{t('interviewKit.areasToProbe')}</span>
                      <div className="ri-tags">
                        {result.profile.gaps.map((s, i) => (
                          <span key={i} className="ri-tag ri-tag-orange">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.profile.jdMatch && result.profile.jdMatch.matched && result.profile.jdMatch.matched.length > 0 && (
                    <div className="ri-profile-item ri-profile-full">
                      <span className="ri-profile-label">{t('interviewKit.jdMatched')}</span>
                      <div className="ri-tags">
                        {result.profile.jdMatch.matched.map((s, i) => (
                          <span key={i} className="ri-tag ri-tag-green">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {result.profile.jdMatch && result.profile.jdMatch.missing && result.profile.jdMatch.missing.length > 0 && (
                    <div className="ri-profile-item ri-profile-full">
                      <span className="ri-profile-label">{t('interviewKit.jdMissing')}</span>
                      <div className="ri-tags">
                        {result.profile.jdMatch.missing.map((s, i) => (
                          <span key={i} className="ri-tag ri-tag-red">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Questions Tabs */}
              <div className="ri-questions-card">
                <h2 className="ri-section-title">{t('interviewKit.questionsTitle', { count:
                  (result.questions?.technical?.length || 0) +
                  (result.questions?.coding?.length || 0) +
                  (result.questions?.sql?.length || 0) +
                  (result.questions?.projectBased?.length || 0) +
                  (result.questions?.behavioral?.length || 0) +
                  (result.questions?.scenario?.length || 0)
                })}</h2>
                <div className="ri-tabs">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      className={`ri-tab ${activeTab === tab.key ? 'ri-tab-active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                    >
                      {tab.label} {tab.count != null && <span className="ri-tab-count">{tab.count}</span>}
                    </button>
                  ))}
                </div>

                <div className="ri-questions-list">
                  {activeTab === 'technical' && (result.questions?.technical || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.difficulty && <span className={`ri-q-diff ${diffClass(q.difficulty)}`}>{q.difficulty}</span>}
                        {q.area && <span className="ri-q-area">{q.area}</span>}
                        {q.skill && <span className="ri-q-skill">{q.skill}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {q.answer && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <p>{q.answer}</p>
                        </details>
                      )}
                    </div>
                  ))}

                  {activeTab === 'coding' && (result.questions?.coding || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.difficulty && <span className={`ri-q-diff ${diffClass(q.difficulty)}`}>{q.difficulty}</span>}
                        {q.language && <span className="ri-q-area">{q.language}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {q.answer && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <pre className="ri-q-code-answer">{q.answer}</pre>
                        </details>
                      )}
                    </div>
                  ))}

                  {activeTab === 'sql' && (result.questions?.sql || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.difficulty && <span className={`ri-q-diff ${diffClass(q.difficulty)}`}>{q.difficulty}</span>}
                        {q.concepts && <span className="ri-q-area">{q.concepts}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {q.answer && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <pre className="ri-q-code-answer">{q.answer}</pre>
                        </details>
                      )}
                    </div>
                  ))}

                  {activeTab === 'projectBased' && (result.questions?.projectBased || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.difficulty && <span className={`ri-q-diff ${diffClass(q.difficulty)}`}>{q.difficulty}</span>}
                        {q.context && <span className="ri-q-context">📁 {q.context}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {q.answer && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <p>{q.answer}</p>
                        </details>
                      )}
                    </div>
                  ))}

                  {activeTab === 'behavioral' && (result.questions?.behavioral || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.evaluates && <span className="ri-q-eval">🎯 {q.evaluates}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {q.answer && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <p>{q.answer}</p>
                        </details>
                      )}
                    </div>
                  ))}

                  {activeTab === 'scenario' && (result.questions?.scenario || []).map((q, i) => (
                    <div key={i} className="ri-question-item">
                      <div className="ri-q-header">
                        <span className="ri-q-num">Q{i + 1}</span>
                        {q.area && <span className="ri-q-area">{q.area}</span>}
                        {typeLabel(q.type) && <span className={`ri-q-type ${typeLabel(q.type).cls}`}>{typeLabel(q.type).text}</span>}
                      </div>
                      <p className="ri-q-text">{q.question}</p>
                      {(q.answer || q.expectedApproach) && (
                        <details className="ri-q-approach">
                          <summary>💡 {t('interviewKit.showAnswer', 'Show Answer')}</summary>
                          <p>{q.answer || q.expectedApproach}</p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
