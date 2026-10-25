import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import '@fontsource/fira-code/latin-400.css';
import '@fontsource/fira-code/latin-500.css';
import '@fontsource/fira-code/latin-600.css';
import { renderIcons } from './icons';
import { renderDiagrams } from './diagrams';
import { focusCode, highlightCode } from './syntax';
import { createReplayController } from './replay';
import { prepareWindows } from './windows';
import { sizePrintPages } from './printing';
import { annotatePackages } from './packages';
import { createTransitionPolicy, transitionSettings } from './transitions';
import './style.css';

function element<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const result = document.getElementById(id);
  if (!(result instanceof type)) throw new Error(`Missing presentation element: ${id}`);
  return result;
}

const root = element('presentation', HTMLElement);
const viewport = element('slide-viewport', HTMLElement);
const themeButton = element('theme', HTMLButtonElement);
const readButton = element('read-mode', HTMLButtonElement);
const overviewButton = element('overview', HTMLButtonElement);
const notesButton = element('notes', HTMLButtonElement);
const menu = element('deck-menu', HTMLDialogElement);
const menuButton = element('menu-toggle', HTMLButtonElement);
const chapterButton = element('chapter-toggle', HTMLButtonElement);
const chapterLabel = element('chapter-label', HTMLSpanElement);
const previousButton = element('previous', HTMLButtonElement);
const nextButton = element('next', HTMLButtonElement);
const position = element('slide-position', HTMLOutputElement);
const status = element('deck-status', HTMLParagraphElement);
const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const printPreference = window.matchMedia('print');
const initialTheme = new URL(window.location.href).searchParams.get('theme');
let explicitTheme = initialTheme === 'dark' || initialTheme === 'light';
const printMode = new URL(window.location.href).searchParams.has('print-pdf');
// Native speaker frames are narrow, but must accept presentation state rather than reading layout.
const speakerReceiver = new URL(window.location.href).searchParams.has('receiver');
const slides = [...root.querySelectorAll<HTMLElement>('.slides > section[id]')];
const slideAliases: Record<string, string> = { aot: 'compiler', 'native-proof': 'compiler', commands: 'live-cli', timeout: 'browser-evidence', 'know-truth': 'ai-loops' };
const initialView = new URL(window.location.href).searchParams.get('mode');
const initialSlideId = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
let reading = !printMode && !speakerReceiver && (initialView === 'read' ||
  (initialView !== 'present' && (window.innerWidth < 1000 || window.innerHeight < 650)));
let currentId = slides[0]?.id ?? 'intro';
let scrollFrame = 0;

try {
  const placements = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  if (!placements.includes(position.dataset.position ?? '')) {
    throw new Error('#slide-position: data-position must be top-left, top-right, bottom-left, or bottom-right.');
  }
  if (position.dataset.visible !== 'true' && position.dataset.visible !== 'false') {
    throw new Error('#slide-position: data-visible must be true or false.');
  }
  position.hidden = position.dataset.visible === 'false';
} catch (error) {
  status.textContent = error instanceof Error ? error.message : '#slide-position configuration could not initialize.';
  console.error('Slide count configuration could not initialize.', error);
  throw error;
}

function dimensions() {
  return {
    width: reading ? Math.min(root.clientWidth, 1440) : Math.max(1200, Math.min(1440, root.clientWidth / root.clientHeight * 810)),
    height: reading ? root.clientHeight : 810,
  };
}

renderIcons();
renderDiagrams();
prepareWindows(root, (message) => { status.textContent = message; },
  () => root.focus({ preventScroll: true }));
highlightCode();
try {
  annotatePackages(root);
} catch (error) {
  status.textContent = error instanceof Error ? error.message : 'Package annotations could not initialize.';
  console.error('Package annotations could not initialize.', error);
  throw error;
}
for (const link of menu.querySelectorAll<HTMLElement>('[data-slide]')) {
  const index = slides.findIndex((slide) => slide.id === link.dataset.slide);
  if (index < 0) throw new Error(`Missing menu slide: ${link.dataset.slide}`);
  const chip = document.createElement('span');
  chip.className = 'slide-number';
  chip.dataset.uxDecoration = '';
  chip.setAttribute('aria-hidden', 'true');
  chip.textContent = String(index + 1);
  link.prepend(chip);
}
const replay = createReplayController(root, element('replay-status', HTMLSpanElement));
let transitions: ReturnType<typeof createTransitionPolicy>;
try {
  transitions = createTransitionPolicy(root, slides, transitionSettings);
} catch (error) {
  status.textContent = error instanceof Error ? error.message : 'Transitions could not initialize.';
  console.error('Transitions could not initialize.', error);
  throw error;
}

