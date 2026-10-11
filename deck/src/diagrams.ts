import { icon, type IconName } from './icons';

type DiagramNode = {
  id: string;
  title: string;
  detail: string[];
  icon: IconName;
  x: number;
  y: number;
  w: number;
  h: number;
  step: number;
  kind?: 'hub' | 'gate';
};
type DiagramEdge = {
  from: string;
  to: string;
  path: string | ((source: DiagramNode, target: DiagramNode) => string);
  step: number;
  label?: string;
  x?: number;
  y?: number;
  kind?: 'return' | 'telemetry' | 'context';
};
type Diagram = {
  title: string;
  description: string;
  width: number;
  height: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

const centerX = (node: DiagramNode) => node.x + node.w / 2;
const centerY = (node: DiagramNode) => node.y + node.h / 2;

function centerline(source: DiagramNode, target: DiagramNode): string {
  if (centerY(source) !== centerY(target)) throw new Error(`Unaligned row: ${source.id} -> ${target.id}`);
  const rightward = source.x < target.x;
  return `M${rightward ? source.x + source.w : source.x} ${centerY(source)} H${rightward ? target.x : target.x + target.w}`;
}

function fanIn(source: DiagramNode, target: DiagramNode): string {
  const portY = centerY(target) + (centerY(source) < centerY(target) ? -1 : 1) * target.h / 4;
  const elbowX = (source.x + source.w + target.x) / 2;
  return `M${source.x + source.w} ${centerY(source)} H${elbowX} V${portY} H${target.x}`;
}

const innerResults: DiagramNode = { id: 'results', title: 'Observed result', detail: ['Logs, traces, metrics'], icon: 'graph', x: 555, y: 410, w: 320, h: 100, step: 3 };
const runtimeVite: DiagramNode = { id: 'vite', title: 'Vite dev server', detail: ['Node + hot reload'], icon: 'package', x: 350, y: 220, w: 275, h: 105, step: 2 };
const apiXml: DiagramNode = { id: 'xml', title: 'XML docs', detail: ['Member docs'], icon: 'file', x: 25, y: 150, w: 220, h: 96, step: 0 };
const apiModelHeight = 110;
const apiModelTop = centerY(apiXml) - apiModelHeight / 2;

const diagrams: Record<string, Diagram> = {
  inner: {
    title: 'The CLI is the inner-loop enabler',
    description: 'Shipped skills guide the agent. The native Aspire CLI retrieves current docs and exact API members, discovers the AppHost model and endpoints, waits for readiness, and takes targeted lifecycle actions. The managed C# AppHost runs the native weather resources. Observed logs, traces, and results feed the CLI and the next precise agent decision, closing the loop. No model training is implied.',
    width: 1280, height: 530,
    nodes: [
      { id: 'agent', title: 'Agent + AI skills', detail: ['Choose the next action'], icon: 'agent', x: 40, y: 45, w: 295, h: 105, step: 0 },
      { id: 'cli', title: 'Native Aspire CLI', detail: ['Current docs + exact APIs', 'Model, endpoints, readiness', 'Targeted actions + JSON'], icon: 'terminal', x: 460, y: 130, w: 345, h: 190, step: 0, kind: 'hub' },
      { id: 'apphost', title: 'C# AppHost', detail: ['Managed app model'], icon: 'code', x: 930, y: 45, w: 310, h: 105, step: 2 },
      { id: 'resources', title: 'Healthy native app', detail: ['API, React, public providers'], icon: 'cpu', x: 930, y: 235, w: 310, h: 105, step: 2 },
      innerResults,
      { id: 'decision', title: 'Next precise decision', detail: ['Use facts instead of guesses'], icon: 'check', x: 40, y: centerY(innerResults) - 110 / 2, w: 345, h: 110, step: 4 },
    ],
    edges: [
      { from: 'agent', to: 'cli', path: 'M335 98 H390 Q420 98 420 130 V182 H460', step: 1, label: 'invoke', x: 374, y: 78 },
      { from: 'cli', to: 'apphost', path: 'M805 177 H865 Q895 177 895 145 V98 H930', step: 2, label: 'describe, wait, start', x: 936, y: 208 },
      { from: 'apphost', to: 'resources', path: 'M1085 150 V235', step: 2 },
      { from: 'resources', to: 'results', path: 'M1085 340 V438 Q1085 460 1058 460 H875', step: 3, label: 'OTLP + response', x: 980, y: 399, kind: 'telemetry' },
      { from: 'results', to: 'cli', path: 'M695 410 V320', step: 3, label: 'otel', x: 737, y: 368, kind: 'telemetry' },
      { from: 'results', to: 'decision', path: centerline, step: 4, label: 'evidence', x: 469, y: 441 },
      { from: 'decision', to: 'agent', path: (source, target) => `M${centerX(target)} ${source.y} V${target.y + target.h}`, step: 5, label: 'next action', x: 111, y: 280, kind: 'return' },
    ],
  },
  runtime: {
    title: 'Native runtime and managed orchestration are distinct',
    description: 'The native Aspire CLI starts the managed C# AppHost. The AppHost uses the DCP process-orchestration helper to launch the prebuilt NativeAOT API and Vite Node development server. React runs in the browser. Production browser traffic goes directly to the native API for static files and API routes; dev traffic uses Vite and its API proxy. The API calls Open-Meteo, geocoding, and BigDataCloud and exports OTLP to the .NET Aspire dashboard. The dashboard and AppHost are not claimed to be NativeAOT.',
    width: 1280, height: 510,
    nodes: [
      { id: 'cli', title: 'Aspire CLI', detail: ['NativeAOT executable'], icon: 'terminal', x: 20, y: 35, w: 265, h: 100, step: 0, kind: 'hub' },
      { id: 'host', title: 'C# AppHost', detail: ['Managed .NET model'], icon: 'code', x: 350, y: 35, w: 275, h: 100, step: 1 },
      { id: 'dcp', title: 'DCP helper', detail: ['Process launch'], icon: 'workflow', x: 725, y: 35, w: 240, h: 100, step: 1 },
      { id: 'dashboard', title: 'Dashboard', detail: ['Aspire telemetry UI'], icon: 'graph', x: 1005, y: 35, w: 255, h: 100, step: 3 },
      { id: 'browser', title: 'Browser / React', detail: ['Map, radar, forecasts'], icon: 'screen', x: 20, y: runtimeVite.y, w: 265, h: runtimeVite.h, step: 2 },
      runtimeVite,
      { id: 'api', title: 'Weather API', detail: ['NativeAOT binary', '/api + static bundle'], icon: 'cpu', x: 725, y: centerY(runtimeVite) - 125 / 2, w: 280, h: 125, step: 2, kind: 'hub' },
      { id: 'providers', title: 'Public providers', detail: ['Open-Meteo APIs', 'BigDataCloud'], icon: 'cloud', x: 1005, y: 380, w: 255, h: 120, step: 2 },
    ],
    edges: [
      { from: 'cli', to: 'host', path: 'M285 85 H350', step: 1 },
      { from: 'host', to: 'dcp', path: 'M625 85 H725', step: 1 },
      { from: 'dcp', to: 'api', path: (source, target) => `M${centerX(source)} ${source.y + source.h} V${target.y}`, step: 2, label: 'launch', x: 892, y: 188 },
      { from: 'dcp', to: 'vite', path: (source, target) => `M${source.x + 35} ${source.y + source.h} V165 H${centerX(target)} V${target.y}`, step: 2 },
      { from: 'browser', to: 'vite', path: centerline, step: 2, label: 'dev', x: 315, y: centerY(runtimeVite) - 20 },
      { from: 'vite', to: 'api', path: centerline, step: 2, label: '/api', x: 671, y: centerY(runtimeVite) - 20 },
      { from: 'browser', to: 'api', path: (source, target) => `M${centerX(source)} ${source.y + source.h} V415 H680 Q700 415 700 391 V${target.y + target.h * 4 / 5} H${target.x}`, step: 2, label: 'published: static + /api', x: 436, y: 444 },
      { from: 'api', to: 'providers', path: (source, target) => `M${centerX(source)} ${source.y + source.h} V${centerY(target)} H${target.x}`, step: 2, label: 'HTTP', x: 930, y: 411 },
      { from: 'api', to: 'dashboard', path: (source, target) => `M${source.x + source.w} ${source.y + source.h * 2 / 5} H${centerX(target)} V${target.y + target.h}`, step: 3, label: 'OTLP', x: 1177, y: 200, kind: 'telemetry' },
    ],
  },
  outer: {
    title: 'Reviewed documentation supplies the CLI with current context',
    description: 'A reviewed and merged product PR triggers gh-aw using docs-repo doc-writer guidance. A separate safe-output handler opens a draft docs PR. Human review and merge precede build and deployment of Markdown and llms-full.txt. C# fetching, fence-aware parsing, caching, and lexical indexing feed CLI docs and API lookup. Shipped skills and retrieved guidance support the next application or product change and its reviewed PR. This outer supply loop feeds the main CLI inner loop; it does not train a model or auto-merge.',
    width: 1280, height: 550,
    nodes: [
      { id: 'product', title: 'Reviewed product PR', detail: ['microsoft/aspire#16531'], icon: 'pr', x: 35, y: 25, w: 335, h: 100, step: 0, kind: 'gate' },
      { id: 'writer', title: 'gh-aw + doc-writer', detail: ['Propose the docs change'], icon: 'agent', x: 470, y: 25, w: 335, h: 100, step: 1 },
      { id: 'draft', title: 'Safe-output docs PR', detail: ['microsoft/aspire.dev#775'], icon: 'pr', x: 905, y: 25, w: 340, h: 100, step: 1 },
      { id: 'review', title: 'Human review + merge', detail: ['A proposal is not publication'], icon: 'review', x: 905, y: 220, w: 340, h: 100, step: 2, kind: 'gate' },
      { id: 'deploy', title: 'Build + publish docs', detail: ['Markdown + llms-full.txt'], icon: 'cloud', x: 470, y: 220, w: 335, h: 100, step: 2, kind: 'gate' },
      { id: 'index', title: 'Parse + cache + index', detail: ['C# / ETag / lexical ranking'], icon: 'database', x: 35, y: 220, w: 335, h: 100, step: 3 },
      { id: 'lookup', title: 'CLI docs + API lookup', detail: ['Docs + exact members'], icon: 'terminal', x: 35, y: 415, w: 335, h: 100, step: 3, kind: 'hub' },
      { id: 'skills', title: 'Shipped AI skills', detail: ['Guidance for the inner loop'], icon: 'book', x: 470, y: 415, w: 335, h: 100, step: 4 },
      { id: 'next', title: 'Next code change', detail: ['Review the resulting PR'], icon: 'code', x: 905, y: 415, w: 340, h: 100, step: 4 },
    ],
    edges: [
      { from: 'product', to: 'writer', path: 'M370 75 H470', step: 1 },
      { from: 'writer', to: 'draft', path: 'M805 75 H905', step: 1 },
      { from: 'draft', to: 'review', path: 'M1075 125 V220', step: 2 },
      { from: 'review', to: 'deploy', path: 'M905 270 H805', step: 2 },
      { from: 'deploy', to: 'index', path: 'M470 270 H370', step: 3, kind: 'context' },
      { from: 'index', to: 'lookup', path: 'M202 320 V415', step: 3, kind: 'context' },
      { from: 'lookup', to: 'skills', path: 'M370 465 H470', step: 4 },
      { from: 'skills', to: 'next', path: 'M805 465 H905', step: 4 },
      { from: 'next', to: 'product', path: 'M1245 465 H1260 V8 H12 V75 H35', step: 5, kind: 'return' },
    ],
  },
  api: {
    title: 'Compiler-derived API information feeds a separate CLI index',
    description: 'Assembly DLL metadata and XML documentation feed a Roslyn canonical model; available PDB source locations enrich it. The deterministic canonical API JSON feeds the C# reference Markdown renderer. Published reference pages and their sitemap feed the separate CLI API index, which returns exact C# member IDs. Only search accepts the language filter; get follows the returned ID.',
    width: 1280, height: 470,
    nodes: [
      { id: 'dll', title: 'DLL', detail: ['Assembly API'], icon: 'package', x: 25, y: 20, w: 220, h: 96, step: 0 },
      apiXml,
      { id: 'pdb', title: 'PDB', detail: ['Source locations'], icon: 'code', x: 25, y: 280, w: 220, h: 96, step: 0 },
      { id: 'roslyn', title: 'Roslyn model', detail: ['Typed canonical API'], icon: 'code', x: 350, y: apiModelTop, w: 260, h: apiModelHeight, step: 1 },
      { id: 'json', title: 'API JSON', detail: ['Canonical schema'], icon: 'database', x: 680, y: apiModelTop, w: 245, h: apiModelHeight, step: 2 },
      { id: 'markdown', title: 'C# Markdown', detail: ['Published reference'], icon: 'book', x: 995, y: apiModelTop, w: 260, h: apiModelHeight, step: 3 },
      { id: 'sitemap', title: 'API sitemap', detail: ['Discover pages'], icon: 'graph', x: 995, y: 345, w: 260, h: 95, step: 3 },
      { id: 'index', title: 'CLI API index', detail: ['search -> ID -> get'], icon: 'terminal', x: 630, y: 345, w: 305, h: 95, step: 4, kind: 'hub' },
    ],
    edges: [
      { from: 'dll', to: 'roslyn', path: fanIn, step: 1 },
      { from: 'xml', to: 'roslyn', path: centerline, step: 1 },
      { from: 'pdb', to: 'roslyn', path: fanIn, step: 1 },
      { from: 'roslyn', to: 'json', path: centerline, step: 2 },
      { from: 'json', to: 'markdown', path: centerline, step: 3 },
      { from: 'markdown', to: 'sitemap', path: (source, target) => `M${centerX(source)} ${source.y + source.h} V${target.y}`, step: 3, kind: 'context' },
      { from: 'sitemap', to: 'index', path: centerline, step: 4, kind: 'context' },
    ],
  },
};

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] ?? character));
}

