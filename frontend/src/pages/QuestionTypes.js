import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import API from '../api';
import './QuestionTypes.css';

// ─── QUESTION TYPE DEFINITIONS ────────────────────────────────────────────────
const QUESTION_TYPES = [
  { id: 'SINGLE_MCQ', icon: '🔘', title: 'Single Choice MCQ', badge: 'Classic', desc: 'Standard multiple-choice with exactly one correct answer.', tags: ['Java', 'Spring Boot', 'SQL', 'AWS'] },
  { id: 'MULTI_MCQ', icon: '☑️', title: 'Multiple Choice', badge: 'Multi', desc: 'Select all correct answers from multiple options.', tags: ['Java', 'Functional Interfaces', 'Design Patterns'] },
  { id: 'DRAG_ORDER', icon: '↕️', title: 'Drag & Drop Ordering', badge: 'Interactive', desc: 'Arrange items in correct sequential order.', tags: ['Spring Boot', 'DevOps', 'Lifecycle'] },
  { id: 'MATCH_PAIRS', icon: '🔗', title: 'Match Concept to Definition', badge: 'Matching', desc: 'Connect concepts to their definitions by drawing lines.', tags: ['Collections', 'DSA', 'Patterns'] },
  { id: 'CODE_OUTPUT', icon: '➡️', title: 'Match Code to Output', badge: 'Matching', desc: 'Match code snippets to their corresponding outputs.', tags: ['Java', 'JavaScript', 'Operators'] },
  { id: 'FILL_BLANK', icon: '✏️', title: 'Fill in the Blank', badge: 'Input', desc: 'Complete code by filling missing keywords or identifiers.', tags: ['Java', 'Generics', 'Streams'] },
  { id: 'PREDICT_OUTPUT', icon: '🔮', title: 'Predict Program Output', badge: 'Tracing', desc: 'Read code and predict console output.', tags: ['Java', 'Operators', 'Loops'] },
  { id: 'DEBUG_CODE', icon: '🐛', title: 'Debug the Code', badge: 'Fix', desc: 'Identify bugs and runtime errors in given code.', tags: ['Exceptions', 'Null Safety', 'Logic'] },
  { id: 'CODE_REARRANGE', icon: '🧩', title: 'Code Rearrangement', badge: 'Puzzle', desc: 'Rearrange shuffled code blocks into valid program.', tags: ['Java', 'Syntax', 'Basics'] },
  { id: 'SQL_BUILDER', icon: '🗃️', title: 'Interactive SQL Builder', badge: 'Builder', desc: 'Drag SQL clauses to construct valid queries.', tags: ['SQL', 'Database', 'Queries'] },
  { id: 'ARCH_LAYERS', icon: '🏗️', title: 'Architecture Layers', badge: 'Design', desc: 'Drag components into correct architecture layers.', tags: ['System Design', 'Spring Boot', 'MVC'] },
  { id: 'CODE_REVIEW', icon: '👁️', title: 'Code Review Challenge', badge: 'Review', desc: 'Identify security/performance issues in PR code.', tags: ['Security', 'OWASP', 'Performance'] },
  { id: 'PIPELINE_BUILD', icon: '🔧', title: 'Stream Pipeline Builder', badge: 'Builder', desc: 'Build a Java Stream pipeline from available operators.', tags: ['Java Streams', 'Functional', 'Lambda'] },
  { id: 'FLOWCHART', icon: '📊', title: 'Flowchart Question', badge: 'Visual', desc: 'Answer questions based on flowchart diagrams.', tags: ['Control Flow', 'Algorithms', 'Loops'] },
  { id: 'DEVOPS_PIPE', icon: '🚀', title: 'DevOps Pipeline', badge: 'CI/CD', desc: 'Arrange CI/CD stages in correct order.', tags: ['DevOps', 'Docker', 'Kubernetes'] },
  { id: 'SECURE_CODE', icon: '🛡️', title: 'Secure Coding', badge: 'Security', desc: 'Identify OWASP vulnerabilities and write secure fixes.', tags: ['XSS', 'SQL Injection', 'OWASP'] },
  { id: 'RIDDLE', icon: '🧩', title: 'Tech Riddles', badge: 'Fun', desc: 'Solve creative riddles about programming concepts.', tags: ['Java', 'Angular', 'Spring Boot', 'All Topics'] },
  { id: 'CROSSWORD', icon: '✚', title: 'Crossword Puzzle', badge: 'Puzzle', desc: 'Fill the crossword grid with tech terms from clues.', tags: ['Java', 'Spring Boot', 'SQL', 'All Topics'] },
];

// ─── DEMO COMPONENTS ──────────────────────────────────────────────────────────

function DemoSingleMCQ() {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = 'B';
  const options = [
    { letter: 'A', text: '3' },
    { letter: 'B', text: '4' },
    { letter: 'C', text: '5' },
    { letter: 'D', text: 'Error' },
  ];

  return (
    <div>
      <div className="qt-demo-question">What is the output of the following code?</div>
      <div className="qt-demo-code">{'String s = "Java";\nSystem.out.println(s.length());'}</div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.letter}
            className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== correct ? 'wrong' : ''}`}
            onClick={() => !submitted && setSelected(o.letter)}
          >
            <span className="qt-option-letter">{o.letter}.</span>
            <span>{o.text}</span>
            {submitted && o.letter === correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit Answer</button>
        ) : (
          <div className={`qt-result ${selected === correct ? 'success' : 'error'}`}>
            {selected === correct ? '✓ Correct! String "Java" has 4 characters.' : `✗ Wrong. The correct answer is B (4 characters).`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoMultiMCQ() {
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const correctSet = new Set(['A', 'B']);
  const options = [
    { letter: 'A', text: 'Runnable' },
    { letter: 'B', text: 'Comparator' },
    { letter: 'C', text: 'List' },
    { letter: 'D', text: 'ArrayList' },
  ];

  const toggle = (letter) => {
    if (submitted) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(letter) ? next.delete(letter) : next.add(letter);
      return next;
    });
  };

  const score = submitted ? [...correctSet].filter(x => selected.has(x)).length / correctSet.size : 0;

  return (
    <div>
      <div className="qt-demo-question">Which of the following are functional interfaces in Java? <em style={{ color: '#94a3b8', fontSize: '0.8rem' }}>(Select all that apply)</em></div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.letter}
            className={`qt-option ${selected.has(o.letter) ? 'selected' : ''} ${submitted && correctSet.has(o.letter) ? 'correct' : ''} ${submitted && selected.has(o.letter) && !correctSet.has(o.letter) ? 'wrong' : ''}`}
            onClick={() => toggle(o.letter)}
          >
            <input type="checkbox" checked={selected.has(o.letter)} readOnly style={{ accentColor: '#A100FF' }} />
            <span>{o.text}</span>
            {submitted && correctSet.has(o.letter) && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={selected.size === 0} onClick={() => setSubmitted(true)}>Submit</button>
        ) : (
          <>
            <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>
              Score: {Math.round(score * 100)}% — Runnable (run()) and Comparator (compare()) are functional interfaces.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DemoDragOrder() {
  const initialItems = [
    { id: '3', text: 'Create Bean' },
    { id: '1', text: 'Run Main Method' },
    { id: '4', text: 'Dependency Injection' },
    { id: '2', text: 'Application Context Creation' },
  ];
  const correctOrder = ['1', '2', '3', '4'];
  const [items, setItems] = useState(initialItems);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newItems = [...items];
    const [dragged] = newItems.splice(dragIdx, 1);
    newItems.splice(idx, 0, dragged);
    setItems(newItems);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const score = submitted ? items.filter((item, idx) => item.id === correctOrder[idx]).length / items.length : 0;

  return (
    <div>
      <div className="qt-demo-question">Arrange the Spring Boot startup flow in correct order:</div>
      <div className="qt-sortable-list">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item.id === correctOrder[idx] ? 'correct-pos' : ''} ${submitted && item.id !== correctOrder[idx] ? 'wrong-pos' : ''}`}
            draggable={!submitted}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <span className="qt-drag-handle">⠿</span>
            <span className="qt-pos">{idx + 1}</span>
            <span>{item.text}</span>
            {submitted && item.id === correctOrder[idx] && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓</span>}
            {submitted && item.id !== correctOrder[idx] && <span style={{ marginLeft: 'auto', color: '#ef4444' }}>✗</span>}
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Check Order</button>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>
            {score === 1 ? '✓ Perfect! All items in correct order.' : `Score: ${Math.round(score * 100)}% — ${items.filter((item, idx) => item.id === correctOrder[idx]).length}/${items.length} correct positions.`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoMatchPairs() {
  const pairs = [
    { left: 'HashMap', right: 'Key-Value Storage', id: '1' },
    { left: 'ArrayList', right: 'Dynamic Array', id: '2' },
    { left: 'Queue', right: 'FIFO', id: '3' },
    { left: 'Stack', right: 'LIFO', id: '4' },
  ];
  const shuffledRight = ['LIFO', 'Key-Value Storage', 'FIFO', 'Dynamic Array'];
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matches, setMatches] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleLeftClick = (left) => { if (!submitted) setSelectedLeft(left); };
  const handleRightClick = (right) => {
    if (submitted || !selectedLeft) return;
    setMatches(prev => ({ ...prev, [selectedLeft]: right }));
    setSelectedLeft(null);
  };

  const score = submitted ? pairs.filter(p => matches[p.left] === p.right).length / pairs.length : 0;

  return (
    <div>
      <div className="qt-demo-question">Match each Java collection to its characteristic:</div>
      <div className="qt-match-container">
        <div className="qt-match-col">
          <h4>Concepts</h4>
          {pairs.map(p => (
            <div key={p.left}
              className={`qt-match-item ${selectedLeft === p.left ? 'active' : ''} ${matches[p.left] ? 'matched' : ''}`}
              onClick={() => handleLeftClick(p.left)}
            >
              {p.left} {matches[p.left] && <span style={{ float: 'right', opacity: 0.6 }}>→ {matches[p.left]}</span>}
            </div>
          ))}
        </div>
        <div className="qt-match-col">
          <h4>Definitions</h4>
          {shuffledRight.map(r => (
            <div key={r}
              className={`qt-match-item ${Object.values(matches).includes(r) ? 'matched' : ''}`}
              onClick={() => handleRightClick(r)}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <>
            <button className="qt-btn qt-btn-primary" disabled={Object.keys(matches).length < pairs.length} onClick={() => setSubmitted(true)}>Check Matches</button>
            {Object.keys(matches).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatches({}); setSelectedLeft(null); }}>Reset</button>}
          </>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>
            Score: {Math.round(score * 100)}% — {pairs.filter(p => matches[p.left] === p.right).length}/{pairs.length} correct matches.
          </div>
        )}
      </div>
    </div>
  );
}