function noMotion() {
  return staticContent() || speakerReceiver;
}

function staticContent() {
  return reading || reducedMotion.matches || printMode || printPreference.matches;
}

function setTheme(theme: 'dark' | 'light') {
  replay.settle();
  document.documentElement.dataset.theme = theme;
  element('theme-color', HTMLMetaElement).content = theme === 'dark' ? '#151423' : '#f5f6f8';
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
  themeButton.querySelector('span:not([data-icon])')!.textContent = `${theme === 'dark' ? 'Light' : 'Dark'} theme`;
}

function toggleTheme() {
  explicitTheme = true;
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  const url = new URL(window.location.href);
  url.searchParams.set('theme', theme);
  window.history.replaceState(null, '', url);
  updatePrintLink();
}

setTheme(initialTheme === 'dark' || initialTheme === 'light'
  ? initialTheme
  : darkPreference.matches ? 'dark' : 'light');

const deck = new Reveal(root, {
  ...dimensions(),
  margin: 0.07,
  minScale: 0.15,
  maxScale: 1.4,
  hash: !reading,
  history: !reading && !speakerReceiver,
  controls: false,
  progress: true,
  embedded: true,
  center: false,
  ...transitions.apply(noMotion()),
  disableLayout: reading,
  overview: !reading,
  scrollActivationWidth: 0,
  scrollProgress: false,
  showNotes: false,
  fragments: !staticContent(),
  pdfSeparateFragments: false,
  keyboardCondition: () => !menu.open && !ownsNavigationKeys(document.activeElement),
  plugins: [Notes],
});

function ownsNavigationKeys(target: Element | null) {
  if (target?.closest('a, button, input, textarea, select, [contenteditable]')) return true;
  const region = target?.closest<HTMLElement>('pre, [role="region"][tabindex]');
  return !!region && (region.scrollHeight > region.clientHeight || region.scrollWidth > region.clientWidth);
}

function updateModeControls() {
  readButton.querySelector('.control-label')!.textContent = reading ? 'Presentation mode' : 'Reading mode';
  readButton.setAttribute('aria-pressed', String(reading));
  readButton.setAttribute('aria-label', reading ? 'Switch to presentation mode' : 'Switch to reading mode');
  overviewButton.disabled = reading;
  overviewButton.title = reading ? 'Switch to presentation mode for overview' : 'Overview (Esc)';
  document.documentElement.dataset.reading = String(reading);
  document.documentElement.dataset.static = String(staticContent());
  document.documentElement.dataset.print = String(printMode);
  document.documentElement.dataset.speakerReceiver = String(speakerReceiver);
  for (const details of root.querySelectorAll<HTMLDetailsElement>('.language-examples')) {
    details.open = reading || printMode || printPreference.matches;
  }
}

function syncControls(animateReplay = false) {
  if (!reading) currentId = deck.getCurrentSlide()?.id ?? currentId;
  const index = slides.findIndex((slide) => slide.id === currentId);
  const slide = document.getElementById(currentId);
  document.documentElement.dataset.intro = String(index === 0);
  document.documentElement.style.setProperty('--slide-scale', String(reading ? 1 : deck.getScale()));
  position.value = `${index + 1} / ${slides.length}`;
  position.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
  chapterLabel.textContent = slide?.dataset.chapter ?? 'Inside Aspire';
  previousButton.disabled = index === 0 && (reading || !deck.availableFragments().prev);
  nextButton.disabled = index === slides.length - 1 && (reading || !deck.availableFragments().next);
  menu.querySelectorAll('[data-slide]').forEach((link) => {
    const current = link.hasAttribute('data-core-chapter')
      ? link.getAttribute('data-core-chapter') === slide?.dataset.chapter
      : link.getAttribute('data-slide') === currentId;
    link.setAttribute('aria-current', current ? 'step' : 'false');
  });
  if (slide) focusCode(slide, staticContent());
  replay.sync(slide ?? undefined, staticContent(), animateReplay && !speakerReceiver);
  if (!reading) {
    for (const inactive of root.querySelectorAll<HTMLElement>('section:not(.present)')) {
      inactive.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    }
  }
  if (reading) for (const slide of slides) slide.removeAttribute('aria-hidden');
}

