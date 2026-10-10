import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import { renderIcons } from './icons';
import { renderDiagrams } from './diagrams';
import { focusCode, highlightCode } from './syntax';
import './style.css';

function element<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const result = document.getElementById(id);
  if (!(result instanceof type)) throw new Error(`Missing presentation element: ${id}`);
  return result;
}

const root = element('presentation', HTMLElement);
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
const initialTheme = new URL(window.location.href).searchParams.get('theme');
let explicitTheme = initialTheme === 'dark' || initialTheme === 'light';
const printMode = new URL(window.location.href).searchParams.has('print-pdf');
const slides = [...root.querySelectorAll<HTMLElement>('.slides > section[id]')];
const initialView = new URL(window.location.href).searchParams.get('mode');
let reading = !printMode && (initialView === 'read' ||
  (initialView !== 'present' && (window.innerWidth < 1000 || window.innerHeight < 650)));
let currentId = slides[0]?.id ?? 'intro';
let readingObserver: IntersectionObserver | undefined;

renderIcons();
renderDiagrams();
highlightCode();

function setTheme(theme: 'dark' | 'light') {
  document.documentElement.dataset.theme = theme;
  themeButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`);
}

function toggleTheme() {
  explicitTheme = true;
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(theme);
  const url = new URL(window.location.href);
  url.searchParams.set('theme', theme);
  window.history.replaceState(null, '', url);
}

setTheme(initialTheme === 'dark' || initialTheme === 'light'
  ? initialTheme
  : darkPreference.matches ? 'dark' : 'light');

const deck = new Reveal(root, {
  width: reading ? Math.min(root.clientWidth, 1440) : Math.max(1200, Math.min(1440, root.clientWidth / root.clientHeight * 810)),
  height: reading ? root.clientHeight : 810,
  margin: 0.07,
  minScale: 0.15,
  maxScale: 1.4,
  hash: !reading,
  history: !reading,
  controls: false,
  progress: true,
  embedded: true,
  center: false,
  transition: reducedMotion.matches ? 'none' : 'fade',
  backgroundTransition: 'none',
  transitionSpeed: 'fast',
  view: reading ? 'scroll' : null,
  scrollSnap: 'proximity',
  scrollActivationWidth: 0,
  scrollProgress: false,
  showNotes: false,
  fragments: !reading && !reducedMotion.matches && !printMode,
  pdfSeparateFragments: false,
  keyboardCondition: () => !menu.open && document.activeElement?.tagName !== 'PRE',
  plugins: [Notes],
});

function updateModeControls() {
  readButton.querySelector('.control-label')!.textContent = reading ? 'Presentation mode' : 'Reading mode';
  readButton.setAttribute('aria-pressed', String(reading));
  readButton.setAttribute('aria-label', reading ? 'Switch to presentation mode' : 'Switch to reading mode');
  overviewButton.disabled = reading;
  overviewButton.title = reading ? 'Switch to presentation mode for overview' : 'Overview (Esc)';
  document.documentElement.dataset.reading = String(reading);
  document.documentElement.dataset.static = String(reading || reducedMotion.matches || printMode);
}

function syncControls() {
  if (!reading) currentId = deck.getCurrentSlide()?.id ?? currentId;
  const index = slides.findIndex((slide) => slide.id === currentId);
  const slide = document.getElementById(currentId);
  position.value = `${index + 1} / ${slides.length}`;
  position.setAttribute('aria-label', `Slide ${index + 1} of ${slides.length}`);
  chapterLabel.textContent = slide?.dataset.chapter ?? 'Inside Aspire';
  previousButton.disabled = index === 0 && (reading || !deck.availableFragments().prev);
  nextButton.disabled = index === slides.length - 1 && (reading || !deck.availableFragments().next);
  menu.querySelectorAll('[data-slide]').forEach((link) => {
    link.setAttribute('aria-current', link.getAttribute('data-slide') === currentId ? 'step' : 'false');
  });
  if (slide) focusCode(slide, reading || reducedMotion.matches || printMode);
  if (!reading) {
    for (const inactive of root.querySelectorAll<HTMLElement>('section:not(.present)')) {
      inactive.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    }
  }
}

function observeReading() {
  readingObserver?.disconnect();
  if (!reading) return;
  readingObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting)
      .sort((first, second) => Math.abs(first.boundingClientRect.top - root.getBoundingClientRect().top) -
        Math.abs(second.boundingClientRect.top - root.getBoundingClientRect().top));
    if (!visible[0]) return;
    currentId = (visible[0].target as HTMLElement).id;
    syncControls();
  }, { root, threshold: [0.15, 0.5], rootMargin: '0px 0px -20% 0px' });
  for (const slide of root.querySelectorAll<HTMLElement>('section[id]')) readingObserver.observe(slide);
}

function goTo(id: string) {
  const target = document.getElementById(id);
  if (!target) throw new Error(`Missing slide: ${id}`);
  currentId = id;
  if (reading) {
    root.scrollTo({
      top: root.scrollTop + target.getBoundingClientRect().top - root.getBoundingClientRect().top,
      behavior: 'instant',
    });
    const url = new URL(window.location.href);
    url.hash = `/${target.id}`;
    if (window.location.hash !== url.hash) window.history.pushState(null, '', url);
    syncControls();
  } else {
    const indices = deck.getIndices(target);
    deck.slide(indices.h, indices.v, -1);
  }
}

function closeMenu() {
  menu.close();
  menuButton.setAttribute('aria-expanded', 'false');
  chapterButton.setAttribute('aria-expanded', 'false');
}

function toggleReading() {
  const id = currentId;
  reading = !reading;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', reading ? 'read' : 'present');
  window.history.replaceState(null, '', url);
  updateModeControls();
  deck.configure({
    view: reading ? 'scroll' : null,
    width: reading ? Math.min(root.clientWidth, 1440) : Math.max(1200, Math.min(1440, root.clientWidth / root.clientHeight * 810)),
    height: reading ? root.clientHeight : 810,
    fragments: !reading && !reducedMotion.matches,
    hash: !reading,
    history: !reading,
  });
  observeReading();
  goTo(id);
  status.textContent = reading ? 'Reading mode. Scroll through the slides.' : 'Presentation mode. Use arrow keys to navigate.';
}

function openNotes() {
  const plugin = deck.getPlugin('notes');
  if ('open' in plugin && typeof plugin.open === 'function') {
    plugin.open();
  } else {
    status.textContent = 'Speaker notes could not open. Use S or allow popups for this site.';
    console.error('Reveal notes plugin is unavailable.');
  }
}

themeButton.addEventListener('click', toggleTheme);
readButton.addEventListener('click', () => { closeMenu(); toggleReading(); root.focus({ preventScroll: true }); });
overviewButton.addEventListener('click', () => { closeMenu(); deck.toggleOverview(); root.focus({ preventScroll: true }); });
notesButton.addEventListener('click', () => { closeMenu(); openNotes(); });
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
});
nextButton.addEventListener('click', () => {
  if (reading) goTo(slides[Math.min(slides.length - 1, slides.findIndex((slide) => slide.id === currentId) + 1)].id);
  else deck.next();
});
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
    transition: reducedMotion.matches ? 'none' : 'fade',
    fragments: !reading && !reducedMotion.matches && !printMode,
  });
  syncControls();
});
window.addEventListener('resize', () => {
  if (reading) deck.configure({ width: Math.min(root.clientWidth, 1440), height: root.clientHeight });
});
window.addEventListener('hashchange', () => {
  if (reading && window.location.hash.startsWith('#/')) {
    goTo(decodeURIComponent(window.location.hash.slice(2).split('/')[0]));
  }
});

try {
  updateModeControls();
  await deck.initialize();
  root.removeAttribute('role');
  deck.on('slidechanged', syncControls);
  deck.on('fragmentshown', syncControls);
  deck.on('fragmenthidden', syncControls);
  observeReading();
  if (reading) {
    const targetId = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
    if (targetId) goTo(decodeURIComponent(targetId));
    else root.scrollTop = 0;
  }
  deck.addKeyBinding({ keyCode: 84, key: 'T', description: 'Switch theme' }, toggleTheme);
  deck.addKeyBinding({ keyCode: 82, key: 'R', description: 'Switch reading mode' }, toggleReading);
  syncControls();
  document.documentElement.dataset.deckReady = 'true';
} catch (error) {
  status.textContent = 'The presentation could not initialize. Reload, or read the repository runbook.';
  console.error('Presentation initialization failed.', error);
  throw error;
}
