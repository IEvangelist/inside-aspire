type DetailsMode = 'present' | 'read' | 'print' | 'receiver';

export function createDetailsController(root: HTMLElement, dialog: HTMLDialogElement) {
  const title = dialog.querySelector<HTMLElement>('#slide-details-title');
  const body = dialog.querySelector<HTMLElement>('.details-scroll');
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-close-details]');
  const status = dialog.querySelector<HTMLElement>('[role="status"]');
  if (!title || !body || !closeButton || !status) throw new Error('Slide details dialog is incomplete.');
  const records = [...root.querySelectorAll<HTMLDetailsElement>('.slides details')].map((details) => {
    const summary = details.querySelector<HTMLElement>(':scope > summary');
    if (!summary) throw new Error(`Slide #${details.closest('section')?.id}: disclosure needs a direct summary.`);
    const content = document.createElement('div');
    content.className = 'details-content';
    if (details.hasAttribute('data-illustrative-addition')) content.dataset.illustrativeAddition = '';
    while (summary.nextSibling) content.append(summary.nextSibling);
    details.append(content);
    return { details, summary, content, readingOpen: details.open || details.matches('.language-examples') };
  });
  let mode: DetailsMode | undefined;
  let active: typeof records[number] | undefined;
  let savedGutter: { value: string; priority: string } | undefined;

  function close(restoreFocus = true) {
    if (!active) return;
    const record = active;
    active = undefined;
    record.details.append(record.content);
    record.summary.setAttribute('aria-expanded', 'false');
    status!.textContent = '';
    if (dialog.open) dialog.close();
    if (savedGutter) {
      document.documentElement.style.setProperty('scrollbar-gutter', savedGutter.value, savedGutter.priority);
      savedGutter = undefined;
    }
    if (restoreFocus) record.summary.focus({ preventScroll: true });
    else root.focus({ preventScroll: true });
  }

  for (const record of records) {
    record.summary.addEventListener('click', (event) => {
      if (mode === 'read' || mode === 'print') return;
      event.preventDefault();
      if (mode === 'receiver') return;
      close(false);
      active = record;
      title.textContent = record.summary.textContent?.trim() || 'Slide details';
      body.replaceChildren(record.content);
      body.scrollTop = 0;
      record.summary.setAttribute('aria-expanded', 'true');
      const page = document.documentElement;
      if (window.innerWidth > page.clientWidth && getComputedStyle(page).scrollbarGutter === 'auto') {
        savedGutter = { value: page.style.getPropertyValue('scrollbar-gutter'), priority: page.style.getPropertyPriority('scrollbar-gutter') };
        page.style.setProperty('scrollbar-gutter', 'stable');
      }
      dialog.showModal();
      closeButton.focus({ preventScroll: true });
    });
  }
  closeButton.addEventListener('click', () => close());
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
    const controls = [...dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]',
    )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0 && !element.closest('[inert]'));
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last && first) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) close();
  });
  window.addEventListener('pagehide', () => close(false));

  function sync(next: DetailsMode) {
    if (mode === next) return;
    close(false);
    for (const record of records) {
      if (mode === 'read') record.readingOpen = record.details.open;
      record.details.open = next === 'print' || (next === 'read' && record.readingOpen);
      if (next === 'present' || next === 'receiver') {
        record.summary.setAttribute('aria-haspopup', 'dialog');
        record.summary.setAttribute('aria-controls', dialog.id);
        record.summary.setAttribute('aria-expanded', 'false');
      } else {
        record.summary.removeAttribute('aria-haspopup');
        record.summary.removeAttribute('aria-controls');
        record.summary.removeAttribute('aria-expanded');
      }
    }
    mode = next;
  }
  return { close, sync };
}