function goTo(id: string) {
  if (Object.hasOwn(slideAliases, id)) id = slideAliases[id];
  const target = document.getElementById(id);
  if (!target) throw new Error(`Missing slide: ${id}`);
  currentId = id;
  const indices = deck.getIndices(target);
  deck.slide(indices.h, indices.v, -1);
  syncControls();
  if (reading) {
    viewport.scrollTo({
      top: viewport.scrollTop + target.getBoundingClientRect().top - viewport.getBoundingClientRect().top,
      behavior: 'instant',
    });
    const url = new URL(window.location.href);
    url.hash = `/${target.id}`;
    if (window.location.hash !== url.hash) window.history.pushState(null, '', url);
  }
  syncControls();
}

function closeMenu() {
  menu.close();
  menuButton.setAttribute('aria-expanded', 'false');
  chapterButton.setAttribute('aria-expanded', 'false');
}

function toggleReading() {
  if (speakerReceiver) return;
  const id = currentId;
  reading = !reading;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', reading ? 'read' : 'present');
  window.history.replaceState(null, '', url);
  updateModeControls();
  deck.configure({
    ...dimensions(),
    ...transitions.apply(noMotion()),
    disableLayout: reading,
    overview: !reading,
    fragments: !staticContent(),
    hash: !reading,
    history: !reading,
  });
  deck.sync();
  goTo(id);
  updatePrintLink();
  status.textContent = reading ? 'Reading mode. Scroll through the slides.' : 'Presentation mode. Use arrow keys to navigate.';
}

function updatePrintLink() {
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.searchParams.set('print-pdf', '');
  url.hash = '';
  element('print-link', HTMLAnchorElement).href = url.href;
}

function openNotes() {
  const plugin = deck.getPlugin('notes');
  if ('open' in plugin && typeof plugin.open === 'function') {
    try {
      plugin.open();
    } catch (error) {
      status.textContent = 'Speaker view could not open. Allow pop-ups for this site, then choose Speaker notes or press S again.';
      console.error('Native Reveal speaker view could not open.', error);
    }
  } else {
    status.textContent = 'Speaker notes could not open. Use S or allow popups for this site.';
    console.error('Reveal notes plugin is unavailable.');
  }
}

