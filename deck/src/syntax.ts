import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import powershell from 'highlight.js/lib/languages/powershell';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';
import plaintext from 'highlight.js/lib/languages/plaintext';
import go from 'highlight.js/lib/languages/go';

const languages = { csharp, powershell, bash, yaml, json, typescript, plaintext, go };
for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition);
hljs.registerLanguage('terminal-output', () => ({
  contains: [
    { scope: 'comment', match: /^\d{2}:\d{2}:\d{2}/m },
    { scope: 'title', match: /Steps Summary:|Step timeline:/ },
    { scope: 'string', match: /✓|[╶╴─]+|\b(?:Pipeline succeeded|Completed successfully|\d+\/\d+ steps succeeded)\b/ },
    { scope: 'meta', match: /→|\[INF\]/ },
    { scope: 'number', match: /\b\d+(?:\.\d+)?(?:ms|s|m)\b/ },
    { scope: 'comment', match: /[│┬]/ },
  ],
}));

function lineMarkup(markup: string, terminal = false): DocumentFragment {
  const highlighted = document.createElement('div');
  highlighted.innerHTML = markup;
  const result = document.createDocumentFragment();
  let number = 0;
  let line: HTMLSpanElement;
  function nextLine() {
    if (number > 0) result.append('\n');
    line = document.createElement('span');
    line.className = 'code-line';
    line.dataset.line = String(++number);
    result.append(line);
  }
  nextLine();
  function visit(node: Node, parents: Element[]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split('\n');
      parts.forEach((part, index) => {
        if (index > 0) nextLine();
        if (!part) return;
        let container: Node = line;
        for (const parent of parents) {
          const clone = parent.cloneNode(false);
          container.appendChild(clone);
          container = clone;
        }
        for (const text of terminal ? part.split(/(✓)/u) : [part]) {
          if (terminal && text === '✓') {
            const cell = document.createElement('span');
            cell.className = 'terminal-cell';
            cell.textContent = text;
            container.appendChild(cell);
          } else container.appendChild(document.createTextNode(text));
        }
      });
    } else if (node instanceof Element) {
      for (const child of node.childNodes) visit(child, [...parents, node]);
    }
  }
  for (const child of highlighted.childNodes) visit(child, []);
  if (terminal) {
    for (const row of result.querySelectorAll<HTMLElement>('.code-line')) {
      if (/│|Step timeline:/.test(row.textContent ?? '')) row.classList.add('terminal-row');
    }
  }
  return result;
}

export function highlightCode() {
  for (const code of document.querySelectorAll<HTMLElement>('pre > code')) {
    const language = [...code.classList].find((name) => name.startsWith('language-'))?.slice(9);
    if (!language || !hljs.getLanguage(language)) throw new Error(`Unsupported code language: ${language}`);
    const pre = code.parentElement;
    const terminal = pre?.hasAttribute('data-terminal-output') ?? false;
    if (terminal && (language !== 'plaintext' || !pre?.classList.contains('replay-output'))) {
      throw new Error('Terminal output styling requires a plaintext replay output.');
    }
    const source = code.textContent ?? '';
    const result = hljs.highlight(source, { language: terminal ? 'terminal-output' : language, ignoreIllegals: false });
    if (result.illegal) throw new Error(`Code excerpt is invalid for its explicit language: ${language}`);
    code.replaceChildren(lineMarkup(result.value, terminal));
    code.classList.add('hljs');
    code.dataset.language = language;
    code.dataset.highlighted = 'true';
    if (pre) {
      pre.tabIndex = 0;
      pre.setAttribute('role', 'region');
      pre.setAttribute('aria-label', pre.classList.contains('replay-output')
        ? `${pre.dataset.label}. Scroll the complete output if needed.`
        : `${pre.dataset.label ?? language} code excerpt. Scroll horizontally if needed.`);
    }
  }
}

export function focusCode(section: HTMLElement, staticMode: boolean) {
  section.querySelectorAll('.code-line.is-focused').forEach((line) => line.classList.remove('is-focused'));
  if (staticMode) return;
  const steps = [...section.querySelectorAll<HTMLElement>('.code-step.visible')];
  const latest = steps.at(-1);
  if (!latest) return;
  const code = section.querySelector(`#${latest.dataset.code}`);
  if (!code) throw new Error(`Missing code target: ${latest.dataset.code}`);
  for (const range of (latest.dataset.lines ?? '').split(',')) {
    const [first, last = first] = range.split('-').map(Number);
    for (let number = first; number <= last; number++) {
      code.querySelector(`[data-line="${number}"]`)?.classList.add('is-focused');
    }
  }
}