export function renderDiagrams() {
  for (const mount of document.querySelectorAll<HTMLElement>('[data-diagram]')) {
    const key = mount.dataset.diagram ?? '';
    const diagram = diagrams[key];
    if (!diagram) throw new Error(`Unknown architecture diagram: ${key}`);
    const nodesById = new Map(diagram.nodes.map((node) => [node.id, node]));
    const connections = diagram.edges.map((edge) => {
      const source = nodesById.get(edge.from);
      const target = nodesById.get(edge.to);
      if (!source || !target) throw new Error(`Missing endpoint for ${key}: ${edge.from} -> ${edge.to}`);
      return {
        ...edge,
        path: typeof edge.path === 'function' ? edge.path(source, target) : edge.path,
        step: Math.max(edge.step, source.step, target.step),
      };
    });
    const steps = Math.max(...diagram.nodes.map((node) => node.step), ...connections.map((edge) => edge.step));
    const stages = Array.from({ length: steps + 1 }, (_, step) => {
      const edges = connections.filter((edge) => edge.step === step).map((edge) => `
        <g class="graph-edge ${edge.kind ?? ''}" data-from="${edge.from}" data-to="${edge.to}">
          <path class="edge-path" d="${edge.path}" pathLength="1" marker-end="url(#${key}-arrow)" />
          ${edge.label ? `<text class="edge-label" x="${edge.x}" y="${edge.y}">${escape(edge.label)}</text>` : ''}
        </g>`).join('');
      const nodes = diagram.nodes.filter((node) => node.step === step).map((node) => `
        <g class="graph-node ${node.kind ?? ''}" data-node="${node.id}" transform="translate(${node.x} ${node.y})">
          <rect width="${node.w}" height="${node.h}" rx="12" />
          <g transform="translate(18 18)">${icon(node.icon)}</g>
          <text class="node-title" x="54" y="36">${escape(node.title)}</text>
          ${node.detail.map((line, index) => `<text class="node-detail" x="18" y="${70 + index * 30}">${escape(line)}</text>`).join('')}
        </g>`).join('');
      return `<g class="graph-stage${step > 0 ? ' fragment' : ''}" ${step > 0 ? `data-fragment-index="${step - 1}"` : ''} data-stage="${step}">${edges}${nodes}</g>`;
    }).join('');
    mount.innerHTML = `
      <svg class="architecture-svg" data-graph="${key}" viewBox="0 0 ${diagram.width} ${diagram.height}" role="img"
        aria-labelledby="${key}-title ${key}-description" xmlns="http://www.w3.org/2000/svg">
        <title id="${key}-title">${escape(diagram.title)}</title>
        <desc id="${key}-description">${escape(diagram.description)}</desc>
        <defs><marker id="${key}-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L8 5 L1 9" class="arrow-head" /></marker></defs>
        ${stages}
      </svg>
      <ol class="architecture-mobile" aria-label="${escape(diagram.title)}">
        ${diagram.nodes.map((node) => `<li class="${node.kind ?? ''}" data-mobile-node="${node.id}"><span class="stage-icon">${icon(node.icon)}</span><div><strong>${escape(node.title)}</strong><p>${escape(node.detail.join('. '))}</p><small>${diagram.edges.filter((edge) => edge.from === node.id).map((edge) => `To ${escape(diagram.nodes.find((target) => target.id === edge.to)?.title ?? edge.to)}`).join('; ')}</small></div></li>`).join('')}
        ${diagram.edges.some((edge) => edge.kind === 'return') ? '<li class="cycle-return"><span class="stage-icon">' + icon('arrowRight') + '</span><div><strong>Close the loop</strong><p>Current evidence informs the next reviewed decision, not model training.</p></div></li>' : ''}
      </ol>`;
    mount.dataset.steps = String(steps);
  }
}
