import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import API from '../api';
import Navbar from '../components/Navbar';
import './AIStudio.css';

export default function AIStudio() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('code-to-mcq');
  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    API.get('/api/v1/master/tech-stacks').then(r => setTechStacks(r.data)).catch(() => {});
    API.get('/api/v1/master/topics').then(r => setTopics(r.data)).catch(() => {});
  }, []);

  return (
    <>
      <Navbar />
      <div className="ai-studio-container">
        <div className="ai-studio-header">
          <h1>🧠 AI Studio</h1>
          <p className="ai-studio-subtitle">Advanced AI-powered tools for intelligent question generation & learning</p>
        </div>

        <div className="ai-studio-tabs">
          <button className={activeTab === 'code-to-mcq' ? 'active' : ''} onClick={() => setActiveTab('code-to-mcq')}>
            💻 Code → MCQ
          </button>
          <button className={activeTab === 'rewrite' ? 'active' : ''} onClick={() => setActiveTab('rewrite')}>
            ✨ AI Rewrite
          </button>
          <button className={activeTab === 'learning-path' ? 'active' : ''} onClick={() => setActiveTab('learning-path')}>
            🎯 Learning Path
          </button>
        </div>

        <div className="ai-studio-content">
          {activeTab === 'code-to-mcq' && (
            <CodeToMcq techStacks={techStacks} topics={topics} loading={loading} setLoading={setLoading} />
          )}
          {activeTab === 'rewrite' && (
            <RewriteMcq loading={loading} setLoading={setLoading} />
          )}
          {activeTab === 'learning-path' && (
            <LearningPath loading={loading} setLoading={setLoading} />
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── Code to MCQ ─────────────────────────── */
function CodeToMcq({ techStacks, topics, loading, setLoading }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('Java');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [techStackId, setTechStackId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [results, setResults] = useState(null);
  const [saveMode, setSaveMode] = useState(false);

  const handleGenerate = async () => {
    if (!code.trim()) { toast.warning('Please paste a code snippet'); return; }
    setLoading(true);
    setResults(null);
    try {
      const res = await API.post('/api/v1/ai/generate-from-code', {
        code, language, count, difficulty,
        techStackId: saveMode && techStackId ? Number(techStackId) : null,
        topicId: saveMode && topicId ? Number(topicId) : null,
        save: saveMode && techStackId && topicId
      });
      setResults(res.data);
      toast.success(`Generated ${res.data.generated} MCQs from code!`);
    } catch (e) {
      toast.error(e.response?.data?.error || 'AI generation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-panel">
      <h2>💻 Generate MCQs from Code Snippet</h2>
      <p className="ai-desc">Paste any code → AI generates questions testing understanding of that code</p>

      <div className="ai-form-row">
        <label>Language</label>
        <select value={language} onChange={e => setLanguage(e.target.value)}>
          {['Java','Python','JavaScript','TypeScript','C++','C#','Go','Rust','SQL','Kotlin'].map(l => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <label>Count</label>
        <select value={count} onChange={e => setCount(Number(e.target.value))}>
          {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <label>Difficulty</label>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      <textarea
        className="ai-code-input"
        placeholder="Paste your code here..."
        value={code}
        onChange={e => setCode(e.target.value)}
        rows={12}
      />

      <div className="ai-form-row">
        <label className="ai-checkbox">
          <input type="checkbox" checked={saveMode} onChange={e => setSaveMode(e.target.checked)} />
          Save to Question Bank
        </label>
        {saveMode && (
          <>
            <select value={techStackId} onChange={e => setTechStackId(e.target.value)}>
              <option value="">Select Tech Stack</option>
              {techStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
            </select>
            <select value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">Select Topic</option>
              {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </>
        )}
      </div>

      <button className="ai-btn" onClick={handleGenerate} disabled={loading}>
        {loading ? '⏳ Generating...' : '🚀 Generate MCQs from Code'}
      </button>

      {results && results.questions && (
        <div className="ai-results">
          <h3>Generated {results.generated} Questions</h3>
          {results.savedIds?.length > 0 && (
            <p className="ai-saved-badge">✅ Saved to Question Bank (IDs: {results.savedIds.join(', ')})</p>
          )}
          {results.questions.map((q, i) => (
            <div key={i} className="ai-mcq-card">
              <div className="ai-mcq-number">Q{i + 1}</div>
              <p className="ai-mcq-stem">{q.questionStem}</p>
              <div className="ai-mcq-options">
                <div className={q.correctAnswer === 'A' ? 'correct' : ''}>A) {q.optionA}</div>
                <div className={q.correctAnswer === 'B' ? 'correct' : ''}>B) {q.optionB}</div>
                <div className={q.correctAnswer === 'C' ? 'correct' : ''}>C) {q.optionC}</div>
                <div className={q.correctAnswer === 'D' ? 'correct' : ''}>D) {q.optionD}</div>
              </div>
              {q.explanation && <p className="ai-mcq-explanation">💡 {q.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── AI Rewrite ─────────────────────────── */
function RewriteMcq({ loading, setLoading }) {
  const [stem, setStem] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState('A');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [result, setResult] = useState(null);
  const [mcqId, setMcqId] = useState('');

  const handleRewrite = async () => {
    if (!stem.trim()) { toast.warning('Enter a question to rewrite'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await API.post('/api/v1/ai/rewrite-mcq', {
        questionStem: stem, optionA: optA, optionB: optB,
        optionC: optC, optionD: optD, correctAnswer: correct, difficulty
      });
      setResult(res.data);
      toast.success('AI rewrite complete!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Rewrite failed');
    } finally { setLoading(false); }
  };

  const handleRewriteById = async () => {
    if (!mcqId) { toast.warning('Enter an MCQ ID'); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await API.post(`/api/v1/ai/rewrite-mcq/${mcqId}`);
      setResult(res.data);
      if (res.data.original) {
        setStem(res.data.original.questionStem || '');
        setOptA(res.data.original.optionA || '');
        setOptB(res.data.original.optionB || '');
        setOptC(res.data.original.optionC || '');
        setOptD(res.data.original.optionD || '');
      }
      toast.success('AI rewrite complete!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Rewrite failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-panel">
      <h2>✨ AI MCQ Rewriter</h2>
      <p className="ai-desc">Paste a weak MCQ → AI rewrites it with better stem, distractors, and clarity</p>

      <div className="ai-form-row">
        <input type="number" placeholder="MCQ ID (optional)" value={mcqId}
          onChange={e => setMcqId(e.target.value)} style={{width: '120px'}} />
        <button className="ai-btn-sm" onClick={handleRewriteById} disabled={loading || !mcqId}>
          Rewrite by ID
        </button>
      </div>

      <div className="ai-form-group">
        <label>Question Stem</label>
        <textarea value={stem} onChange={e => setStem(e.target.value)} rows={3}
          placeholder="What is the purpose of...?" />
      </div>
      <div className="ai-form-row">
        <div className="ai-form-group" style={{flex: 1}}>
          <label>A</label><input value={optA} onChange={e => setOptA(e.target.value)} />
        </div>
        <div className="ai-form-group" style={{flex: 1}}>
          <label>B</label><input value={optB} onChange={e => setOptB(e.target.value)} />
        </div>
      </div>
      <div className="ai-form-row">
        <div className="ai-form-group" style={{flex: 1}}>
          <label>C</label><input value={optC} onChange={e => setOptC(e.target.value)} />
        </div>
        <div className="ai-form-group" style={{flex: 1}}>
          <label>D</label><input value={optD} onChange={e => setOptD(e.target.value)} />
        </div>
      </div>
      <div className="ai-form-row">
        <select value={correct} onChange={e => setCorrect(e.target.value)}>
          <option value="A">Correct: A</option>
          <option value="B">Correct: B</option>
          <option value="C">Correct: C</option>
          <option value="D">Correct: D</option>
        </select>
        <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      <button className="ai-btn" onClick={handleRewrite} disabled={loading}>
        {loading ? '⏳ Rewriting...' : '✨ AI Rewrite'}
      </button>

      {result && result.improved && (
        <div className="ai-results">
          <div className="ai-comparison">
            <div className="ai-compare-col ai-before">
              <h4>❌ Original (Score: {result.qualityBefore || '?'}/100)</h4>
              <p><strong>Q:</strong> {result.original?.questionStem}</p>
              <p>A) {result.original?.optionA}</p>
              <p>B) {result.original?.optionB}</p>
              <p>C) {result.original?.optionC}</p>
              <p>D) {result.original?.optionD}</p>
            </div>
            <div className="ai-compare-col ai-after">
              <h4>✅ Improved (Score: {result.qualityAfter || '?'}/100)</h4>
              <p><strong>Q:</strong> {result.improved.questionStem}</p>
              <p>A) {result.improved.optionA}</p>
              <p>B) {result.improved.optionB}</p>
              <p>C) {result.improved.optionC}</p>
              <p>D) {result.improved.optionD}</p>
            </div>
          </div>
          {result.improvements && (
            <div className="ai-improvements">
              <h4>📝 Improvements Made:</h4>
              <ul>{result.improvements.map((imp, i) => <li key={i}>{imp}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Learning Path ─────────────────────────── */
function LearningPath({ loading, setLoading }) {
  const [result, setResult] = useState(null);
  const [wrongAnswers, setWrongAnswers] = useState([
    { topic: 'Spring Boot', questionStem: 'What annotation starts a Spring Boot app?', correctAnswer: '@SpringBootApplication', userAnswer: '@Configuration' },
    { topic: 'Spring Boot', questionStem: 'Default port for Spring Boot?', correctAnswer: '8080', userAnswer: '8443' },
    { topic: 'JPA', questionStem: 'What is @OneToMany fetch type default?', correctAnswer: 'LAZY', userAnswer: 'EAGER' },
  ]);
  const [correctAnswers, setCorrectAnswers] = useState([
    { topic: 'Java', questionStem: 'What is JVM?' },
    { topic: 'Spring Boot', questionStem: 'What is dependency injection?' },
  ]);
  const [jsonInput, setJsonInput] = useState('');

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        wrongAnswers: jsonInput ? JSON.parse(jsonInput).wrongAnswers || wrongAnswers : wrongAnswers,
        correctAnswers: jsonInput ? JSON.parse(jsonInput).correctAnswers || correctAnswers : correctAnswers
      };
      const res = await API.post('/api/v1/ai/learning-path', payload);
      setResult(res.data);
      toast.success('Learning path generated!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to generate learning path');
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-panel">
      <h2>🎯 AI Personalized Learning Path</h2>
      <p className="ai-desc">Based on your quiz performance, AI generates a custom study plan with priorities</p>

      <div className="ai-form-group">
        <label>Quiz Results (JSON - optional, or use demo data below)</label>
        <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} rows={5}
          placeholder={'{"wrongAnswers":[{"topic":"...","questionStem":"...","correctAnswer":"...","userAnswer":"..."}],"correctAnswers":[{"topic":"...","questionStem":"..."}]}'} />
      </div>

      <details className="ai-demo-data">
        <summary>📋 Demo Data (pre-filled)</summary>
        <p><strong>Wrong:</strong> {wrongAnswers.length} questions | <strong>Correct:</strong> {correctAnswers.length} questions</p>
        <pre>{JSON.stringify({ wrongAnswers, correctAnswers }, null, 2)}</pre>
      </details>

      <button className="ai-btn" onClick={handleGenerate} disabled={loading}>
        {loading ? '⏳ Analyzing...' : '🎯 Generate My Learning Path'}
      </button>

      {result && result.available !== false && (
        <div className="ai-results ai-learning-results">
          <div className="ai-lp-header">
            <div className="ai-lp-level">
              <span className={`ai-level-badge ${(result.overallLevel || '').toLowerCase()}`}>
                {result.overallLevel}
              </span>
              <span className="ai-accuracy">{result.accuracy?.toFixed?.(1) || result.accuracy}% Accuracy</span>
            </div>
            {result.motivationalNote && <p className="ai-motivation">{result.motivationalNote}</p>}
          </div>

          {result.weakTopics && result.weakTopics.length > 0 && (
            <div className="ai-section">
              <h4>⚠️ Weak Topics</h4>
              <div className="ai-weak-topics">
                {result.weakTopics.map((wt, i) => (
                  <span key={i} className={`ai-topic-tag priority-${(wt.priority || '').toLowerCase()}`}>
                    {wt.topic} ({wt.errorCount} errors)
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.learningPath && (
            <div className="ai-section">
              <h4>📚 Your Learning Path</h4>
              <div className="ai-path-steps">
                {result.learningPath.map((step, i) => (
                  <div key={i} className="ai-path-step">
                    <div className="ai-step-num">{step.step || i + 1}</div>
                    <div className="ai-step-content">
                      <strong>{step.topic}</strong>
                      <p>{step.action}</p>
                      <div className="ai-step-meta">
                        {step.estimatedTime && <span>⏱ {step.estimatedTime}</span>}
                        {step.difficulty && <span className="ai-diff-tag">{step.difficulty}</span>}
                        {step.resource && <span>📖 {step.resource}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.practiceRecommendations && (
            <div className="ai-section">
              <h4>💡 Practice Recommendations</h4>
              <ul>{result.practiceRecommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>
          )}

          {result.strengths && result.strengths.length > 0 && (
            <div className="ai-section">
              <h4>💪 Your Strengths</h4>
              <div className="ai-strengths">
                {result.strengths.map((s, i) => <span key={i} className="ai-strength-tag">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