function DemoCodeOutput() {
  const snippets = [
    { id: 'A', code: 'System.out.println(5 + 5);' },
    { id: 'B', code: 'System.out.println("5" + 5);' },
  ];
  const outputs = [{ id: '1', text: '10' }, { id: '2', text: '55' }];
  const correctMap = { A: '1', B: '2' };
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const [matches, setMatches] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleSnippetClick = (id) => { if (!submitted) setSelectedSnippet(id); };
  const handleOutputClick = (id) => {
    if (submitted || !selectedSnippet) return;
    setMatches(prev => ({ ...prev, [selectedSnippet]: id }));
    setSelectedSnippet(null);
  };

  const score = submitted ? Object.keys(correctMap).filter(k => matches[k] === correctMap[k]).length / Object.keys(correctMap).length : 0;

  return (
    <div>
      <div className="qt-demo-question">Match each code snippet to its output:</div>
      <div className="qt-match-container">
        <div className="qt-match-col">
          <h4>Code Snippets</h4>
          {snippets.map(s => (
            <div key={s.id}
              className={`qt-match-item ${selectedSnippet === s.id ? 'active' : ''} ${matches[s.id] ? 'matched' : ''}`}
              onClick={() => handleSnippetClick(s.id)}
              style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
            >
              <strong>{s.id}:</strong> {s.code}
            </div>
          ))}
        </div>
        <div className="qt-match-col">
          <h4>Outputs</h4>
          {outputs.map(o => (
            <div key={o.id}
              className={`qt-match-item ${Object.values(matches).includes(o.id) ? 'matched' : ''}`}
              onClick={() => handleOutputClick(o.id)}
              style={{ fontFamily: 'monospace' }}
            >
              {o.text}
            </div>
          ))}
        </div>
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={Object.keys(matches).length < 2} onClick={() => setSubmitted(true)}>Check</button>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : 'error'}`}>
            {score === 1 ? '✓ Correct! 5+5=10 (arithmetic), "5"+5="55" (string concat).' : 'Some matches are incorrect.'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoFillBlank() {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const correct = 'ArrayList';
  const isCorrect = answer.trim().toLowerCase() === correct.toLowerCase();

  return (
    <div>
      <div className="qt-demo-question">Fill in the blank to create a list of Strings:</div>
      <div className="qt-fill-code">
        <span>List&lt;String&gt; list = new </span>
        <input
          className={`qt-fill-input ${submitted ? (isCorrect ? 'correct' : 'wrong') : ''}`}
          value={answer}
          onChange={e => !submitted && setAnswer(e.target.value)}
          placeholder="______"
          disabled={submitted}
        />
        <span>&lt;&gt;();</span>
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!answer.trim()} onClick={() => setSubmitted(true)}>Submit</button>
        ) : (
          <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>
            {isCorrect ? '✓ Correct! ArrayList is the most common List implementation.' : `✗ Expected: ArrayList. You entered: "${answer}"`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoPredictOutput() {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const expected = '10\n12';
  const isCorrect = answer.trim() === expected;

  return (
    <div>
      <div className="qt-demo-question">What will be printed to the console?</div>
      <div className="qt-demo-code">{'int x = 10;\nSystem.out.println(x++);\nSystem.out.println(++x);'}</div>
      <textarea
        className="qt-output-input"
        value={answer}
        onChange={e => !submitted && setAnswer(e.target.value)}
        placeholder="Enter each output on a new line..."
        disabled={submitted}
        rows={3}
      />
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!answer.trim()} onClick={() => setSubmitted(true)}>Submit</button>
        ) : (
          <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>
            {isCorrect ? '✓ Correct! x++ prints 10 (post-increment), then x becomes 11, ++x makes it 12.' : `✗ Expected:\n10\n12\n\nx++ returns current value (10), then x=11, ++x increments first to 12.`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoDebugCode() {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const options = [
    { id: 'A', text: 'ArrayIndexOutOfBoundsException' },
    { id: 'B', text: 'NullPointerException' },
    { id: 'C', text: 'ClassCastException' },
    { id: 'D', text: 'StackOverflowError' },
  ];

  return (
    <div>
      <div className="qt-demo-question">What error will occur when this code runs?</div>
      <div className="qt-demo-code">{'String s = null;\nSystem.out.println(s.length());'}</div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.id}
            className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === 'B' ? 'correct' : ''} ${submitted && selected === o.id && o.id !== 'B' ? 'wrong' : ''}`}
            onClick={() => !submitted && setSelected(o.id)}
          >
            <span className="qt-option-letter">{o.id}.</span>
            <span>{o.text}</span>
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Identify Bug</button>
        ) : (
          <div className={`qt-result ${selected === 'B' ? 'success' : 'error'}`}>
            {selected === 'B' ? '✓ Correct! Calling .length() on null throws NullPointerException.' : 'The correct answer is NullPointerException — cannot call methods on null.'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoCodeRearrange() {
  const initialBlocks = [
    { id: '3', code: '        System.out.println("Hello");' },
    { id: '1', code: 'public class Test {' },
    { id: '5', code: '}' },
    { id: '2', code: '    public static void main(String[] args) {' },
    { id: '4', code: '    }' },
  ];
  const correctOrder = ['1', '2', '3', '4', '5'];
  const [blocks, setBlocks] = useState(initialBlocks);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newBlocks = [...blocks];
    const [dragged] = newBlocks.splice(dragIdx, 1);
    newBlocks.splice(idx, 0, dragged);
    setBlocks(newBlocks);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const score = blocks.filter((b, i) => b.id === correctOrder[i]).length / blocks.length;

  return (
    <div>
      <div className="qt-demo-question">Rearrange the code blocks to form a valid Java program:</div>
      <div className="qt-sortable-list">
        {blocks.map((block, idx) => (
          <div
            key={block.id}
            className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && block.id === correctOrder[idx] ? 'correct-pos' : ''} ${submitted && block.id !== correctOrder[idx] ? 'wrong-pos' : ''}`}
            draggable={!submitted}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
          >
            <span className="qt-drag-handle">⠿</span>
            <span>{block.code}</span>
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Check Code</button>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : score >= 0.6 ? 'partial' : 'error'}`}>
            {score === 1 ? '✓ Perfect! Valid Java program assembled.' : `Score: ${Math.round(score * 100)}% — Some blocks are out of order.`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoSQLBuilder() {
  const clauses = [
    { id: '1', text: 'SELECT name, salary', cat: 'select' },
    { id: '2', text: 'FROM employees', cat: 'from' },
    { id: '3', text: 'WHERE salary > 50000', cat: 'where' },
    { id: '4', text: 'ORDER BY name ASC', cat: 'orderby' },
    { id: '5', text: 'GROUP BY department', cat: 'distractor' },
    { id: '6', text: 'HAVING COUNT(*) > 1', cat: 'distractor' },
  ];
  const correctIds = ['1', '2', '3', '4'];
  const [canvas, setCanvas] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const addToCanvas = (clause) => {
    if (submitted || canvas.find(c => c.id === clause.id)) return;
    setCanvas([...canvas, clause]);
  };
  const removeFromCanvas = (id) => {
    if (submitted) return;
    setCanvas(canvas.filter(c => c.id !== id));
  };

  const isCorrect = submitted && canvas.length === correctIds.length && canvas.every((c, i) => c.id === correctIds[i]);

  return (
    <div>
      <div className="qt-demo-question">Build a SQL query: Find employees with salary &gt; 50000 ordered by name.</div>
      <div className="qt-sql-palette">
        {clauses.map(c => (
          <div
            key={c.id}
            className={`qt-sql-clause ${c.cat} ${canvas.find(x => x.id === c.id) ? 'used' : ''}`}
            onClick={() => addToCanvas(c)}
            style={{ opacity: canvas.find(x => x.id === c.id) ? 0.4 : 1, cursor: canvas.find(x => x.id === c.id) ? 'default' : 'pointer' }}
          >
            {c.text}
          </div>
        ))}
      </div>
      <div className={`qt-sql-canvas ${canvas.length > 0 ? 'has-items' : ''}`}>
        {canvas.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>Click clauses above to build your query...</span>}
        {canvas.map(c => (
          <div key={c.id} className={`qt-sql-clause ${c.cat}`} onClick={() => removeFromCanvas(c.id)} style={{ cursor: 'pointer' }}>
            {c.text} ×
          </div>
        ))}
      </div>
      {canvas.length > 0 && (
        <div className="qt-sql-preview">
          {canvas.map(c => c.text).join('\n')}
        </div>
      )}
      <div className="qt-actions">
        {!submitted ? (
          <>
            <button className="qt-btn qt-btn-primary" disabled={canvas.length === 0} onClick={() => setSubmitted(true)}>Execute Query</button>
            {canvas.length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => setCanvas([])}>Clear</button>}
          </>
        ) : (
          <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>
            {isCorrect ? '✓ Correct! Query returns employees with salary > 50000 sorted by name.' : 'Not quite. The correct query uses SELECT → FROM → WHERE → ORDER BY (without GROUP BY or HAVING).'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoArchLayers() {
  const layers = [
    { id: 'L1', name: 'Presentation Layer' },
    { id: 'L2', name: 'Business Layer' },
    { id: 'L3', name: 'Data Access Layer' },
    { id: 'L4', name: 'Database Layer' },
  ];
  const components = [
    { id: 'C1', name: 'Controller', icon: '🎮', correctLayer: 'L1' },
    { id: 'C2', name: 'Service', icon: '⚙️', correctLayer: 'L2' },
    { id: 'C3', name: 'Repository', icon: '📦', correctLayer: 'L3' },
    { id: 'C4', name: 'MySQL', icon: '🗄️', correctLayer: 'L4' },
  ];
  const [placements, setPlacements] = useState({});
  const [dragComp, setDragComp] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const unplaced = components.filter(c => !Object.values(placements).flat().find(x => x === c.id));
  const score = submitted ? components.filter(c => (placements[c.correctLayer] || []).includes(c.id)).length / components.length : 0;

  return (
    <div>
      <div className="qt-demo-question">Drag each component to its correct architectural layer:</div>
      <div className="qt-arch-palette">
        {unplaced.map(c => (
          <div
            key={c.id}
            className="qt-arch-component"
            draggable={!submitted}
            onDragStart={() => setDragComp(c.id)}
          >
            {c.icon} {c.name}
          </div>
        ))}
        {unplaced.length === 0 && !submitted && <span style={{ color: '#64748b', fontSize: '0.75rem' }}>All components placed!</span>}
      </div>
      <div className="qt-arch-zones">
        {layers.map(layer => (
          <div
            key={layer.id}
            className="qt-arch-zone"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
            onDrop={e => {
              e.currentTarget.classList.remove('drag-over');
              if (submitted || !dragComp) return;
              // Remove from other layers
              const newP = { ...placements };
              Object.keys(newP).forEach(k => { newP[k] = (newP[k] || []).filter(x => x !== dragComp); });
              newP[layer.id] = [...(newP[layer.id] || []), dragComp];
              setPlacements(newP);
              setDragComp(null);
            }}
          >
            <div className="qt-arch-zone-label">{layer.name}</div>
            {(placements[layer.id] || []).map(cId => {
              const comp = components.find(c => c.id === cId);
              const isCorrect = submitted && comp.correctLayer === layer.id;
              const isWrong = submitted && comp.correctLayer !== layer.id;
              return (
                <span key={cId} className={`qt-arch-component ${isCorrect ? 'placed' : ''}`} style={isWrong ? { borderColor: '#ef4444', color: '#fca5a5' } : {}}>
                  {comp.icon} {comp.name} {isCorrect && '✓'} {isWrong && '✗'}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={unplaced.length > 0} onClick={() => setSubmitted(true)}>Check Placement</button>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>
            {score === 1 ? '✓ Perfect! All components in correct layers.' : `Score: ${Math.round(score * 100)}% — Some components are misplaced.`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoCodeReview() {
  const [selectedLine, setSelectedLine] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const lines = [
    'public String getUserData(String userId) {',
    '    String query = "SELECT * FROM users WHERE id = \'" + userId + "\'";',
    '    return jdbcTemplate.queryForObject(query, String.class);',
    '}',
  ];
  const bugLine = 1; // 0-indexed

  return (
    <div>
      <div className="qt-demo-question">Review this code — click the line with a security vulnerability:</div>
      <div className="qt-pr-code" style={{ background: '#0d1117', borderRadius: '10px', overflow: 'hidden', marginBottom: '1rem' }}>
        {lines.map((line, idx) => (
          <React.Fragment key={idx}>
            <div
              className={`qt-pr-line ${selectedLine === idx ? 'highlighted' : ''} ${submitted && idx === bugLine ? 'highlighted' : ''}`}
              onClick={() => !submitted && setSelectedLine(idx)}
              style={{ cursor: submitted ? 'default' : 'pointer' }}
            >
              <span className="qt-pr-linenum">{idx + 1}</span>
              <span className="qt-pr-content">{line}</span>
            </div>
            {submitted && idx === bugLine && (
              <div className="qt-pr-annotation">
                🛡️ <strong>SQL Injection (CWE-89)</strong> — User input directly concatenated into query. Use parameterized queries instead.
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={selectedLine === null} onClick={() => setSubmitted(true)}>Submit Review</button>
        ) : (
          <div className={`qt-result ${selectedLine === bugLine ? 'success' : 'error'}`}>
            {selectedLine === bugLine ? '✓ Correct! Line 2 has SQL Injection vulnerability — use PreparedStatement or named parameters.' : `✗ The vulnerability is on line 2. String concatenation with user input = SQL Injection.`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoPipelineBuilder() {
  const operators = [
    { id: '1', text: '.stream()' },
    { id: '2', text: '.filter(x -> x % 2 == 0)' },
    { id: '3', text: '.map(x -> x * 2)' },
    { id: '4', text: '.collect(Collectors.toList())' },
    { id: '5', text: '.sorted()' },
    { id: '6', text: '.distinct()' },
  ];
  const correctPipeline = ['1', '2', '3', '4'];
  const [pipeline, setPipeline] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const addOp = (op) => {
    if (submitted || pipeline.find(p => p.id === op.id)) return;
    setPipeline([...pipeline, op]);
  };
  const removeOp = (id) => {
    if (submitted) return;
    setPipeline(pipeline.filter(p => p.id !== id));
  };

  const isCorrect = submitted && pipeline.length === correctPipeline.length && pipeline.every((p, i) => p.id === correctPipeline[i]);

  return (
    <div>
      <div className="qt-demo-question">Build a Stream pipeline: filter even numbers, double them, collect to list.</div>
      <div className="qt-demo-code">{'List<Integer> nums = Arrays.asList(1, 2, 3, 4, 5, 6);'}</div>
      <div className="qt-op-palette">
        {operators.map(op => (
          <div
            key={op.id}
            className={`qt-op-chip ${pipeline.find(p => p.id === op.id) ? 'used' : ''}`}
            onClick={() => addOp(op)}
          >
            {op.text}
          </div>
        ))}
      </div>
      <div className={`qt-pipeline ${pipeline.length > 0 ? 'has-items' : ''}`}>
        {pipeline.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>Click operators above to build pipeline...</span>}
        <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.8rem' }}>nums</span>
        {pipeline.map((op, idx) => (
          <React.Fragment key={op.id}>
            <span className="qt-pipe-op" onClick={() => removeOp(op.id)} style={{ cursor: 'pointer' }}>{op.text}</span>
          </React.Fragment>
        ))}
      </div>
      {pipeline.length > 0 && (
        <div className="qt-sql-preview" style={{ fontFamily: 'monospace' }}>
          nums{pipeline.map(p => p.text).join('')}
        </div>
      )}
      <div className="qt-actions">
        {!submitted ? (
          <>
            <button className="qt-btn qt-btn-primary" disabled={pipeline.length === 0} onClick={() => setSubmitted(true)}>Run Pipeline</button>
            {pipeline.length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => setPipeline([])}>Clear</button>}
          </>
        ) : (
          <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>
            {isCorrect ? '✓ Correct! Output: [4, 8, 12] — filters evens (2,4,6), doubles them.' : 'Not quite. Correct: .stream() → .filter(even) → .map(double) → .collect()'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoFlowchart() {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const options = [
    { id: 'A', text: 'Loop continues with i++' },
    { id: 'B', text: 'Program terminates (End)' },
    { id: 'C', text: 'i resets to 1' },
    { id: 'D', text: 'Error occurs' },
  ];

  return (
    <div>
      <div className="qt-demo-question">Based on the for-loop flowchart: What happens when (i &lt;= 10) is FALSE?</div>
      {/* Simple text-based flowchart */}
      <div className="qt-flowchart">
        <div className="qt-flow-node start">Start: i = 1</div>
        <div className="qt-flow-arrow">↓</div>
        <div className="qt-flow-node process" style={{ background: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.3)', color: '#fcd34d', borderRadius: '4px', transform: 'none', clipPath: 'none' }}>
          (i &lt;= 10)?
        </div>
        <div className="qt-flow-branch">
          <div>
            <div className="qt-flow-label" style={{ color: '#10b981' }}>TRUE ↓</div>
            <div className="qt-flow-node process" style={{ fontSize: '0.7rem' }}>print "Hello Java"</div>
            <div className="qt-flow-arrow">↓</div>
            <div className="qt-flow-node process" style={{ fontSize: '0.7rem', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)', color: '#fcd34d' }}>i++</div>
            <div className="qt-flow-label">↑ loops back</div>
          </div>
          <div style={{ marginLeft: '2rem' }}>
            <div className="qt-flow-label" style={{ color: '#ef4444' }}>FALSE →</div>
            <div className="qt-flow-node end">End</div>
          </div>
        </div>
      </div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.id}
            className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === 'B' ? 'correct' : ''} ${submitted && selected === o.id && o.id !== 'B' ? 'wrong' : ''}`}
            onClick={() => !submitted && setSelected(o.id)}
          >
            <span className="qt-option-letter">{o.id}.</span>
            <span>{o.text}</span>
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit</button>
        ) : (
          <div className={`qt-result ${selected === 'B' ? 'success' : 'error'}`}>
            {selected === 'B' ? '✓ Correct! When condition is false, the loop exits and program ends.' : 'When condition is FALSE, the flow goes to End — program terminates.'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoDevOpsPipeline() {
  const initialStages = [
    { id: '5', text: 'Docker Image Build', icon: '🐳' },
    { id: '2', text: 'Unit Tests', icon: '🧪' },
    { id: '8', text: 'Deploy to Production', icon: '🚀' },
    { id: '1', text: 'Code Checkout', icon: '📥' },
    { id: '3', text: 'Build Artifact', icon: '🔨' },
    { id: '6', text: 'Deploy to Staging', icon: '🎭' },
  ];
  const correctOrder = ['1', '2', '3', '5', '6', '8'];
  const [stages, setStages] = useState(initialStages);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);

  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newStages = [...stages];
    const [dragged] = newStages.splice(dragIdx, 1);
    newStages.splice(idx, 0, dragged);
    setStages(newStages);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const score = submitted ? stages.filter((s, i) => s.id === correctOrder[i]).length / stages.length : 0;

  return (
    <div>
      <div className="qt-demo-question">Arrange the CI/CD pipeline stages in correct order:</div>
      <div className="qt-sortable-list">
        {stages.map((stage, idx) => (
          <div
            key={stage.id}
            className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && stage.id === correctOrder[idx] ? 'correct-pos' : ''} ${submitted && stage.id !== correctOrder[idx] ? 'wrong-pos' : ''}`}
            draggable={!submitted}
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
          >
            <span className="qt-drag-handle">⠿</span>
            <span className="qt-pos">{idx + 1}</span>
            <span>{stage.icon} {stage.text}</span>
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Deploy!</button>
        ) : (
          <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>
            {score === 1 ? '✓ Perfect pipeline! Ready for production.' : `Score: ${Math.round(score * 100)}% — Correct: Checkout → Tests → Build → Docker → Staging → Production`}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoSecureCoding() {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const options = [
    { id: 'A', text: 'SQL Injection — query concatenates user input' },
    { id: 'B', text: 'XSS — user input rendered directly in HTML response' },
    { id: 'C', text: 'CSRF — missing token validation' },
    { id: 'D', text: 'Insecure Deserialization' },
  ];

  return (
    <div>
      <div className="qt-demo-question">Identify the OWASP vulnerability in this endpoint:</div>
      <div className="qt-demo-code">{'@GetMapping("/search")\npublic String search(@RequestParam String query) {\n    return "<h1>Results for: " + query + "</h1>";\n}'}</div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.id}
            className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === 'B' ? 'correct' : ''} ${submitted && selected === o.id && o.id !== 'B' ? 'wrong' : ''}`}
            onClick={() => !submitted && setSelected(o.id)}
          >
            <span className="qt-option-letter">{o.id}.</span>
            <span>{o.text}</span>
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit</button>
        ) : (
          <div className={`qt-result ${selected === 'B' ? 'success' : 'error'}`}>
            {selected === 'B' ? '✓ Correct! XSS (CWE-79) — user query parameter is reflected directly into HTML without sanitization.' : 'The vulnerability is XSS. User input is rendered directly in the HTML response without encoding.'}
          </div>
        )}
      </div>
    </div>
  );
}

function DemoRiddle() {
  const [hintsShown, setHintsShown] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const hints = ['I handle requests before your Controller', 'Spring Boot uses me to route HTTP calls'];
  const options = [
    { letter: 'A', text: 'DispatcherServlet' },
    { letter: 'B', text: 'ApplicationContext' },
    { letter: 'C', text: 'BeanFactory' },
    { letter: 'D', text: 'JdbcTemplate' },
  ];

  return (
    <div>
      <div className="qt-riddle-header">🧩 <strong>Tech Riddle</strong></div>
      <div className="qt-riddle-text">
        "I am the gatekeeper of your web kingdom. Every HTTP request must pass through me first. I decide who handles what, routing visitors to the right controller. Without me, your endpoints are just lonely methods. What am I?"
      </div>
      <div className="qt-riddle-hints">
        {hints.slice(0, hintsShown).map((h, i) => (
          <div key={i} className="qt-riddle-hint">💡 Hint {i + 1}: {h}</div>
        ))}
        {hintsShown < hints.length && !submitted && (
          <button className="qt-btn qt-btn-outline qt-btn-sm" onClick={() => setHintsShown(hintsShown + 1)}>
            Show Hint ({hintsShown + 1}/{hints.length})
          </button>
        )}
      </div>
      <div className="qt-options">
        {options.map(o => (
          <div
            key={o.letter}
            className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === 'A' ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== 'A' ? 'wrong' : ''}`}
            onClick={() => !submitted && setSelected(o.letter)}
          >
            <span className="qt-option-letter">{o.letter}.</span>
            <span>{o.text}</span>
            {submitted && o.letter === 'A' && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
        ))}
      </div>
      <div className="qt-actions">
        {!submitted ? (
          <button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Solve Riddle</button>
        ) : (
          <div className={`qt-result ${selected === 'A' ? 'success' : 'error'}`}>
            {selected === 'A' ? '🎉 Solved! DispatcherServlet is Spring MVC\'s front controller — all requests go through it.' : '❌ The answer is DispatcherServlet — it\'s the front controller that routes all HTTP requests.'}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DEMO MAP ─────────────────────────────────────────────────────────────────
const DEMO_MAP = {
  SINGLE_MCQ: DemoSingleMCQ,
  MULTI_MCQ: DemoMultiMCQ,
  DRAG_ORDER: DemoDragOrder,
  MATCH_PAIRS: DemoMatchPairs,
  CODE_OUTPUT: DemoCodeOutput,
  FILL_BLANK: DemoFillBlank,
  PREDICT_OUTPUT: DemoPredictOutput,
  DEBUG_CODE: DemoDebugCode,
  CODE_REARRANGE: DemoCodeRearrange,
  SQL_BUILDER: DemoSQLBuilder,
  ARCH_LAYERS: DemoArchLayers,
  CODE_REVIEW: DemoCodeReview,
  PIPELINE_BUILD: DemoPipelineBuilder,
  FLOWCHART: DemoFlowchart,
  DEVOPS_PIPE: DemoDevOpsPipeline,
  SECURE_CODE: DemoSecureCoding,
  RIDDLE: DemoRiddle,
};

// ─── GENERATED QUESTION TEMPLATES BY TOPIC ────────────────────────────────────
const QUESTION_BANK = {
  'spring boot': [
    { type: 'SINGLE_MCQ', question: 'Which annotation is used to define the main class in Spring Boot?', code: null, options: [{ letter: 'A', text: '@SpringBootApplication' }, { letter: 'B', text: '@Controller' }, { letter: 'C', text: '@Service' }, { letter: 'D', text: '@Bean' }], correct: 'A', explanation: '@SpringBootApplication combines @Configuration, @EnableAutoConfiguration, and @ComponentScan.' },
    { type: 'SINGLE_MCQ', question: 'What is the default port for a Spring Boot application?', code: null, options: [{ letter: 'A', text: '3000' }, { letter: 'B', text: '8080' }, { letter: 'C', text: '8443' }, { letter: 'D', text: '9090' }], correct: 'B', explanation: 'Spring Boot Tomcat server starts on port 8080 by default.' },
    { type: 'SINGLE_MCQ', question: 'Which file is used to configure application properties?', code: null, options: [{ letter: 'A', text: 'config.xml' }, { letter: 'B', text: 'application.yml' }, { letter: 'C', text: 'settings.json' }, { letter: 'D', text: 'boot.properties' }], correct: 'B', explanation: 'application.yml or application.properties are Spring Boot config files.' },
    { type: 'DRAG_ORDER', question: 'Arrange the Spring Boot request lifecycle in order:', items: ['Client sends HTTP request', 'DispatcherServlet receives it', 'Handler mapping finds controller', 'Controller method executes', 'Response returned to client'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'FILL_BLANK', question: 'Complete the REST controller annotation:', codeParts: ['@', { blank: true, answer: 'RestController' }, '\npublic class UserController {\n    @', { blank: true, answer: 'GetMapping' }, '("/users")\n    public List<User> getAll() { ... }\n}'] },
    { type: 'SINGLE_MCQ', question: 'Which Spring Boot starter provides JPA support?', code: null, options: [{ letter: 'A', text: 'spring-boot-starter-web' }, { letter: 'B', text: 'spring-boot-starter-data-jpa' }, { letter: 'C', text: 'spring-boot-starter-jdbc' }, { letter: 'D', text: 'spring-boot-starter-orm' }], correct: 'B', explanation: 'spring-boot-starter-data-jpa provides JPA + Hibernate auto-configuration.' },
    { type: 'PREDICT_OUTPUT', question: 'What HTTP status code does this return?', code: '@PostMapping("/users")\n@ResponseStatus(HttpStatus.CREATED)\npublic User create(@RequestBody User user) {\n    return userService.save(user);\n}', expectedOutput: '201', explanation: 'HttpStatus.CREATED maps to 201.' },
    { type: 'DEBUG_CODE', question: 'Why will this bean fail to inject?', code: 'public class UserService {\n    private UserRepository repo;\n    \n    public UserService() {\n        this.repo = repo; // BUG\n    }\n}', options: [{ id: 'A', text: 'Missing @Service annotation on UserService' }, { id: 'B', text: 'Missing @Autowired or constructor injection' }, { id: 'C', text: 'UserRepository interface is wrong' }, { id: 'D', text: 'Constructor is private' }], correct: 'B', explanation: 'Without @Autowired or proper constructor injection, Spring cannot inject the dependency.' },
    { type: 'MULTI_MCQ', question: 'Which are valid Spring Boot auto-configuration conditions? (Select all)', options: [{ letter: 'A', text: '@ConditionalOnClass' }, { letter: 'B', text: '@ConditionalOnBean' }, { letter: 'C', text: '@ConditionalOnStart' }, { letter: 'D', text: '@ConditionalOnProperty' }], correctSet: ['A', 'B', 'D'], explanation: '@ConditionalOnStart does not exist.' },
    { type: 'SINGLE_MCQ', question: 'What does @Transactional do in Spring?', code: null, options: [{ letter: 'A', text: 'Creates a REST endpoint' }, { letter: 'B', text: 'Manages database transactions automatically' }, { letter: 'C', text: 'Logs method execution' }, { letter: 'D', text: 'Validates input' }], correct: 'B', explanation: '@Transactional ensures methods run within a database transaction with automatic commit/rollback.' },
    { type: 'RIDDLE', riddle: 'I am the invisible traffic controller of Spring. Every HTTP request passes through me. I consult my maps to find the right handler, then dispatch the work. Without me, no @GetMapping ever fires. What am I?', hints: ['I live in spring-webmvc', 'My name suggests I "dispatch" to "servlets"'], options: [{ letter: 'A', text: 'DispatcherServlet' }, { letter: 'B', text: 'Tomcat' }, { letter: 'C', text: 'ApplicationContext' }, { letter: 'D', text: 'Filter' }], correct: 'A', explanation: 'DispatcherServlet is the front controller that routes all requests to appropriate handlers.' },
    { type: 'MATCH_PAIRS', question: 'Match Spring annotation to its purpose:', pairs: [{ left: '@RestController', right: 'REST API controller' }, { left: '@Service', right: 'Business logic layer' }, { left: '@Repository', right: 'Data access layer' }, { left: '@Component', right: 'Generic Spring bean' }], shuffledRight: ['Business logic layer', 'REST API controller', 'Generic Spring bean', 'Data access layer'] },
    { type: 'CODE_OUTPUT', question: 'Match Spring annotation to HTTP method:', snippets: [{ id: 'A', code: '@PostMapping("/users")' }, { id: 'B', code: '@DeleteMapping("/users/{id}")' }], outputs: [{ id: '1', text: 'HTTP POST' }, { id: '2', text: 'HTTP DELETE' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange Spring Boot REST controller:', blocks: [{ id: '1', code: '@RestController' }, { id: '2', code: '@RequestMapping("/api")' }, { id: '3', code: 'public class UserController {' }, { id: '4', code: '    @GetMapping("/users")' }, { id: '5', code: '    public List<User> getAll() {' }, { id: '6', code: '        return service.findAll();' }, { id: '7', code: '    }' }, { id: '8', code: '}' }], correctOrder: ['1', '2', '3', '4', '5', '6', '7', '8'] },
  
    { type: 'ARCH_LAYERS', question: 'Place Spring components in correct architecture layer:', layers: ['Presentation', 'Service', 'Repository'], items: [{ text: '@RestController', layer: 'Presentation' }, { text: '@Service', layer: 'Service' }, { text: '@Repository', layer: 'Repository' }, { text: '@ControllerAdvice', layer: 'Presentation' }] },
    { type: 'CODE_REVIEW', question: 'Identify the security issue in this Spring controller:', code: '@PostMapping("/login")\npublic String login(@RequestParam String user) {\n    String sql = "SELECT * FROM users WHERE name=\'" + user + "\'";\n    return jdbcTemplate.queryForObject(sql, String.class);\n}', options: [{ id: 'A', text: 'SQL Injection via string concatenation' }, { id: 'B', text: 'Missing @Validated' }, { id: 'C', text: 'Should use GET' }, { id: 'D', text: 'Missing return type' }], correct: 'A', explanation: 'Direct string concatenation allows SQL injection. Use parameterized queries.' },
    { type: 'PIPELINE_BUILD', question: 'Build a Spring WebFlux reactive pipeline:', clauses: [{ id: '1', text: 'Mono.just(user)', cat: 'source' }, { id: '2', text: '.map(u -> u.getName())', cat: 'transform' }, { id: '3', text: '.flatMap(name -> repo.findByName(name))', cat: 'transform' }, { id: '4', text: '.subscribe()', cat: 'terminal' }, { id: '5', text: '.toBlocking()', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Spring request flow: Client -> Filter -> DispatcherServlet -> Controller. If Filter throws, what happens?', options: [{ letter: 'A', text: 'Request never reaches DispatcherServlet' }, { letter: 'B', text: 'Controller handles error' }, { letter: 'C', text: '@ControllerAdvice catches it' }, { letter: 'D', text: 'Spring retries' }], correct: 'A', explanation: 'Filters execute before DispatcherServlet. If a filter throws, the chain stops.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Spring Boot CI/CD pipeline stages:', items: ['Compile source code', 'Run unit tests', 'Build Docker image', 'Push to registry', 'Deploy to Kubernetes'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What OWASP vulnerability does this expose?', code: '@GetMapping("/profile")\npublic User getProfile(@RequestParam Long userId) {\n    return userRepository.findById(userId).orElseThrow();\n}', options: [{ id: 'A', text: 'Broken Access Control (IDOR)' }, { id: 'B', text: 'XSS' }, { id: 'C', text: 'CSRF' }, { id: 'D', text: 'Insecure deserialization' }], correct: 'A', explanation: 'Any user can access any profile by changing userId — this is IDOR.' },
    { type: 'CROSSWORD', question: '✚ Spring Boot Crossword — Fill in the tech terms!', words: [{ word: 'BEAN', clue: 'Object managed by Spring IoC container', row: 0, col: 0, direction: 'across' }, { word: 'BOOT', clue: 'Framework for rapid Spring app development', row: 0, col: 0, direction: 'down' }, { word: 'API', clue: 'Application programming interface', row: 0, col: 2, direction: 'down' }, { word: 'REST', clue: 'Architectural style for web APIs', row: 3, col: 1, direction: 'across' }, { word: 'YAML', clue: 'Config file format (application.___)', row: 5, col: 0, direction: 'across' }] },
  ],
  'java': [
    { type: 'SINGLE_MCQ', question: 'What is the output of: System.out.println("Hello" == "Hello");', code: null, options: [{ letter: 'A', text: 'true' }, { letter: 'B', text: 'false' }, { letter: 'C', text: 'Error' }, { letter: 'D', text: 'null' }], correct: 'A', explanation: 'String literals are interned, so == returns true for same literal.' },
    { type: 'PREDICT_OUTPUT', question: 'What does this print?', code: 'int[] arr = {1, 2, 3, 4, 5};\nSystem.out.println(arr.length);\nSystem.out.println(arr[arr.length - 1]);', expectedOutput: '5\n5', explanation: 'arr.length is 5, arr[4] is the last element which is 5.' },
    { type: 'SINGLE_MCQ', question: 'Which collection does NOT allow duplicate elements?', code: null, options: [{ letter: 'A', text: 'ArrayList' }, { letter: 'B', text: 'LinkedList' }, { letter: 'C', text: 'HashSet' }, { letter: 'D', text: 'Vector' }], correct: 'C', explanation: 'HashSet implements Set interface which guarantees no duplicates.' },
    { type: 'DRAG_ORDER', question: 'Arrange Java class loading phases in order:', items: ['Loading .class file', 'Linking (verification)', 'Initialization (static blocks)', 'Object instantiation', 'Garbage collection'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'FILL_BLANK', question: 'Complete the Stream operation:', codeParts: ['List<String> names = Arrays.asList("Alice", "Bob", "Charlie");\nList<String> result = names.stream()\n    .', { blank: true, answer: 'filter' }, '(n -> n.length() > 3)\n    .', { blank: true, answer: 'collect' }, '(Collectors.toList());'] },
    { type: 'MULTI_MCQ', question: 'Which are functional interfaces in Java? (Select all)', options: [{ letter: 'A', text: 'Runnable' }, { letter: 'B', text: 'Comparator' }, { letter: 'C', text: 'List' }, { letter: 'D', text: 'Predicate' }], correctSet: ['A', 'B', 'D'], explanation: 'List is not a functional interface — it has multiple abstract methods.' },
    { type: 'DEBUG_CODE', question: 'What exception will this throw?', code: 'List<String> list = Arrays.asList("a", "b", "c");\nlist.add("d");', options: [{ id: 'A', text: 'NullPointerException' }, { id: 'B', text: 'UnsupportedOperationException' }, { id: 'C', text: 'IndexOutOfBoundsException' }, { id: 'D', text: 'ClassCastException' }], correct: 'B', explanation: 'Arrays.asList() returns a fixed-size list. add() throws UnsupportedOperationException.' },
    { type: 'SINGLE_MCQ', question: 'What does the "volatile" keyword guarantee?', code: null, options: [{ letter: 'A', text: 'Thread safety for all operations' }, { letter: 'B', text: 'Visibility of changes across threads' }, { letter: 'C', text: 'Atomicity of operations' }, { letter: 'D', text: 'Prevents deadlocks' }], correct: 'B', explanation: 'volatile ensures visibility — all threads see the latest value, but does not guarantee atomicity.' },
    { type: 'PREDICT_OUTPUT', question: 'What is the output?', code: 'String s1 = new String("Java");\nString s2 = new String("Java");\nSystem.out.println(s1 == s2);\nSystem.out.println(s1.equals(s2));', expectedOutput: 'false\ntrue', explanation: '== compares references (different objects), .equals() compares content.' },
    { type: 'SINGLE_MCQ', question: 'What is the time complexity of HashMap.get()?', code: null, options: [{ letter: 'A', text: 'O(1) average' }, { letter: 'B', text: 'O(log n)' }, { letter: 'C', text: 'O(n)' }, { letter: 'D', text: 'O(n²)' }], correct: 'A', explanation: 'HashMap provides O(1) average-case lookup via hash-based indexing.' },
    { type: 'RIDDLE', riddle: 'I collect garbage but I am not a garbage truck. I free memory but I cannot be commanded. You can request my presence with System.gc(), but I may ignore you entirely. What am I?', hints: ['JVM manages me automatically', 'Mark-and-sweep is one of my algorithms'], options: [{ letter: 'A', text: 'Garbage Collector' }, { letter: 'B', text: 'Finalizer' }, { letter: 'C', text: 'ClassLoader' }, { letter: 'D', text: 'JIT Compiler' }], correct: 'A', explanation: 'The JVM Garbage Collector automatically reclaims unused heap memory. System.gc() is only a suggestion.' },
    { type: 'MATCH_PAIRS', question: 'Match Java concept to its keyword:', pairs: [{ left: 'Inheritance', right: 'extends' }, { left: 'Interface impl', right: 'implements' }, { left: 'Abstraction', right: 'abstract' }, { left: 'Encapsulation', right: 'private' }], shuffledRight: ['implements', 'extends', 'private', 'abstract'] },
    { type: 'CODE_OUTPUT', question: 'Match Java expression to output:', snippets: [{ id: 'A', code: 'System.out.println(10 / 3)' }, { id: 'B', code: 'System.out.println(10.0 / 3)' }], outputs: [{ id: '1', text: '3' }, { id: '2', text: '3.3333...' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange to create a Java class with method:', blocks: [{ id: '1', code: 'public class Calculator {' }, { id: '2', code: '    private int result = 0;' }, { id: '3', code: '    public int add(int a, int b) {' }, { id: '4', code: '        result = a + b;' }, { id: '5', code: '        return result;' }, { id: '6', code: '    }' }, { id: '7', code: '}' }], correctOrder: ['1', '2', '3', '4', '5', '6', '7'] },
  
    { type: 'ARCH_LAYERS', question: 'Place Java components in correct layer:', layers: ['Interface', 'Implementation', 'Utility'], items: [{ text: 'List<T>', layer: 'Interface' }, { text: 'ArrayList<T>', layer: 'Implementation' }, { text: 'Collections.sort()', layer: 'Utility' }, { text: 'Comparable<T>', layer: 'Interface' }] },
    { type: 'CODE_REVIEW', question: 'What performance issue exists?', code: 'public String buildReport(List<String> items) {\n    String result = "";\n    for (String item : items) {\n        result += item + "\\n";\n    }\n    return result;\n}', options: [{ id: 'A', text: 'String concat in loop is O(n squared)' }, { id: 'B', text: 'Missing null check' }, { id: 'C', text: 'Wrong loop type' }, { id: 'D', text: 'Memory leak' }], correct: 'A', explanation: 'String is immutable — each += creates a new object. Use StringBuilder.' },
    { type: 'PIPELINE_BUILD', question: 'Build a Stream pipeline for top 3 longest names:', clauses: [{ id: '1', text: 'names.stream()', cat: 'source' }, { id: '2', text: '.sorted(Comparator.comparingInt(String::length).reversed())', cat: 'transform' }, { id: '3', text: '.limit(3)', cat: 'transform' }, { id: '4', text: '.collect(Collectors.toList())', cat: 'terminal' }, { id: '5', text: '.forEach(println)', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Exception handling: try -> catch -> finally. If both try and finally return, which wins?', options: [{ letter: 'A', text: 'finally block return wins' }, { letter: 'B', text: 'try block return wins' }, { letter: 'C', text: 'Compilation error' }, { letter: 'D', text: 'Runtime exception' }], correct: 'A', explanation: 'finally always executes last — its return overrides try.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Java Maven build phases:', items: ['mvn clean', 'mvn compile', 'mvn test', 'mvn package', 'mvn deploy'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability exists?', code: 'ObjectInputStream ois = new ObjectInputStream(request.getInputStream());\nObject obj = ois.readObject();\nUser user = (User) obj;', options: [{ id: 'A', text: 'Insecure deserialization of untrusted data' }, { id: 'B', text: 'Missing try-catch' }, { id: 'C', text: 'Wrong cast' }, { id: 'D', text: 'Stream not closed' }], correct: 'A', explanation: 'Deserializing untrusted input can execute arbitrary code. Use allowlists or JSON.' },
    { type: 'CROSSWORD', question: '✚ Java Crossword — Fill in the keywords!', words: [{ word: 'CLASS', clue: 'Blueprint for creating objects', row: 0, col: 0, direction: 'across' }, { word: 'CATCH', clue: 'Block that handles exceptions', row: 0, col: 0, direction: 'down' }, { word: 'ARRAY', clue: 'Fixed-size indexed data structure', row: 0, col: 2, direction: 'down' }, { word: 'VOID', clue: 'Return type meaning "nothing"', row: 1, col: 4, direction: 'across' }, { word: 'FINAL', clue: 'Keyword preventing reassignment', row: 5, col: 0, direction: 'across' }] },
  ],
  'sql': [
    { type: 'SINGLE_MCQ', question: 'Which SQL clause is used to filter grouped results?', code: null, options: [{ letter: 'A', text: 'WHERE' }, { letter: 'B', text: 'HAVING' }, { letter: 'C', text: 'GROUP BY' }, { letter: 'D', text: 'ORDER BY' }], correct: 'B', explanation: 'HAVING filters after GROUP BY; WHERE filters before grouping.' },
    { type: 'SQL_BUILDER', question: 'Build a query to find departments with more than 5 employees:', clauses: [{ id: '1', text: 'SELECT department, COUNT(*)', cat: 'select' }, { id: '2', text: 'FROM employees', cat: 'from' }, { id: '3', text: 'GROUP BY department', cat: 'where' }, { id: '4', text: 'HAVING COUNT(*) > 5', cat: 'orderby' }, { id: '5', text: 'WHERE salary > 0', cat: 'distractor' }, { id: '6', text: 'LIMIT 10', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'SQL_BUILDER', question: 'Build a query to find the top 3 highest-paid employees:', clauses: [{ id: '1', text: 'SELECT name, salary', cat: 'select' }, { id: '2', text: 'FROM employees', cat: 'from' }, { id: '3', text: 'ORDER BY salary DESC', cat: 'orderby' }, { id: '4', text: 'LIMIT 3', cat: 'limit' }, { id: '5', text: 'GROUP BY name', cat: 'distractor' }, { id: '6', text: 'HAVING salary > 50000', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'SQL_BUILDER', question: 'Build a query to find employees who joined in 2024:', clauses: [{ id: '1', text: 'SELECT name, join_date', cat: 'select' }, { id: '2', text: 'FROM employees', cat: 'from' }, { id: '3', text: 'WHERE YEAR(join_date) = 2024', cat: 'where' }, { id: '4', text: 'ORDER BY join_date ASC', cat: 'orderby' }, { id: '5', text: 'HAVING COUNT(*) > 1', cat: 'distractor' }, { id: '6', text: 'GROUP BY department', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'SINGLE_MCQ', question: 'What does INNER JOIN return?', code: null, options: [{ letter: 'A', text: 'All rows from both tables' }, { letter: 'B', text: 'Only matching rows from both tables' }, { letter: 'C', text: 'All rows from left table' }, { letter: 'D', text: 'All rows from right table' }], correct: 'B', explanation: 'INNER JOIN returns only rows where the join condition matches in both tables.' },
    { type: 'PREDICT_OUTPUT', question: 'How many rows will this return?', code: 'CREATE TABLE t (id INT);\nINSERT INTO t VALUES (1),(2),(3),(NULL),(NULL);\nSELECT COUNT(*) FROM t;\nSELECT COUNT(id) FROM t;', expectedOutput: '5\n3', explanation: 'COUNT(*) counts all rows (5). COUNT(id) counts non-NULL values (3).' },
    { type: 'FILL_BLANK', question: 'Complete the SQL to find second highest salary:', codeParts: ['SELECT MAX(salary) FROM employees\nWHERE salary < (\n    SELECT ', { blank: true, answer: 'MAX' }, '(salary) FROM employees\n);'] },
    { type: 'DRAG_ORDER', question: 'SQL execution order (logical processing):', items: ['FROM / JOIN', 'WHERE', 'GROUP BY', 'HAVING', 'SELECT', 'ORDER BY'], correctOrder: [0, 1, 2, 3, 4, 5] },
    { type: 'SINGLE_MCQ', question: 'Which is NOT a valid SQL constraint?', code: null, options: [{ letter: 'A', text: 'PRIMARY KEY' }, { letter: 'B', text: 'FOREIGN KEY' }, { letter: 'C', text: 'UNIQUE' }, { letter: 'D', text: 'DUPLICATE' }], correct: 'D', explanation: 'DUPLICATE is not a SQL constraint. Valid ones include PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK.' },
    { type: 'SINGLE_MCQ', question: 'What does COALESCE(NULL, NULL, "hello", "world") return?', code: null, options: [{ letter: 'A', text: 'NULL' }, { letter: 'B', text: 'hello' }, { letter: 'C', text: 'world' }, { letter: 'D', text: 'Error' }], correct: 'B', explanation: 'COALESCE returns the first non-NULL value.' },
    { type: 'RIDDLE', riddle: 'I never appear in results, yet I am always in the data. Compare me with = and you get nothing. Only IS can find me. I am not zero, not empty string — I am the absence of value. What am I?', hints: ['Three-valued logic revolves around me', 'WHERE col = ??? never works for me'], options: [{ letter: 'A', text: 'NULL' }, { letter: 'B', text: 'Empty String' }, { letter: 'C', text: 'Zero' }, { letter: 'D', text: 'Undefined' }], correct: 'A', explanation: 'NULL represents unknown/missing data. Only IS NULL / IS NOT NULL can test for it.' },
    { type: 'MATCH_PAIRS', question: 'Match SQL JOIN type to its behavior:', pairs: [{ left: 'INNER JOIN', right: 'Only matching rows' }, { left: 'LEFT JOIN', right: 'All from left + matches' }, { left: 'CROSS JOIN', right: 'Cartesian product' }, { left: 'SELF JOIN', right: 'Table joined with itself' }], shuffledRight: ['Cartesian product', 'Only matching rows', 'Table joined with itself', 'All from left + matches'] },
    { type: 'CODE_OUTPUT', question: 'Match SQL query to its result:', snippets: [{ id: 'A', code: 'SELECT COUNT(DISTINCT dept) FROM emp' }, { id: 'B', code: 'SELECT COALESCE(NULL, "X")' }], outputs: [{ id: '1', text: 'Number of unique departments' }, { id: '2', text: 'X' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange SQL query in correct order:', blocks: [{ id: '1', code: 'SELECT name, SUM(amount)' }, { id: '2', code: 'FROM orders' }, { id: '3', code: 'WHERE status = "completed"' }, { id: '4', code: 'GROUP BY name' }, { id: '5', code: 'HAVING SUM(amount) > 100' }, { id: '6', code: 'ORDER BY SUM(amount) DESC' }], correctOrder: ['1', '2', '3', '4', '5', '6'] },
  
    { type: 'ARCH_LAYERS', question: 'Place database concepts in correct layer:', layers: ['Physical', 'Logical', 'External'], items: [{ text: 'Data files on disk', layer: 'Physical' }, { text: 'Tables and relations', layer: 'Logical' }, { text: 'Views for users', layer: 'External' }, { text: 'Indexes', layer: 'Physical' }] },
    { type: 'CODE_REVIEW', question: 'What performance problem exists?', code: 'SELECT * FROM orders\nWHERE YEAR(order_date) = 2024\nAND customer_id IN (SELECT customer_id FROM customers WHERE city = "NYC");', options: [{ id: 'A', text: 'YEAR() function prevents index usage' }, { id: 'B', text: 'Subquery syntax wrong' }, { id: 'C', text: 'SELECT * is a security issue' }, { id: 'D', text: 'Missing semicolon' }], correct: 'A', explanation: 'Functions on columns prevent index use. Use range: order_date BETWEEN ... AND ...' },
    { type: 'PIPELINE_BUILD', question: 'Build a CTE query:', clauses: [{ id: '1', text: 'WITH ranked AS (', cat: 'source' }, { id: '2', text: '  SELECT *, ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) rn', cat: 'transform' }, { id: '3', text: '  FROM employees', cat: 'from' }, { id: '4', text: ') SELECT * FROM ranked WHERE rn = 1', cat: 'terminal' }, { id: '5', text: 'LIMIT 1', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Transaction: BEGIN -> UPDATE -> error. What happens with ROLLBACK?', options: [{ letter: 'A', text: 'All changes since BEGIN are undone' }, { letter: 'B', text: 'Only failed statement rolls back' }, { letter: 'C', text: 'Changes commit anyway' }, { letter: 'D', text: 'Database crashes' }], correct: 'A', explanation: 'ROLLBACK reverts all changes within the transaction to maintain atomicity.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange database migration pipeline:', items: ['Backup current database', 'Run migration scripts', 'Validate schema changes', 'Run integration tests', 'Deploy application'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability does this code expose?', code: 'String query = "SELECT * FROM users WHERE name = \'" + userInput + "\'";\nStatement stmt = conn.createStatement();\nResultSet rs = stmt.executeQuery(query);', options: [{ id: 'A', text: 'SQL Injection — use PreparedStatement' }, { id: 'B', text: 'Connection leak' }, { id: 'C', text: 'Wrong ResultSet usage' }, { id: 'D', text: 'Missing transaction' }], correct: 'A', explanation: 'String concatenation enables SQL injection. Use PreparedStatement with ? placeholders.' },
    { type: 'CROSSWORD', question: '✚ SQL Crossword — Database terminology!', words: [{ word: 'INDEX', clue: 'Structure that speeds up queries', row: 0, col: 0, direction: 'across' }, { word: 'INSERT', clue: 'DML command to add rows', row: 0, col: 0, direction: 'down' }, { word: 'JOIN', clue: 'Combines rows from two tables', row: 2, col: 2, direction: 'across' }, { word: 'NULL', clue: 'Represents missing data', row: 4, col: 2, direction: 'across' }, { word: 'TABLE', clue: 'Basic storage structure in RDBMS', row: 0, col: 6, direction: 'down' }] },
  ],
  'react': [
    { type: 'SINGLE_MCQ', question: 'Which hook is used for side effects in React?', code: null, options: [{ letter: 'A', text: 'useState' }, { letter: 'B', text: 'useEffect' }, { letter: 'C', text: 'useContext' }, { letter: 'D', text: 'useMemo' }], correct: 'B', explanation: 'useEffect handles side effects like API calls, subscriptions, and DOM manipulation.' },
    { type: 'PREDICT_OUTPUT', question: 'What renders on screen?', code: 'function App() {\n  const [count, setCount] = useState(0);\n  return <h1>{count}</h1>;\n}', expectedOutput: '0', explanation: 'Initial state is 0, so <h1>0</h1> renders.' },
    { type: 'FILL_BLANK', question: 'Complete the custom hook:', codeParts: ['function useCounter(initial) {\n  const [count, setCount] = ', { blank: true, answer: 'useState' }, '(initial);\n  const increment = () => setCount(c => c + 1);\n  return { count, increment };\n}'] },
    { type: 'SINGLE_MCQ', question: 'What does React.memo() do?', code: null, options: [{ letter: 'A', text: 'Memoizes component to prevent re-renders if props unchanged' }, { letter: 'B', text: 'Creates a new component' }, { letter: 'C', text: 'Adds error boundaries' }, { letter: 'D', text: 'Manages state' }], correct: 'A', explanation: 'React.memo is a HOC that skips re-rendering if props are shallowly equal.' },
    { type: 'DEBUG_CODE', question: 'What\'s wrong with this useEffect?', code: 'useEffect(() => {\n  const interval = setInterval(() => {\n    setCount(count + 1);\n  }, 1000);\n});', options: [{ id: 'A', text: 'Missing cleanup — will cause memory leak' }, { id: 'B', text: 'Missing dependency array — runs every render' }, { id: 'C', text: 'Both A and B' }, { id: 'D', text: 'setCount syntax is wrong' }], correct: 'C', explanation: 'No cleanup (clearInterval) and no dependency array means it runs every render AND leaks intervals.' },
    { type: 'RIDDLE', riddle: 'I am a tree made of fibers. I exist in two copies — one you see, one being secretly built. When building is done, I swap instantly so the user sees no flicker. What am I?', hints: ['React 18 uses me for concurrent rendering', 'Reconciliation happens here'], options: [{ letter: 'A', text: 'Virtual DOM / Fiber Tree' }, { letter: 'B', text: 'Shadow DOM' }, { letter: 'C', text: 'Real DOM' }, { letter: 'D', text: 'CSSOM' }], correct: 'A', explanation: 'React\'s Fiber architecture uses dual virtual DOM trees — current and work-in-progress — for seamless updates.' },
    { type: 'MATCH_PAIRS', question: 'Match React hook to its purpose:', pairs: [{ left: 'useState', right: 'Manage local state' }, { left: 'useEffect', right: 'Side effects' }, { left: 'useMemo', right: 'Memoize computed value' }, { left: 'useRef', right: 'Persist value without re-render' }], shuffledRight: ['Side effects', 'Manage local state', 'Persist value without re-render', 'Memoize computed value'] },
    { type: 'CODE_OUTPUT', question: 'Match React code to its behavior:', snippets: [{ id: 'A', code: 'useEffect(() => {}, [])' }, { id: 'B', code: 'useEffect(() => {})' }], outputs: [{ id: '1', text: 'Runs once on mount' }, { id: '2', text: 'Runs on every render' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange React component setup:', blocks: [{ id: '1', code: 'import React, { useState } from "react";' }, { id: '2', code: 'function Counter() {' }, { id: '3', code: '  const [count, setCount] = useState(0);' }, { id: '4', code: '  return <button onClick={() => setCount(count+1)}>{count}</button>;' }, { id: '5', code: '}' }, { id: '6', code: 'export default Counter;' }], correctOrder: ['1', '2', '3', '4', '5', '6'] },
  
    { type: 'ARCH_LAYERS', question: 'Place React concepts in correct layer:', layers: ['View', 'State Management', 'Data Fetching'], items: [{ text: 'JSX components', layer: 'View' }, { text: 'Redux store', layer: 'State Management' }, { text: 'useEffect + fetch', layer: 'Data Fetching' }, { text: 'Context API', layer: 'State Management' }] },
    { type: 'CODE_REVIEW', question: 'What issue exists in this component?', code: 'function UserList() {\n    const [users, setUsers] = useState([]);\n    useEffect(() => {\n        fetch("/api/users").then(r => r.json()).then(setUsers);\n    });\n    return users.map(u => <div key={u.id}>{u.name}</div>);\n}', options: [{ id: 'A', text: 'Missing dependency array — infinite loop' }, { id: 'B', text: 'Missing return' }, { id: 'C', text: 'Wrong key prop' }, { id: 'D', text: 'setUsers called wrong' }], correct: 'A', explanation: 'Without [], useEffect runs after every render causing infinite fetch loop.' },
    { type: 'PIPELINE_BUILD', question: 'Build a React data flow pipeline:', clauses: [{ id: '1', text: 'useState() declare state', cat: 'source' }, { id: '2', text: 'useEffect() fetch data', cat: 'transform' }, { id: '3', text: 'setState() update', cat: 'transform' }, { id: '4', text: 'render() display UI', cat: 'terminal' }, { id: '5', text: 'componentWillMount()', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'React render cycle: State change -> ? -> DOM update. What is the middle step?', options: [{ letter: 'A', text: 'Virtual DOM diffing (reconciliation)' }, { letter: 'B', text: 'Full page reload' }, { letter: 'C', text: 'CSS recalculation' }, { letter: 'D', text: 'Garbage collection' }], correct: 'A', explanation: 'React compares new Virtual DOM with previous (diffing) and updates only changed DOM parts.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange React CI/CD pipeline:', items: ['npm install', 'npm run lint', 'npm test', 'npm run build', 'Deploy to CDN'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What XSS vulnerability exists?', code: 'function Comment({ text }) {\n    return <div dangerouslySetInnerHTML={{ __html: text }} />;\n}', options: [{ id: 'A', text: 'XSS — dangerouslySetInnerHTML renders unsanitized HTML' }, { id: 'B', text: 'Missing PropTypes' }, { id: 'C', text: 'Memory leak' }, { id: 'D', text: 'Invalid JSX' }], correct: 'A', explanation: 'dangerouslySetInnerHTML can execute injected scripts. Sanitize with DOMPurify.' },
    { type: 'CROSSWORD', question: '✚ React Crossword — Frontend concepts!', words: [{ word: 'HOOK', clue: 'Function starting with "use" for state/effects', row: 0, col: 0, direction: 'across' }, { word: 'HTML', clue: 'Markup language JSX compiles to', row: 0, col: 0, direction: 'down' }, { word: 'KEY', clue: 'Unique identifier for list items', row: 0, col: 3, direction: 'down' }, { word: 'STATE', clue: 'Component data that triggers re-render', row: 2, col: 4, direction: 'across' }, { word: 'PROPS', clue: 'Data passed from parent to child', row: 4, col: 0, direction: 'across' }] },
  ],
  'devops': [
    { type: 'DRAG_ORDER', question: 'Arrange a typical CI/CD pipeline:', items: ['Code Commit & Push', 'Build & Compile', 'Run Unit Tests', 'Docker Image Build', 'Deploy to Staging', 'Integration Tests', 'Deploy to Production'], correctOrder: [0, 1, 2, 3, 4, 5, 6] },
    { type: 'SINGLE_MCQ', question: 'What does Kubernetes use to ensure desired state?', code: null, options: [{ letter: 'A', text: 'Reconciliation loops' }, { letter: 'B', text: 'Polling' }, { letter: 'C', text: 'Manual triggers' }, { letter: 'D', text: 'Cron jobs' }], correct: 'A', explanation: 'K8s controllers use reconciliation loops to continuously compare actual vs desired state.' },
    { type: 'FILL_BLANK', question: 'Complete the Dockerfile:', codeParts: ['FROM openjdk:17-slim\n', { blank: true, answer: 'COPY' }, ' target/*.jar app.jar\nEXPOSE 8080\n', { blank: true, answer: 'ENTRYPOINT' }, ' ["java", "-jar", "app.jar"]'] },
    { type: 'SINGLE_MCQ', question: 'What is a Kubernetes Pod?', code: null, options: [{ letter: 'A', text: 'A cluster of nodes' }, { letter: 'B', text: 'Smallest deployable unit (1+ containers)' }, { letter: 'C', text: 'A load balancer' }, { letter: 'D', text: 'A network policy' }], correct: 'B', explanation: 'Pod is the smallest deployable unit — one or more containers sharing network/storage.' },
    { type: 'MULTI_MCQ', question: 'Which are valid Docker commands? (Select all)', options: [{ letter: 'A', text: 'docker build' }, { letter: 'B', text: 'docker deploy' }, { letter: 'C', text: 'docker push' }, { letter: 'D', text: 'docker compose up' }], correctSet: ['A', 'C', 'D'], explanation: '`docker deploy` is not a standard command.' },
    { type: 'RIDDLE', riddle: 'I am a recipe that can build anything, but I cannot run. Layer by layer I construct images. COPY, RUN, and FROM are my vocabulary. What am I?', hints: ['I live in your project root', 'docker build reads me'], options: [{ letter: 'A', text: 'Dockerfile' }, { letter: 'B', text: 'docker-compose.yml' }, { letter: 'C', text: 'Kubernetes manifest' }, { letter: 'D', text: 'Jenkinsfile' }], correct: 'A', explanation: 'Dockerfile contains instructions to build a Docker image layer by layer.' },
    { type: 'MATCH_PAIRS', question: 'Match DevOps tool to its purpose:', pairs: [{ left: 'Jenkins', right: 'CI/CD automation' }, { left: 'Terraform', right: 'Infrastructure as Code' }, { left: 'Prometheus', right: 'Monitoring & metrics' }, { left: 'Ansible', right: 'Configuration management' }], shuffledRight: ['Infrastructure as Code', 'CI/CD automation', 'Configuration management', 'Monitoring & metrics'] },
    { type: 'CODE_OUTPUT', question: 'Match Docker command to its result:', snippets: [{ id: 'A', code: 'docker ps' }, { id: 'B', code: 'docker images' }], outputs: [{ id: '1', text: 'List running containers' }, { id: '2', text: 'List local images' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange Dockerfile instructions:', blocks: [{ id: '1', code: 'FROM openjdk:17-slim' }, { id: '2', code: 'WORKDIR /app' }, { id: '3', code: 'COPY target/*.jar app.jar' }, { id: '4', code: 'EXPOSE 8080' }, { id: '5', code: 'ENTRYPOINT ["java", "-jar", "app.jar"]' }], correctOrder: ['1', '2', '3', '4', '5'] },
  
    { type: 'ARCH_LAYERS', question: 'Place DevOps tools in correct category:', layers: ['CI/CD', 'Containerization', 'Monitoring'], items: [{ text: 'Jenkins', layer: 'CI/CD' }, { text: 'Docker', layer: 'Containerization' }, { text: 'Prometheus', layer: 'Monitoring' }, { text: 'GitHub Actions', layer: 'CI/CD' }] },
    { type: 'CODE_REVIEW', question: 'What issue in this Dockerfile?', code: 'FROM ubuntu:latest\nRUN apt-get update && apt-get install -y python3\nCOPY . /app\nCMD ["python3", "/app/main.py"]', options: [{ id: 'A', text: 'Using :latest — non-reproducible builds' }, { id: 'B', text: 'COPY should come first' }, { id: 'C', text: 'CMD syntax wrong' }, { id: 'D', text: 'Missing EXPOSE' }], correct: 'A', explanation: ':latest means builds may break when base image updates. Pin specific version.' },
    { type: 'PIPELINE_BUILD', question: 'Build a CI/CD pipeline:', clauses: [{ id: '1', text: 'trigger: push to main', cat: 'source' }, { id: '2', text: 'stage: build', cat: 'transform' }, { id: '3', text: 'stage: test', cat: 'transform' }, { id: '4', text: 'stage: deploy', cat: 'terminal' }, { id: '5', text: 'stage: rollback', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Canary deployment: Deploy canary -> Monitor -> Decision. If error rate > 5%?', options: [{ letter: 'A', text: 'Automatic rollback' }, { letter: 'B', text: 'Scale canary to 100%' }, { letter: 'C', text: 'Alert and wait' }, { letter: 'D', text: 'Restart pods' }], correct: 'A', explanation: 'Canary deployments auto-rollback if metrics exceed thresholds.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Kubernetes deployment stages:', items: ['Create Docker image', 'Push to container registry', 'Apply K8s manifests', 'Rolling update pods', 'Health check passes'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What security issue in this K8s manifest?', code: 'containers:\n  - name: app\n    image: myapp:latest\n    securityContext:\n      privileged: true\n      runAsUser: 0', options: [{ id: 'A', text: 'Running as root with privileged — container escape risk' }, { id: 'B', text: 'Missing resource limits' }, { id: 'C', text: 'Wrong image format' }, { id: 'D', text: 'Missing probe' }], correct: 'A', explanation: 'Root + privileged allows container escape. Use non-root users.' },
    { type: 'CROSSWORD', question: '✚ DevOps Crossword — Infrastructure terms!', words: [{ word: 'DOCKER', clue: 'Container runtime platform', row: 0, col: 0, direction: 'across' }, { word: 'DEPLOY', clue: 'Release code to production', row: 0, col: 0, direction: 'down' }, { word: 'NODE', clue: 'Worker machine in a cluster', row: 1, col: 2, direction: 'down' }, { word: 'POD', clue: 'Smallest K8s deployable unit', row: 2, col: 4, direction: 'across' }, { word: 'HELM', clue: 'K8s package manager', row: 4, col: 1, direction: 'across' }] },
  ],
  'design patterns': [
    { type: 'SINGLE_MCQ', question: 'Which pattern ensures only one instance of a class?', code: null, options: [{ letter: 'A', text: 'Factory' }, { letter: 'B', text: 'Singleton' }, { letter: 'C', text: 'Observer' }, { letter: 'D', text: 'Strategy' }], correct: 'B', explanation: 'Singleton restricts a class to a single instance, often using private constructor + static method.' },
    { type: 'SINGLE_MCQ', question: 'Which pattern is used by Spring Framework for DI?', code: null, options: [{ letter: 'A', text: 'Dependency Injection / IoC' }, { letter: 'B', text: 'Singleton only' }, { letter: 'C', text: 'MVC only' }, { letter: 'D', text: 'Adapter' }], correct: 'A', explanation: 'Spring uses IoC (Inversion of Control) / Dependency Injection as its core pattern.' },
    { type: 'FILL_BLANK', question: 'Complete the Builder pattern:', codeParts: ['User user = User.', { blank: true, answer: 'builder' }, '()\n    .name("Alice")\n    .email("alice@test.com")\n    .', { blank: true, answer: 'build' }, '();'] },
    { type: 'DRAG_ORDER', question: 'Observer pattern event flow:', items: ['Subject state changes', 'Subject calls notifyAll()', 'Each observer.update() invoked', 'Observers pull/use new data', 'UI re-renders with new state'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SINGLE_MCQ', question: 'Which pattern lets you add behavior to objects dynamically?', code: null, options: [{ letter: 'A', text: 'Decorator' }, { letter: 'B', text: 'Facade' }, { letter: 'C', text: 'Proxy' }, { letter: 'D', text: 'Bridge' }], correct: 'A', explanation: 'Decorator wraps objects to add responsibilities dynamically without subclassing.' },
    { type: 'RIDDLE', riddle: 'I am born once and live forever in my application. Many ask for me, but there is only one of me. My constructor is private — no one can clone or recreate me. What am I?', hints: ['I restrict instantiation to one object', 'Spring beans are this by default scope'], options: [{ letter: 'A', text: 'Singleton' }, { letter: 'B', text: 'Prototype' }, { letter: 'C', text: 'Factory' }, { letter: 'D', text: 'Builder' }], correct: 'A', explanation: 'Singleton ensures a class has only one instance with a global access point.' },
    { type: 'MATCH_PAIRS', question: 'Match design pattern to its category:', pairs: [{ left: 'Factory', right: 'Creational' }, { left: 'Adapter', right: 'Structural' }, { left: 'Observer', right: 'Behavioral' }, { left: 'Decorator', right: 'Structural' }], shuffledRight: ['Behavioral', 'Creational', 'Structural', 'Structural'] },
    { type: 'CODE_OUTPUT', question: 'Match pattern code to its type:', snippets: [{ id: 'A', code: 'private static instance; private constructor()' }, { id: 'B', code: 'subject.addObserver(observer)' }], outputs: [{ id: '1', text: 'Singleton pattern' }, { id: '2', text: 'Observer pattern' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange Builder pattern usage:', blocks: [{ id: '1', code: 'User user = User.builder()' }, { id: '2', code: '    .name("Alice")' }, { id: '3', code: '    .email("alice@test.com")' }, { id: '4', code: '    .age(25)' }, { id: '5', code: '    .build();' }], correctOrder: ['1', '2', '3', '4', '5'] },
  
    { type: 'ARCH_LAYERS', question: 'Place patterns in correct category:', layers: ['Creational', 'Structural', 'Behavioral'], items: [{ text: 'Singleton', layer: 'Creational' }, { text: 'Adapter', layer: 'Structural' }, { text: 'Observer', layer: 'Behavioral' }, { text: 'Factory Method', layer: 'Creational' }] },
    { type: 'CODE_REVIEW', question: 'What design issue exists?', code: 'class OrderService {\n    public void processOrder(Order o) {\n        validateOrder(o); calculateTax(o);\n        applyDiscount(o); processPayment(o);\n        sendEmail(o); updateInventory(o);\n    }\n}', options: [{ id: 'A', text: 'God class — violates Single Responsibility' }, { id: 'B', text: 'Missing return type' }, { id: 'C', text: 'Should use static methods' }, { id: 'D', text: 'Too short' }], correct: 'A', explanation: 'One class doing everything violates SRP. Decompose into separate services.' },
    { type: 'PIPELINE_BUILD', question: 'Build a Chain of Responsibility:', clauses: [{ id: '1', text: 'AuthenticationHandler', cat: 'source' }, { id: '2', text: '.next(AuthorizationHandler)', cat: 'transform' }, { id: '3', text: '.next(ValidationHandler)', cat: 'transform' }, { id: '4', text: '.next(BusinessLogicHandler)', cat: 'terminal' }, { id: '5', text: '.retry(3)', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Observer pattern: Subject changes -> notifyAll() -> ? What happens?', options: [{ letter: 'A', text: 'All registered observers receive update' }, { letter: 'B', text: 'Only first observer notified' }, { letter: 'C', text: 'Subject waits for ack' }, { letter: 'D', text: 'New thread per observer' }], correct: 'A', explanation: 'Observer pattern notifies ALL registered observers when state changes.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Strategy pattern implementation:', items: ['Define strategy interface', 'Create concrete strategies', 'Context holds strategy ref', 'Client selects strategy', 'Execute strategy method'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability in this Singleton?', code: 'public class Config {\n    private static Config instance;\n    public Map<String,String> secrets = new HashMap<>();\n    public static Config getInstance() {\n        if (instance == null) instance = new Config();\n        return instance;\n    }\n}', options: [{ id: 'A', text: 'Public secrets field + no thread safety + no private constructor' }, { id: 'B', text: 'Wrong map type' }, { id: 'C', text: 'Missing interface' }, { id: 'D', text: 'Only public field issue' }], correct: 'A', explanation: 'Public mutable field exposes secrets, race condition, and missing private constructor.' },
  ],
  'security': [
    { type: 'SINGLE_MCQ', question: 'Which OWASP Top 10 vulnerability involves user input in SQL?', code: null, options: [{ letter: 'A', text: 'XSS' }, { letter: 'B', text: 'SQL Injection' }, { letter: 'C', text: 'CSRF' }, { letter: 'D', text: 'SSRF' }], correct: 'B', explanation: 'SQL Injection (A03:2021) occurs when untrusted data is sent as part of a SQL command.' },
    { type: 'DEBUG_CODE', question: 'Identify the security vulnerability:', code: '@GetMapping("/user")\npublic String getUser(@RequestParam String id) {\n    String query = "SELECT * FROM users WHERE id = \'" + id + "\'";\n    return jdbc.queryForObject(query, String.class);\n}', options: [{ id: 'A', text: 'SQL Injection — use parameterized query' }, { id: 'B', text: 'XSS — escape output' }, { id: 'C', text: 'CSRF — add token' }, { id: 'D', text: 'No vulnerability' }], correct: 'A', explanation: 'String concatenation with user input = SQL Injection. Use PreparedStatement.' },
    { type: 'SINGLE_MCQ', question: 'What is the purpose of CORS?', code: null, options: [{ letter: 'A', text: 'Control which origins can access your API' }, { letter: 'B', text: 'Encrypt data in transit' }, { letter: 'C', text: 'Authenticate users' }, { letter: 'D', text: 'Rate limit requests' }], correct: 'A', explanation: 'CORS (Cross-Origin Resource Sharing) controls which domains can make requests to your API.' },
    { type: 'MULTI_MCQ', question: 'Which prevent XSS attacks? (Select all)', options: [{ letter: 'A', text: 'Output encoding' }, { letter: 'B', text: 'Content Security Policy' }, { letter: 'C', text: 'Input validation' }, { letter: 'D', text: 'Increasing server RAM' }], correctSet: ['A', 'B', 'C'], explanation: 'Increasing RAM does nothing for security.' },
    { type: 'FILL_BLANK', question: 'Complete the Spring Security config:', codeParts: ['@Configuration\npublic class SecurityConfig {\n    @Bean\n    public SecurityFilterChain filterChain(', { blank: true, answer: 'HttpSecurity' }, ' http) {\n        http.csrf().disable()\n            .', { blank: true, answer: 'authorizeHttpRequests' }, '(auth -> auth.anyRequest().authenticated());\n        return http.build();\n    }\n}'] },
    { type: 'RIDDLE', riddle: 'I am a token split into three parts by dots. My header tells you how I am signed, my payload carries claims, and my signature proves I have not been tampered with. What am I?', hints: ['xxxxx.yyyyy.zzzzz format', 'Often stored in Authorization: Bearer ...'], options: [{ letter: 'A', text: 'JWT (JSON Web Token)' }, { letter: 'B', text: 'OAuth Token' }, { letter: 'C', text: 'API Key' }, { letter: 'D', text: 'Session Cookie' }], correct: 'A', explanation: 'JWT has 3 base64url parts: header.payload.signature — used for stateless authentication.' },
    { type: 'MATCH_PAIRS', question: 'Match security attack to its prevention:', pairs: [{ left: 'SQL Injection', right: 'Parameterized queries' }, { left: 'XSS', right: 'Output encoding' }, { left: 'CSRF', right: 'Anti-CSRF tokens' }, { left: 'Brute Force', right: 'Rate limiting' }], shuffledRight: ['Output encoding', 'Parameterized queries', 'Rate limiting', 'Anti-CSRF tokens'] },
    { type: 'CODE_OUTPUT', question: 'Match security config to its effect:', snippets: [{ id: 'A', code: 'http.csrf().disable()' }, { id: 'B', code: 'http.cors().configurationSource(src)' }], outputs: [{ id: '1', text: 'Disables CSRF protection' }, { id: '2', text: 'Enables cross-origin requests' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange JWT authentication flow:', blocks: [{ id: '1', code: 'User sends credentials' }, { id: '2', code: 'Server validates credentials' }, { id: '3', code: 'Server generates JWT token' }, { id: '4', code: 'Client stores token' }, { id: '5', code: 'Client sends token in header' }, { id: '6', code: 'Server verifies token signature' }], correctOrder: ['1', '2', '3', '4', '5', '6'] },
  
    { type: 'ARCH_LAYERS', question: 'Place security controls in correct layer:', layers: ['Network', 'Application', 'Data'], items: [{ text: 'Firewall rules', layer: 'Network' }, { text: 'Input validation', layer: 'Application' }, { text: 'Encryption at rest', layer: 'Data' }, { text: 'WAF', layer: 'Network' }] },
    { type: 'CODE_REVIEW', question: 'What OWASP issue exists?', code: 'app.get("/admin", (req, res) => {\n    if (req.query.role === "admin") {\n        res.json(getAllUsers());\n    }\n});', options: [{ id: 'A', text: 'Broken Access Control — role from query is client-controlled' }, { id: 'B', text: 'Missing HTTPS' }, { id: 'C', text: 'XSS' }, { id: 'D', text: 'Missing rate limit' }], correct: 'A', explanation: 'Client can set ?role=admin. Verify roles server-side from session.' },
    { type: 'PIPELINE_BUILD', question: 'Build a security scanning pipeline:', clauses: [{ id: '1', text: 'SAST — static analysis', cat: 'source' }, { id: '2', text: 'Dependency CVE check', cat: 'transform' }, { id: '3', text: 'DAST — dynamic testing', cat: 'transform' }, { id: '4', text: 'Penetration testing', cat: 'terminal' }, { id: '5', text: 'Deploy to prod', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'OAuth2 flow: User -> Login -> Auth Server -> Token. What does client receive?', options: [{ letter: 'A', text: 'Access token + Refresh token' }, { letter: 'B', text: 'Username + password hash' }, { letter: 'C', text: 'Session cookie only' }, { letter: 'D', text: 'Encrypted user data' }], correct: 'A', explanation: 'OAuth2 returns access token (for APIs) and refresh token (for renewal).' },
    { type: 'DEVOPS_PIPE', question: 'Arrange incident response steps:', items: ['Detect anomaly', 'Contain breach', 'Eradicate threat', 'Recover systems', 'Post-mortem analysis'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability in this password storage?', code: 'public void saveUser(String user, String pass) {\n    String hash = MessageDigest.getInstance("MD5")\n        .digest(pass.getBytes()).toString();\n    db.save(user, hash);\n}', options: [{ id: 'A', text: 'MD5 is broken — use bcrypt/argon2 with salt' }, { id: 'B', text: 'Missing validation' }, { id: 'C', text: 'Should use SHA-1' }, { id: 'D', text: 'toString() output wrong' }], correct: 'A', explanation: 'MD5 is broken and unsalted. Use bcrypt, scrypt, or Argon2.' },
  ],
  'microservices': [
    { type: 'SINGLE_MCQ', question: 'What is the role of an API Gateway in microservices?', code: null, options: [{ letter: 'A', text: 'Single entry point for all client requests' }, { letter: 'B', text: 'Database management' }, { letter: 'C', text: 'Code compilation' }, { letter: 'D', text: 'Unit testing' }], correct: 'A', explanation: 'API Gateway acts as reverse proxy — routing, auth, rate-limiting at a single entry point.' },
    { type: 'DRAG_ORDER', question: 'Microservice communication flow (sync):', items: ['Client calls API Gateway', 'Gateway routes to service', 'Service queries database', 'Service returns response', 'Gateway forwards to client'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SINGLE_MCQ', question: 'What pattern prevents cascading failures?', code: null, options: [{ letter: 'A', text: 'Circuit Breaker' }, { letter: 'B', text: 'Singleton' }, { letter: 'C', text: 'Factory' }, { letter: 'D', text: 'Observer' }], correct: 'A', explanation: 'Circuit Breaker (like Resilience4j) stops calling a failing service, preventing cascade failures.' },
    { type: 'MULTI_MCQ', question: 'Which are microservice communication patterns? (Select all)', options: [{ letter: 'A', text: 'REST/HTTP' }, { letter: 'B', text: 'Message Queue (Kafka/RabbitMQ)' }, { letter: 'C', text: 'gRPC' }, { letter: 'D', text: 'Shared Database' }], correctSet: ['A', 'B', 'C'], explanation: 'Shared Database is an anti-pattern in microservices — each service should own its data.' },
    { type: 'RIDDLE', riddle: 'I stand at the gates of a distributed kingdom. All visitors must pass through me — I check their papers, I limit their speed, and I direct them to the right castle. What am I?', hints: ['Think about the single entry point', 'Netflix Zuul and Spring Cloud Gateway are examples'], options: [{ letter: 'A', text: 'API Gateway' }, { letter: 'B', text: 'Load Balancer' }, { letter: 'C', text: 'DNS Server' }, { letter: 'D', text: 'Firewall' }], correct: 'A', explanation: 'API Gateway routes, rate-limits, and authenticates all incoming requests.' },
    { type: 'MATCH_PAIRS', question: 'Match microservice pattern to its purpose:', pairs: [{ left: 'Circuit Breaker', right: 'Prevent cascading failures' }, { left: 'Service Registry', right: 'Track service locations' }, { left: 'Saga Pattern', right: 'Distributed transactions' }, { left: 'API Gateway', right: 'Single entry point' }], shuffledRight: ['Track service locations', 'Prevent cascading failures', 'Single entry point', 'Distributed transactions'] },
    { type: 'CODE_OUTPUT', question: 'Match resilience pattern to its behavior:', snippets: [{ id: 'A', code: '@CircuitBreaker(name="svc", fallbackMethod="fb")' }, { id: 'B', code: '@Retry(name="svc", maxAttempts=3)' }], outputs: [{ id: '1', text: 'Opens circuit after failures' }, { id: '2', text: 'Retries up to 3 times' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange microservice startup flow:', blocks: [{ id: '1', code: 'Service starts up' }, { id: '2', code: 'Registers with Service Registry' }, { id: '3', code: 'Health check endpoint active' }, { id: '4', code: 'Gateway discovers service' }, { id: '5', code: 'Traffic routed to service' }], correctOrder: ['1', '2', '3', '4', '5'] },
  
    { type: 'ARCH_LAYERS', question: 'Place microservice components in correct layer:', layers: ['API Gateway', 'Service', 'Infrastructure'], items: [{ text: 'Rate limiting', layer: 'API Gateway' }, { text: 'Business logic', layer: 'Service' }, { text: 'Service mesh', layer: 'Infrastructure' }, { text: 'Request routing', layer: 'API Gateway' }] },
    { type: 'CODE_REVIEW', question: 'What distributed systems issue?', code: 'public Order createOrder(OrderRequest req) {\n    paymentService.charge(req.getAmount());\n    inventoryService.reserve(req.getItems());\n    orderRepository.save(new Order(req));\n    return order;\n}', options: [{ id: 'A', text: 'No compensation if step fails — needs Saga' }, { id: 'B', text: 'Missing @Transactional' }, { id: 'C', text: 'Should be async' }, { id: 'D', text: 'Wrong return' }], correct: 'A', explanation: 'If inventory fails after payment, no rollback. Use Saga pattern.' },
    { type: 'PIPELINE_BUILD', question: 'Build a circuit breaker pipeline:', clauses: [{ id: '1', text: 'Call remote service', cat: 'source' }, { id: '2', text: 'Monitor failure count', cat: 'transform' }, { id: '3', text: 'Open circuit if threshold exceeded', cat: 'transform' }, { id: '4', text: 'Return fallback response', cat: 'terminal' }, { id: '5', text: 'Retry indefinitely', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Circuit Breaker: Closed -> Open -> Half-Open. When does Open move to Half-Open?', options: [{ letter: 'A', text: 'After timeout period expires' }, { letter: 'B', text: 'When all requests succeed' }, { letter: 'C', text: 'Manually by operator' }, { letter: 'D', text: 'When memory freed' }], correct: 'A', explanation: 'After timeout, circuit moves to Half-Open to test with one request.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange microservices deployment:', items: ['Build individual services', 'Run contract tests', 'Deploy to staging', 'Integration testing', 'Canary deploy to production'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What security issue in this microservice?', code: '@GetMapping("/internal/users/{id}")\npublic User getUser(@PathVariable Long id) {\n    return userRepository.findById(id).orElseThrow();\n}\n// No auth required', options: [{ id: 'A', text: 'Internal API without auth — needs service-to-service auth' }, { id: 'B', text: 'Missing pagination' }, { id: 'C', text: 'Wrong HTTP method' }, { id: 'D', text: 'Missing cache' }], correct: 'A', explanation: 'Internal APIs need mTLS or JWT service tokens. Network alone is insufficient.' },
  ],
  'angular': [
    { type: 'SINGLE_MCQ', question: 'Which decorator defines a component in Angular?', code: null, options: [{ letter: 'A', text: '@Component' }, { letter: 'B', text: '@NgModule' }, { letter: 'C', text: '@Injectable' }, { letter: 'D', text: '@Directive' }], correct: 'A', explanation: '@Component decorator marks a class as an Angular component with template and styles.' },
    { type: 'SINGLE_MCQ', question: 'What is Angular\'s change detection default strategy?', code: null, options: [{ letter: 'A', text: 'Default (check all)' }, { letter: 'B', text: 'OnPush' }, { letter: 'C', text: 'Manual' }, { letter: 'D', text: 'Lazy' }], correct: 'A', explanation: 'Default strategy checks all components on every change. OnPush is opt-in optimization.' },
    { type: 'DRAG_ORDER', question: 'Angular component lifecycle hooks in order:', items: ['ngOnChanges', 'ngOnInit', 'ngDoCheck', 'ngAfterViewInit', 'ngOnDestroy'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'FILL_BLANK', question: 'Complete the Angular service injection:', codeParts: ['@', { blank: true, answer: 'Injectable' }, '({ providedIn: \'root\' })\nexport class UserService {\n  constructor(private http: ', { blank: true, answer: 'HttpClient' }, ') {}\n}'] },
    { type: 'SINGLE_MCQ', question: 'What does *ngFor do?', code: null, options: [{ letter: 'A', text: 'Iterates over a collection in template' }, { letter: 'B', text: 'Conditionally shows elements' }, { letter: 'C', text: 'Switches between views' }, { letter: 'D', text: 'Binds form data' }], correct: 'A', explanation: '*ngFor is a structural directive that loops through arrays to render repeated elements.' },
    { type: 'PREDICT_OUTPUT', question: 'What does this pipe return?', code: '{{ "hello world" | titlecase }}', expectedOutput: 'Hello World', explanation: 'titlecase pipe capitalizes first letter of each word.' },
    { type: 'RIDDLE', riddle: 'I am invisible yet I control what you see. Add a star before my name and I can create or destroy elements. *ngIf and *ngFor are my famous children. What am I?', hints: ['I modify the DOM structure', 'I start with * in templates'], options: [{ letter: 'A', text: 'Structural Directive' }, { letter: 'B', text: 'Pipe' }, { letter: 'C', text: 'Service' }, { letter: 'D', text: 'Module' }], correct: 'A', explanation: 'Structural directives (*ngIf, *ngFor) add/remove DOM elements.' },
    { type: 'DEBUG_CODE', question: 'Why does this component fail?', code: '@Component({ selector: \'app-user\' })\nexport class UserComponent {\n  // no template or templateUrl\n}', options: [{ id: 'A', text: 'Missing template/templateUrl property' }, { id: 'B', text: 'Missing @NgModule declaration' }, { id: 'C', text: 'Selector is wrong' }, { id: 'D', text: 'Missing constructor' }], correct: 'A', explanation: 'Every @Component must have either template or templateUrl.' },
    { type: 'MULTI_MCQ', question: 'Which are Angular built-in pipes? (Select all)', options: [{ letter: 'A', text: 'DatePipe' }, { letter: 'B', text: 'AsyncPipe' }, { letter: 'C', text: 'FilterPipe' }, { letter: 'D', text: 'CurrencyPipe' }], correctSet: ['A', 'B', 'D'], explanation: 'FilterPipe does not exist built-in — you must create custom pipes for filtering.' },
    { type: 'SINGLE_MCQ', question: 'What is RxJS Observable used for in Angular?', code: null, options: [{ letter: 'A', text: 'Handling async data streams' }, { letter: 'B', text: 'DOM manipulation' }, { letter: 'C', text: 'Routing only' }, { letter: 'D', text: 'CSS animations' }], correct: 'A', explanation: 'Observables handle async data streams — HTTP responses, events, WebSocket messages.' },
    { type: 'MATCH_PAIRS', question: 'Match Angular concept to its role:', pairs: [{ left: 'Component', right: 'UI building block' }, { left: 'Service', right: 'Business logic & data' }, { left: 'Module', right: 'Organizes related code' }, { left: 'Directive', right: 'Modifies DOM behavior' }], shuffledRight: ['Business logic & data', 'UI building block', 'Modifies DOM behavior', 'Organizes related code'] },
    { type: 'CODE_OUTPUT', question: 'Match Angular template syntax to result:', snippets: [{ id: 'A', code: '{{ "hello" | uppercase }}' }, { id: 'B', code: '{{ 1234.5 | number:"1.0-0" }}' }], outputs: [{ id: '1', text: 'HELLO' }, { id: '2', text: '1,235' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange Angular component setup:', blocks: [{ id: '1', code: 'import { Component } from "@angular/core";' }, { id: '2', code: '@Component({' }, { id: '3', code: '  selector: "app-hello",' }, { id: '4', code: '  template: "<h1>Hello</h1>"' }, { id: '5', code: '})' }, { id: '6', code: 'export class HelloComponent {}' }], correctOrder: ['1', '2', '3', '4', '5', '6'] },
  
    { type: 'ARCH_LAYERS', question: 'Place Angular concepts in correct layer:', layers: ['Component', 'Service', 'Module'], items: [{ text: 'Template + styles', layer: 'Component' }, { text: 'HTTP client calls', layer: 'Service' }, { text: 'Route declarations', layer: 'Module' }, { text: 'DI providers', layer: 'Service' }] },
    { type: 'CODE_REVIEW', question: 'What issue in this Angular component?', code: 'export class ListComponent {\n    items = [];\n    ngOnInit() {\n        setInterval(() => {\n            this.http.get("/api").subscribe(d => this.items = d);\n        }, 1000);\n    }\n}', options: [{ id: 'A', text: 'Memory leak — interval never cleared, no unsubscribe' }, { id: 'B', text: 'Missing constructor' }, { id: 'C', text: 'Wrong hook' }, { id: 'D', text: 'Wrong type' }], correct: 'A', explanation: 'setInterval + subscriptions accumulate. Clear in ngOnDestroy.' },
    { type: 'PIPELINE_BUILD', question: 'Build an Angular reactive form pipeline:', clauses: [{ id: '1', text: 'FormGroup with FormControls', cat: 'source' }, { id: '2', text: '.valueChanges pipe', cat: 'transform' }, { id: '3', text: 'debounceTime(300)', cat: 'transform' }, { id: '4', text: '.subscribe(val => search(val))', cat: 'terminal' }, { id: '5', text: '.detectChanges()', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Angular change detection: Event -> Zone.js -> ? -> View updated. Missing step?', options: [{ letter: 'A', text: 'Change detection runs on component tree' }, { letter: 'B', text: 'Full page re-render' }, { letter: 'C', text: 'Service worker intercepts' }, { letter: 'D', text: 'Virtual DOM diff' }], correct: 'A', explanation: 'Zone.js triggers change detection which checks bindings in component tree.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Angular production build steps:', items: ['ng lint', 'ng test', 'ng build --prod (AOT)', 'Tree-shaking', 'Deploy bundle'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What XSS risk exists?', code: '@Component({ template: "<div [innerHTML]=\"userComment\"></div>" })\nexport class CommentComponent {\n    @Input() userComment: string;\n}', options: [{ id: 'A', text: 'innerHTML with unsanitized user input enables XSS' }, { id: 'B', text: 'Missing OnPush' }, { id: 'C', text: '@Input wrong type' }, { id: 'D', text: 'Syntax error' }], correct: 'A', explanation: 'innerHTML with user content is risky. Use DomSanitizer or text interpolation.' },
  ],
  'python': [
    { type: 'SINGLE_MCQ', question: 'What does "len([1,2,3])" return?', code: null, options: [{ letter: 'A', text: '3' }, { letter: 'B', text: '2' }, { letter: 'C', text: '4' }, { letter: 'D', text: 'Error' }], correct: 'A', explanation: 'len() returns number of elements. [1,2,3] has 3 items.' },
    { type: 'PREDICT_OUTPUT', question: 'What does this print?', code: 'x = [1, 2, 3]\nprint(x[::-1])', expectedOutput: '[3, 2, 1]', explanation: '[::-1] reverses the list using slice notation.' },
    { type: 'SINGLE_MCQ', question: 'Which keyword creates a generator?', code: null, options: [{ letter: 'A', text: 'yield' }, { letter: 'B', text: 'return' }, { letter: 'C', text: 'generate' }, { letter: 'D', text: 'async' }], correct: 'A', explanation: 'yield pauses function execution and produces values lazily.' },
    { type: 'FILL_BLANK', question: 'Complete the list comprehension:', codeParts: ['squares = [x**2 ', { blank: true, answer: 'for' }, ' x in range(5) ', { blank: true, answer: 'if' }, ' x % 2 == 0]'] },
    { type: 'DEBUG_CODE', question: 'What error occurs here?', code: 'my_dict = {"a": 1}\nprint(my_dict["b"])', options: [{ id: 'A', text: 'KeyError' }, { id: 'B', text: 'ValueError' }, { id: 'C', text: 'TypeError' }, { id: 'D', text: 'IndexError' }], correct: 'A', explanation: 'Accessing non-existent key raises KeyError. Use .get("b") for safe access.' },
    { type: 'DRAG_ORDER', question: 'Python MRO (Method Resolution Order):', items: ['Check current class', 'Check parent classes (left to right)', 'Check grandparent', 'Check object (base)'], correctOrder: [0, 1, 2, 3] },
    { type: 'RIDDLE', riddle: 'I am neither a list nor a tuple, yet I hold unique treasures. Add me, remove me, check if I belong — all in the blink of O(1). Duplicates fear me. What am I?', hints: ['I use hash tables internally', 'Created with {} or my own name()'], options: [{ letter: 'A', text: 'Set' }, { letter: 'B', text: 'Dictionary' }, { letter: 'C', text: 'Frozenset' }, { letter: 'D', text: 'Deque' }], correct: 'A', explanation: 'Sets store unique elements with O(1) add/remove/lookup via hashing.' },
    { type: 'MULTI_MCQ', question: 'Which are Python immutable types? (Select all)', options: [{ letter: 'A', text: 'tuple' }, { letter: 'B', text: 'str' }, { letter: 'C', text: 'list' }, { letter: 'D', text: 'frozenset' }], correctSet: ['A', 'B', 'D'], explanation: 'Lists are mutable. Tuples, strings, and frozensets cannot be changed after creation.' },
    { type: 'PREDICT_OUTPUT', question: 'What is the output?', code: 'def func(a, b=[]):\n    b.append(a)\n    return b\nprint(func(1))\nprint(func(2))', expectedOutput: '[1]\n[1, 2]', explanation: 'Mutable default args are shared between calls — classic Python gotcha.' },
    { type: 'SINGLE_MCQ', question: 'What does @staticmethod do?', code: null, options: [{ letter: 'A', text: 'Method doesn\'t receive self/cls' }, { letter: 'B', text: 'Method runs at import' }, { letter: 'C', text: 'Method is private' }, { letter: 'D', text: 'Method is async' }], correct: 'A', explanation: '@staticmethod creates a method that belongs to the class but doesn\'t access instance or class.' },
    { type: 'MATCH_PAIRS', question: 'Match Python data structure to its property:', pairs: [{ left: 'list', right: 'Ordered, mutable' }, { left: 'tuple', right: 'Ordered, immutable' }, { left: 'dict', right: 'Key-value pairs' }, { left: 'set', right: 'Unordered, unique' }], shuffledRight: ['Key-value pairs', 'Ordered, mutable', 'Unordered, unique', 'Ordered, immutable'] },
    { type: 'CODE_OUTPUT', question: 'Match Python expression to result:', snippets: [{ id: 'A', code: 'print(type([]))' }, { id: 'B', code: 'print(type(()))' }], outputs: [{ id: '1', text: "<class 'list'>" }, { id: '2', text: "<class 'tuple'>" }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Arrange to create a Python class:', blocks: [{ id: '1', code: 'class Dog:' }, { id: '2', code: '    def __init__(self, name):' }, { id: '3', code: '        self.name = name' }, { id: '4', code: '    def bark(self):' }, { id: '5', code: '        return f"{self.name} says Woof!"' }], correctOrder: ['1', '2', '3', '4', '5'] },
  
    { type: 'ARCH_LAYERS', question: 'Place Python concepts in correct layer:', layers: ['Web Framework', 'ORM', 'Utility'], items: [{ text: 'Flask routes', layer: 'Web Framework' }, { text: 'SQLAlchemy models', layer: 'ORM' }, { text: 'os.path utilities', layer: 'Utility' }, { text: 'Django views', layer: 'Web Framework' }] },
    { type: 'CODE_REVIEW', question: 'What issue in this Python code?', code: 'def get_users(admin=False, cache=[]):\n    if not cache:\n        cache = fetch_from_db()\n    if admin:\n        cache.append("admin_data")\n    return cache', options: [{ id: 'A', text: 'Mutable default argument shared across calls' }, { id: 'B', text: 'Missing return type' }, { id: 'C', text: 'fetch_from_db undefined' }, { id: 'D', text: 'Wrong if syntax' }], correct: 'A', explanation: 'Mutable defaults are shared. Use None and create inside function.' },
    { type: 'PIPELINE_BUILD', question: 'Build a Python data pipeline:', clauses: [{ id: '1', text: 'pd.read_csv("data.csv")', cat: 'source' }, { id: '2', text: '.dropna()', cat: 'transform' }, { id: '3', text: '.groupby("category").sum()', cat: 'transform' }, { id: '4', text: '.to_csv("output.csv")', cat: 'terminal' }, { id: '5', text: '.print()', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Python GIL: Thread A acquires GIL -> Executes -> Releases. Can Thread B run CPU code simultaneously?', options: [{ letter: 'A', text: 'No — GIL prevents parallel CPU execution' }, { letter: 'B', text: 'Yes always' }, { letter: 'C', text: 'Only with async' }, { letter: 'D', text: 'Only on Linux' }], correct: 'A', explanation: 'GIL allows only one thread to execute bytecode at a time. Use multiprocessing for CPU parallelism.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Python CI pipeline:', items: ['pip install requirements', 'Run flake8 linting', 'Run pytest', 'Build wheel package', 'Publish to PyPI'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability exists?', code: 'import pickle\ndef load_session(data):\n    return pickle.loads(data)  # data from HTTP request', options: [{ id: 'A', text: 'Insecure deserialization — pickle executes arbitrary code' }, { id: 'B', text: 'Missing try/except' }, { id: 'C', text: 'Wrong import' }, { id: 'D', text: 'Performance issue' }], correct: 'A', explanation: 'pickle.loads() on untrusted data can execute code. Use JSON or HMAC verification.' },
  ],
  'typescript': [
    { type: 'SINGLE_MCQ', question: 'What does "unknown" type mean in TypeScript?', code: null, options: [{ letter: 'A', text: 'Type-safe alternative to any' }, { letter: 'B', text: 'Same as any' }, { letter: 'C', text: 'Means undefined' }, { letter: 'D', text: 'Means null' }], correct: 'A', explanation: 'unknown requires type checking before use, unlike any which bypasses all checks.' },
    { type: 'PREDICT_OUTPUT', question: 'Does this compile?', code: 'let x: number = "5";', expectedOutput: 'Error', explanation: 'Type "string" is not assignable to type "number".' },
    { type: 'FILL_BLANK', question: 'Complete the generic function:', codeParts: ['function identity<', { blank: true, answer: 'T' }, '>(arg: T): ', { blank: true, answer: 'T' }, ' {\n  return arg;\n}'] },
    { type: 'SINGLE_MCQ', question: 'What is the difference between interface and type?', code: null, options: [{ letter: 'A', text: 'interface is extendable, type uses unions' }, { letter: 'B', text: 'No difference' }, { letter: 'C', text: 'type is faster' }, { letter: 'D', text: 'interface is deprecated' }], correct: 'A', explanation: 'Interfaces support extends/implements. Types support unions, intersections, and mapped types.' },
    { type: 'DEBUG_CODE', question: 'Why does this fail?', code: 'interface User { name: string; age: number; }\nconst user: User = { name: "Alice" };', options: [{ id: 'A', text: 'Missing required property "age"' }, { id: 'B', text: 'Wrong interface syntax' }, { id: 'C', text: 'const cannot be typed' }, { id: 'D', text: 'String should be String' }], correct: 'A', explanation: 'All required interface properties must be present. Use age?: number for optional.' },
    { type: 'RIDDLE', riddle: 'I guard the gates of your code at compile time but vanish completely at runtime. I make promises about shape but take up zero bytes in your bundle. What am I?', hints: ['I exist only during development', 'interface and type keyword create me'], options: [{ letter: 'A', text: 'TypeScript type/interface' }, { letter: 'B', text: 'Generic' }, { letter: 'C', text: 'Decorator' }, { letter: 'D', text: 'Enum' }], correct: 'A', explanation: 'Types/interfaces are erased during compilation — they only exist at dev time.' },
    { type: 'MULTI_MCQ', question: 'Which are valid TypeScript utility types? (Select all)', options: [{ letter: 'A', text: 'Partial<T>' }, { letter: 'B', text: 'Omit<T,K>' }, { letter: 'C', text: 'Filter<T>' }, { letter: 'D', text: 'Record<K,V>' }], correctSet: ['A', 'B', 'D'], explanation: 'Filter<T> doesn\'t exist. Partial, Omit, Record, Pick, Required are built-in utility types.' },
    { type: 'MATCH_PAIRS', question: 'Match TypeScript type to its meaning:', pairs: [{ left: 'Partial<T>', right: 'All properties optional' }, { left: 'Required<T>', right: 'All properties mandatory' }, { left: 'Readonly<T>', right: 'Cannot reassign properties' }, { left: 'Pick<T,K>', right: 'Select subset of properties' }], shuffledRight: ['Cannot reassign properties', 'All properties optional', 'Select subset of properties', 'All properties mandatory'] },
    { type: 'CODE_OUTPUT', question: 'Match TypeScript code to its result:', snippets: [{ id: 'A', code: 'type A = string | number; let x: A = 42;' }, { id: 'B', code: 'type B = string & number;' }], outputs: [{ id: '1', text: 'Valid — 42 is number' }, { id: '2', text: 'Never type (impossible)' }], correctMap: { A: '1', B: '2' } },
    // eslint-disable-next-line no-template-curly-in-string
    { type: 'CODE_REARRANGE', question: 'Arrange to define a typed function:', blocks: [{ id: '1', code: 'function greet(' }, { id: '2', code: '  name: string,' }, { id: '3', code: '  age: number' }, { id: '4', code: '): string {' }, { id: '5', code: '  return `Hello ${name}, ${age}`;' }, { id: '6', code: '}' }], correctOrder: ['1', '2', '3', '4', '5', '6'] },
  
    { type: 'ARCH_LAYERS', question: 'Place TypeScript concepts in correct layer:', layers: ['Type System', 'Runtime', 'Tooling'], items: [{ text: 'Interfaces', layer: 'Type System' }, { text: 'Compiled JavaScript', layer: 'Runtime' }, { text: 'tsconfig.json', layer: 'Tooling' }, { text: 'Generics', layer: 'Type System' }] },
    { type: 'CODE_REVIEW', question: 'What type safety issue?', code: 'function processData(input: any) {\n    const name = input.user.name;\n    const age = input.user.age;\n    return { name, age: age + 1 };\n}', options: [{ id: 'A', text: '"any" bypasses type checking — define interface' }, { id: 'B', text: 'Missing return type' }, { id: 'C', text: 'Cannot add to age' }, { id: 'D', text: 'Destructuring wrong' }], correct: 'A', explanation: '"any" disables TypeScript benefits. Define proper interface.' },
    { type: 'PIPELINE_BUILD', question: 'Build a TypeScript build pipeline:', clauses: [{ id: '1', text: 'tsc — compile to JS', cat: 'source' }, { id: '2', text: 'Type checking passes', cat: 'transform' }, { id: '3', text: 'Bundle with webpack', cat: 'transform' }, { id: '4', text: 'Output dist/ folder', cat: 'terminal' }, { id: '5', text: 'Run in Deno', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'TS compilation: .ts -> ? -> .js. What happens in between?', options: [{ letter: 'A', text: 'Type erasure — types removed, only JS remains' }, { letter: 'B', text: 'Types kept in output' }, { letter: 'C', text: 'Binary compilation' }, { letter: 'D', text: 'JIT compilation' }], correct: 'A', explanation: 'TypeScript performs type erasure — all annotations are removed, only JS emitted.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange TypeScript build steps:', items: ['Install dependencies', 'Run ESLint', 'tsc --noEmit (type check)', 'Run tests', 'Build production bundle'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability exists?', code: 'app.get("/file", (req: Request, res: Response) => {\n    const filename = req.query.name as string;\n    const content = fs.readFileSync("/data/" + filename);\n    res.send(content);\n});', options: [{ id: 'A', text: 'Path traversal — ../../etc/passwd' }, { id: 'B', text: 'Type assertion wrong' }, { id: 'C', text: 'readFileSync deprecated' }, { id: 'D', text: 'Missing Content-Type' }], correct: 'A', explanation: 'No path sanitization allows directory traversal. Validate and resolve paths.' },
  ],
  'node': [
    { type: 'SINGLE_MCQ', question: 'What is the event loop in Node.js?', code: null, options: [{ letter: 'A', text: 'Handles async callbacks in single thread' }, { letter: 'B', text: 'Creates multiple threads' }, { letter: 'C', text: 'A for-loop' }, { letter: 'D', text: 'A debugging tool' }], correct: 'A', explanation: 'The event loop processes callbacks from I/O operations in a non-blocking, single-threaded model.' },
    { type: 'PREDICT_OUTPUT', question: 'What prints first?', code: 'console.log("1");\nsetTimeout(() => console.log("2"), 0);\nconsole.log("3");', expectedOutput: '1\n3\n2', explanation: 'setTimeout callback goes to event queue, runs after synchronous code completes.' },
    { type: 'DRAG_ORDER', question: 'Node.js request handling phases:', items: ['Receive HTTP request', 'Parse request (URL, headers)', 'Route to handler', 'Execute middleware chain', 'Send response'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SINGLE_MCQ', question: 'What does "require()" do?', code: null, options: [{ letter: 'A', text: 'Imports a module synchronously' }, { letter: 'B', text: 'Installs a package' }, { letter: 'C', text: 'Creates a server' }, { letter: 'D', text: 'Reads a file' }], correct: 'A', explanation: 'require() synchronously loads and caches CommonJS modules.' },
    { type: 'RIDDLE', riddle: 'I never sleep, yet I never block. I juggle thousands of tasks with just one hand. Callbacks, promises, and async/await all dance to my tune. What am I?', hints: ['I make Node.js non-blocking', 'libuv implements me under the hood'], options: [{ letter: 'A', text: 'Event Loop' }, { letter: 'B', text: 'Thread Pool' }, { letter: 'C', text: 'Cluster Module' }, { letter: 'D', text: 'Worker Thread' }], correct: 'A', explanation: 'The event loop enables non-blocking I/O by delegating operations and processing callbacks.' },
    { type: 'DEBUG_CODE', question: 'What\'s the issue?', code: 'const fs = require("fs");\nconst data = fs.readFile("file.txt");\nconsole.log(data);', options: [{ id: 'A', text: 'readFile is async — needs callback or use readFileSync' }, { id: 'B', text: 'Wrong require syntax' }, { id: 'C', text: 'file.txt doesn\'t exist' }, { id: 'D', text: 'console.log can\'t print files' }], correct: 'A', explanation: 'fs.readFile is async and returns undefined. Use readFileSync or pass a callback.' },
    { type: 'MATCH_PAIRS', question: 'Match each Node.js module to its purpose:', pairs: [{ left: 'fs', right: 'File system operations' }, { left: 'http', right: 'Create web servers' }, { left: 'path', right: 'File path utilities' }, { left: 'events', right: 'Event emitter pattern' }], shuffledRight: ['Event emitter pattern', 'File system operations', 'Create web servers', 'File path utilities'] },
    { type: 'CODE_OUTPUT', question: 'Match each Node.js snippet to its output:', snippets: [{ id: 'A', code: 'console.log(typeof null)' }, { id: 'B', code: 'console.log([] + [])' }], outputs: [{ id: '1', text: 'object' }, { id: '2', text: '(empty string)' }], correctMap: { A: '1', B: '2' } },
    { type: 'CODE_REARRANGE', question: 'Rearrange to create a basic Express server:', blocks: [{ id: '1', code: 'const express = require("express");' }, { id: '2', code: 'const app = express();' }, { id: '3', code: 'app.get("/", (req, res) => res.send("Hi"));' }, { id: '4', code: 'app.listen(3000);' }], correctOrder: ['1', '2', '3', '4'] },
  
    { type: 'ARCH_LAYERS', question: 'Place Node.js concepts in correct layer:', layers: ['Runtime', 'Framework', 'Database'], items: [{ text: 'V8 engine', layer: 'Runtime' }, { text: 'Express middleware', layer: 'Framework' }, { text: 'Mongoose ODM', layer: 'Database' }, { text: 'libuv event loop', layer: 'Runtime' }] },
    { type: 'CODE_REVIEW', question: 'What issue in this Express middleware?', code: 'app.use((req, res, next) => {\n    const token = req.headers.authorization;\n    if (token === "secret123") {\n        next();\n    }\n    res.status(401).send("Unauthorized");\n});', options: [{ id: 'A', text: 'Missing return — both next() and res.send() execute' }, { id: 'B', text: 'Wrong header name' }, { id: 'C', text: 'Should use POST' }, { id: 'D', text: 'Missing try-catch' }], correct: 'A', explanation: 'Without return after next(), code sends 401 even for valid tokens.' },
    { type: 'PIPELINE_BUILD', question: 'Build a Node.js stream pipeline:', clauses: [{ id: '1', text: 'fs.createReadStream(file)', cat: 'source' }, { id: '2', text: '.pipe(zlib.createGzip())', cat: 'transform' }, { id: '3', text: '.pipe(crypto.createCipher())', cat: 'transform' }, { id: '4', text: '.pipe(fs.createWriteStream(out))', cat: 'terminal' }, { id: '5', text: '.toString()', cat: 'distractor' }], correctIds: ['1', '2', '3', '4'] },
    { type: 'FLOWCHART', question: 'Event loop phases: timers -> pending -> poll -> check -> close. Where do setImmediate() callbacks run?', options: [{ letter: 'A', text: 'Check phase' }, { letter: 'B', text: 'Timers phase' }, { letter: 'C', text: 'Poll phase' }, { letter: 'D', text: 'Close phase' }], correct: 'A', explanation: 'setImmediate() callbacks execute in the check phase after poll.' },
    { type: 'DEVOPS_PIPE', question: 'Arrange Node.js deployment steps:', items: ['npm ci (clean install)', 'npm audit (security)', 'npm test', 'npm run build', 'pm2 start app.js'], correctOrder: [0, 1, 2, 3, 4] },
    { type: 'SECURE_CODE', question: 'What vulnerability exists?', code: 'app.get("/run", (req, res) => {\n    const cmd = req.query.command;\n    exec(cmd, (err, stdout) => res.send(stdout));\n});', options: [{ id: 'A', text: 'Command injection — user executes any OS command' }, { id: 'B', text: 'Missing async/await' }, { id: 'C', text: 'exec deprecated' }, { id: 'D', text: 'Missing error handling' }], correct: 'A', explanation: 'User input in exec() allows arbitrary command execution.' },
  ],
};

// ─── DYNAMIC QUESTION RENDERER ────────────────────────────────────────────────
function GeneratedMCQ({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      {q.code && <div className="qt-demo-code">{q.code}</div>}
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
            <span className="qt-option-letter">{o.letter}.</span><span>{o.text}</span>
            {submitted && o.letter === q.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Correct! ${q.explanation}` : `✗ Wrong. ${q.explanation}`}</div>
      )}
    </div>
  );
}

function GeneratedMultiMCQ({ q, index }) {
  const [selected, setSelected] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const correctSet = new Set(q.correctSet);
  const toggle = (letter) => { if (submitted) return; setSelected(prev => { const next = new Set(prev); next.has(letter) ? next.delete(letter) : next.add(letter); return next; }); };
  const score = submitted ? [...correctSet].filter(x => selected.has(x)).length / correctSet.size : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.letter} className={`qt-option ${selected.has(o.letter) ? 'selected' : ''} ${submitted && correctSet.has(o.letter) ? 'correct' : ''} ${submitted && selected.has(o.letter) && !correctSet.has(o.letter) ? 'wrong' : ''}`} onClick={() => toggle(o.letter)}>
            <input type="checkbox" checked={selected.has(o.letter)} readOnly style={{ accentColor: '#A100FF' }} />
            <span>{o.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={selected.size === 0} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>Score: {Math.round(score * 100)}% — {q.explanation}</div>
      )}
    </div>
  );
}

function GeneratedDragOrder({ q, index }) {
  const shuffled = useMemo(() => [...q.items].sort(() => Math.random() - 0.5).map((text, i) => ({ id: String(i), text, correctPos: q.items.indexOf(text) })), [q]);
  const [items, setItems] = useState(shuffled);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; const n = [...items]; const [d] = n.splice(dragIdx, 1); n.splice(idx, 0, d); setItems(n); setDragIdx(idx); };
  const score = submitted ? items.filter((item, idx) => item.correctPos === idx).length / items.length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-sortable-list">
        {items.map((item, idx) => (
          <div key={item.id + item.text} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item.correctPos === idx ? 'correct-pos' : ''} ${submitted && item.correctPos !== idx ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={() => setDragIdx(null)}>
            <span className="qt-drag-handle">⠿</span><span className="qt-pos">{idx + 1}</span><span>{item.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Check Order</button></div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>{score === 1 ? '✓ Perfect order!' : `Score: ${Math.round(score * 100)}%`}</div>
      )}
    </div>
  );
}

function GeneratedFillBlank({ q, index }) {
  // Support two formats:
  // 1. codeParts array: ['text', { blank: true, answer: 'x' }, 'text']
  // 2. AI format: { question: "The ___ is used...", blank: "answer" } or { question: "...", blanks: ["a","b"] }
  let parts = q.codeParts || [];
  if (parts.length === 0 && q.question) {
    const blankAnswers = q.blanks || (q.blank ? [q.blank] : []);
    const segments = q.question.split(/_{2,}/);
    if (segments.length > 1 && blankAnswers.length > 0) {
      parts = [];
      segments.forEach((seg, i) => {
        if (seg) parts.push(seg);
        if (i < segments.length - 1 && i < blankAnswers.length) {
          parts.push({ blank: true, answer: blankAnswers[i] });
        }
      });
    } else if (blankAnswers.length > 0) {
      parts = [q.question + ' → ', { blank: true, answer: blankAnswers[0] }];
    }
  }
  const blanks = parts.filter(p => typeof p === 'object');

  // Build word bank: correct answers + auto-generated distractors, shuffled
  const correctAnswers = blanks.map(b => b.answer);
  const distractorPool = ['void', 'static', 'public', 'return', 'class', 'import', 'extends', 'implements',
    'final', 'abstract', 'interface', 'throws', 'new', 'this', 'super', 'try', 'catch', 'break',
    'continue', 'default', 'switch', 'for', 'while', 'do', 'if', 'else', 'null', 'true', 'false',
    'String', 'int', 'boolean', 'Map', 'List', 'Set', 'Optional', 'Stream', 'Object', 'Runnable',
    'Override', 'Bean', 'Autowired', 'Controller', 'Service', 'Repository', 'Component',
    'RequestMapping', 'PathVariable', 'RequestBody', 'PostMapping', 'PutMapping', 'DeleteMapping',
    'WHERE', 'FROM', 'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'GROUP BY', 'ORDER BY',
    'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'useReducer',
    'COPY', 'RUN', 'CMD', 'EXPOSE', 'WORKDIR', 'ADD', 'ENV', 'ARG', 'VOLUME', 'FROM'];
  const distractors = q.distractors || distractorPool
    .filter(d => !correctAnswers.some(a => a.toLowerCase() === d.toLowerCase()))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(3, blanks.length * 2));
  const wordBank = [...correctAnswers, ...distractors].sort(() => Math.random() - 0.5);

  const [answers, setAnswers] = useState(blanks.map(() => ''));
  const [submitted, setSubmitted] = useState(false);
  const [usedWords, setUsedWords] = useState([]);
  // Use a ref so word bank order is stable across re-renders
  const [shuffledBank] = useState(wordBank);

  const handleWordClick = (word) => {
    if (submitted) return;
    // Find first empty blank
    const emptyIdx = answers.findIndex(a => !a);
    if (emptyIdx === -1) return;
    const newAnswers = [...answers];
    newAnswers[emptyIdx] = word;
    setAnswers(newAnswers);
    setUsedWords([...usedWords, word]);
  };

  const handleBlankClick = (idx) => {
    if (submitted || !answers[idx]) return;
    const word = answers[idx];
    const newAnswers = [...answers];
    newAnswers[idx] = '';
    setAnswers(newAnswers);
    setUsedWords(usedWords.filter(w => w !== word));
  };

  let blankIdx = 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question && parts.length > 0 ? q.question : ''}</div>
      {/* Word Bank */}
      <div className="qt-word-bank">
        <div className="qt-word-bank-label">📦 Word Bank — click to place:</div>
        <div className="qt-word-bank-options">
          {shuffledBank.map((word, i) => (
            <button key={i}
              className={`qt-word-chip ${usedWords.includes(word) ? 'used' : ''}`}
              onClick={() => handleWordClick(word)}
              disabled={submitted || usedWords.includes(word)}>
              {word}
            </button>
          ))}
        </div>
      </div>
      {/* Code with blanks */}
      <div className="qt-fill-code">
        {parts.map((part, i) => {
          if (typeof part === 'string') return <span key={i}>{part}</span>;
          const idx = blankIdx++;
          const isCorrect = submitted && answers[idx] && answers[idx].trim().toLowerCase() === part.answer.toLowerCase();
          const isWrong = submitted && answers[idx] && !isCorrect;
          const isEmpty = !answers[idx];
          return (
            <span key={i}
              className={`qt-fill-slot ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''} ${isEmpty ? 'empty' : 'filled'}`}
              onClick={() => handleBlankClick(idx)}
              title={answers[idx] ? 'Click to remove' : ''}>
              {answers[idx] || '______'}
            </span>
          );
        })}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={answers.some(a => !a)} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${answers.every((a, i) => a.trim().toLowerCase() === blanks[i].answer.toLowerCase()) ? 'success' : 'error'}`}>
          {answers.every((a, i) => a.trim().toLowerCase() === blanks[i].answer.toLowerCase()) ? '✓ All blanks correct!' : `Expected: ${blanks.map(b => b.answer).join(', ')}`}
        </div>
      )}
    </div>
  );
}

function GeneratedPredictOutput({ q, index }) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answer.trim() === q.expectedOutput;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-demo-code">{q.code}</div>
      <textarea className="qt-output-input" value={answer} onChange={e => !submitted && setAnswer(e.target.value)} placeholder="Enter expected output..." disabled={submitted} rows={2} />
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!answer.trim()} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>{isCorrect ? `✓ Correct! ${q.explanation}` : `Expected: ${q.expectedOutput} — ${q.explanation}`}</div>
      )}
    </div>
  );
}

function GeneratedDebugCode({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-demo-code">{q.code}</div>
      <div className="qt-options">
        {q.options.map(o => (
          <div key={o.id} className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === q.correct ? 'correct' : ''} ${submitted && selected === o.id && o.id !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.id)}>
            <span className="qt-option-letter">{o.id}.</span><span>{o.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Correct! ${q.explanation}` : `✗ ${q.explanation}`}</div>
      )}
    </div>
  );
}

function GeneratedSQLBuilder({ q, index }) {
  const [canvas, setCanvas] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const addToCanvas = (clause) => { if (submitted || canvas.find(c => c.id === clause.id)) return; setCanvas([...canvas, clause]); };
  const removeFromCanvas = (id) => { if (submitted) return; setCanvas(canvas.filter(c => c.id !== id)); };
  const isCorrect = submitted && canvas.length === q.correctIds.length && canvas.every((c, i) => c.id === q.correctIds[i]);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-sql-palette">
        {q.clauses.map(c => (
          <div key={c.id} className={`qt-sql-clause ${c.cat}`} onClick={() => addToCanvas(c)} style={{ opacity: canvas.find(x => x.id === c.id) ? 0.4 : 1, cursor: canvas.find(x => x.id === c.id) ? 'default' : 'pointer' }}>{c.text}</div>
        ))}
      </div>
      <div className={`qt-sql-canvas ${canvas.length > 0 ? 'has-items' : ''}`}>
        {canvas.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>Click clauses to build query...</span>}
        {canvas.map(c => (<div key={c.id} className={`qt-sql-clause ${c.cat}`} onClick={() => removeFromCanvas(c.id)} style={{ cursor: 'pointer' }}>{c.text} ×</div>))}
      </div>
      {canvas.length > 0 && <div className="qt-sql-preview">{canvas.map(c => c.text).join('\n')}</div>}
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={canvas.length === 0} onClick={() => setSubmitted(true)}>Execute</button>{canvas.length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => setCanvas([])}>Clear</button>}</div>
      ) : (
        <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>{isCorrect ? '✓ Correct query!' : 'Not quite. Check the clause order and remove distractors.'}</div>
      )}
    </div>
  );
}

// Riddle-style question renderer
function GeneratedRiddle({ q, index }) {
  const [hintsShown, setHintsShown] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const hints = q.hints || [];
  return (
    <div className="qt-generated-q qt-riddle">
      <div className="qt-riddle-header">🧩 <strong>Riddle #{index}</strong></div>
      <div className="qt-riddle-text">{q.riddle || q.question}</div>
      {hints.length > 0 && (
        <div className="qt-riddle-hints">
          {hints.slice(0, hintsShown).map((h, i) => (
            <div key={i} className="qt-riddle-hint">💡 Hint {i + 1}: {h}</div>
          ))}
          {hintsShown < hints.length && !submitted && (
            <button className="qt-btn qt-btn-outline qt-btn-sm" onClick={() => setHintsShown(hintsShown + 1)}>
              Show Hint ({hintsShown + 1}/{hints.length})
            </button>
          )}
        </div>
      )}
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
            <span className="qt-option-letter">{o.letter}.</span><span>{o.text}</span>
            {submitted && o.letter === q.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Solve Riddle</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `🎉 Solved! ${q.explanation || ''}` : `❌ Not quite. ${q.explanation || ''}`}</div>
      )}
    </div>
  );
}

// ─── MATCH PAIRS RENDERER ─────────────────────────────────────────────────────
function GeneratedMatchPairs({ q, index }) {
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [matches, setMatches] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const pairs = q.pairs || [];
  const shuffledRight = q.shuffledRight || pairs.map(p => p.right).sort(() => Math.random() - 0.5);
  const handleLeftClick = (left) => { if (!submitted) setSelectedLeft(left); };
  const handleRightClick = (right) => { if (submitted || !selectedLeft) return; setMatches(prev => ({ ...prev, [selectedLeft]: right })); setSelectedLeft(null); };
  const score = submitted ? pairs.filter(p => matches[p.left] === p.right).length / pairs.length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-match-container">
        <div className="qt-match-col">
          <h4>Concepts</h4>
          {pairs.map(p => (
            <div key={p.left} className={`qt-match-item ${selectedLeft === p.left ? 'active' : ''} ${matches[p.left] ? 'matched' : ''}`} onClick={() => handleLeftClick(p.left)}>
              {p.left} {matches[p.left] && <span style={{ float: 'right', opacity: 0.6 }}>→ {matches[p.left]}</span>}
            </div>
          ))}
        </div>
        <div className="qt-match-col">
          <h4>Definitions</h4>
          {shuffledRight.map(r => (
            <div key={r} className={`qt-match-item ${Object.values(matches).includes(r) ? 'matched' : ''}`} onClick={() => handleRightClick(r)}>{r}</div>
          ))}
        </div>
      </div>
      {!submitted ? (
        <div className="qt-actions">
          <button className="qt-btn qt-btn-primary" disabled={Object.keys(matches).length < pairs.length} onClick={() => setSubmitted(true)}>Check Matches</button>
          {Object.keys(matches).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatches({}); setSelectedLeft(null); }}>Reset</button>}
        </div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>Score: {Math.round(score * 100)}% — {pairs.filter(p => matches[p.left] === p.right).length}/{pairs.length} correct.</div>
      )}
    </div>
  );
}

// ─── CODE OUTPUT RENDERER ─────────────────────────────────────────────────────
function GeneratedCodeOutput({ q, index }) {
  const [matches, setMatches] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState(null);
  const snippets = q.snippets || [];
  const outputs = q.outputs || [];
  const correctMap = q.correctMap || {};
  const handleSnippetClick = (id) => { if (!submitted) setSelectedSnippet(id); };
  const handleOutputClick = (id) => { if (submitted || !selectedSnippet) return; setMatches(prev => ({ ...prev, [selectedSnippet]: id })); setSelectedSnippet(null); };
  const score = submitted ? Object.keys(correctMap).filter(k => matches[k] === correctMap[k]).length / Object.keys(correctMap).length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-match-container">
        <div className="qt-match-col">
          <h4>Code</h4>
          {snippets.map(s => (
            <div key={s.id} className={`qt-match-item ${selectedSnippet === s.id ? 'active' : ''} ${matches[s.id] ? 'matched' : ''}`} onClick={() => handleSnippetClick(s.id)}>
              <code style={{ fontSize: '0.8rem' }}>{s.code}</code>
              {matches[s.id] && <span style={{ float: 'right', opacity: 0.6 }}>→ {matches[s.id]}</span>}
            </div>
          ))}
        </div>
        <div className="qt-match-col">
          <h4>Output</h4>
          {outputs.map(o => (
            <div key={o.id} className={`qt-match-item ${Object.values(matches).includes(o.id) ? 'matched' : ''}`} onClick={() => handleOutputClick(o.id)}>{o.id}. {o.text}</div>
          ))}
        </div>
      </div>
      {!submitted ? (
        <div className="qt-actions">
          <button className="qt-btn qt-btn-primary" disabled={Object.keys(matches).length < snippets.length} onClick={() => setSubmitted(true)}>Check</button>
          {Object.keys(matches).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatches({}); setSelectedSnippet(null); }}>Reset</button>}
        </div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>Score: {Math.round(score * 100)}%</div>
      )}
    </div>
  );
}

// ─── CODE REARRANGE RENDERER ──────────────────────────────────────────────────
function GeneratedCodeRearrange({ q, index }) {
  const shuffled = useMemo(() => [...(q.blocks || [])].sort(() => Math.random() - 0.5), [q]);
  const [items, setItems] = useState(shuffled);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const correctOrder = q.correctOrder || [];
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; const n = [...items]; const [d] = n.splice(dragIdx, 1); n.splice(idx, 0, d); setItems(n); setDragIdx(idx); };
  const score = submitted ? items.filter((item, idx) => item.id === correctOrder[idx]).length / items.length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-sortable-list">
        {items.map((item, idx) => (
          <div key={item.id} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item.id === correctOrder[idx] ? 'correct-pos' : ''} ${submitted && item.id !== correctOrder[idx] ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={() => setDragIdx(null)}>
            <span className="qt-drag-handle">⠿</span><span className="qt-pos">{idx + 1}</span><code style={{ fontSize: '0.82rem' }}>{item.code}</code>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Check Order</button></div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>{score === 1 ? '✓ Perfect arrangement!' : `Score: ${Math.round(score * 100)}%`}</div>
      )}
    </div>
  );
}

// ─── ARCHITECTURE LAYERS RENDERER ─────────────────────────────────────────────
function GeneratedArchLayers({ q, index }) {
  const [placed, setPlaced] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const layers = q.layers || [];
  const items = q.items || [];
  const [selectedItem, setSelectedItem] = useState(null);
  const handleItemClick = (text) => { if (!submitted) setSelectedItem(text); };
  const handleLayerClick = (layer) => { if (submitted || !selectedItem) return; setPlaced(prev => ({ ...prev, [selectedItem]: layer })); setSelectedItem(null); };
  const score = submitted ? items.filter(it => placed[it.text] === it.layer).length / items.length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 🏗️ {q.question}</div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {items.map(it => (
          <div key={it.text} className={`qt-sql-clause ${selectedItem === it.text ? 'select' : ''}`} onClick={() => handleItemClick(it.text)} style={{ opacity: placed[it.text] ? 0.4 : 1, cursor: placed[it.text] ? 'default' : 'pointer', border: selectedItem === it.text ? '2px solid #A100FF' : '1px solid rgba(255,255,255,0.15)' }}>{it.text}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${layers.length}, 1fr)`, gap: '0.5rem' }}>
        {layers.map(layer => (
          <div key={layer} onClick={() => handleLayerClick(layer)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px dashed rgba(161,0,255,0.3)', background: 'rgba(161,0,255,0.04)', cursor: selectedItem ? 'pointer' : 'default', minHeight: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#A100FF', marginBottom: '0.4rem', textTransform: 'uppercase' }}>{layer}</div>
            {items.filter(it => placed[it.text] === layer).map(it => (
              <div key={it.text} style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem', margin: '0.15rem 0', borderRadius: '4px', background: submitted ? (it.layer === layer ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.06)', color: submitted ? (it.layer === layer ? '#10b981' : '#ef4444') : 'inherit' }}>{it.text}</div>
            ))}
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions" style={{ marginTop: '0.75rem' }}>
          <button className="qt-btn qt-btn-primary" disabled={Object.keys(placed).length < items.length} onClick={() => setSubmitted(true)}>Check Layers</button>
          {Object.keys(placed).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setPlaced({}); setSelectedItem(null); }}>Reset</button>}
        </div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>Score: {Math.round(score * 100)}% — {items.filter(it => placed[it.text] === it.layer).length}/{items.length} correct placements.</div>
      )}
    </div>
  );
}

// ─── CODE REVIEW RENDERER ─────────────────────────────────────────────────────
function GeneratedCodeReview({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 👁️ {q.question}</div>
      <div className="qt-demo-code">{q.code}</div>
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.id} className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === q.correct ? 'correct' : ''} ${submitted && selected === o.id && o.id !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.id)}>
            <span className="qt-option-letter">{o.id}.</span><span>{o.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit Review</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Good eye! ${q.explanation}` : `✗ ${q.explanation}`}</div>
      )}
    </div>
  );
}

// ─── PIPELINE BUILD RENDERER ──────────────────────────────────────────────────
function GeneratedPipelineBuild({ q, index }) {
  const [canvas, setCanvas] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const clauses = q.clauses || [];
  const correctIds = q.correctIds || [];
  const addToCanvas = (clause) => { if (submitted || canvas.find(c => c.id === clause.id)) return; setCanvas([...canvas, clause]); };
  const removeFromCanvas = (id) => { if (submitted) return; setCanvas(canvas.filter(c => c.id !== id)); };
  const isCorrect = submitted && canvas.length === correctIds.length && canvas.every((c, i) => c.id === correctIds[i]);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 🔧 {q.question}</div>
      <div className="qt-sql-palette">
        {clauses.map(c => (
          <div key={c.id} className={`qt-sql-clause ${c.cat}`} onClick={() => addToCanvas(c)} style={{ opacity: canvas.find(x => x.id === c.id) ? 0.4 : 1, cursor: canvas.find(x => x.id === c.id) ? 'default' : 'pointer' }}>{c.text}</div>
        ))}
      </div>
      <div className={`qt-sql-canvas ${canvas.length > 0 ? 'has-items' : ''}`}>
        {canvas.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem' }}>Click operators to build pipeline...</span>}
        {canvas.map(c => (<div key={c.id} className={`qt-sql-clause ${c.cat}`} onClick={() => removeFromCanvas(c.id)} style={{ cursor: 'pointer' }}>{c.text} ×</div>))}
      </div>
      {!submitted ? (
        <div className="qt-actions">
          <button className="qt-btn qt-btn-primary" disabled={canvas.length === 0} onClick={() => setSubmitted(true)}>Build</button>
          {canvas.length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => setCanvas([])}>Clear</button>}
        </div>
      ) : (
        <div className={`qt-result ${isCorrect ? 'success' : 'error'}`}>{isCorrect ? '✓ Perfect pipeline!' : 'Not quite — check the order and remove distractors.'}</div>
      )}
    </div>
  );
}

// ─── FLOWCHART RENDERER ───────────────────────────────────────────────────────
function GeneratedFlowchart({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 📊 {q.question}</div>
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
            <span className="qt-option-letter">{o.letter}.</span><span>{o.text}</span>
            {submitted && o.letter === q.correct && <span style={{ marginLeft: 'auto' }}>✓</span>}
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Submit</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Correct! ${q.explanation}` : `✗ ${q.explanation}`}</div>
      )}
    </div>
  );
}

// ─── DEVOPS PIPELINE RENDERER ─────────────────────────────────────────────────
function GeneratedDevOpsPipe({ q, index }) {
  const shuffled = useMemo(() => [...(q.items || [])].map((text, i) => ({ id: String(i), text, correctPos: i })).sort(() => Math.random() - 0.5), [q]);
  const [items, setItems] = useState(shuffled);
  const [submitted, setSubmitted] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); if (dragIdx === null || dragIdx === idx) return; const n = [...items]; const [d] = n.splice(dragIdx, 1); n.splice(idx, 0, d); setItems(n); setDragIdx(idx); };
  const score = submitted ? items.filter((item, idx) => item.correctPos === idx).length / items.length : 0;
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 🚀 {q.question}</div>
      <div className="qt-sortable-list">
        {items.map((item, idx) => (
          <div key={item.id + item.text} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item.correctPos === idx ? 'correct-pos' : ''} ${submitted && item.correctPos !== idx ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => handleDragStart(idx)} onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={() => setDragIdx(null)}>
            <span className="qt-drag-handle">⠿</span><span className="qt-pos">{idx + 1}</span><span>{item.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={() => setSubmitted(true)}>Check Pipeline</button></div>
      ) : (
        <div className={`qt-result ${score === 1 ? 'success' : score >= 0.5 ? 'partial' : 'error'}`}>{score === 1 ? '✓ Perfect pipeline order!' : `Score: ${Math.round(score * 100)}%`}</div>
      )}
    </div>
  );
}

// ─── SECURE CODE RENDERER ─────────────────────────────────────────────────────
function GeneratedSecureCode({ q, index }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="qt-generated-q">
      <div className="qt-demo-question"><strong>Q{index}.</strong> 🛡️ {q.question}</div>
      <div className="qt-demo-code">{q.code}</div>
      <div className="qt-options">
        {(q.options || []).map(o => (
          <div key={o.id} className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === q.correct ? 'correct' : ''} ${submitted && selected === o.id && o.id !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.id)}>
            <span className="qt-option-letter">{o.id}.</span><span>{o.text}</span>
          </div>
        ))}
      </div>
      {!submitted ? (
        <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={() => setSubmitted(true)}>Identify Vulnerability</button></div>
      ) : (
        <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Correct! ${q.explanation}` : `✗ ${q.explanation}`}</div>
      )}
    </div>
  );
}

// Renders a generated crossword puzzle
function GeneratedCrossword({ q, index }) {
  // Build grid from word definitions
  const buildGrid = () => {
    let maxRow = 0, maxCol = 0;
    (q.words || []).forEach(w => {
      const len = w.word.length;
      if (w.direction === 'across') {
        maxRow = Math.max(maxRow, w.row);
        maxCol = Math.max(maxCol, w.col + len - 1);
      } else {
        maxRow = Math.max(maxRow, w.row + len - 1);
        maxCol = Math.max(maxCol, w.col);
      }
    });
    const rows = maxRow + 1;
    const cols = maxCol + 1;
    // Create empty grid
    const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ letter: '', active: false, number: null })));
    // Place words
    (q.words || []).forEach((w) => {
      for (let i = 0; i < w.word.length; i++) {
        const r = w.direction === 'across' ? w.row : w.row + i;
        const c = w.direction === 'across' ? w.col + i : w.col;
        grid[r][c].letter = w.word[i].toUpperCase();
        grid[r][c].active = true;
      }
    });
    // Assign numbers sequentially by position (top-to-bottom, left-to-right)
    const startCells = new Set();
    (q.words || []).forEach(w => startCells.add(`${w.row}-${w.col}`));
    let num = 1;
    const cellNumbers = {};
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}-${c}`;
        if (startCells.has(key)) {
          cellNumbers[key] = num;
          grid[r][c].number = num;
          num++;
        }
      }
    }
    // Map word index to cell number for clues
    const wordNumbers = (q.words || []).map(w => cellNumbers[`${w.row}-${w.col}`]);
    return { grid, rows, cols, wordNumbers };
  };

  const { grid, rows, cols, wordNumbers } = useMemo(buildGrid, [q.words]);
  const [userGrid, setUserGrid] = useState(() =>
    Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''))
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const inputRefs = useRef({});

  const handleInput = (r, c, val) => {
    if (submitted) return;
    const ch = val.slice(-1).toUpperCase();
    setUserGrid(prev => {
      const next = prev.map(row => [...row]);
      next[r][c] = ch;
      return next;
    });
    // Auto-advance to next cell
    if (ch) {
      // Find next active cell in reading order
      const allCells = [];
      for (let ri = 0; ri < rows; ri++) {
        for (let ci = 0; ci < cols; ci++) {
          if (grid[ri][ci].active) allCells.push(`${ri}-${ci}`);
        }
      }
      const currentIdx = allCells.indexOf(`${r}-${c}`);
      if (currentIdx < allCells.length - 1) {
        const nextKey = allCells[currentIdx + 1];
        if (inputRefs.current[nextKey]) inputRefs.current[nextKey].focus();
      }
    }
  };

  const handleSubmit = () => {
    let correct = 0, total = 0;
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c2 = 0; c2 < cols; c2++) {
        if (grid[r2][c2].active) {
          total++;
          if (userGrid[r2][c2] === grid[r2][c2].letter) correct++;
        }
      }
    }
    setScore(Math.round((correct / total) * 100));
    setSubmitted(true);
  };

  const handleReveal = () => {
    setUserGrid(grid.map(row => row.map(cell => cell.active ? cell.letter : '')));
    setSubmitted(true);
    setScore(0);
  };

  return (
    <div className="qt-generated-q qt-crossword">
      <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
      <div className="qt-crossword-layout">
        <div className="qt-crossword-grid" style={{ gridTemplateColumns: `repeat(${cols}, 44px)`, gridTemplateRows: `repeat(${rows}, 44px)` }}>
          {grid.map((row, ri) => row.map((cell, ci) => (
            <div key={`${ri}-${ci}`} className={`qt-crossword-cell ${cell.active ? 'active' : 'empty'} ${submitted && cell.active && userGrid[ri][ci] === cell.letter ? 'correct' : ''} ${submitted && cell.active && userGrid[ri][ci] !== cell.letter ? 'wrong' : ''}`}>
              {cell.number && <span className="qt-crossword-number">{cell.number}</span>}
              {cell.active && (
                <input
                  ref={el => { inputRefs.current[`${ri}-${ci}`] = el; }}
                  type="text"
                  maxLength={1}
                  value={userGrid[ri][ci]}
                  onChange={e => handleInput(ri, ci, e.target.value)}
                  disabled={submitted}
                  className="qt-crossword-input"
                  autoComplete="off"
                />
              )}
            </div>
          )))}
        </div>
        <div className="qt-crossword-clues">
          <div className="qt-crossword-clue-section">
            <strong>Across</strong>
            {(q.words || []).map((w, i) => w.direction === 'across' ? (
              <div key={i} className="qt-crossword-clue">{wordNumbers[i]}. {w.clue}</div>
            ) : null)}
          </div>
          <div className="qt-crossword-clue-section">
            <strong>Down</strong>
            {(q.words || []).map((w, i) => w.direction === 'down' ? (
              <div key={i} className="qt-crossword-clue">{wordNumbers[i]}. {w.clue}</div>
            ) : null)}
          </div>
        </div>
      </div>
      {!submitted ? (
        <div className="qt-actions">
          <button className="qt-btn qt-btn-primary" onClick={handleSubmit}>Check Crossword</button>
          <button className="qt-btn qt-btn-outline" onClick={handleReveal}>Reveal Answers</button>
        </div>
      ) : (
        <div className={`qt-result ${score === 100 ? 'success' : score >= 50 ? 'warning' : 'error'}`}>
          {score === 100 ? '✓ Perfect! All letters correct!' : score > 0 ? `Score: ${score}% — ${score >= 50 ? 'Good effort!' : 'Try again!'}` : 'Answers revealed!'}
        </div>
      )}
    </div>
  );
}

// Renders a generated question by its type
function RenderGeneratedQuestion({ q, index }) {
  switch (q.type) {
    case 'SINGLE_MCQ': return <GeneratedMCQ q={q} index={index} />;
    case 'MULTI_MCQ': return <GeneratedMultiMCQ q={q} index={index} />;
    case 'DRAG_ORDER': return <GeneratedDragOrder q={q} index={index} />;
    case 'FILL_BLANK': return <GeneratedFillBlank q={q} index={index} />;
    case 'PREDICT_OUTPUT': return <GeneratedPredictOutput q={q} index={index} />;
    case 'DEBUG_CODE': return <GeneratedDebugCode q={q} index={index} />;
    case 'SQL_BUILDER': return <GeneratedSQLBuilder q={q} index={index} />;
    case 'RIDDLE': return <GeneratedRiddle q={q} index={index} />;
    case 'MATCH_PAIRS': return <GeneratedMatchPairs q={q} index={index} />;
    case 'CODE_OUTPUT': return <GeneratedCodeOutput q={q} index={index} />;
    case 'CODE_REARRANGE': return <GeneratedCodeRearrange q={q} index={index} />;
    case 'ARCH_LAYERS': return <GeneratedArchLayers q={q} index={index} />;
    case 'CODE_REVIEW': return <GeneratedCodeReview q={q} index={index} />;
    case 'PIPELINE_BUILD': return <GeneratedPipelineBuild q={q} index={index} />;
    case 'FLOWCHART': return <GeneratedFlowchart q={q} index={index} />;
    case 'DEVOPS_PIPE': return <GeneratedDevOpsPipe q={q} index={index} />;
    case 'SECURE_CODE': return <GeneratedSecureCode q={q} index={index} />;
    case 'CROSSWORD': return <GeneratedCrossword q={q} index={index} />;
    default: return <GeneratedMCQ q={q} index={index} />;
  }
}

// ─── PROMPT PARSER ────────────────────────────────────────────────────────────
function parsePrompt(prompt) {
  const lower = prompt.toLowerCase();
  // Extract count — number near question keywords, leading number, or any standalone number
  const countMatch = lower.match(/(\d+)\s*(question|q\b|mcq|quiz)/) || lower.match(/^(\d+)\s/) || lower.match(/\b(\d+)\b/);
  const count = countMatch ? Math.min(parseInt(countMatch[1]), 10) : 5;
  // Extract topic — extensive keyword mapping to bank topics
  const topics = Object.keys(QUESTION_BANK);
  let matchedTopic = null;
  let displayTopic = null; // what the user actually asked for
  // Direct match against bank keys first
  for (const topic of topics) {
    if (lower.includes(topic)) { matchedTopic = topic; break; }
  }
  // Extensive keyword → bank topic mapping (covers 100+ technologies)
  if (!matchedTopic) {
    const TOPIC_MAP = {
      // Java ecosystem
      'spring': 'spring boot', 'boot': 'spring boot', 'jpa': 'spring boot', 'hibernate': 'spring boot',
      'spring cloud': 'spring boot', 'spring mvc': 'spring boot', 'thymeleaf': 'spring boot',
      'maven': 'java', 'gradle': 'java', 'junit': 'java', 'mockito': 'java', 'lombok': 'java',
      'servlet': 'java', 'jdbc': 'java', 'jvm': 'java', 'jdk': 'java', 'jre': 'java',
      'collections': 'java', 'streams': 'java', 'multithreading': 'java', 'concurrency': 'java',
      'generics': 'java', 'enum': 'java', 'annotations': 'java', 'reflection': 'java',
      // JavaScript / Frontend
      'javascript': 'react', 'js': 'react', 'es6': 'react', 'es2015': 'react',
      'vue': 'react', 'vuejs': 'react', 'vue.js': 'react', 'nuxt': 'react', 'svelte': 'react',
      'next': 'react', 'nextjs': 'react', 'next.js': 'react', 'gatsby': 'react',
      'html': 'react', 'css': 'react', 'sass': 'react', 'tailwind': 'react', 'bootstrap': 'react',
      'webpack': 'react', 'vite': 'react', 'babel': 'react', 'esbuild': 'react',
      'dom': 'react', 'ajax': 'react', 'fetch': 'react', 'promise': 'react', 'async': 'react',
      'hook': 'react', 'component': 'react', 'jsx': 'react', 'redux': 'react', 'zustand': 'react',
      // Angular
      'angular': 'angular', 'ng': 'angular', 'rxjs': 'angular', 'ngrx': 'angular',
      'ionic': 'angular', 'material': 'angular',
      // TypeScript
      'typescript': 'typescript', 'ts': 'typescript', 'interface': 'typescript', 'generic': 'typescript',
      'zod': 'typescript', 'prisma': 'typescript',
      // Python
      'python': 'python', 'django': 'python', 'flask': 'python', 'fastapi': 'python',
      'pip': 'python', 'pandas': 'python', 'numpy': 'python', 'pytorch': 'python',
      'tensorflow': 'python', 'scikit': 'python', 'celery': 'python', 'airflow': 'python',
      'jupyter': 'python', 'matplotlib': 'python', 'seaborn': 'python',
      // Node.js
      'node': 'node', 'nodejs': 'node', 'node.js': 'node', 'express': 'node', 'npm': 'node',
      'yarn': 'node', 'pnpm': 'node', 'deno': 'node', 'bun': 'node', 'nestjs': 'node',
      'nest': 'node', 'koa': 'node', 'fastify': 'node', 'event loop': 'node', 'socket': 'node',
      'socket.io': 'node', 'websocket': 'node',
      // DevOps / Cloud / Infra
      'docker': 'devops', 'kubernetes': 'devops', 'k8s': 'devops', 'ci/cd': 'devops',
      'jenkins': 'devops', 'gitlab': 'devops', 'github actions': 'devops', 'terraform': 'devops',
      'ansible': 'devops', 'aws': 'devops', 'azure': 'devops', 'gcp': 'devops',
      'cloud': 'devops', 'linux': 'devops', 'nginx': 'devops', 'apache': 'devops',
      'helm': 'devops', 'prometheus': 'devops', 'grafana': 'devops', 'datadog': 'devops',
      'splunk': 'devops', 'elk': 'devops', 'logstash': 'devops', 'kibana': 'devops',
      'vagrant': 'devops', 'puppet': 'devops', 'chef': 'devops', 'argo': 'devops',
      'argocd': 'devops', 'sonarqube': 'devops', 'sonar': 'devops',
      'n8n': 'devops', 'zapier': 'devops', 'make': 'devops',
      // Database / SQL
      'sql': 'sql', 'mysql': 'sql', 'postgres': 'sql', 'postgresql': 'sql', 'oracle': 'sql',
      'mongodb': 'sql', 'mongo': 'sql', 'redis': 'sql', 'cassandra': 'sql',
      'dynamodb': 'sql', 'elasticsearch': 'sql', 'query': 'sql', 'database': 'sql',
      'nosql': 'sql', 'sqlite': 'sql', 'mariadb': 'sql', 'couchdb': 'sql',
      'neo4j': 'sql', 'graphql': 'sql', 'plsql': 'sql',
      // Security
      'xss': 'security', 'owasp': 'security', 'jwt': 'security', 'oauth': 'security',
      'cors': 'security', 'csrf': 'security', 'ssl': 'security', 'tls': 'security',
      'encryption': 'security', 'hashing': 'security', 'penetration': 'security',
      'firewall': 'security', 'cybersecurity': 'security', 'cyber': 'security',
      // Design patterns / Architecture
      'pattern': 'design patterns', 'singleton': 'design patterns', 'factory': 'design patterns',
      'solid': 'design patterns', 'observer': 'design patterns', 'strategy': 'design patterns',
      'decorator': 'design patterns', 'adapter': 'design patterns', 'proxy': 'design patterns',
      'mvc': 'design patterns', 'mvvm': 'design patterns', 'clean code': 'design patterns',
      'ddd': 'design patterns', 'domain driven': 'design patterns', 'hexagonal': 'design patterns',
      // Microservices
      'micro': 'microservices', 'microservice': 'microservices', 'gateway': 'microservices',
      'circuit': 'microservices', 'kafka': 'microservices', 'rabbitmq': 'microservices',
      'grpc': 'microservices', 'eureka': 'microservices', 'consul': 'microservices',
      'service mesh': 'microservices', 'istio': 'microservices', 'envoy': 'microservices',
      'saga': 'microservices', 'cqrs': 'microservices', 'event sourcing': 'microservices',
      // Other languages → closest bank
      'c++': 'java', 'cpp': 'java', 'c#': 'java', 'csharp': 'java', 'dotnet': 'java', '.net': 'java',
      'golang': 'java', 'go': 'java', 'rust': 'java', 'kotlin': 'java', 'scala': 'java',
      'swift': 'java', 'objective-c': 'java', 'r ': 'python', 'matlab': 'python',
      'ruby': 'node', 'rails': 'node', 'php': 'node', 'laravel': 'node', 'perl': 'node',
      'dart': 'react', 'flutter': 'react',
      // AI/ML
      'ai': 'python', 'ml': 'python', 'machine learning': 'python', 'deep learning': 'python',
      'nlp': 'python', 'openai': 'python', 'gpt': 'python', 'llm': 'python',
      'langchain': 'python', 'hugging': 'python', 'transformers': 'python',
      // Data engineering
      'spark': 'python', 'hadoop': 'python', 'hive': 'sql', 'etl': 'sql',
      'dbt': 'sql', 'snowflake': 'sql', 'bigquery': 'sql', 'redshift': 'sql',
      // Mobile
      'android': 'java', 'ios': 'typescript', 'react native': 'react', 'expo': 'react',
      // Testing
      'selenium': 'java', 'cypress': 'react', 'playwright': 'typescript',
      'jest': 'react', 'mocha': 'node', 'chai': 'node', 'vitest': 'react',
    };
    // Find match — try longest keywords first
    const sortedKeys = Object.keys(TOPIC_MAP).sort((a, b) => b.length - a.length);
    for (const kw of sortedKeys) {
      if (lower.includes(kw)) {
        // Extract what the user actually said as display topic
        displayTopic = kw;
        matchedTopic = TOPIC_MAP[kw];
        break;
      }
    }
  }
  // If still no match, try to extract a noun/word as display topic, default bank to java
  if (!matchedTopic) {
    // Try to find a capitalized or quoted word the user mentioned as their topic
    const topicWordMatch = prompt.match(/(?:about|for|on|in)\s+([A-Za-z0-9#+.]+)/i) || prompt.match(/\b([A-Z][a-z]+(?:\.[a-z]+)?)\b/);
    if (topicWordMatch) displayTopic = topicWordMatch[1].toLowerCase();
    matchedTopic = 'java'; // default bank
  }
  // displayTopic = what we show in the tag. If not set, use matchedTopic
  if (!displayTopic) displayTopic = matchedTopic;
  // Detect ALL mentioned types (support mixed requests like "fill blank and drag drop")
  const detectedTypes = [];
  if (lower.includes('fill') || lower.includes('blank') || lower.includes('cloze') || lower.includes('word bank') || lower.includes('word-bank') || lower.includes('gap')) detectedTypes.push('FILL_BLANK');
  if (lower.includes('rearrange') || lower.includes('reorder') || (lower.includes('code') && lower.includes('puzzle'))) detectedTypes.push('CODE_REARRANGE');
  if (lower.includes('drag') || lower.includes('sequence') || (lower.includes('arrange') && !lower.includes('rearrange'))) detectedTypes.push('DRAG_ORDER');
  if ((lower.includes('predict') && lower.includes('output')) || lower.includes('trace')) detectedTypes.push('PREDICT_OUTPUT');
  if (lower.includes('debug') || lower.includes('bug') || lower.includes('find the error')) detectedTypes.push('DEBUG_CODE');
  if (lower.includes('sql') && lower.includes('build')) detectedTypes.push('SQL_BUILDER');
  if (lower.includes('riddle') || lower.includes('enigma')) detectedTypes.push('RIDDLE');
  if (lower.includes('multi') || lower.includes('select all') || lower.includes('checkbox')) detectedTypes.push('MULTI_MCQ');
  if (lower.includes('match') && (lower.includes('concept') || lower.includes('definition') || lower.includes('pair'))) detectedTypes.push('MATCH_PAIRS');
  if ((lower.includes('match') && (lower.includes('code') || lower.includes('output') || lower.includes('snippet'))) || (lower.includes('code') && lower.includes('output') && !lower.includes('predict'))) detectedTypes.push('CODE_OUTPUT');
  if (lower.includes('code review') || lower.includes('review challenge') || lower.includes('pr review')) detectedTypes.push('CODE_REVIEW');
  if (lower.includes('stream') && lower.includes('pipeline')) detectedTypes.push('PIPELINE_BUILD');
  if (lower.includes('flowchart') || lower.includes('flow chart') || lower.includes('diagram')) detectedTypes.push('FLOWCHART');
  if (lower.includes('devops') && lower.includes('pipe')) detectedTypes.push('DEVOPS_PIPE');
  if (lower.includes('ci/cd') || lower.includes('cicd') || lower.includes('deploy')) detectedTypes.push('DEVOPS_PIPE');
  if (lower.includes('secure') || (lower.includes('vulnerab') && !detectedTypes.length)) detectedTypes.push('SECURE_CODE');
  if (lower.includes('architect') || lower.includes('layer')) detectedTypes.push('ARCH_LAYERS');
  if (lower.includes('crossword') || lower.includes('cross word') || lower.includes('crossword puzzle')) detectedTypes.push('CROSSWORD');
  if ((lower.includes('single') || lower.includes('mcq') || lower.includes('multiple choice')) && !detectedTypes.includes('MULTI_MCQ')) detectedTypes.push('SINGLE_MCQ');

  // Primary preferred type (first detected)
  const preferredType = detectedTypes.length === 1 ? detectedTypes[0] : null;
  // "interactive", "mix", or multiple types detected means variety
  const wantsMix = lower.includes('interactive') || lower.includes('mix') || lower.includes('animation') || lower.includes('varied') || lower.includes('different') || detectedTypes.length > 1;
  return { count, topic: matchedTopic, displayTopic, preferredType, wantsMix, detectedTypes };
}

function generateQuestions(parsed) {
  const allBanks = Object.values(QUESTION_BANK).flat();
  const topicBank = QUESTION_BANK[parsed.topic] || QUESTION_BANK['java'];
  let pool = [...topicBank];

  // If multiple types detected, pull one of each from any topic, then fill remaining
  if (parsed.detectedTypes && parsed.detectedTypes.length > 1) {
    const result = [];
    const usedIds = new Set();
    // First: one question per detected type
    for (const type of parsed.detectedTypes) {
      // Prefer from requested topic first
      let q = topicBank.find(q => q.type === type && !usedIds.has(q.question));
      if (!q) q = allBanks.find(q => q.type === type && !usedIds.has(q.question));
      if (q) { result.push(q); usedIds.add(q.question); }
    }
    // Fill remaining count with variety from topic
    let fillPool = [...topicBank].filter(q => !usedIds.has(q.question));
    for (let i = fillPool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fillPool[i], fillPool[j]] = [fillPool[j], fillPool[i]]; }
    while (result.length < parsed.count && fillPool.length > 0) {
      result.push(fillPool.shift());
    }
    // Still not enough? Pull from all topics
    if (result.length < parsed.count) {
      let morePool = allBanks.filter(q => !usedIds.has(q.question) && !result.includes(q));
      for (let i = morePool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [morePool[i], morePool[j]] = [morePool[j], morePool[i]]; }
      while (result.length < parsed.count && morePool.length > 0) result.push(morePool.shift());
    }
    return result.slice(0, parsed.count);
  }

  // If single preferred type and not mix, filter — pull from all topics if not enough
  if (parsed.preferredType && !parsed.wantsMix) {
    let filtered = pool.filter(q => q.type === parsed.preferredType);
    if (filtered.length < parsed.count) {
      const otherTopics = Object.keys(QUESTION_BANK).filter(t => t !== parsed.topic);
      for (const t of otherTopics) {
        if (filtered.length >= parsed.count) break;
        const extras = QUESTION_BANK[t].filter(q => q.type === parsed.preferredType && !filtered.includes(q));
        filtered = filtered.concat(extras);
      }
    }
    if (filtered.length > 0) pool = filtered;
  }
  // Shuffle
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  // If wants mix, prioritize variety
  if (parsed.wantsMix) {
    const byType = {};
    pool.forEach(q => { if (!byType[q.type]) byType[q.type] = []; byType[q.type].push(q); });
    const types = Object.keys(byType);
    const result = [];
    let typeIdx = 0;
    while (result.length < parsed.count && result.length < pool.length) {
      const type = types[typeIdx % types.length];
      if (byType[type].length > 0) result.push(byType[type].shift());
      typeIdx++;
    }
    return result;
  }
  return pool.slice(0, parsed.count);
}

// ─── CHALLENGE MODE: TIMER, LEADERBOARD, PROGRESS, DIFFICULTY, CERTIFICATE ───

// Difficulty settings per question type
const DIFFICULTY_MAP = {
  'SINGLE_MCQ': 'Easy', 'MULTI_MCQ': 'Medium', 'DRAG_ORDER': 'Medium',
  'FILL_BLANK': 'Hard', 'PREDICT_OUTPUT': 'Hard', 'DEBUG_CODE': 'Hard',
  'RIDDLE': 'Medium', 'SQL_BUILDER': 'Hard', 'MATCH_PAIRS': 'Medium',
  'CODE_OUTPUT': 'Medium', 'CODE_REARRANGE': 'Hard', 'ARCH_LAYERS': 'Hard',
  'CODE_REVIEW': 'Hard', 'PIPELINE_BUILD': 'Medium', 'FLOWCHART': 'Medium',
  'DEVOPS_PIPE': 'Medium', 'SECURE_CODE': 'Hard'
};
const DIFFICULTY_POINTS = { 'Easy': 10, 'Medium': 20, 'Hard': 30 };
const DIFFICULTY_TIME = { 'Easy': 30, 'Medium': 45, 'Hard': 60 }; // seconds per question

// Local storage keys
const LS_LEADERBOARD = 'qt_leaderboard';
const LS_STREAK = 'qt_streak';
const LS_LAST_PLAY = 'qt_last_play';
const LS_TOTAL_SOLVED = 'qt_total_solved';

function getLeaderboard() {
  try { return JSON.parse(localStorage.getItem(LS_LEADERBOARD)) || []; } catch { return []; }
}
function saveLeaderboard(board) {
  const top10 = board.sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem(LS_LEADERBOARD, JSON.stringify(top10));
}
function getStreak() {
  try {
    const streak = parseInt(localStorage.getItem(LS_STREAK)) || 0;
    const lastPlay = localStorage.getItem(LS_LAST_PLAY);
    if (lastPlay) {
      const daysDiff = Math.floor((Date.now() - new Date(lastPlay).getTime()) / 86400000);
      if (daysDiff > 1) { localStorage.setItem(LS_STREAK, '0'); return 0; }
    }
    return streak;
  } catch { return 0; }
}
function updateStreak() {
  const today = new Date().toDateString();
  const lastPlay = localStorage.getItem(LS_LAST_PLAY);
  if (lastPlay !== today) {
    const streak = getStreak() + 1;
    localStorage.setItem(LS_STREAK, streak.toString());
    localStorage.setItem(LS_LAST_PLAY, today);
    return streak;
  }
  return getStreak();
}
function getTotalSolved() {
  try { return parseInt(localStorage.getItem(LS_TOTAL_SOLVED)) || 0; } catch { return 0; }
}

// ─── TIMER COMPONENT ─────────────────────────────────────────────────────────
function ChallengeTimer({ timeLeft, totalTime, isPaused }) {
  const pct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const color = pct > 60 ? '#10b981' : pct > 30 ? '#f59e0b' : '#ef4444';
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  return (
    <div className="qt-timer">
      <div className="qt-timer-ring">
        <svg viewBox="0 0 36 36" className="qt-timer-svg">
          <path className="qt-timer-bg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
          <path className="qt-timer-fg" d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={color} strokeWidth="3" strokeDasharray={`${pct}, 100`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
        </svg>
        <div className="qt-timer-text" style={{ color }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>
      {isPaused && <span className="qt-timer-paused">⏸ PAUSED</span>}
    </div>
  );
}

// ─── PROGRESS BAR ────────────────────────────────────────────────────────────
function ChallengeProgress({ current, total, score, maxScore, streak }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="qt-challenge-progress">
      <div className="qt-progress-stats">
        <span className="qt-progress-qnum">Q{current}/{total}</span>
        <span className="qt-progress-score">🏆 {score}/{maxScore}</span>
        {streak > 0 && <span className="qt-progress-streak">🔥 {streak} day streak</span>}
      </div>
      <div className="qt-progress-track">
        <div className="qt-progress-fill" style={{ width: `${pct}%` }} />
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className={`qt-progress-dot ${i < current ? 'done' : i === current ? 'active' : ''}`} style={{ left: `${((i + 0.5) / total) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

// ─── DIFFICULTY BADGE ────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const cls = difficulty === 'Easy' ? 'easy' : difficulty === 'Medium' ? 'medium' : 'hard';
  const icon = difficulty === 'Easy' ? '⭐' : difficulty === 'Medium' ? '⭐⭐' : '⭐⭐⭐';
  return <span className={`qt-difficulty qt-difficulty-${cls}`}>{icon} {difficulty}</span>;
}

// ─── LEADERBOARD PANEL ───────────────────────────────────────────────────────
function LeaderboardPanel({ show, onClose }) {
  const board = getLeaderboard();
  const totalSolved = getTotalSolved();
  const streak = getStreak();
  if (!show) return null;
  return (
    <div className="qt-modal-overlay" onClick={onClose}>
      <div className="qt-modal qt-leaderboard-modal" onClick={e => e.stopPropagation()}>
        <div className="qt-modal-header">
          <span style={{ fontSize: '1.3rem' }}>🏆</span>
          <h2>Leaderboard & Stats</h2>
          <button className="qt-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="qt-modal-body">
          <div className="qt-lb-stats">
            <div className="qt-lb-stat-card"><div className="qt-lb-stat-num">{totalSolved}</div><div className="qt-lb-stat-label">Questions Solved</div></div>
            <div className="qt-lb-stat-card"><div className="qt-lb-stat-num">🔥 {streak}</div><div className="qt-lb-stat-label">Day Streak</div></div>
            <div className="qt-lb-stat-card"><div className="qt-lb-stat-num">{board.length > 0 ? board[0].score : 0}</div><div className="qt-lb-stat-label">Best Score</div></div>
          </div>
          {board.length === 0 ? (
            <div className="qt-lb-empty">No scores yet. Start a Challenge to earn your place! 🚀</div>
          ) : (
            <div className="qt-lb-table">
              <div className="qt-lb-row qt-lb-header"><span>#</span><span>Player</span><span>Topic</span><span>Score</span><span>Date</span></div>
              {board.map((entry, idx) => (
                <div key={idx} className={`qt-lb-row ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                  <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</span>
                  <span>{entry.name}</span>
                  <span>{entry.topic}</span>
                  <span className="qt-lb-score">{entry.score}</span>
                  <span>{new Date(entry.date).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CERTIFICATE MODAL ───────────────────────────────────────────────────────
function CertificateModal({ show, onClose, data }) {
  const canvasRef = useRef(null);
  if (!show || !data) return null;
  const { name, topic, score, maxScore, date, questionsCount, timeUsed } = data;
  const pct = Math.round((score / maxScore) * 100);
  const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'D';
  const gradeColor = pct >= 80 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444';

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 800; canvas.height = 560;
    // Background
    const grad = ctx.createLinearGradient(0, 0, 800, 560);
    grad.addColorStop(0, '#1a1a2e'); grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 800, 560);
    // Border
    ctx.strokeStyle = '#A100FF'; ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 520);
    ctx.strokeStyle = 'rgba(161,0,255,0.3)'; ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, 740, 500);
    // Title
    ctx.fillStyle = '#a5b4fc'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center';
    ctx.fillText('QUIZHUB AI • INTERACTIVE QUESTION TYPES', 400, 70);
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 28px Georgia';
    ctx.fillText('Certificate of Achievement', 400, 110);
    // Name
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px Arial';
    ctx.fillText('This certifies that', 400, 160);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Arial';
    ctx.fillText(name || 'Quiz Champion', 400, 195);
    // Details
    ctx.fillStyle = '#94a3b8'; ctx.font = '14px Arial';
    ctx.fillText('has successfully completed a challenge on', 400, 240);
    ctx.fillStyle = '#a5b4fc'; ctx.font = 'bold 20px Arial';
    ctx.fillText(topic.charAt(0).toUpperCase() + topic.slice(1), 400, 270);
    // Score
    ctx.fillStyle = gradeColor; ctx.font = 'bold 48px Arial';
    ctx.fillText(grade, 400, 340);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '16px Arial';
    ctx.fillText(`Score: ${score}/${maxScore} (${pct}%)`, 400, 380);
    ctx.fillText(`${questionsCount} questions • ${timeUsed}`, 400, 405);
    // Date
    ctx.fillStyle = '#64748b'; ctx.font = '12px Arial';
    ctx.fillText(`Completed: ${new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 460);
    ctx.fillText('Powered by QuizHub AI • Accenture Hack-N-Stack 2026', 400, 490);
    // Download
    const link = document.createElement('a');
    link.download = `QuizHub_Certificate_${topic.replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="qt-modal-overlay" onClick={onClose}>
      <div className="qt-modal qt-certificate-modal" onClick={e => e.stopPropagation()}>
        <div className="qt-modal-header">
          <span style={{ fontSize: '1.3rem' }}>🏅</span>
          <h2>Challenge Complete!</h2>
          <button className="qt-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="qt-modal-body">
          <div className="qt-cert-card">
            <div className="qt-cert-grade" style={{ color: gradeColor }}>{grade}</div>
            <div className="qt-cert-score">{score}/{maxScore} points ({pct}%)</div>
            <div className="qt-cert-details">
              <span>📝 {questionsCount} questions</span>
              <span>⏱️ {timeUsed}</span>
              <span>📚 {topic}</span>
            </div>
            {pct >= 70 && <div className="qt-cert-congrats">🎉 Congratulations, {name || 'Champion'}!</div>}
            {pct < 70 && <div className="qt-cert-retry">Keep practicing! You'll get there 💪</div>}
          </div>
          <div className="qt-cert-actions">
            <button className="qt-btn qt-btn-primary" onClick={handleDownload}>📥 Download Certificate</button>
            <button className="qt-btn qt-btn-outline" onClick={onClose}>Close</button>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  );
}

// ─── CHALLENGE MODE WRAPPER (single question at a time with timer) ───────────
function ChallengeMode({ questions, topic, onExit }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const [startTime] = useState(Date.now());
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(true);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const timerRef = useRef(null);

  const currentQ = questions[currentIdx];
  const difficulty = DIFFICULTY_MAP[currentQ?.type] || 'Medium';
  const pointsForQ = DIFFICULTY_POINTS[difficulty];
  const maxScore = questions.reduce((sum, q) => sum + (DIFFICULTY_POINTS[DIFFICULTY_MAP[q.type] || 'Medium']), 0);
  const streak = getStreak();

  // Start timer for current question
  useEffect(() => {
    if (showNameInput || challengeComplete || isPaused) return;
    const qTime = DIFFICULTY_TIME[difficulty];
    setTimeLeft(qTime);
    setTotalTime(qTime);
    setQuestionAnswered(false);
  }, [currentIdx, showNameInput, challengeComplete, difficulty]);// eslint-disable-line

  // Countdown
  useEffect(() => {
    if (showNameInput || challengeComplete || isPaused || questionAnswered) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [showNameInput, challengeComplete, isPaused, questionAnswered, currentIdx]);// eslint-disable-line

  const handleTimeUp = () => {
    setQuestionAnswered(true);
    setAnswers(prev => [...prev, { qIdx: currentIdx, correct: false, timedOut: true, points: 0 }]);
  };

  const handleAnswer = (isCorrect) => {
    if (questionAnswered) return;
    clearInterval(timerRef.current);
    setQuestionAnswered(true);
    const timeBonus = Math.floor((timeLeft / totalTime) * 5); // up to 5 bonus points for speed
    const points = isCorrect ? pointsForQ + timeBonus : 0;
    setScore(prev => prev + points);
    setAnswers(prev => [...prev, { qIdx: currentIdx, correct: isCorrect, timedOut: false, points }]);
  };

  const nextQuestion = () => {
    if (currentIdx >= questions.length - 1) {
      finishChallenge();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const finishChallenge = () => {
    setChallengeComplete(true);
    clearInterval(timerRef.current);
    const finalScore = score;
    // Update streak & stats
    updateStreak();
    const totalSolved = getTotalSolved() + questions.length;
    localStorage.setItem(LS_TOTAL_SOLVED, totalSolved.toString());
    // Save to leaderboard
    if (playerName.trim()) {
      const board = getLeaderboard();
      board.push({ name: playerName.trim(), topic: topic || 'Mixed', score: finalScore, date: new Date().toISOString() });
      saveLeaderboard(board);
    }
  };

  const getTimeUsed = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}m ${secs}s`;
  };

  // Name input screen
  if (showNameInput) {
    return (
      <div className="qt-challenge-start">
        <div className="qt-challenge-start-card">
          <div className="qt-challenge-start-icon">🎮</div>
          <h2>Challenge Mode</h2>
          <p>{questions.length} questions • {topic || 'Mixed Topics'}</p>
          <div className="qt-challenge-features">
            <span>⏱️ Timed</span>
            <span>🏆 Leaderboard</span>
            <span>🔥 Streak: {streak}</span>
            <span>🏅 Certificate</span>
          </div>
          <input
            className="qt-challenge-name-input"
            placeholder="Enter your name (for leaderboard)"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && playerName.trim() && setShowNameInput(false)}
            autoFocus
          />
          <div className="qt-challenge-start-actions">
            <button className="qt-btn qt-btn-primary" onClick={() => setShowNameInput(false)} disabled={!playerName.trim()}>
              🚀 Start Challenge
            </button>
            <button className="qt-btn qt-btn-outline" onClick={onExit}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  // Challenge complete screen
  if (challengeComplete) {
    const pct = Math.round((score / maxScore) * 100);
    const correctCount = answers.filter(a => a.correct).length;
    return (
      <div className="qt-challenge-complete">
        <div className="qt-challenge-complete-card">
          <div className="qt-challenge-complete-icon">{pct >= 70 ? '🎉' : pct >= 50 ? '👏' : '💪'}</div>
          <h2>Challenge Complete!</h2>
          <div className="qt-challenge-final-score">{score}<span>/{maxScore}</span></div>
          <div className="qt-challenge-final-stats">
            <div><strong>{correctCount}</strong>/{questions.length} correct</div>
            <div><strong>{pct}%</strong> accuracy</div>
            <div><strong>{getTimeUsed()}</strong> time</div>
          </div>
          <div className="qt-challenge-final-breakdown">
            {answers.map((a, i) => (
              <div key={i} className={`qt-challenge-answer-dot ${a.correct ? 'correct' : a.timedOut ? 'timeout' : 'wrong'}`} title={`Q${i + 1}: ${a.correct ? '✓' : a.timedOut ? '⏰ Time up' : '✗'} (${a.points}pts)`} />
            ))}
          </div>
          <div className="qt-challenge-complete-actions">
            <button className="qt-btn qt-btn-primary" onClick={() => setShowCert(true)}>🏅 View Certificate</button>
            <button className="qt-btn qt-btn-success" onClick={onExit}>🔄 New Challenge</button>
            <button className="qt-btn qt-btn-outline" onClick={onExit}>← Back to Library</button>
          </div>
        </div>
        <CertificateModal show={showCert} onClose={() => setShowCert(false)} data={{ name: playerName, topic: topic || 'Mixed', score, maxScore, date: new Date().toISOString(), questionsCount: questions.length, timeUsed: getTimeUsed() }} />
      </div>
    );
  }

  // Active question
  return (
    <div className="qt-challenge-active">
      <div className="qt-challenge-hud">
        <ChallengeTimer timeLeft={timeLeft} totalTime={totalTime} isPaused={isPaused} />
        <ChallengeProgress current={currentIdx} total={questions.length} score={score} maxScore={maxScore} streak={streak} />
        <div className="qt-challenge-hud-right">
          <DifficultyBadge difficulty={difficulty} />
          <span className="qt-challenge-points">+{pointsForQ}pts</span>
          <button className="qt-btn qt-btn-outline qt-btn-sm" onClick={() => setIsPaused(p => !p)}>{isPaused ? '▶️' : '⏸'}</button>
        </div>
      </div>

      {isPaused ? (
        <div className="qt-challenge-paused">
          <div className="qt-challenge-paused-icon">⏸</div>
          <h3>Challenge Paused</h3>
          <button className="qt-btn qt-btn-primary" onClick={() => setIsPaused(false)}>▶️ Resume</button>
        </div>
      ) : (
        <div className="qt-challenge-question">
          <ChallengeQuestion q={currentQ} index={currentIdx + 1} onAnswer={handleAnswer} answered={questionAnswered} />
          {questionAnswered && (
            <div className="qt-challenge-next">
              <button className="qt-btn qt-btn-primary" onClick={nextQuestion}>
                {currentIdx >= questions.length - 1 ? '🏅 Finish Challenge' : '→ Next Question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CHALLENGE QUESTION (renders a single question with answer callback) ─────
function ChallengeQuestion({ q, index, onAnswer, answered }) {
  const [selected, setSelected] = useState(null);
  const [selectedSet, setSelectedSet] = useState(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [items, setItems] = useState(q.items ? [...q.items].sort(() => Math.random() - 0.5) : q.blocks ? [...q.blocks].sort(() => Math.random() - 0.5) : []);
  const [dragIdx, setDragIdx] = useState(null);
  const [fillAnswers, setFillAnswers] = useState({});
  const [hintIdx, setHintIdx] = useState(-1);
  const [matchLeft, setMatchLeft] = useState(null);
  const [matchMap, setMatchMap] = useState({});

  useEffect(() => {
    setSelected(null); setSelectedSet(new Set()); setSubmitted(false);
    setTextAnswer(''); setDragIdx(null); setFillAnswers({});
    setHintIdx(-1); setMatchLeft(null); setMatchMap({});
    if (q.items) setItems([...q.items].sort(() => Math.random() - 0.5));
    else if (q.blocks) setItems([...q.blocks].sort(() => Math.random() - 0.5));
  }, [q]);

  const doSubmit = (isCorrect) => {
    setSubmitted(true);
    onAnswer(isCorrect);
  };

  // Render based on type
  switch (q.type) {
    case 'SINGLE_MCQ': {
      const handleSubmit = () => { doSubmit(selected === q.correct); };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          {q.code && <div className="qt-demo-code">{q.code}</div>}
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
                <span className="qt-option-letter">{o.letter}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={handleSubmit}>Submit</button></div>}
          {submitted && <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `✓ Correct! ${q.explanation || ''}` : `✗ Wrong. ${q.explanation || ''}`}</div>}
        </div>
      );
    }
    case 'MULTI_MCQ': {
      const handleSubmit = () => {
        const correctSet = new Set(q.correctSet);
        const isCorrect = selectedSet.size === correctSet.size && [...selectedSet].every(x => correctSet.has(x));
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.letter} className={`qt-option ${selectedSet.has(o.letter) ? 'selected' : ''} ${submitted && q.correctSet.includes(o.letter) ? 'correct' : ''} ${submitted && selectedSet.has(o.letter) && !q.correctSet.includes(o.letter) ? 'wrong' : ''}`} onClick={() => { if (submitted) return; const ns = new Set(selectedSet); ns.has(o.letter) ? ns.delete(o.letter) : ns.add(o.letter); setSelectedSet(ns); }}>
                <span className="qt-option-letter">{o.letter}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={selectedSet.size === 0} onClick={handleSubmit}>Submit</button></div>}
          {submitted && <div className={`qt-result ${[...selectedSet].every(x => q.correctSet.includes(x)) && selectedSet.size === q.correctSet.length ? 'success' : 'error'}`}>{q.explanation || ''}</div>}
        </div>
      );
    }
    case 'DRAG_ORDER': {
      const handleDrop = (toIdx) => { const newItems = [...items]; const [moved] = newItems.splice(dragIdx, 1); newItems.splice(toIdx, 0, moved); setItems(newItems); setDragIdx(null); };
      const handleSubmit = () => {
        const isCorrect = items.every((item, idx) => item === q.items[q.correctOrder[idx]]);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-sortable-list">
            {items.map((item, idx) => (
              <div key={item} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item === q.items[q.correctOrder[idx]] ? 'correct-pos' : ''} ${submitted && item !== q.items[q.correctOrder[idx]] ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(idx)}>
                <span className="qt-pos">{idx + 1}</span><span>{item}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={handleSubmit}>Check Order</button></div>}
          {submitted && <div className={`qt-result ${items.every((item, idx) => item === q.items[q.correctOrder[idx]]) ? 'success' : 'error'}`}>{items.every((item, idx) => item === q.items[q.correctOrder[idx]]) ? '✓ Perfect order!' : '✗ Not quite right.'}</div>}
        </div>
      );
    }
    case 'FILL_BLANK': {
      const blanks = q.codeParts ? q.codeParts.filter(p => p.blank) : [];
      const handleSubmit = () => {
        const isCorrect = blanks.every((b, i) => (fillAnswers[i] || '').toLowerCase().trim() === b.answer.toLowerCase());
        doSubmit(isCorrect);
      };
      let blankCount = 0;
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-fill-code">
            {q.codeParts && q.codeParts.map((part, i) => {
              if (part.blank) {
                const bIdx = blankCount++;
                return <input key={i} className={`qt-fill-input ${submitted ? ((fillAnswers[bIdx] || '').toLowerCase().trim() === part.answer.toLowerCase() ? 'correct' : 'wrong') : ''}`} value={fillAnswers[bIdx] || ''} onChange={e => setFillAnswers(prev => ({ ...prev, [bIdx]: e.target.value }))} disabled={submitted} placeholder="?" />;
              }
              return <span key={i}>{part}</span>;
            })}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={handleSubmit}>Check</button></div>}
          {submitted && <div className={`qt-result ${blanks.every((b, i) => (fillAnswers[i] || '').toLowerCase().trim() === b.answer.toLowerCase()) ? 'success' : 'error'}`}>{blanks.every((b, i) => (fillAnswers[i] || '').toLowerCase().trim() === b.answer.toLowerCase()) ? '✓ All correct!' : `✗ Answers: ${blanks.map(b => b.answer).join(', ')}`}</div>}
        </div>
      );
    }
    case 'PREDICT_OUTPUT': {
      const handleSubmit = () => {
        const isCorrect = textAnswer.trim().replace(/\s+/g, ' ') === (q.expectedOutput || '').trim().replace(/\s+/g, ' ');
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          {q.code && <div className="qt-demo-code">{q.code}</div>}
          <textarea className="qt-output-input" value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="Type the expected output..." disabled={submitted} />
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={handleSubmit} disabled={!textAnswer.trim()}>Check</button></div>}
          {submitted && <div className={`qt-result ${textAnswer.trim().replace(/\s+/g, ' ') === (q.expectedOutput || '').trim().replace(/\s+/g, ' ') ? 'success' : 'error'}`}>{q.explanation || ''} Expected: {q.expectedOutput}</div>}
        </div>
      );
    }
    case 'DEBUG_CODE': {
      const handleSubmit = () => { doSubmit(selected === q.correct); };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          {q.code && <div className="qt-demo-code">{q.code}</div>}
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.id} className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === q.correct ? 'correct' : ''} ${submitted && selected === o.id && o.id !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.id)}>
                <span className="qt-option-letter">{o.id}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={handleSubmit}>Submit</button></div>}
          {submitted && <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{q.explanation || ''}</div>}
        </div>
      );
    }
    case 'RIDDLE': {
      const handleSubmit = () => { doSubmit(selected === q.correct); };
      return (
        <div className="qt-cq qt-riddle">
          <div className="qt-riddle-header">🧩 Riddle Q{index}</div>
          <div className="qt-riddle-text">{q.riddle}</div>
          {q.hints && hintIdx < q.hints.length - 1 && !submitted && (
            <button className="qt-btn qt-btn-outline qt-btn-sm" onClick={() => setHintIdx(h => h + 1)} style={{ marginBottom: '0.75rem' }}>💡 Hint ({hintIdx + 2}/{q.hints.length})</button>
          )}
          <div className="qt-riddle-hints">
            {q.hints && q.hints.slice(0, hintIdx + 1).map((h, i) => <div key={i} className="qt-riddle-hint">💡 {h}</div>)}
          </div>
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
                <span className="qt-option-letter">{o.letter}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={handleSubmit}>Solve</button></div>}
          {submitted && <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{selected === q.correct ? `🎉 Solved! ${q.explanation || ''}` : `✗ ${q.explanation || ''}`}</div>}
        </div>
      );
    }
    case 'MATCH_PAIRS': {
      const handleLeftClick = (l) => { if (!submitted) setMatchLeft(l); };
      const handleRightClick = (r) => { if (submitted || !matchLeft) return; setMatchMap(prev => ({ ...prev, [matchLeft]: r })); setMatchLeft(null); };
      const handleSubmit = () => {
        const isCorrect = q.pairs.every(p => matchMap[p.left] === p.right);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-match-container">
            <div className="qt-match-col">
              {q.pairs.map(p => (
                <div key={p.left} className={`qt-match-item ${matchLeft === p.left ? 'active' : ''} ${matchMap[p.left] ? 'matched' : ''}`} onClick={() => handleLeftClick(p.left)}>
                  {p.left} {matchMap[p.left] && <span style={{ float: 'right', opacity: 0.6, fontSize: '0.7rem' }}>→ {matchMap[p.left]}</span>}
                </div>
              ))}
            </div>
            <div className="qt-match-col">
              {(q.shuffledRight || q.pairs.map(p => p.right)).map(r => (
                <div key={r} className={`qt-match-item ${Object.values(matchMap).includes(r) ? 'matched' : ''}`} onClick={() => handleRightClick(r)}>
                  {r}
                </div>
              ))}
            </div>
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={Object.keys(matchMap).length < q.pairs.length} onClick={handleSubmit}>Check Matches</button>{Object.keys(matchMap).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatchMap({}); setMatchLeft(null); }}>Reset</button>}</div>}
          {submitted && <div className={`qt-result ${q.pairs.every(p => matchMap[p.left] === p.right) ? 'success' : 'error'}`}>{q.pairs.every(p => matchMap[p.left] === p.right) ? '✓ All matched correctly!' : `✗ Some matches are wrong.`}</div>}
        </div>
      );
    }
    case 'CODE_OUTPUT': {
      const handleLeftClick = (id) => { if (!submitted) setMatchLeft(id); };
      const handleRightClick = (id) => { if (submitted || !matchLeft) return; setMatchMap(prev => ({ ...prev, [matchLeft]: id })); setMatchLeft(null); };
      const handleSubmit = () => {
        const isCorrect = Object.keys(q.correctMap).every(k => matchMap[k] === q.correctMap[k]);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-match-container">
            <div className="qt-match-col">
              {q.snippets.map(s => (
                <div key={s.id} className={`qt-match-item ${matchLeft === s.id ? 'active' : ''} ${matchMap[s.id] ? 'matched' : ''}`} onClick={() => handleLeftClick(s.id)} style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                  <strong>{s.id}:</strong> {s.code}
                </div>
              ))}
            </div>
            <div className="qt-match-col">
              {q.outputs.map(o => (
                <div key={o.id} className={`qt-match-item ${Object.values(matchMap).includes(o.id) ? 'matched' : ''}`} onClick={() => handleRightClick(o.id)}>
                  {o.text}
                </div>
              ))}
            </div>
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={Object.keys(matchMap).length < q.snippets.length} onClick={handleSubmit}>Check</button>{Object.keys(matchMap).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatchMap({}); setMatchLeft(null); }}>Reset</button>}</div>}
          {submitted && <div className={`qt-result ${Object.keys(q.correctMap).every(k => matchMap[k] === q.correctMap[k]) ? 'success' : 'error'}`}>{Object.keys(q.correctMap).every(k => matchMap[k] === q.correctMap[k]) ? '✓ All correct!' : '✗ Some matches are wrong.'}</div>}
        </div>
      );
    }
    case 'CODE_REARRANGE': {
      const handleDrop = (toIdx) => { const newItems = [...items]; const [moved] = newItems.splice(dragIdx, 1); newItems.splice(toIdx, 0, moved); setItems(newItems); setDragIdx(null); };
      const handleSubmit = () => {
        const isCorrect = items.every((item, idx) => item.id === q.correctOrder[idx]);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-sortable-list">
            {items.map((item, idx) => (
              <div key={item.id} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && item.id === q.correctOrder[idx] ? 'correct-pos' : ''} ${submitted && item.id !== q.correctOrder[idx] ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(idx)} style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                <span className="qt-drag-handle">⠿</span><span>{item.code}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={handleSubmit}>Check Code</button></div>}
          {submitted && <div className={`qt-result ${items.every((item, idx) => item.id === q.correctOrder[idx]) ? 'success' : 'error'}`}>{items.every((item, idx) => item.id === q.correctOrder[idx]) ? '✓ Perfect arrangement!' : '✗ Not quite right.'}</div>}
        </div>
      );
    }
    case 'ARCH_LAYERS': {
      const handleSubmit = () => {
        const isCorrect = q.items.every(item => matchMap[item.text] === item.layer);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-arch-layers">
            <div className="qt-arch-items">
              {q.items.map(item => (
                <div key={item.text} className={`qt-match-item ${matchLeft === item.text ? 'active' : ''} ${matchMap[item.text] ? 'matched' : ''}`} onClick={() => !submitted && setMatchLeft(item.text)}>
                  {item.text} {matchMap[item.text] && <span style={{ float: 'right', opacity: 0.6, fontSize: '0.7rem' }}>→ {matchMap[item.text]}</span>}
                </div>
              ))}
            </div>
            <div className="qt-arch-targets">
              {q.layers.map(layer => (
                <div key={layer} className={`qt-match-item ${Object.values(matchMap).includes(layer) ? 'matched' : ''}`} onClick={() => { if (!submitted && matchLeft) { setMatchMap(prev => ({ ...prev, [matchLeft]: layer })); setMatchLeft(null); } }} style={{ background: '#f0f4ff', fontWeight: 'bold' }}>
                  🏗️ {layer}
                </div>
              ))}
            </div>
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={Object.keys(matchMap).length < q.items.length} onClick={handleSubmit}>Check Layers</button>{Object.keys(matchMap).length > 0 && <button className="qt-btn qt-btn-outline" onClick={() => { setMatchMap({}); setMatchLeft(null); }}>Reset</button>}</div>}
          {submitted && <div className={`qt-result ${q.items.every(item => matchMap[item.text] === item.layer) ? 'success' : 'error'}`}>{q.items.every(item => matchMap[item.text] === item.layer) ? '✓ All placed correctly!' : '✗ Some placements are wrong.'}</div>}
        </div>
      );
    }
    case 'CODE_REVIEW':
    case 'SECURE_CODE': {
      const handleSubmit = () => { doSubmit(selected === q.correct); };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          {q.code && <div className="qt-demo-code">{q.code}</div>}
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.id} className={`qt-option ${selected === o.id ? 'selected' : ''} ${submitted && o.id === q.correct ? 'correct' : ''} ${submitted && selected === o.id && o.id !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.id)}>
                <span className="qt-option-letter">{o.id}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={handleSubmit}>Submit</button></div>}
          {submitted && <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{q.explanation || ''}</div>}
        </div>
      );
    }
    case 'PIPELINE_BUILD': {
      const handleToggle = (id) => {
        if (submitted) return;
        setSelectedSet(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
      };
      const handleSubmit = () => {
        const isCorrect = selectedSet.size === q.correctIds.length && q.correctIds.every(id => selectedSet.has(id));
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-pipeline-items">
            {q.clauses.map(c => (
              <div key={c.id} className={`qt-match-item ${selectedSet.has(c.id) ? 'active' : ''} ${submitted && q.correctIds.includes(c.id) ? 'correct-pos' : ''} ${submitted && selectedSet.has(c.id) && !q.correctIds.includes(c.id) ? 'wrong-pos' : ''}`} onClick={() => handleToggle(c.id)} style={{ cursor: 'pointer' }}>
                <span style={{ marginRight: '0.5rem' }}>{selectedSet.has(c.id) ? '✓' : '○'}</span>{c.text}
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={selectedSet.size === 0} onClick={handleSubmit}>Build Pipeline</button>{selectedSet.size > 0 && <button className="qt-btn qt-btn-outline" onClick={() => setSelectedSet(new Set())}>Reset</button>}</div>}
          {submitted && <div className={`qt-result ${selectedSet.size === q.correctIds.length && q.correctIds.every(id => selectedSet.has(id)) ? 'success' : 'error'}`}>{selectedSet.size === q.correctIds.length && q.correctIds.every(id => selectedSet.has(id)) ? '✓ Pipeline built correctly!' : '✗ Wrong selection. Correct: ' + q.correctIds.map(id => q.clauses.find(c => c.id === id)?.text).join(' → ')}</div>}
        </div>
      );
    }
    case 'FLOWCHART': {
      const handleSubmit = () => { doSubmit(selected === q.correct); };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-options">
            {q.options.map(o => (
              <div key={o.letter} className={`qt-option ${selected === o.letter ? 'selected' : ''} ${submitted && o.letter === q.correct ? 'correct' : ''} ${submitted && selected === o.letter && o.letter !== q.correct ? 'wrong' : ''}`} onClick={() => !submitted && setSelected(o.letter)}>
                <span className="qt-option-letter">{o.letter}</span><span>{o.text}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" disabled={!selected} onClick={handleSubmit}>Submit</button></div>}
          {submitted && <div className={`qt-result ${selected === q.correct ? 'success' : 'error'}`}>{q.explanation || ''}</div>}
        </div>
      );
    }
    case 'DEVOPS_PIPE': {
      const handleDrop = (toIdx) => { const newItems = [...items]; const [moved] = newItems.splice(dragIdx, 1); newItems.splice(toIdx, 0, moved); setItems(newItems); setDragIdx(null); };
      const handleSubmit = () => {
        const isCorrect = items.every((item, idx) => q.items[q.correctOrder[idx]] === item);
        doSubmit(isCorrect);
      };
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question}</div>
          <div className="qt-sortable-list">
            {items.map((item, idx) => (
              <div key={idx} className={`qt-sortable-item ${dragIdx === idx ? 'dragging' : ''} ${submitted && q.items[q.correctOrder[idx]] === item ? 'correct-pos' : ''} ${submitted && q.items[q.correctOrder[idx]] !== item ? 'wrong-pos' : ''}`} draggable={!submitted} onDragStart={() => setDragIdx(idx)} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(idx)}>
                <span className="qt-drag-handle">⠿</span><span>{item}</span>
              </div>
            ))}
          </div>
          {!submitted && <div className="qt-actions"><button className="qt-btn qt-btn-primary" onClick={handleSubmit}>Check Order</button></div>}
          {submitted && <div className={`qt-result ${items.every((item, idx) => q.items[q.correctOrder[idx]] === item) ? 'success' : 'error'}`}>{items.every((item, idx) => q.items[q.correctOrder[idx]] === item) ? '✓ Correct pipeline order!' : '✗ Wrong order.'}</div>}
        </div>
      );
    }
    default: {
      // For unsupported types in challenge mode, treat as bonus
      return (
        <div className="qt-cq">
          <div className="qt-demo-question"><strong>Q{index}.</strong> {q.question || 'Bonus Question'}</div>
          {q.code && <div className="qt-demo-code">{q.code}</div>}
          {!submitted && (
            <div className="qt-actions">
              <button className="qt-btn qt-btn-success" onClick={() => doSubmit(true)}>✓ I got it right</button>
              <button className="qt-btn qt-btn-outline" onClick={() => doSubmit(false)}>✗ I didn't know</button>
            </div>
          )}
        </div>
      );
    }
  }
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function QuestionTypes() {
  const navigate = useNavigate();
  const [activeDemo, setActiveDemo] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genMeta, setGenMeta] = useState(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [challengeQuestions, setChallengeQuestions] = useState(null);
  const [challengeTopic, setChallengeTopic] = useState('');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [selectedChallengeTopic, setSelectedChallengeTopic] = useState(null);

  const closeModal = useCallback(() => setActiveDemo(null), []);

  const ActiveComponent = activeDemo ? DEMO_MAP[activeDemo.id] : null;

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedQuestions(null);
    setGenMeta({ topic: prompt.trim(), wantsMix: true, preferredType: null });

    const parsed = parsePrompt(prompt);

    try {
      // Call real AI backend with a short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await API.post('/ai/generate-interactive', { prompt: prompt.trim() }, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.data && res.data.questions && res.data.questions.length > 0) {
        // Validate AI returned the correct type if user specified one
        const aiQuestions = res.data.questions;
        if (parsed.preferredType) {
          const matchingType = aiQuestions.filter(q => q.type === parsed.preferredType);
          if (matchingType.length > 0) {
            setGenMeta({ ...parsed, source: 'AI' });
            setGeneratedQuestions(matchingType.slice(0, parsed.count));
            setGenerating(false);
            return;
          }
          // AI didn't return correct type — fall through to local bank
          console.warn('AI returned wrong types, falling back to local bank');
        } else {
          setGenMeta({ topic: prompt.trim(), wantsMix: true, preferredType: null, source: 'AI' });
          setGeneratedQuestions(aiQuestions);
          setGenerating(false);
          return;
        }
      }
    } catch (err) {
      // AI unavailable — fall back to local bank
      console.warn('AI generation unavailable, using local bank:', err.message);
    }

    // Fallback: use local question bank
    const questions = generateQuestions(parsed);
    setGenMeta({ ...parsed, source: 'local' });
    setGeneratedQuestions(questions);
    setGenerating(false);
  };

  const clearGenerated = () => { setGeneratedQuestions(null); setGenMeta(null); setPrompt(''); };

  const startChallenge = (questions, topic) => {
    setChallengeQuestions(questions);
    setChallengeTopic(topic);
    setChallengeMode(true);
  };

  const exitChallenge = () => {
    setChallengeMode(false);
    setChallengeQuestions(null);
    setChallengeTopic('');
  };

  // Quick-start challenge from a topic (with optional type filter)
  const startQuickChallenge = (topicName, questionType) => {
    const bank = QUESTION_BANK[topicName] || QUESTION_BANK['java'];
    let filtered = bank;
    if (questionType && questionType !== 'ALL') {
      filtered = bank.filter(q => q.type === questionType);
    }
    if (filtered.length === 0) filtered = bank; // fallback if no match
    const shuffled = [...filtered].sort(() => Math.random() - 0.5).slice(0, Math.min(5, filtered.length));
    startChallenge(shuffled, topicName);
    setSelectedChallengeTopic(null);
  };

  // Get unique question types available for a topic
  const getTypesForTopic = (topicName) => {
    const bank = QUESTION_BANK[topicName] || [];
    const types = [...new Set(bank.map(q => q.type))];
    return types;
  };

  const TYPE_LABELS = {
    'SINGLE_MCQ': { icon: '🔘', label: 'Single Choice MCQ' },
    'MULTI_MCQ': { icon: '☑️', label: 'Multiple Choice' },
    'DRAG_ORDER': { icon: '↕️', label: 'Drag & Drop Order' },
    'FILL_BLANK': { icon: '✏️', label: 'Fill in the Blank' },
    'PREDICT_OUTPUT': { icon: '🖥️', label: 'Predict Output' },
    'DEBUG_CODE': { icon: '🐛', label: 'Debug the Code' },
    'RIDDLE': { icon: '🧩', label: 'Riddle' },
    'MATCH_PAIRS': { icon: '🔗', label: 'Match Concept' },
    'CODE_OUTPUT': { icon: '➡️', label: 'Code to Output' },
    'CODE_REARRANGE': { icon: '🧱', label: 'Code Rearrange' },
    'SQL_BUILDER': { icon: '🗃️', label: 'SQL Builder' },
    'ARCH_LAYERS': { icon: '🏗️', label: 'Architecture Layers' },
    'CODE_REVIEW': { icon: '👁️', label: 'Code Review' },
    'PIPELINE_BUILD': { icon: '🔧', label: 'Stream Pipeline' },
    'FLOWCHART': { icon: '📊', label: 'Flowchart' },
    'DEVOPS_PIPE': { icon: '🚀', label: 'DevOps Pipeline' },
    'SECURE_CODE': { icon: '🛡️', label: 'Secure Coding' },
  };

  // Challenge mode view
  if (challengeMode && challengeQuestions) {
    return (
      <>
        <Navbar />
        <div className="qt-page">
          <ChallengeMode questions={challengeQuestions} topic={challengeTopic} onExit={exitChallenge} />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="qt-page">
        <div className="qt-page-header">
          <div>
            <h1>Interactive Question Types</h1>
            <p className="qt-subtitle">18 interactive assessment formats • Challenge Mode with timers & leaderboard</p>
          </div>
          <div className="qt-header-actions">
            <button className="qt-btn qt-btn-outline" onClick={() => setShowLeaderboard(true)}>🏆 Leaderboard</button>
            <span className="qt-streak-badge">🔥 {getStreak()} day streak</span>
          </div>
        </div>

        {/* ─── PROMPT BAR ─── */}
        <div className="qt-prompt-bar">
          <div className="qt-prompt-icon">✨</div>
          <input
            className="qt-prompt-input"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            placeholder='Try: "5 Spring Boot interactive questions" or "3 SQL drag-and-drop quizzes"'
            disabled={generating}
          />
          <button className="qt-btn qt-btn-primary qt-prompt-btn" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
            {generating ? '⏳ Building...' : '🚀 Generate'}
          </button>
        </div>

        {/* ─── QUICK CHALLENGE: 2-STEP SELECTION ─── */}
        {!generatedQuestions && !generating && (
          <div className="qt-quick-challenges">
            <h3 className="qt-section-title">⚡ Quick Challenge</h3>

            {/* Step 1: Pick a Topic */}
            {!selectedChallengeTopic && (
              <>
                <p className="qt-step-label">Step 1: Choose a topic</p>
                <div className="qt-topic-pills">
                  {Object.keys(QUESTION_BANK).map(topic => (
                    <button key={topic} className="qt-topic-pill" onClick={() => setSelectedChallengeTopic(topic)}>
                      🎮 {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 2: Pick a Question Type */}
            {selectedChallengeTopic && (
              <>
                <p className="qt-step-label">
                  Topic: <strong>{selectedChallengeTopic.charAt(0).toUpperCase() + selectedChallengeTopic.slice(1)}</strong>
                  <button className="qt-btn qt-btn-outline qt-btn-sm" onClick={() => setSelectedChallengeTopic(null)} style={{ marginLeft: '0.75rem' }}>← Change Topic</button>
                </p>
                <p className="qt-step-label">Step 2: Choose a challenge type</p>
                <div className="qt-type-grid">
                  <button className="qt-type-card" onClick={() => startQuickChallenge(selectedChallengeTopic, 'ALL')}>
                    <span className="qt-type-card-icon">🎲</span>
                    <span className="qt-type-card-label">Mix (All Types)</span>
                    <span className="qt-type-card-count">{(QUESTION_BANK[selectedChallengeTopic] || []).length} questions</span>
                  </button>
                  {getTypesForTopic(selectedChallengeTopic).map(type => {
                    const info = TYPE_LABELS[type] || { icon: '❓', label: type };
                    const count = (QUESTION_BANK[selectedChallengeTopic] || []).filter(q => q.type === type).length;
                    return (
                      <button key={type} className="qt-type-card" onClick={() => startQuickChallenge(selectedChallengeTopic, type)}>
                        <span className="qt-type-card-icon">{info.icon}</span>
                        <span className="qt-type-card-label">{info.label}</span>
                        <span className="qt-type-card-count">{count} questions</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── GENERATED QUESTIONS ─── */}
        {generating && (
          <div className="qt-generating">
            <div className="qt-gen-spinner" />
            <span>Building interactive questions...</span>
          </div>
        )}

        {generatedQuestions && (
          <div className="qt-generated-section">
            <div className="qt-gen-header">
              <h2>🎯 Generated: {generatedQuestions.length} questions</h2>
              <div className="qt-gen-meta">
                {genMeta.source === 'AI' && <span className="qt-tag qt-tag-ai">🤖 AI Generated</span>}
                {genMeta.source === 'local' && <span className="qt-tag">📦 Local Bank</span>}
                {genMeta.wantsMix && <span className="qt-tag">Mixed Types</span>}
                {genMeta.detectedTypes && genMeta.detectedTypes.length > 1
                  ? genMeta.detectedTypes.map(t => <span key={t} className="qt-tag">{t.replace('_', ' ')}</span>)
                  : genMeta.preferredType && <span className="qt-tag">{genMeta.preferredType.replace('_', ' ')}</span>}
                <span className="qt-tag">{genMeta.displayTopic || genMeta.topic}</span>
              </div>
              <button className="qt-btn qt-btn-outline" onClick={clearGenerated}>✕ Clear</button>
            </div>

            {/* Challenge Mode CTA */}
            <div className="qt-challenge-cta">
              <button className="qt-btn qt-btn-success qt-btn-lg" onClick={() => startChallenge(generatedQuestions, genMeta.topic || 'Mixed')}>
                🎮 Start Challenge Mode — Timer, Scoring & Certificate
              </button>
            </div>

            <div className="qt-generated-list">
              {generatedQuestions.map((q, idx) => (
                <RenderGeneratedQuestion key={idx} q={q} index={idx + 1} />
              ))}
            </div>
            <div className="qt-gen-footer">
              <button className="qt-btn qt-btn-primary" onClick={handleGenerate}>🔄 Regenerate</button>
              <button className="qt-btn qt-btn-success" onClick={() => startChallenge(generatedQuestions, genMeta.topic || 'Mixed')}>🎮 Challenge Mode</button>
              <button className="qt-btn qt-btn-outline" onClick={clearGenerated}>Back to Library</button>
            </div>
          </div>
        )}

        {/* ─── CARD GRID (hidden when generated questions shown) ─── */}
        {!generatedQuestions && !generating && (
          <>
            <h3 className="qt-section-title" style={{ marginTop: '2rem' }}>📚 Question Type Library</h3>
            <div className="qt-grid">
              {QUESTION_TYPES.map(qt => (
                <div key={qt.id} className="qt-card">
                  <div className="qt-card-header" onClick={() => setActiveDemo(qt)} style={{ cursor: 'pointer' }}>
                    <span className="qt-card-icon">{qt.icon}</span>
                    <span className="qt-card-title">{qt.title}</span>
                    <span className="qt-card-badge">{qt.badge}</span>
                  </div>
                  <div className="qt-card-body">
                    <p className="qt-card-desc">{qt.desc}</p>
                    <div className="qt-card-tags">
                      {qt.tags.map(tag => <span key={tag} className="qt-tag">{tag}</span>)}
                    </div>
                    <button className="qt-btn qt-btn-primary" style={{ marginTop: '0.75rem', width: '100%' }}
                      onClick={(e) => { e.stopPropagation(); navigate(`/question-type-create/${qt.id}`); }}>
                      ✍️ Create Question
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Demo Modal */}
      {activeDemo && ActiveComponent && (
        <div className="qt-modal-overlay" onClick={closeModal}>
          <div className="qt-modal" onClick={e => e.stopPropagation()}>
            <div className="qt-modal-header">
              <span style={{ fontSize: '1.3rem' }}>{activeDemo.icon}</span>
              <h2>{activeDemo.title}</h2>
              <button className="qt-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="qt-modal-body">
              <ActiveComponent />
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Modal */}
      <LeaderboardPanel show={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
    </>
  );
}
