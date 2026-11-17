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
const codeWalkStages = [
  'CLI command',
  'Search service',
  'Search index',
  'Saved index',
  'HTTP + ETag',
  'Source cache',
  'Parse + reuse',
  'Rank',
  'CLI output',
] as const;

for (const [name, definition] of Object.entries(languages)) hljs.registerLanguage(name, definition);
hljs.registerLanguage('terminal-output', () => ({
  contains: [
    { scope: 'comment', match: /^\d{2}:\d{2}:\d{2}/m },
    { scope: 'title', match: /Steps Summary:|Step timeline:/ },
    { scope: 'string', match: /✓|[╶╴─]+|\b(?:Pipeline succeeded|Completed successfully|\d+\/\d+ steps succeeded|304 Not Modified)\b/ },
    { scope: 'meta', match: /→|\[INF\]|\[(?:dbug|info)\]/ },
    { scope: 'title', match: /\b(?:DocsFetcher|DocsCache|DocsIndexService):/ },
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
    if (terminal && (language !== 'plaintext' || !(pre?.classList.contains('replay-output') || pre?.closest('.code-panel')))) {
      throw new Error('Terminal output styling requires a plaintext replay output or code panel.');
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

function prepareCodeWalk(walk: HTMLElement) {
  let guide = walk.querySelector<HTMLElement>('.code-walk-guide');
  if (guide) return guide;

  guide = document.createElement('div');
  guide.className = 'code-walk-guide';

  const route = document.createElement('ol');
  route.className = 'code-walk-route';
  route.setAttribute('aria-label', 'Request path');
  for (const [index, label] of codeWalkStages.entries()) {
    const stage = document.createElement('li');
    stage.dataset.stage = String(index + 1);
    stage.textContent = label;
    route.append(stage);
  }

  const status = document.createElement('div');
  status.className = 'code-walk-status';
  const step = document.createElement('span');
  step.className = 'code-walk-current';
  const summary = document.createElement('p');
  summary.className = 'code-walk-summary';
  summary.setAttribute('aria-live', 'polite');
  status.append(step, summary);

  guide.append(route, status);
  walk.prepend(guide);
  return guide;
}

function animateCodeWalk(element: HTMLElement, frames: Keyframe[], delay = 0) {
  if (document.documentElement.dataset.motion === 'none' ||
      matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const animation of element.getAnimations()) {
    if (animation.id === 'code-walk') animation.cancel();
  }
  const animation = element.animate(frames, {
    id: 'code-walk',
    duration: 300,
    delay,
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
    fill: 'both',
  });
  animation.onfinish = () => animation.cancel();
}

export function focusCode(section: HTMLElement, staticMode: boolean, animateStep = false) {
  section.querySelectorAll('.code-line.is-focused').forEach((line) => line.classList.remove('is-focused'));
  const steps = [...section.querySelectorAll<HTMLElement>('.code-step.visible')];
  const latest = staticMode ? undefined : steps.at(-1);
  const first = section.querySelector<HTMLElement>('.code-step');
  let codeStepChanged = false;
  const currentStep = staticMode ? undefined : latest ?? first ?? undefined;
  const stageNumber = currentStep ? Number(currentStep.dataset.stage) : 0;
  if (currentStep && section.querySelector('.code-walk') &&
      (!Number.isInteger(stageNumber) || stageNumber < 1 || stageNumber > codeWalkStages.length ||
      !currentStep.dataset.summary)) {
    throw new Error(`Invalid code walkthrough step in "${section.id}".`);
  }
  const stepKey = latest ? `${latest.dataset.code}:${latest.dataset.lines}:${stageNumber}` : '';

  for (const walk of section.querySelectorAll<HTMLElement>('.code-walk')) {
    const guide = prepareCodeWalk(walk);
    const currentPanel = walk.querySelector<HTMLElement>(':scope > .code-panel.is-active');
    const panels = [...walk.querySelectorAll<HTMLElement>(':scope > .code-panel')];
    const active = latest
      ? panels.find((panel) => panel.querySelector('code')?.id === latest.dataset.code)
      : panels[0];
    if (!active) throw new Error(`Missing walkthrough panel: ${latest?.dataset.code}`);

    const changed = walk.dataset.activeStep !== stepKey;
    codeStepChanged = changed;
    if (stepKey) {
      walk.dataset.activeStep = stepKey;
    } else {
      delete walk.dataset.activeStep;
    }

    for (const panel of panels) panel.classList.toggle('is-active', panel === active);
    if (animateStep && changed && currentPanel !== active && active) {
      animateCodeWalk(active, [
        { opacity: 0.35, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ]);
    }

    const status = guide.querySelector<HTMLElement>('.code-walk-status')!;
    const current = guide.querySelector<HTMLElement>('.code-walk-current')!;
    const summary = guide.querySelector<HTMLElement>('.code-walk-summary')!;
    status.hidden = !currentStep;
    current.textContent = currentStep ? `${stageNumber} / ${codeWalkStages.length}  ${codeWalkStages[stageNumber - 1]}` : '';
    summary.textContent = currentStep?.dataset.summary ?? '';

    guide.querySelectorAll<HTMLElement>('.code-walk-route [data-stage]').forEach((item, index) => {
      const number = index + 1;
      item.classList.toggle('is-complete', currentStep !== undefined && number < stageNumber);
      item.classList.toggle('is-current', currentStep !== undefined && number === stageNumber);
      if (number === stageNumber && currentStep) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
  }
  if (!latest) return;
  const code = section.querySelector(`#${latest.dataset.code}`);
  if (!code) throw new Error(`Missing code target: ${latest.dataset.code}`);
  const focused: HTMLElement[] = [];
  for (const range of (latest.dataset.lines ?? '').split(',').filter((value) => value.trim())) {
    const [first, last = first] = range.split('-').map(Number);
    for (let number = first; number <= last; number++) {
      const line = code.querySelector<HTMLElement>(`[data-line="${number}"]`);
      if (!line) throw new Error(`Missing code line ${number} in "${code.id}".`);
      line.classList.add('is-focused');
      focused.push(line);
    }
  }
  const walk = code.closest<HTMLElement>('.code-walk');
  if (animateStep && codeStepChanged && walk?.dataset.activeStep === stepKey) {
    focused.forEach((line, index) => animateCodeWalk(line, [
      { backgroundColor: 'transparent', transform: 'translateX(-8px)' },
      { backgroundColor: 'var(--code-focus)', transform: 'translateX(0)' },
    ], Math.min(index, 5) * 18));
  }
}