themeButton.addEventListener('click', toggleTheme);
readButton.addEventListener('click', () => { closeMenu(); toggleReading(); root.focus({ preventScroll: true }); });
overviewButton.addEventListener('click', () => { closeMenu(); deck.toggleOverview(); root.focus({ preventScroll: true }); });
notesButton.addEventListener('click', () => { closeMenu(); openNotes(); });
for (const details of root.querySelectorAll<HTMLDetailsElement>('.language-examples')) {
  details.addEventListener('toggle', () => {
    if (details.open && !reading && !printMode && !printPreference.matches) {
      toggleReading();
      details.scrollIntoView({ block: 'start' });
    }
  });
}
for (const button of [menuButton, chapterButton]) {
  button.addEventListener('click', () => {
    menu.showModal();
    menuButton.setAttribute('aria-expanded', 'true');
    chapterButton.setAttribute('aria-expanded', 'true');
  });
}
menu.addEventListener('close', () => {
  menuButton.setAttribute('aria-expanded', 'false');
  chapterButton.setAttribute('aria-expanded', 'false');
});
menu.addEventListener('click', (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('[data-slide]');
  if (link?.dataset.slide) {
    event.preventDefault();
    closeMenu();
    goTo(link.dataset.slide);
    root.focus({ preventScroll: true });
  }
});
root.addEventListener('click', (event) => {
  const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#/"]');
  const href = link?.getAttribute('href');
  if (!href) return;
  event.preventDefault();
  goTo(decodeURIComponent(href.slice(2).split('/')[0]));
  root.focus({ preventScroll: true });
});
previousButton.addEventListener('click', () => {
  if (reading) goTo(slides[Math.max(0, slides.findIndex((slide) => slide.id === currentId) - 1)].id);
  else deck.prev();
  root.focus({ preventScroll: true });
});
nextButton.addEventListener('click', () => {
  if (reading) goTo(slides[Math.min(slides.length - 1, slides.findIndex((slide) => slide.id === currentId) + 1)].id);
  else deck.next();
  root.focus({ preventScroll: true });
});
viewport.addEventListener('scroll', () => {
  if (!reading || scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    const frame = viewport.getBoundingClientRect();
    const current = slides.find((slide) => {
      const bounds = slide.getBoundingClientRect();
      return bounds.top <= frame.top + 24 && bounds.bottom > frame.top + 24;
    });
    if (!current) return;
    currentId = current.id;
    if (deck.getCurrentSlide() !== current) {
      const indices = deck.getIndices(current);
      deck.slide(indices.h, indices.v, -1);
    }
    syncControls();
  });
});
window.addEventListener('keydown', (event) => {
  if (!reading || menu.open || event.altKey || event.ctrlKey || event.metaKey ||
      (event.target instanceof Element && ownsNavigationKeys(event.target))) return;
  const direction = ['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key) ? 1 :
    ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
  if (direction) {
    event.preventDefault();
    event.stopImmediatePropagation();
    goTo(slides[Math.max(0, Math.min(slides.length - 1, slides.findIndex((slide) => slide.id === currentId) + direction))].id);
  }
}, true);
document.querySelector('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  root.focus();
});
darkPreference.addEventListener('change', () => {
  if (!explicitTheme) setTheme(darkPreference.matches ? 'dark' : 'light');
});
reducedMotion.addEventListener('change', () => {
  updateModeControls();
  deck.configure({
    ...transitions.apply(noMotion()),
    fragments: !staticContent(),
  });
  let beforePrint: ReturnType<typeof deck.getState> | undefined;
  printPreference.addEventListener('change', () => {
    if (printPreference.matches) beforePrint = deck.getState();
    updateModeControls();
    deck.configure({ ...transitions.apply(noMotion()), fragments: !staticContent() });
    deck.sync();
    if (!printPreference.matches && beforePrint) {
      deck.setState(beforePrint);
      beforePrint = undefined;
    }
    syncControls();
  });
  deck.sync();
  syncControls();
});
window.addEventListener('resize', () => {
  replay.settle();
  updateModeControls();
  deck.configure({ ...dimensions(), disableLayout: reading });
  syncControls();
});
window.addEventListener('hashchange', (event) => {
  if (!window.location.hash.startsWith('#/')) return;
  const [slideId, fragment] = window.location.hash.slice(2).split('/');
  const id = decodeURIComponent(slideId);
  const directSlideJump = !printMode && fragment === undefined &&
    (id !== currentId || (deck.getIndices().f ?? -1) >= 0);
  if (reading || Object.hasOwn(slideAliases, id) || directSlideJump) {
    // An absent fragment also means -1 when browser Back returns to this slide's initial history entry.
    // Toolbar Back and explicit fragment hashes keep Reveal's restoration.
    // Reading pages own their DOM offsets instead of Reveal's fixed-height hash navigation.
    event.stopImmediatePropagation();
    goTo(id);
  }
}, true);

try {
  updateModeControls();
  await Promise.all([
    document.fonts.load('400 28px Poppins'),
    document.fonts.load('700 84px Poppins'),
    document.fonts.load('400 22px "Fira Code"'),
    document.fonts.load('500 18px "Fira Code"'),
    document.fonts.load('600 18px "Fira Code"'),
  ]);
  await document.fonts.ready;
  const printReady = printMode
    ? new Promise<void>((resolve) => deck.on('pdf-ready', () => resolve()))
    : undefined;
  if (printMode) {
    deck.on('pdf-ready', () => sizePrintPages(root));
    window.addEventListener('beforeprint', () => sizePrintPages(root));
  }
  await deck.initialize();
  root.removeAttribute('role');
  deck.on('slidechanged', () => {
    if (!reading) viewport.scrollTop = 0;
    syncControls();
  });
  deck.on('fragmentshown', () => syncControls(true));
  deck.on('fragmenthidden', () => syncControls());
  const targetId = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
  if (Object.hasOwn(slideAliases, initialSlideId)) goTo(initialSlideId);
  else if (reading) {
    if (targetId) goTo(decodeURIComponent(targetId));
    else viewport.scrollTop = 0;
  }
  deck.addKeyBinding({ keyCode: 84, key: 'T', description: 'Switch theme' }, toggleTheme);
  deck.addKeyBinding({ keyCode: 82, key: 'R', description: 'Switch reading mode' }, toggleReading);
  deck.addKeyBinding({ keyCode: 83, key: 'S', description: 'Open speaker notes and presenter view' }, openNotes);
  syncControls();
  updatePrintLink();
  // Static replay content must settle before measuring the completed native print pages.
  if (printReady) {
    await printReady;
    sizePrintPages(root);
  }
  document.documentElement.dataset.deckReady = 'true';
} catch (error) {
  status.textContent = 'The presentation could not initialize. Reload, or read the repository runbook.';
  console.error('Presentation initialization failed.', error);
  throw error;
}
