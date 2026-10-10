import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';
import '@fontsource/poppins/latin-400.css';
import '@fontsource/poppins/latin-500.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
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
const chapter = element('chapter', HTMLSelectElement);
const status = element('deck-status', HTMLParagraphElement);
const darkPreference = window.matchMedia('(prefers-color-scheme: dark)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const initialTheme = new URL(window.location.href).searchParams.get('theme');
let explicitTheme = initialTheme === 'dark' || initialTheme === 'light';
let reading = window.innerWidth < 768;

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
  width: reading ? Math.min(root.clientWidth, 1440) : 1440,
  height: reading ? root.clientHeight : 810,
  margin: 0.07,
  minScale: 0.15,
  maxScale: 1.4,
  hash: true,
  history: true,
  controls: true,
  progress: true,
  embedded: true,
  center: false,
  transition: reducedMotion.matches ? 'none' : 'fade',
  backgroundTransition: 'none',
  transitionSpeed: 'fast',
  view: reading ? 'scroll' : null,
  scrollSnap: 'proximity',
  scrollActivationWidth: 0,
  showNotes: false,
  pdfSeparateFragments: false,
  plugins: [Notes],
});

function updateModeControls() {
  readButton.textContent = reading ? 'Present' : 'Read';
  readButton.setAttribute('aria-pressed', String(reading));
  readButton.setAttribute('aria-label', reading ? 'Switch to presentation mode' : 'Switch to reading mode');
  overviewButton.disabled = reading;
  overviewButton.title = reading ? 'Switch to presentation mode for overview' : 'Overview (Esc)';
  document.documentElement.dataset.reading = String(reading);
}

function toggleReading() {
  reading = !reading;
  updateModeControls();
  deck.configure({
    view: reading ? 'scroll' : null,
    width: reading ? Math.min(root.clientWidth, 1440) : 1440,
    height: reading ? root.clientHeight : 810,
  });
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
readButton.addEventListener('click', toggleReading);
overviewButton.addEventListener('click', () => deck.toggleOverview());
notesButton.addEventListener('click', openNotes);
chapter.addEventListener('change', () => {
  const target = document.getElementById(chapter.value);
  if (!target) throw new Error(`Missing chapter: ${chapter.value}`);
  if (reading) {
    target.scrollIntoView({ block: 'start', behavior: 'instant' });
    const url = new URL(window.location.href);
    url.hash = `/${target.id}`;
    window.history.pushState(null, '', url);
  } else {
    const indices = deck.getIndices(target);
    deck.slide(indices.h, indices.v);
  }
});
document.querySelector('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  root.focus();
});
darkPreference.addEventListener('change', () => {
  if (!explicitTheme) setTheme(darkPreference.matches ? 'dark' : 'light');
});
reducedMotion.addEventListener('change', () => {
  deck.configure({ transition: reducedMotion.matches ? 'none' : 'fade' });
});
window.addEventListener('resize', () => {
  if (reading) deck.configure({ width: Math.min(root.clientWidth, 1440), height: root.clientHeight });
});

try {
  updateModeControls();
  await deck.initialize();
  root.removeAttribute('role');
  if (reading) {
    const targetId = window.location.hash.startsWith('#/') ? window.location.hash.slice(2).split('/')[0] : '';
    if (targetId) document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'instant' });
    else root.scrollTop = 0;
  }
  deck.addKeyBinding({ keyCode: 84, key: 'T', description: 'Switch theme' }, toggleTheme);
  deck.addKeyBinding({ keyCode: 82, key: 'R', description: 'Switch reading mode' }, toggleReading);
  document.documentElement.dataset.deckReady = 'true';
} catch (error) {
  status.textContent = 'The presentation could not initialize. Reload, or read the repository runbook.';
  console.error('Presentation initialization failed.', error);
  throw error;
}
