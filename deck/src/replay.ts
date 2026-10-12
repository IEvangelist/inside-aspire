type ReplayPanel = {
  section: HTMLElement;
  panel: HTMLElement;
  response: HTMLElement;
  cue: HTMLElement;
  step: HTMLElement;
  expanded: boolean;
};

export function createReplayController(root: HTMLElement) {
  const panels: ReplayPanel[] = [...root.querySelectorAll<HTMLElement>('[data-cli-replay]')].map((panel) => {
    const section = panel.closest<HTMLElement>('section');
    const response = panel.querySelector<HTMLElement>('.replay-response');
    const cue = panel.querySelector<HTMLElement>('.replay-cue');
    const step = section?.querySelector<HTMLElement>('.replay-step');
    if (!section || !response || !cue || !step) throw new Error('Recorded CLI surface is incomplete.');
    return { section, panel, response, cue, step, expanded: false };
  });
  let pending: { panel: ReplayPanel; timer?: number; animation?: Animation } | undefined;

  function cancel() {
    if (!pending) return;
    window.clearTimeout(pending.timer);
    pending.animation?.cancel();
    pending = undefined;
  }

  function settle(record: ReplayPanel, expanded: boolean) {
    record.expanded = expanded;
    record.response.hidden = !expanded;
    record.panel.dataset.replayPhase = expanded ? 'complete' : 'command';
    record.cue.textContent = expanded
      ? 'Captured output / exit 0. Recorded CLI run, not live execution.'
      : 'Recorded CLI run. Next replays its captured output.';
  }

  function play(record: ReplayPanel) {
    record.expanded = true;
    record.response.hidden = true;
    record.panel.dataset.replayPhase = 'cue';
    record.cue.textContent = 'Replaying captured output... Illustrative timing.';
    const task: { panel: ReplayPanel; timer?: number; animation?: Animation } = { panel: record };
    pending = task;
    task.timer = window.setTimeout(() => {
      if (pending !== task) return;
      record.response.hidden = false;
      record.panel.dataset.replayPhase = 'expanding';
      const height = record.response.offsetHeight;
      task.animation = record.response.animate([
        { height: '0px', clipPath: 'inset(0 0 100% 0)' },
        { height: `${height}px`, clipPath: 'inset(0)' },
      ], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      task.animation.onfinish = () => {
        if (pending !== task) return;
        pending = undefined;
        settle(record, true);
      };
    }, 180);
  }

  function sync(active: HTMLElement | undefined, staticMode: boolean, animate = false) {
    const activePanel = panels.find((record) => record.section === active);
    const expanded = activePanel && (staticMode || activePanel.step.classList.contains('visible'));
    if (pending && (pending.panel !== activePanel || !expanded || staticMode || !animate)) cancel();
    for (const record of panels) {
      const wanted = staticMode || record.step.classList.contains('visible');
      if (record === activePanel && wanted && !record.expanded && animate && !staticMode) play(record);
      else if (pending?.panel !== record) settle(record, wanted);
    }
  }

  return { sync, settle: () => {
    cancel();
    for (const record of panels) settle(record, record.expanded);
  } };
}
