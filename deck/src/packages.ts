const colors = ['purple', 'cyan', 'pink', 'teal'] as const;
type PackageColor = typeof colors[number];
type PackageAnnotation = { color: PackageColor; label: string; add: string; apis: string[]; lines: Set<number> };

export function validatePackageMarkup(html: string) {
  let slide = 'reference';
  for (const tag of html.matchAll(/<(section|pre)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
    if (tag[1].toLowerCase() === 'section') {
      slide = tag[2].match(/\bid="([^"]+)"/)?.[1] ?? slide;
      continue;
    }
    const seen = new Set<string>();
    const block = tag[2].match(/\bdata-label="([^"]+)"/)?.[1] ?? 'code';
    for (const attribute of tag[2].matchAll(/\s+([-\w]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g)) {
      const name = attribute[1].toLowerCase();
      if (!/^data-(pkg|add|apis|lines)-/.test(name)) continue;
      if (seen.has(name)) throw new Error(`Package annotations: slide "${slide}", block "${block}": duplicate ${name}.`);
      seen.add(name);
    }
  }
}

function apiNodes(line: HTMLElement, api: string): Text[] {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  const pattern = new RegExp(`\\b${api}\\b`);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node instanceof Text && !node.parentElement?.closest('.hljs-string,.hljs-comment,.hljs-doctag,.hljs-regexp') &&
        pattern.test(node.data)) nodes.push(node);
  }
  return nodes;
}

function markApi(line: HTMLElement, api: string, annotation: PackageAnnotation) {
  for (const node of apiNodes(line, api)) {
    const source = node.data;
    const result = document.createDocumentFragment();
    let start = 0;
    for (const match of source.matchAll(new RegExp(`\\b${api}\\b`, 'g'))) {
      result.append(source.slice(start, match.index));
      const token = document.createElement('span');
      token.className = 'pkg-api';
      token.dataset.pkg = annotation.color;
      token.title = `${api} - ${annotation.label || `aspire add ${annotation.add}`}`;
      token.textContent = api;
      result.append(token);
      start = match.index + api.length;
    }
    result.append(source.slice(start));
    node.replaceWith(result);
  }
}

export function annotatePackages(root: HTMLElement) {
  for (const pre of root.querySelectorAll<HTMLPreElement>('pre')) {
    const attributes = pre.getAttributeNames().filter((name) => /^data-(pkg|add|apis|lines)-/.test(name));
    if (!attributes.length) continue;
    const code = pre.querySelector<HTMLElement>('code');
    const caption = pre.closest('.code-panel')?.querySelector('figcaption');
    const slide = pre.closest('section')?.id ?? 'reference';
    const fail: (reason: string) => never = (reason) => {
      throw new Error(`Package annotations: slide "${slide}", block "${pre.dataset.label ?? code?.id ?? 'code'}": ${reason}`);
    };
    if (!code || !caption) fail('a code window with an original caption is required.');
    for (const name of attributes) {
      if (!colors.some((color) => name.endsWith(`-${color}`))) fail(`unknown accent in ${name}.`);
    }
    const lines = [...code.querySelectorAll<HTMLElement>('.code-line')];
    const packages: PackageAnnotation[] = [];
    const ownedApis = new Set<string>();
    const ownedLines = new Set<number>();
    for (const color of colors) {
      if (!attributes.some((name) => name.endsWith(`-${color}`))) continue;
      const label = pre.getAttribute(`data-pkg-${color}`)?.trim() ?? '';
      const add = pre.getAttribute(`data-add-${color}`)?.trim() ?? '';
      if (!label && !add) fail(`${color} needs a package name or aspire add identifier.`);
      const apis = (pre.getAttribute(`data-apis-${color}`) ?? '').trim().split(/\s+/).filter(Boolean);
      if (!apis.length || apis.some((api) => !/^[a-zA-Z_]\w*$/.test(api))) fail(`${color} needs exact API identifiers.`);
      const found = new Set<number>();
      for (const api of apis) {
        if (ownedApis.has(api)) fail(`API ${api} is owned by more than one package.`);
        ownedApis.add(api);
        const matches = lines.map((line, index) => apiNodes(line, api).length ? index + 1 : 0).filter(Boolean);
        if (!matches.length) fail(`${api} is not present as a code token; strings and comments do not count.`);
        matches.forEach((number) => found.add(number));
      }
      const ranges = pre.getAttribute(`data-lines-${color}`);
      const selected = new Set<number>();
      if (ranges === null) found.forEach((number) => selected.add(number));
      else {
        for (const range of ranges.split(',')) {
          if (!/^\d+(?:-\d+)?$/.test(range.trim())) fail(`invalid ${color} line range.`);
          const [first, last = first] = range.trim().split('-').map(Number);
          if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) ||
              first < 1 || last < first || last > lines.length) fail(`${color} line range exceeds the block.`);
          for (let number = first; number <= last; number++) {
            if (selected.has(number)) fail(`${color} line ranges overlap.`);
            selected.add(number);
          }
        }
      }
      if ([...found].some((number) => !selected.has(number))) fail(`${color} API lies outside its package's lines.`);
      for (const number of selected) {
        if (ownedLines.has(number)) fail(`package line ranges overlap at line ${number}.`);
        ownedLines.add(number);
      }
      packages.push({ color, label, add, apis, lines: selected });
    }
    const source = code.textContent;
    const legend = document.createElement('span');
    legend.className = 'package-legend';
    legend.dataset.uxDecoration = '';
    legend.id = `${code.id || `${slide}-code`}-packages`;
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', 'Packages providing the marked APIs');
    for (const annotation of packages) {
      const label = document.createElement('span');
      label.className = 'package-label';
      label.dataset.pkg = annotation.color;
      const swatch = document.createElement('span');
      swatch.className = 'package-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.className = 'package-name';
      name.textContent = annotation.label;
      label.append(swatch, name);
      if (annotation.add) {
        const add = document.createElement('span');
        add.className = 'package-add';
        add.textContent = `aspire add ${annotation.add}`;
        label.append(add);
      }
      legend.append(label);
      for (const number of annotation.lines) {
        const line = lines[number - 1];
        line.dataset.rail = annotation.color;
        if (!annotation.lines.has(number - 1)) line.classList.add('package-start');
        if (!annotation.lines.has(number + 1)) line.classList.add('package-end');
        for (const api of annotation.apis) markApi(line, api, annotation);
      }
    }
    caption.append(legend);
    pre.setAttribute('aria-describedby', legend.id);
    if (code.textContent !== source) fail('annotation changed copied source.');
  }
}
