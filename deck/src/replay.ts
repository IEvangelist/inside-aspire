type ReplayPanel = {
  section: HTMLElement;
  panel: HTMLElement;
  response: HTMLElement;
  step: HTMLElement;
  expanded: boolean;
  support: { element: HTMLElement; hidden: boolean; inert: boolean }[];
  focusReturn?: HTMLElement;
};

export function createReplayController(root: HTMLElement, announcement: HTMLElement) {
  for (const section of root.querySelectorAll<HTMLElement>('[data-terminal-focus]')) {
    const identity = `Terminal focus: slide #${section.id || '(missing id)'}`;
    if (section.dataset.terminalFocus !== 'true') {
      throw new Error(`${identity}: data-terminal-focus must be "true" or omitted.`);
    }
    if (section.tagName !== 'SECTION' || section.querySelector('section') ||
        section.querySelectorAll('[data-cli-replay]').length !== 1 ||
        !section.querySelector(':scope > [data-cli-replay]')) {
      throw new Error(`${identity}: use one direct recorded terminal on a leaf slide.`);
    }
  }
  const panels: ReplayPanel[] = [...root.querySelectorAll<HTMLElement>('[data-cli-replay]')].map((panel) => {
    const section = panel.closest<HTMLElement>('section');
    const response = panel.querySelector<HTMLElement>('.replay-response');
    const step = section?.querySelector<HTMLElement>('.replay-step');
    if (!section || !response || !step) throw new Error('Recorded CLI surface is incomplete.');
    const support = [...section.querySelectorAll<HTMLElement>(':scope > .terminal-support')]
      .map((element) => ({ element, hidden: element.hidden, inert: element.inert }));
    return { section, panel, response, step, support, expanded: false };
  });
  let pending: { panel: ReplayPanel; timer?: number; animation?: Animation } | undefined;
  let activePanel: ReplayPanel | undefined;
  let focusPresentation = false;

  function focus(record: ReplayPanel, expanded: boolean) {
    const focused = focusPresentation && record === activePanel &&
      record.section.dataset.terminalFocus === 'true' && expanded;
    const hideFocusedLink = focused && record.support.some(({ element }) => element.contains(document.activeElement));
    if (hideFocusedLink && document.activeElement instanceof HTMLElement) record.focusReturn = document.activeElement;
    record.section.classList.toggle('is-terminal-focused', focused);
    for (const { element, hidden, inert } of record.support) {
      element.hidden = focused || hidden;
      element.inert = focused || inert;
    }
    root.classList.toggle('has-terminal-focus', panels.some(({ section }) => section.classList.contains('is-terminal-focused')));
    if (hideFocusedLink) record.panel.querySelector<HTMLElement>('.replay-command')?.focus({ preventScroll: true });
    if (!focused && record.focusReturn) {
      if (record === activePanel && record.panel.contains(document.activeElement)) {
        record.focusReturn.focus({ preventScroll: true });
      }
      record.focusReturn = undefined;
    }
  }

  function cancel() {
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending.animation?.cancel();
    pending = undefined;
    announcement.textContent = '';
  }

  function settle(record: ReplayPanel, expanded: boolean) {
    record.expanded = expanded;
    record.response.hidden = !expanded;
    record.panel.dataset.replayPhase = expanded ? 'complete' : 'command';
    const copy = record.panel.querySelector<HTMLButtonElement>('[data-copy-output]');
    if (copy) copy.disabled = !expanded;
    focus(record, expanded);
  }

  function play(record: ReplayPanel) {
    record.expanded = true;
    record.response.hidden = true;
    record.panel.dataset.replayPhase = 'cue';
    const copy = record.panel.querySelector<HTMLButtonElement>('[data-copy-output]');
    if (copy) copy.disabled = true;
    announcement.textContent = 'Replaying the recorded response.';
    const task: { panel: ReplayPanel; timer?: number; animation?: Animation } = { panel: record };
    pending = task;
    task.timer = window.setTimeout(() => {
      if (pending !== task) return;
      const before = record.panel.getBoundingClientRect();
      record.response.hidden = false;
      record.panel.dataset.replayPhase = 'expanding';
      focus(record, true);
      const timing = { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' };
      if (record.section.classList.contains('is-terminal-focused')) {
        const after = record.panel.getBoundingClientRect();
        task.animation = record.panel.animate([
          { height: `${before.height}px`, width: `${before.width}px`,
            transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)`, clipPath: 'inset(0)' },
          { height: `${after.height}px`, width: `${after.width}px`, transform: 'none', clipPath: 'inset(0)' },
        ], timing);
      } else {
        const height = record.response.offsetHeight;
        task.animation = record.response.animate([
          { height: '0px', clipPath: 'inset(0 0 100% 0)' },
          { height: `${height}px`, clipPath: 'inset(0)' },
        ], timing);
      }
      task.animation.onfinish = () => {
        if (pending !== task) return;
        pending = undefined;
        settle(record, true);
        announcement.textContent = 'Complete captured stdout is available. Exit code 0.';
      };
    }, 180);
  }

  function sync(active: HTMLElement | undefined, staticMode: boolean, animate = false, presentation = false) {
    activePanel = panels.find((record) => record.section === active);
    focusPresentation = presentation;
    const expanded = activePanel && (staticMode || activePanel.step.classList.contains('visible'));
    if (pending && (pending.panel !== activePanel || !expanded || staticMode || !animate)) cancel();
    for (const record of panels) if (record !== activePanel) focus(record, false);
    for (const record of panels) {
      const wanted = staticMode || record.step.classList.contains('visible');
      if (record === activePanel && wanted && !record.expanded && animate && !staticMode) play(record);
      else if (pending?.panel !== record) settle(record, wanted);
    }
    if (!pending) {
      announcement.textContent = activePanel && expanded && !staticMode
        ? 'Complete captured stdout is available. Exit code 0.' : '';
    }
  }

  return { sync, settle: () => {
    cancel();
    for (const record of panels) settle(record, record.expanded);
    announcement.textContent = '';
  } };
}
