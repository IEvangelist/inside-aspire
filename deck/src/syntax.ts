import hljs from 'highlight.js/lib/core';
import csharp from 'highlight.js/lib/languages/csharp';
import powershell from 'highlight.js/lib/languages/powershell';
import bash from 'highlight.js/lib/languages/bash';
import yaml from 'highlight.js/lib/languages/yaml';
import json from 'highlight.js/lib/languages/json';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';

const languages = { csharp, powershell, bash, yaml, json, typescript, xml };
for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition);

function lineMarkup(markup: string): DocumentFragment {
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
        container.appendChild(document.createTextNode(part));
      });
    } else if (node instanceof Element) {
      for (const child of node.childNodes) visit(child, [...parents, node]);
    }
  }
  for (const child of highlighted.childNodes) visit(child, []);
  return result;
}

export function highlightCode() {
  for (const code of document.querySelectorAll<HTMLElement>('pre > code')) {
    const language = [...code.classList].find((name) => name.startsWith('language-'))?.slice(9);
    if (!language || !hljs.getLanguage(language)) throw new Error(`Unsupported code language: ${language}`);
    const source = code.textContent ?? '';
    const result = hljs.highlight(source, { language, ignoreIllegals: false });
    if (result.illegal) throw new Error(`Code excerpt is invalid for its explicit language: ${language}`);
    code.replaceChildren(lineMarkup(result.value));
    code.classList.add('hljs');
    code.dataset.language = language;
    code.dataset.highlighted = 'true';
    const pre = code.parentElement;
    if (pre) {
      pre.tabIndex = 0;
      pre.setAttribute('role', 'region');
      pre.setAttribute('aria-label', `${pre.dataset.label ?? language} code excerpt. Scroll horizontally if needed.`);
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
