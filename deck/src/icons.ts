import arrowLeft from '@primer/octicons/build/svg/arrow-left-24.svg?raw';
import arrowRight from '@primer/octicons/build/svg/arrow-right-24.svg?raw';
import book from '@primer/octicons/build/svg/book-24.svg?raw';
import check from '@primer/octicons/build/svg/check-circle-24.svg?raw';
import cloud from '@primer/octicons/build/svg/cloud-24.svg?raw';
import code from '@primer/octicons/build/svg/code-24.svg?raw';
import cpu from '@primer/octicons/build/svg/cpu-24.svg?raw';
import database from '@primer/octicons/build/svg/database-24.svg?raw';
import agent from '@primer/octicons/build/svg/dependabot-24.svg?raw';
import file from '@primer/octicons/build/svg/file-code-24.svg?raw';
import graph from '@primer/octicons/build/svg/graph-24.svg?raw';
import review from '@primer/octicons/build/svg/code-review-24.svg?raw';
import menu from '@primer/octicons/build/svg/three-bars-24.svg?raw';
import moon from '@primer/octicons/build/svg/moon-24.svg?raw';
import packageIcon from '@primer/octicons/build/svg/package-24.svg?raw';
import person from '@primer/octicons/build/svg/person-24.svg?raw';
import pr from '@primer/octicons/build/svg/git-pull-request-24.svg?raw';
import screen from '@primer/octicons/build/svg/device-desktop-24.svg?raw';
import sun from '@primer/octicons/build/svg/sun-24.svg?raw';
import terminal from '@primer/octicons/build/svg/terminal-24.svg?raw';
import workflow from '@primer/octicons/build/svg/workflow-24.svg?raw';
import close from '@primer/octicons/build/svg/x-24.svg?raw';
import { faBluesky, faLinkedinIn, faXTwitter } from '@fortawesome/free-brands-svg-icons';

function brandSvg(definition: typeof faBluesky): string {
  const [width, height, , , paths] = definition.icon;
  const pathData = typeof paths === 'string' ? [paths] : paths;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${pathData.map((path) => `<path d="${path}" />`).join('')}</svg>`;
}

const icons = {
  arrowLeft, arrowRight, book, check, cloud, code, cpu, database, agent, file,
  graph, review, menu, moon, package: packageIcon, person, pr, screen, sun, terminal, workflow, close,
  socialX: brandSvg(faXTwitter), socialBluesky: brandSvg(faBluesky), socialLinkedIn: brandSvg(faLinkedinIn),
};

export type IconName = keyof typeof icons;

export function icon(name: IconName): string {
  return icons[name].replace('<svg ', `<svg aria-hidden="true" focusable="false" class="octicon icon-${name}" `);
}

export function renderIcons(scope: ParentNode = document) {
  for (const slot of scope.querySelectorAll<HTMLElement>('[data-icon]')) {
    const name = slot.dataset.icon;
    if (!name || !Object.hasOwn(icons, name)) throw new Error(`Unknown presentation icon: ${name}`);
    slot.innerHTML = icon(name as IconName);
    slot.setAttribute('aria-hidden', 'true');
  }
}
