type Loop = { key: string; icon: string; name: string; line: string };

const loops: Loop[] = [
  { key: 'docs', icon: 'book', name: 'Docs', line: 'Features ship with docs' },
  { key: 'workflows', icon: 'workflow', name: 'Agentic workflows', line: 'Agents draft, people merge' },
  { key: 'cli', icon: 'terminal', name: 'Aspire CLI', line: 'AI looks it up instead of guessing' },
  { key: 'search', icon: 'database', name: 'Search', line: 'Index once, answer fast' },
  { key: 'runtime', icon: 'cpu', name: 'Runtime', line: 'Start, wait, verify' },
  { key: 'dashboard', icon: 'graph', name: 'Dashboard', line: 'See what your app did' },
];

// Tiles sit on an ellipse around Aspire, starting at the top and going clockwise.
const position = (index: number) => {
  const angle = (-90 + index * (360 / loops.length)) * (Math.PI / 180);
  return { x: 50 + 36 * Math.cos(angle), y: 50 + 34 * Math.sin(angle) };
};

export function renderLoopMaps() {
  for (const mount of document.querySelectorAll<HTMLElement>('[data-loop-map]')) {
    const focus = mount.dataset.loopMap ?? '';
    const done = new Set((mount.dataset.mapDone ?? '').split(/\s+/).filter(Boolean));
    const all = focus === 'all';
    const target = loops.findIndex((loop) => loop.key === focus);
    if (!all && target < 0) throw new Error(`Unknown loop map focus: ${focus}`);
    const tiles = loops.map((loop, index) => {
      const { x, y } = position(index);
      const state = all || done.has(loop.key) ? 'done' : loop.key === focus ? 'focus' : 'idle';
      return `<li class="map-tile" data-state="${state}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%">
        <span class="map-badge"><span data-icon="${loop.icon}"></span></span>
        <strong>${loop.name}</strong><span class="map-line">${loop.line}</span></li>`;
    }).join('');
    const origin = target >= 0 ? position(target) : { x: 50, y: 50 };
    mount.classList.add('loop-map');
    mount.style.setProperty('--zoom-x', `${origin.x.toFixed(2)}%`);
    mount.style.setProperty('--zoom-y', `${origin.y.toFixed(2)}%`);
    mount.innerHTML = `<div class="map-stage">
        <div class="map-core"><img src="${import.meta.env.BASE_URL}brand/aspire-icon-256.svg" width="96" height="96" alt="" /><strong>Aspire</strong></div>
        <ul class="map-tiles">${tiles}</ul>
      </div>${target >= 0 ? '<span class="fragment map-zoom" aria-hidden="true"></span>' : ''}`;
  }
}
