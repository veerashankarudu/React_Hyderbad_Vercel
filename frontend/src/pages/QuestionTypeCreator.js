import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import API from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../AuthContext';
import './McqForm.css';

// ─── TYPE DEFINITIONS (must match QuestionTypes.js QUESTION_TYPES) ───────────
const TYPE_META = {
  SINGLE_MCQ: { icon: '🔘', title: 'Single Choice MCQ', badge: 'Classic' },
  MULTI_MCQ: { icon: '☑️', title: 'Multiple Choice', badge: 'Multi' },
  DRAG_ORDER: { icon: '↕️', title: 'Drag & Drop Ordering', badge: 'Interactive' },
  MATCH_PAIRS: { icon: '🔗', title: 'Match Concept to Definition', badge: 'Matching' },
  CODE_OUTPUT: { icon: '➡️', title: 'Match Code to Output', badge: 'Matching' },
  FILL_BLANK: { icon: '✏️', title: 'Fill in the Blank', badge: 'Input' },
  PREDICT_OUTPUT: { icon: '🔮', title: 'Predict Program Output', badge: 'Tracing' },
  DEBUG_CODE: { icon: '🐛', title: 'Debug the Code', badge: 'Fix' },
  CODE_REARRANGE: { icon: '🧩', title: 'Code Rearrangement', badge: 'Puzzle' },
  SQL_BUILDER: { icon: '🗃️', title: 'Interactive SQL Builder', badge: 'Builder' },
  ARCH_LAYERS: { icon: '🏗️', title: 'Architecture Layers', badge: 'Design' },
  CODE_REVIEW: { icon: '👁️', title: 'Code Review Challenge', badge: 'Review' },
  PIPELINE_BUILD: { icon: '🔧', title: 'Stream Pipeline Builder', badge: 'Builder' },
  FLOWCHART: { icon: '📊', title: 'Flowchart Question', badge: 'Visual' },
  DEVOPS_PIPE: { icon: '🚀', title: 'DevOps Pipeline', badge: 'CI/CD' },
  SECURE_CODE: { icon: '🛡️', title: 'Secure Coding', badge: 'Security' },
  RIDDLE: { icon: '🧩', title: 'Tech Riddles', badge: 'Fun' },
};

// ─── FORM COMPONENTS ─────────────────────────────────────────────────────────

