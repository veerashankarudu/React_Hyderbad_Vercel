import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import API from '../api';
import './CodingQuestion.css';

export default function CodingQuestion() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    techStackId: '',
    topicId: '',
    difficulty: 'MEDIUM',
    language: 'java',
    starterCode: '',
    solutionCode: '',
    testCases: [{ input: '', expectedOutput: '', hidden: false }],
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/master/tech-stacks').then(({ data }) => setTechStacks(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.techStackId) {
      API.get(`/master/tech-stacks/${form.techStackId}/topics`).then(({ data }) => setTopics(data)).catch(() => {});
    } else {
      setTopics([]);
    }
  }, [form.techStackId]);

  const updateForm = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addTestCase = () => setForm(prev => ({
    ...prev,
    testCases: [...prev.testCases, { input: '', expectedOutput: '', hidden: false }]
  }));

  const removeTestCase = (idx) => setForm(prev => ({
    ...prev,
    testCases: prev.testCases.filter((_, i) => i !== idx)
  }));

  const updateTestCase = (idx, key, val) => setForm(prev => ({
    ...prev,
    testCases: prev.testCases.map((tc, i) => i === idx ? { ...tc, [key]: val } : tc)
  }));

  // AI Generate coding question
  const handleAiGenerate = async () => {
    if (!form.techStackId || !form.topicId) {
      toast.warning('Please select tech stack and topic first');
      return;
    }
    setAiLoading(true);
    try {
      const stack = techStacks.find(s => String(s.id) === String(form.techStackId));
      const topic = topics.find(tp => String(tp.id) === String(form.topicId));
      const { data } = await API.post('/coding/ai-generate', {
        techStack: stack?.name || '',
        topic: topic?.name || '',
        difficulty: form.difficulty,
        language: form.language,
      });
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        description: data.description || prev.description,
        starterCode: data.starterCode || prev.starterCode,
        solutionCode: data.solutionCode || prev.solutionCode,
        testCases: data.testCases?.length > 0 ? data.testCases : prev.testCases,
      }));
      toast.success('AI generated coding question!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setAiLoading(false);
    }
  };

  // Run code against test cases
  const handleRunCode = async () => {
    if (!form.solutionCode.trim()) {
      toast.warning('Please write solution code first');
      return;
    }
    setRunLoading(true);
    setRunResult(null);
    try {
      const { data } = await API.post('/coding/execute', {
        language: form.language,
        code: form.solutionCode,
        testCases: form.testCases,
      });
      setRunResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed');
    } finally {
      setRunLoading(false);
    }
  };

  // Save coding question
  const handleSave = async () => {
    if (!form.title || !form.description || !form.techStackId || !form.topicId) {
      toast.warning('Please fill all required fields');
      return;
    }
    setSaving(true);
    try {
      await API.post('/coding/questions', form);
      toast.success('Coding question saved!');
      navigate('/my-questions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container coding-page">
      <div className="coding-header">
        <h1>💻 {t('myQ.codingQuestion')}</h1>
        <p className="coding-subtitle">Create a coding challenge with test cases and AI assistance</p>
      </div>

      <div className="coding-layout">
        {/* Left: Form */}
        <div className="coding-form-panel">
          <div className="coding-section">
            <h3>Problem Details</h3>
            <div className="coding-row">
              <select value={form.techStackId} onChange={e => updateForm('techStackId', e.target.value)}>
                <option value="">Select Tech Stack</option>
                {techStacks.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.topicId} onChange={e => updateForm('topicId', e.target.value)}>
                <option value="">Select Topic</option>
                {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
              </select>
            </div>
            <div className="coding-row">
              <select value={form.difficulty} onChange={e => updateForm('difficulty', e.target.value)}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
              <select value={form.language} onChange={e => updateForm('language', e.target.value)}>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
            <input
              type="text"
              className="coding-input"
              placeholder="Problem Title (e.g. Two Sum)"
              value={form.title}
              onChange={e => updateForm('title', e.target.value)}
            />
            <textarea
              className="coding-textarea"
              placeholder="Problem Description — explain what the user needs to solve..."
              rows={5}
              value={form.description}
              onChange={e => updateForm('description', e.target.value)}
            />
          </div>

          <div className="coding-section">
            <div className="coding-section-header">
              <h3>Test Cases</h3>
              <button type="button" className="coding-btn-sm" onClick={addTestCase}>+ Add</button>
            </div>
            {form.testCases.map((tc, idx) => (
              <div key={idx} className="test-case-row">
                <span className="tc-num">#{idx + 1}</span>
                <input placeholder="Input" value={tc.input} onChange={e => updateTestCase(idx, 'input', e.target.value)} />
                <input placeholder="Expected Output" value={tc.expectedOutput} onChange={e => updateTestCase(idx, 'expectedOutput', e.target.value)} />
                <label className="tc-hidden-label">
                  <input type="checkbox" checked={tc.hidden} onChange={e => updateTestCase(idx, 'hidden', e.target.checked)} />
                  Hidden
                </label>
                {form.testCases.length > 1 && (
                  <button type="button" className="tc-remove" onClick={() => removeTestCase(idx)}>✕</button>
                )}
              </div>
            ))}
          </div>

          <div className="coding-actions">
            <button className="coding-btn ai-btn" onClick={handleAiGenerate} disabled={aiLoading}>
              {aiLoading ? '⏳ Generating...' : '🤖 AI Generate'}
            </button>
            <button className="coding-btn run-btn" onClick={handleRunCode} disabled={runLoading}>
              {runLoading ? '⏳ Running...' : '▶ Run Tests'}
            </button>
            <button className="coding-btn save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Question'}
            </button>
          </div>
        </div>

        {/* Right: Code Editor + Results */}
        <div className="coding-editor-panel">
          <div className="coding-section">
            <h3>Starter Code (shown to user)</h3>
            <textarea
              className="code-editor"
              placeholder={form.language === 'java'
                ? 'public class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your code here\n    }\n}'
                : '# Write your solution here'}
              rows={8}
              value={form.starterCode}
              onChange={e => updateForm('starterCode', e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="coding-section">
            <h3>Solution Code (for validation)</h3>
            <textarea
              className="code-editor"
              placeholder="Write the complete solution to validate test cases..."
              rows={12}
              value={form.solutionCode}
              onChange={e => updateForm('solutionCode', e.target.value)}
              spellCheck={false}
            />
          </div>

          {runResult && (
            <div className="coding-section run-results">
              <h3>Execution Results</h3>
              <div className={`run-summary ${runResult.allPassed ? 'pass' : 'fail'}`}>
                {runResult.allPassed ? '✅ All tests passed!' : `❌ ${runResult.passed}/${runResult.total} passed`}
              </div>
              {runResult.results?.map((r, i) => (
                <div key={i} className={`run-case ${r.passed ? 'pass' : 'fail'}`}>
                  <span className="run-case-num">Test {i + 1}:</span>
                  <span className={r.passed ? 'text-success' : 'text-error'}>
                    {r.passed ? '✓ PASS' : '✗ FAIL'}
                  </span>
                  {!r.passed && <div className="run-case-detail">Expected: {r.expected} | Got: {r.actual}</div>}
                  {r.error && <div className="run-case-error">{r.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
