import React, { useEffect, useRef } from 'react';
import './QuestionStemRenderer.css';

/**
 * Renders a question stem with optional fenced code blocks.
 * Usage in question text:  ```java\nSystem.out.println("hi");\n```
 * Everything outside fences renders as normal paragraphs.
 * No external dependencies — fully XSS-safe (no dangerouslySetInnerHTML).
 * Syntax highlighting via highlight.js loaded from CDN in index.html.
 */
export default function QuestionStemRenderer({ text, className = '' }) {
  const rootRef = useRef(null);

  // Run highlight.js on every code block after render
  useEffect(() => {
    if (!rootRef.current || !window.hljs) return;
    rootRef.current.querySelectorAll('pre code').forEach(el => {
      window.hljs.highlightElement(el);
    });
  });

  if (!text) return null;

  // Split on fenced code blocks: ```lang\n...code...\n```
  const parts = [];
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fenceRegex.exec(text)) !== null) {
    // Text before this code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', lang: match[1] || 'code', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // If no fences found at all, just push the whole thing as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return (
    <div ref={rootRef} className={`qsr-root ${className}`}>
      {parts.map((part, i) => {
        if (part.type === 'code') {
          return (
            <div key={i} className="qsr-code-block">
              {part.lang && <span className="qsr-lang-badge">{part.lang}</span>}
              <pre><code>{part.content.trimEnd()}</code></pre>
            </div>
          );
        }
        // Plain text — preserve newlines as line breaks
        return (
          <span key={i} className="qsr-text">
            {part.content.split('\n').map((line, j, arr) => (
              <React.Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </React.Fragment>
            ))}
          </span>
        );
      })}
    </div>
  );
}