function DragOrderForm({ content, setContent }) {
  const items = content.items || ['', '', '', ''];
  const setItems = (newItems) => setContent({ ...content, items: newItems, correctOrder: newItems.map((_, i) => i) });
  return (
    <div className="qt-form-section">
      <label className="form-label">Items (in CORRECT order — they will be shuffled for the learner):</label>
      {items.map((item, i) => (
        <div key={i} className="form-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-badge">{i + 1}.</span>
          <input className="form-input" value={item} placeholder={`Step ${i + 1}`}
            onChange={e => { const n = [...items]; n[i] = e.target.value; setItems(n); }} />
          {items.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setItems([...items, ''])}>+ Add Step</button>
    </div>
  );
}

function MatchPairsForm({ content, setContent }) {
  const pairs = content.pairs || [{ left: '', right: '' }, { left: '', right: '' }];
  const setPairs = (p) => setContent({ ...content, pairs: p });
  return (
    <div className="qt-form-section">
      <label className="form-label">Matching Pairs (Concept → Definition):</label>
      {pairs.map((pair, i) => (
        <div key={i} className="form-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input className="form-input" value={pair.left} placeholder="Concept"
            onChange={e => { const n = [...pairs]; n[i] = { ...n[i], left: e.target.value }; setPairs(n); }} />
          <span style={{ alignSelf: 'center' }}>→</span>
          <input className="form-input" value={pair.right} placeholder="Definition"
            onChange={e => { const n = [...pairs]; n[i] = { ...n[i], right: e.target.value }; setPairs(n); }} />
          {pairs.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setPairs([...pairs, { left: '', right: '' }])}>+ Add Pair</button>
    </div>
  );
}

function CodeOutputForm({ content, setContent }) {
  const pairs = content.pairs || [{ code: '', output: '' }, { code: '', output: '' }];
  const setPairs = (p) => setContent({ ...content, pairs: p });
  return (
    <div className="qt-form-section">
      <label className="form-label">Code → Output Pairs:</label>
      {pairs.map((pair, i) => (
        <div key={i} style={{ marginBottom: '1rem', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.75rem' }}>
          <textarea className="form-input" rows={3} value={pair.code} placeholder="Code snippet..."
            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
            onChange={e => { const n = [...pairs]; n[i] = { ...n[i], code: e.target.value }; setPairs(n); }} />
          <input className="form-input" value={pair.output} placeholder="Expected output" style={{ marginTop: '0.5rem' }}
            onChange={e => { const n = [...pairs]; n[i] = { ...n[i], output: e.target.value }; setPairs(n); }} />
          {pairs.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setPairs(pairs.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setPairs([...pairs, { code: '', output: '' }])}>+ Add Pair</button>
    </div>
  );
}

function FillBlankForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Code with blanks (use <code>___</code> for each blank):</label>
      <textarea className="form-input" rows={5} value={content.codeTemplate || ''} placeholder={'List<String> list = new ArrayList<>();\nlist.stream().___( s -> s.length() > 3 ).___( System.out::println );'}
        style={{ fontFamily: 'monospace' }}
        onChange={e => setContent({ ...content, codeTemplate: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Correct answers (comma-separated, in order of blanks):</label>
      <input className="form-input" value={content.answers || ''} placeholder="filter, forEach"
        onChange={e => setContent({ ...content, answers: e.target.value })} />
    </div>
  );
}

function PredictOutputForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Code to trace:</label>
      <textarea className="form-input" rows={6} value={content.code || ''} placeholder="int x = 5;\nfor (int i = 0; i < 3; i++) {\n  x += i;\n}\nSystem.out.println(x);"
        style={{ fontFamily: 'monospace' }}
        onChange={e => setContent({ ...content, code: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Correct output:</label>
      <input className="form-input" value={content.correctOutput || ''} placeholder="8"
        onChange={e => setContent({ ...content, correctOutput: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Distractor outputs (comma-separated):</label>
      <input className="form-input" value={content.distractors || ''} placeholder="5, 6, 15"
        onChange={e => setContent({ ...content, distractors: e.target.value })} />
    </div>
  );
}

function DebugCodeForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Buggy code:</label>
      <textarea className="form-input" rows={6} value={content.buggyCode || ''} placeholder='String s = null;\nSystem.out.println(s.length());'
        style={{ fontFamily: 'monospace' }}
        onChange={e => setContent({ ...content, buggyCode: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Bug description:</label>
      <input className="form-input" value={content.bugDescription || ''} placeholder="NullPointerException — s is null"
        onChange={e => setContent({ ...content, bugDescription: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Fixed code:</label>
      <textarea className="form-input" rows={4} value={content.fixedCode || ''} placeholder='String s = "";\nif (s != null) System.out.println(s.length());'
        style={{ fontFamily: 'monospace' }}
        onChange={e => setContent({ ...content, fixedCode: e.target.value })} />
    </div>
  );
}

function CodeRearrangeForm({ content, setContent }) {
  const blocks = content.blocks || ['', '', '', ''];
  const setBlocks = (b) => setContent({ ...content, blocks: b });
  return (
    <div className="qt-form-section">
      <label className="form-label">Code blocks (in CORRECT order — will be shuffled):</label>
      {blocks.map((block, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-badge">{i + 1}.</span>
          <input className="form-input" value={block} placeholder={`Code line ${i + 1}`}
            style={{ fontFamily: 'monospace' }}
            onChange={e => { const n = [...blocks]; n[i] = e.target.value; setBlocks(n); }} />
          {blocks.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setBlocks(blocks.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setBlocks([...blocks, ''])}>+ Add Block</button>
    </div>
  );
}

function SQLBuilderForm({ content, setContent }) {
  const clauses = content.clauses || ['', '', '', ''];
  const setClauses = (c) => setContent({ ...content, clauses: c });
  return (
    <div className="qt-form-section">
      <label className="form-label">SQL clauses (in CORRECT order):</label>
      {clauses.map((clause, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-badge">{i + 1}.</span>
          <input className="form-input" value={clause} placeholder={`e.g. SELECT name, age`}
            style={{ fontFamily: 'monospace' }}
            onChange={e => { const n = [...clauses]; n[i] = e.target.value; setClauses(n); }} />
          {clauses.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setClauses(clauses.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setClauses([...clauses, ''])}>+ Add Clause</button>
      <label className="form-label" style={{ marginTop: '1rem' }}>Expected result description:</label>
      <input className="form-input" value={content.expectedResult || ''} placeholder="Returns all employees older than 25"
        onChange={e => setContent({ ...content, expectedResult: e.target.value })} />
    </div>
  );
}

function ArchLayersForm({ content, setContent }) {
  const layers = content.layers || [{ name: 'Controller', components: '' }, { name: 'Service', components: '' }, { name: 'Repository', components: '' }];
  const setLayers = (l) => setContent({ ...content, layers: l });
  return (
    <div className="qt-form-section">
      <label className="form-label">Architecture layers with components (learner drags components into layers):</label>
      {layers.map((layer, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
          <input className="form-input" style={{ width: '30%' }} value={layer.name} placeholder="Layer name"
            onChange={e => { const n = [...layers]; n[i] = { ...n[i], name: e.target.value }; setLayers(n); }} />
          <span>:</span>
          <input className="form-input" value={layer.components} placeholder="Component1, Component2, ..."
            onChange={e => { const n = [...layers]; n[i] = { ...n[i], components: e.target.value }; setLayers(n); }} />
          {layers.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setLayers(layers.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setLayers([...layers, { name: '', components: '' }])}>+ Add Layer</button>
    </div>
  );
}

function CodeReviewForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Code to review (with intentional issues):</label>
      <textarea className="form-input" rows={8} value={content.code || ''} placeholder={'// PR code to review\npublic void process(String input) {\n  String query = "SELECT * FROM users WHERE name = \'" + input + "\';";\n  db.execute(query);\n}'}
        style={{ fontFamily: 'monospace' }}
        onChange={e => setContent({ ...content, code: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Issues to find (one per line):</label>
      <textarea className="form-input" rows={3} value={content.issues || ''} placeholder="SQL Injection vulnerability\nNo input validation\nNo parameterized query"
        onChange={e => setContent({ ...content, issues: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Fixed code:</label>
      <textarea className="form-input" rows={5} value={content.fixedCode || ''} style={{ fontFamily: 'monospace' }}
        placeholder={'public void process(String input) {\n  String query = "SELECT * FROM users WHERE name = ?";\n  db.prepareStatement(query).setString(1, input);\n}'}
        onChange={e => setContent({ ...content, fixedCode: e.target.value })} />
    </div>
  );
}

function PipelineBuilderForm({ content, setContent }) {
  const operators = content.operators || ['', '', '', ''];
  const setOps = (o) => setContent({ ...content, operators: o });
  return (
    <div className="qt-form-section">
      <label className="form-label">Stream pipeline operators (in correct order):</label>
      {operators.map((op, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-badge">{i + 1}.</span>
          <input className="form-input" value={op} placeholder={`e.g. .filter(x -> x > 0)`}
            style={{ fontFamily: 'monospace' }}
            onChange={e => { const n = [...operators]; n[i] = e.target.value; setOps(n); }} />
          {operators.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setOps(operators.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setOps([...operators, ''])}>+ Add Operator</button>
      <label className="form-label" style={{ marginTop: '1rem' }}>Source collection:</label>
      <input className="form-input" value={content.source || ''} placeholder="List.of(1, -2, 3, -4, 5)"
        onChange={e => setContent({ ...content, source: e.target.value })} />
      <label className="form-label" style={{ marginTop: '0.5rem' }}>Expected output:</label>
      <input className="form-input" value={content.expectedOutput || ''} placeholder="[1, 3, 5]"
        onChange={e => setContent({ ...content, expectedOutput: e.target.value })} />
    </div>
  );
}

function FlowchartForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Flowchart description (text-based diagram):</label>
      <textarea className="form-input" rows={6} value={content.diagram || ''} placeholder="START → Read n → Is n > 0? → YES: Print 'Positive' → END\n                         → NO: Print 'Negative' → END"
        onChange={e => setContent({ ...content, diagram: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Question about the flowchart:</label>
      <input className="form-input" value={content.question || ''} placeholder="What is printed when n = -5?"
        onChange={e => setContent({ ...content, question: e.target.value })} />
      <label className="form-label" style={{ marginTop: '0.5rem' }}>Correct answer:</label>
      <input className="form-input" value={content.correctAnswer || ''} placeholder="Negative"
        onChange={e => setContent({ ...content, correctAnswer: e.target.value })} />
      <label className="form-label" style={{ marginTop: '0.5rem' }}>Distractors (comma-separated):</label>
      <input className="form-input" value={content.distractors || ''} placeholder="Positive, Zero, Error"
        onChange={e => setContent({ ...content, distractors: e.target.value })} />
    </div>
  );
}

function DevOpsPipeForm({ content, setContent }) {
  const stages = content.stages || ['', '', '', '', ''];
  const setStages = (s) => setContent({ ...content, stages: s });
  return (
    <div className="qt-form-section">
      <label className="form-label">CI/CD pipeline stages (in CORRECT order):</label>
      {stages.map((stage, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="form-badge">{i + 1}.</span>
          <input className="form-input" value={stage} placeholder={`e.g. Build`}
            onChange={e => { const n = [...stages]; n[i] = e.target.value; setStages(n); }} />
          {stages.length > 2 && <button type="button" className="btn-sm-danger" onClick={() => setStages(stages.filter((_, j) => j !== i))}>✕</button>}
        </div>
      ))}
      <button type="button" className="btn-sm-add" onClick={() => setStages([...stages, ''])}>+ Add Stage</button>
    </div>
  );
}

function SecureCodingForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Vulnerable code:</label>
      <textarea className="form-input" rows={6} value={content.vulnerableCode || ''} style={{ fontFamily: 'monospace' }}
        placeholder={'// Vulnerable to XSS\nresponse.getWriter().write("<h1>" + userInput + "</h1>");'}
        onChange={e => setContent({ ...content, vulnerableCode: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Vulnerability type:</label>
      <input className="form-input" value={content.vulnerabilityType || ''} placeholder="Cross-Site Scripting (XSS)"
        onChange={e => setContent({ ...content, vulnerabilityType: e.target.value })} />
      <label className="form-label" style={{ marginTop: '0.5rem' }}>Secure fix:</label>
      <textarea className="form-input" rows={4} value={content.secureFix || ''} style={{ fontFamily: 'monospace' }}
        placeholder={'// Secure version\nresponse.getWriter().write("<h1>" + HtmlUtils.htmlEscape(userInput) + "</h1>");'}
        onChange={e => setContent({ ...content, secureFix: e.target.value })} />
    </div>
  );
}

function RiddleForm({ content, setContent }) {
  return (
    <div className="qt-form-section">
      <label className="form-label">Riddle text:</label>
      <textarea className="form-input" rows={3} value={content.riddle || ''} placeholder="I am used to store key-value pairs. I don't allow duplicate keys. I'm not thread-safe. What am I?"
        onChange={e => setContent({ ...content, riddle: e.target.value })} />
      <label className="form-label" style={{ marginTop: '1rem' }}>Correct answer:</label>
      <input className="form-input" value={content.answer || ''} placeholder="HashMap"
        onChange={e => setContent({ ...content, answer: e.target.value })} />
      <label className="form-label" style={{ marginTop: '0.5rem' }}>Hint:</label>
      <input className="form-input" value={content.hint || ''} placeholder="Think java.util package..."
        onChange={e => setContent({ ...content, hint: e.target.value })} />
    </div>
  );
}

// Map type IDs to form components
const FORM_MAP = {
  DRAG_ORDER: DragOrderForm,
  MATCH_PAIRS: MatchPairsForm,
  CODE_OUTPUT: CodeOutputForm,
  FILL_BLANK: FillBlankForm,
  PREDICT_OUTPUT: PredictOutputForm,
  DEBUG_CODE: DebugCodeForm,
  CODE_REARRANGE: CodeRearrangeForm,
  SQL_BUILDER: SQLBuilderForm,
  ARCH_LAYERS: ArchLayersForm,
  CODE_REVIEW: CodeReviewForm,
  PIPELINE_BUILD: PipelineBuilderForm,
  FLOWCHART: FlowchartForm,
  DEVOPS_PIPE: DevOpsPipeForm,
  SECURE_CODE: SecureCodingForm,
  RIDDLE: RiddleForm,
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function QuestionTypeCreator() {
  const { typeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = TYPE_META[typeId] || { icon: '❓', title: 'Unknown Type', badge: '' };

  const [techStacks, setTechStacks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState({ techStackId: '', topicId: '', questionStem: '', difficulty: 'MEDIUM' });
  const [content, setContent] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/master/tech-stacks').then(r => { const d = r.data; setTechStacks(Array.isArray(d) ? d : (d.content || [])); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.techStackId) {
      API.get(`/master/tech-stacks/${form.techStackId}/topics`).then(r => { const d = r.data; setTopics(Array.isArray(d) ? d : (d.content || [])); }).catch(() => {});
    } else {
      setTopics([]);
    }
  }, [form.techStackId]);

  const handleSave = async (sendForReview = false) => {
    if (!form.techStackId || !form.questionStem) {
      toast.error('Please fill in tech stack and question stem');
      return;
    }
    setSaving(true);
    try {
      // For SINGLE_MCQ / MULTI_MCQ, redirect to existing form
      const qType = typeId === 'SINGLE_MCQ' ? 'SINGLE' : typeId === 'MULTI_MCQ' ? 'MULTI' : typeId;
      const payload = {
        questionStem: form.questionStem,
        techStackId: parseInt(form.techStackId),
        topicId: form.topicId ? parseInt(form.topicId) : null,
        difficulty: form.difficulty,
        questionType: qType,
        optionA: content.optionA || 'N/A',
        optionB: content.optionB || 'N/A',
        optionC: content.optionC || 'N/A',
        optionD: content.optionD || 'N/A',
        correctAnswer: content.correctAnswer || 'A',
        contentJson: JSON.stringify(content),
        sendForReview,
        skipDuplicateCheck: true,
      };
      const { data } = await API.post('/mcqs', payload);
      if (sendForReview) {
        try { await API.post(`/mcqs/${data.id}/submit`); } catch {}
      }
      toast.success(`${meta.title} question saved as ${sendForReview ? 'Ready for Review' : 'Draft'}!`);
      navigate('/my-questions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const FormComponent = FORM_MAP[typeId];

  // For SINGLE_MCQ and MULTI_MCQ, redirect to existing McqForm
  if (typeId === 'SINGLE_MCQ' || typeId === 'MULTI_MCQ') {
    navigate('/mcq/new');
    return null;
  }

  return (
    <>
      <Navbar />
      <div className="mcq-form-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/question-types')} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '2rem' }}>{meta.icon}</span>
          <div>
            <h2 style={{ margin: 0 }}>Create: {meta.title}</h2>
            <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{meta.badge} • Question Type</span>
          </div>
        </div>

        {/* Common Fields */}
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label className="form-label">Technology Stack *</label>
            <select className="form-input" value={form.techStackId} onChange={e => setForm({ ...form, techStackId: e.target.value, topicId: '' })}>
              <option value="">Select...</option>
              {techStacks.map(ts => <option key={ts.id} value={ts.id}>{ts.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Topic</label>
            <select className="form-input" value={form.topicId} onChange={e => setForm({ ...form, topicId: e.target.value })}>
              <option value="">Select...</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Difficulty *</label>
            <select className="form-input" value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        </div>

        {/* Question Stem */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label">Question / Instruction *</label>
          <textarea className="form-input" rows={3} value={form.questionStem} placeholder="Enter the question or instruction for this challenge..."
            onChange={e => setForm({ ...form, questionStem: e.target.value })} />
        </div>

        {/* Type-Specific Form */}
        {FormComponent && <FormComponent content={content} setContent={setContent} />}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={() => navigate('/question-types')} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save as Draft'}
          </button>
          <button className="btn-success" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? '📤 Sending...' : '📤 Save & Send for Review'}
          </button>
        </div>
      </div>
    </>
  );
}
