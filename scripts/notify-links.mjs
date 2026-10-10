import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateLinks(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    throw new Error('Provide 1-32 verified live links as a JSON array.');
  }
  return value.map((item) => {
    if (!item || typeof item.name !== 'string' || !item.name.trim() ||
        item.name.length > 120 || /[^\x20-\x7e]/.test(item.name) ||
        typeof item.url !== 'string') {
      throw new Error('Each link needs an ASCII name and an HTTPS URL.');
    }
    const url = new URL(item.url);
    const allowedHost = ['github.com', 'gist.github.com', 'ievangelist.github.io', 'davidpine.dev', 'github.blog', 'www.meetup.com'].includes(url.hostname) ||
      /^deploy-preview-\d+--davidpinedev\.netlify\.app$/.test(url.hostname);
    if (url.protocol !== 'https:' || url.username || url.password || !allowedHost ||
        [...url.searchParams.keys()].some((key) => /token|secret|auth|key|signature/i.test(key))) {
      throw new Error(`Not a public deliverable URL: ${item.url}`);
    }
    return { name: item.name.trim(), url: url.href };
  });
}

export async function checkLinks(links) {
  for (const { url } of links) {
    const parsed = new URL(url);
    const prefix = '/IEvangelist/inside-aspire/blob/main/';
    const filePath = parsed.hostname === 'github.com' && parsed.pathname.startsWith(prefix) &&
      !parsed.search && !parsed.hash ? parsed.pathname.slice(prefix.length) : null;
    const target = filePath === null ? url :
      `https://api.github.com/repos/IEvangelist/inside-aspire/contents/${filePath}?ref=main`;
    const headers = {
      'User-Agent': 'InsideAspire-LinkVerification/1.0',
      Accept: filePath === null ? 'text/html' : 'application/vnd.github+json',
    };
    if (filePath !== null) {
      headers['X-GitHub-Api-Version'] = '2022-11-28';
      if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    for (let attempt = 1; attempt <= 3; attempt++) {
      let response;
      let waitMs = 1000 * attempt;
      try {
        response = await fetch(target, {
          redirect: filePath === null ? 'follow' : 'error',
          headers,
          signal: AbortSignal.timeout(15_000),
        });
      } catch (error) {
        const transient = error?.name === 'TimeoutError' || error?.name === 'AbortError' ||
          (error instanceof TypeError && error.message === 'fetch failed');
        if (!transient) throw error;
        if (attempt === 3) {
          throw new Error(`Live-link check failed after 3 attempts: ${url}`, { cause: error });
        }
        console.warn(`Live-link check had a transient network failure; retry ${attempt + 1}/3: ${url}`);
      }
      if (response) {
        try {
          if (response.ok) {
            if (filePath !== null) {
              if (!response.body) throw new Error(`Empty GitHub contents response: ${url}`);
              const decoder = new TextDecoder();
              let content = '';
              for await (const chunk of response.body) content += decoder.decode(chunk, { stream: true });
              const file = JSON.parse(content + decoder.decode());
              if (response.status !== 200 || file?.type !== 'file' || file.html_url !== url) {
                throw new Error(`Authoritative GitHub file check did not match the supplied link: ${url}`);
              }
            }
            break;
          }
          const transient = response.status === 429 || (response.status >= 500 && response.status < 600);
          if (!transient || attempt === 3) {
            throw new Error(`Live-link check failed: HTTP ${response.status} ${url} (attempt ${attempt}/3)`);
          }
          const retryAfter = response.headers.get('retry-after');
          if (retryAfter) {
            const requested = /^\d+$/.test(retryAfter)
              ? Number(retryAfter) * 1000
              : Date.parse(retryAfter) - Date.now();
            if (Number.isFinite(requested)) waitMs = Math.min(5000, Math.max(0, requested));
          }
          console.warn(`Live-link check returned HTTP ${response.status}; retry ${attempt + 1}/3: ${url}`);
        } finally {
          await response.body?.cancel();
        }
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

export function notificationBody(links) {
  const list = links.map(({ name, url }) => `- [${name.replace(/([\\[\]])/g, '\\$1')}](<${url}>)`).join('\n');
  return `@IEvangelist, the verified Inside Aspire deliverables are live.\n\n${list}\n\n` +
    'This notification was sent by the manually dispatched GitHub Actions bot. ' +
    'GitHub account notification preferences determine email delivery; email delivery is not guaranteed.';
}

async function main() {
  const repository = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (repository !== 'IEvangelist/inside-aspire' || !token || !process.env.LINKS_JSON) {
    throw new Error('Use the manual notify-links workflow in IEvangelist/inside-aspire with its GITHUB_TOKEN.');
  }
  const links = validateLinks(JSON.parse(process.env.LINKS_JSON));
  await checkLinks(links);
  const response = await fetch(`https://api.github.com/repos/${repository}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: 'Inside Aspire: verified live links',
      body: notificationBody(links),
      assignees: ['IEvangelist'],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub notification failed: HTTP ${response.status}`);
  const issue = await response.json();
  if (typeof issue.html_url !== 'string') throw new Error('GitHub returned no notification issue URL.');
  console.log(`Created GitHub notification: ${issue.html_url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
