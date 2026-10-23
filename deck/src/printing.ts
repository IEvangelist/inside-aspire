export function sizePrintPages(root: HTMLElement) {
  const pages = [...root.querySelectorAll<HTMLElement>('.pdf-page')];
  if (!pages.length) return;
  const width = document.body.clientWidth;
  const rules: string[] = [];
  for (const [index, page] of pages.entries()) {
    const slide = page.querySelector<HTMLElement>('section');
    if (!slide) throw new Error('Printable page is missing its slide.');
    const name = `inside-slide-${index + 1}`;
    // Long recorded stdout gets a taller page, not smaller or clipped code.
    const height = Math.max(867, Math.ceil(slide.scrollHeight + slide.offsetTop * 2));
    page.style.height = `${height}px`;
    page.style.setProperty('page', name);
    rules.push(`@page ${name} { size: ${width}px ${height}px; margin: 0; }`);
  }
  let style = document.querySelector<HTMLStyleElement>('#complete-print-pages');
  if (!style) {
    style = document.createElement('style');
    style.id = 'complete-print-pages';
    document.head.append(style);
  }
  style.textContent = rules.join('\n');
}
