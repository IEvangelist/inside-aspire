import { icon } from './icons';

export function prepareWindows(root: HTMLElement, announce: (message: string) => void) {
  for (const panel of root.querySelectorAll<HTMLElement>('.code-panel, .cli-terminal')) {
    const caption = panel.querySelector('figcaption');
    if (!caption) throw new Error('Code window is missing its original caption.');
    const title = document.createElement('span');
    title.className = 'window-title';
    title.append(...caption.childNodes);
    caption.append(title);
    const controls = document.createElement('span');
    controls.className = 'window-actions';
    controls.dataset.uxDecoration = '';
    for (const pre of panel.querySelectorAll<HTMLPreElement>('pre')) {
      const code = pre.querySelector('code');
      if (!code) throw new Error('Code window is missing its original source.');
      const source = code.textContent ?? '';
      const label = pre.dataset.label ?? 'Source';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'copy-code';
      const name = panel.matches('.cli-terminal')
        ? pre.matches('.replay-output') ? 'Copy output' : 'Copy command' : 'Copy';
      button.innerHTML = icon('copy');
      const text = document.createElement('span');
      text.textContent = name;
      button.append(text);
      button.setAttribute('aria-label', `Copy ${label}`);
      if (pre.matches('.replay-output')) {
        button.dataset.copyOutput = '';
        button.disabled = true;
      }
      button.addEventListener('click', async () => {
        try {
          if (!navigator.clipboard) throw new Error('Clipboard access requires HTTPS or localhost.');
          await navigator.clipboard.writeText(source);
          announce(`${label} copied.`);
        } catch (error) {
          console.error('Code copy failed.', error);
          announce(`Could not copy ${label}. Allow clipboard access, or select and copy the code directly.`);
        }
      });
      controls.append(button);
    }
    caption.append(controls);
  }
  for (const mount of root.querySelectorAll<HTMLElement>('[data-diagram]')) {
    const title = mount.querySelector('svg title')?.textContent;
    if (!title) throw new Error('Diagram window is missing its accessible title.');
    const window = document.createElement('div');
    window.className = 'diagram-window';
    const chrome = document.createElement('div');
    chrome.className = 'window-chrome';
    chrome.dataset.uxDecoration = '';
    chrome.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'window-title';
    label.textContent = title;
    chrome.append(label);
    const body = document.createElement('div');
    body.className = 'diagram-body';
    body.append(...mount.childNodes);
    window.append(chrome, body);
    mount.append(window);
  }
}
