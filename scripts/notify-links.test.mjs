import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLinks, notificationBody, validateLinks } from './notify-links.mjs';

const link = { name: 'Runbook', url: 'https://github.com/IEvangelist/inside-aspire/blob/main/docs/RUNBOOK.md' };
const originalSetTimeout = globalThis.setTimeout;

function fileResponse(overrides = {}, status = 200) {
  return Response.json({ type: 'file', html_url: link.url, ...overrides }, { status });
}

function captureRetryWaits(context) {
  const waits = [];
  context.mock.method(globalThis, 'setTimeout', (callback, milliseconds, ...args) => {
    waits.push(milliseconds);
    return originalSetTimeout(callback, 0, ...args);
  });
  context.mock.method(console, 'warn', () => {});
  return waits;
}

test('accepts the verified repository, deck, gist, and site preview link shapes', () => {
  const links = validateLinks([
    { name: 'Deck', url: 'https://ievangelist.github.io/inside-aspire/' },
    { name: 'Demo', url: 'https://github.com/IEvangelist/inside-aspire/tree/main/demo' },
    { name: 'Site PR', url: 'https://github.com/IEvangelist/davidpine.dev/pull/7' },
    { name: 'Preview', url: 'https://deploy-preview-7--davidpinedev.netlify.app/slides' },
    { name: 'Gist', url: 'https://gist.github.com/IEvangelist/example' },
    { name: 'GitHub article', url: 'https://github.blog/ai-and-ml/github-copilot/automating-cross-repo-documentation-with-github-agentic-workflows/' },
    { name: 'Event', url: 'https://www.meetup.com/wisconsin-net-users-group/' },
  ]);
  assert.equal(links.length, 7);
  assert.match(notificationBody(links), /^@IEvangelist,/);
  assert.match(notificationBody(links), /email delivery is not guaranteed/);
});

test('accepts all 32 deliverables and rejects a 33rd link', () => {
  const links = Array.from({ length: 32 }, (_, index) => ({
    name: `Deliverable ${index + 1}`,
    url: `https://github.com/IEvangelist/inside-aspire#deliverable-${index + 1}`,
  }));
  assert.equal(validateLinks(links).length, 32);
  assert.throws(() => validateLinks([...links, links[0]]), /1-32/);
});

test('rejects empty data, invalid shape, secret URLs, and unrelated hosts', () => {
  for (const input of [null, [], [{ name: '', url: 'https://github.com' }], [{ name: 'Deck', url: 'http://ievangelist.github.io' }]]) {
    assert.throws(() => validateLinks(input));
  }
  for (const url of ['https://user:password@github.com/', 'https://github.com/?token=private', 'https://example.com/', 'javascript:alert(1)']) {
    assert.throws(() => validateLinks([{ name: 'Link', url }]));
  }
});

test('escapes Markdown label delimiters without adding extra mentions', () => {
  const body = notificationBody(validateLinks([{ name: 'Repo [source]', url: 'https://github.com/IEvangelist/inside-aspire' }]));
  assert.match(body, /Repo \\\[source\\\]/);
  assert.equal((body.match(/@IEvangelist/g) ?? []).length, 1);
});

test('checks links sequentially instead of making parallel GitHub requests', async (context) => {
  let active = 0;
  let maximum = 0;
  const fetch = context.mock.method(globalThis, 'fetch', async () => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setImmediate(resolve));
    active--;
    return fileResponse();
  });
  await checkLinks([link, link, link]);
  assert.equal(fetch.mock.callCount(), 3);
  assert.equal(maximum, 1);
  const options = fetch.mock.calls[0].arguments[1];
  assert.equal(options.headers['User-Agent'], 'InsideAspire-LinkVerification/1.0');
  assert.equal(options.headers.Accept, 'application/vnd.github+json');
  assert.equal(options.redirect, 'error');
});

test('retries a transient 503 once and cancels both response bodies', async (context) => {
  const waits = captureRetryWaits(context);
  const responses = [new Response('busy', { status: 503 }), fileResponse()];
  const cancellations = responses.map((response) => context.mock.method(response.body, 'cancel'));
  let index = 0;
  const fetch = context.mock.method(globalThis, 'fetch', async () => responses[index++]);
  await checkLinks([link]);
  assert.equal(fetch.mock.callCount(), 2);
  assert.deepEqual(waits, [1000]);
  assert(cancellations.every((cancel) => cancel.mock.callCount() === 1));
});

test('persistent 503 fails after three attempts and does not check later links', async (context) => {
  const waits = captureRetryWaits(context);
  const cancellations = [];
  const fetch = context.mock.method(globalThis, 'fetch', async () => {
    const response = new Response('busy', { status: 503 });
    cancellations.push(context.mock.method(response.body, 'cancel'));
    return response;
  });
  await assert.rejects(checkLinks([link, link]), /HTTP 503.*attempt 3\/3/);
  assert.equal(fetch.mock.callCount(), 3);
  assert.deepEqual(waits, [1000, 2000]);
  assert(cancellations.every((cancel) => cancel.mock.callCount() === 1));
});

test('persistent network timeout fails after exactly three attempts', async (context) => {
  const waits = captureRetryWaits(context);
  const timeout = new DOMException('Fixture network timeout', 'TimeoutError');
  const fetch = context.mock.method(globalThis, 'fetch', async () => { throw timeout; });
  await assert.rejects(checkLinks([link]), (error) =>
    /failed after 3 attempts/.test(error.message) && error.cause === timeout);
  assert.equal(fetch.mock.callCount(), 3);
  assert.deepEqual(waits, [1000, 2000]);
});

test('network fetch failure can recover without retrying unrelated errors', async (context) => {
  captureRetryWaits(context);
  let count = 0;
  const fetch = context.mock.method(globalThis, 'fetch', async () => {
    if (count++ === 0) throw new TypeError('fetch failed');
    return fileResponse();
  });
  await checkLinks([link]);
  assert.equal(fetch.mock.callCount(), 2);
  const unexpected = new Error('Fixture programming failure');
  fetch.mock.mockImplementation(async () => { throw unexpected; });
  await assert.rejects(checkLinks([link]), (error) => error === unexpected);
  assert.equal(fetch.mock.callCount(), 3);
});

test('permanent 404 is not retried and its response body is canceled', async (context) => {
  const waits = captureRetryWaits(context);
  const response = new Response('not found', { status: 404 });
  const cancel = context.mock.method(response.body, 'cancel');
  const fetch = context.mock.method(globalThis, 'fetch', async () => response);
  await assert.rejects(checkLinks([link]), /HTTP 404.*attempt 1\/3/);
  assert.equal(fetch.mock.callCount(), 1);
  assert.equal(cancel.mock.callCount(), 1);
  assert.deepEqual(waits, []);
});

test('honors a reasonable 429 Retry-After and caps longer waits', async (context) => {
  const waits = captureRetryWaits(context);
  const responses = [
    new Response('limited', { status: 429, headers: { 'retry-after': '1' } }),
    new Response('busy', { status: 503, headers: { 'retry-after': '120' } }),
    fileResponse(),
  ];
  let index = 0;
  context.mock.method(globalThis, 'fetch', async () => responses[index++]);
  await checkLinks([link]);
  assert.deepEqual(waits, [1000, 5000]);
});

test('honors Retry-After dates and falls back for malformed headers', async (context) => {
  const waits = captureRetryWaits(context);
  const now = Date.parse('2026-10-10T05:00:00Z');
  context.mock.method(Date, 'now', () => now);
  const responses = [
    new Response('busy', { status: 503, headers: { 'retry-after': 'Sat, 10 Oct 2026 05:00:02 GMT' } }),
    new Response('busy', { status: 503, headers: { 'retry-after': 'invalid' } }),
    fileResponse(),
  ];
  let index = 0;
  context.mock.method(globalThis, 'fetch', async () => responses[index++]);
  await checkLinks([link]);
  assert.deepEqual(waits, [2000, 2000]);
});

test('maps only the known own-repo blob/main file URL to official contents metadata', async (context) => {
  const response = fileResponse();
  const cancel = context.mock.method(response.body, 'cancel');
  const fetch = context.mock.method(globalThis, 'fetch', async () => response);
  await checkLinks([link]);
  assert.equal(fetch.mock.calls[0].arguments[0],
    'https://api.github.com/repos/IEvangelist/inside-aspire/contents/docs/RUNBOOK.md?ref=main');
  assert.equal(cancel.mock.callCount(), 1);
  assert.equal(link.url, 'https://github.com/IEvangelist/inside-aspire/blob/main/docs/RUNBOOK.md');
});

test('rejects mismatched html_url, non-file metadata, and non-200 API success', async (context) => {
  const cases = [
    fileResponse({ html_url: 'https://github.com/IEvangelist/inside-aspire/blob/main/docs/ABSTRACT.md' }),
    fileResponse({ type: 'dir' }),
    fileResponse({}, 201),
  ];
  let index = 0;
  const fetch = context.mock.method(globalThis, 'fetch', async () => cases[index++]);
  for (const response of cases) {
    const cancel = context.mock.method(response.body, 'cancel');
    await assert.rejects(checkLinks([link]), /did not match the supplied link/);
    assert.equal(cancel.mock.callCount(), 1);
  }
  assert.equal(fetch.mock.callCount(), 3);
});

test('sends the workflow token only to the fixed official API host without redirects', async (context) => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = 'fixture-token';
  context.after(() => {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  });
  const otherLinks = [
    { name: 'Blog', url: 'https://github.blog/' },
    { name: 'Meetup', url: 'https://www.meetup.com/' },
    { name: 'Site', url: 'https://davidpine.dev/' },
    { name: 'Other repo', url: 'https://github.com/microsoft/aspire/blob/main/README.md' },
  ];
  const fetch = context.mock.method(globalThis, 'fetch', async (url) =>
    new URL(url).hostname === 'api.github.com' ? fileResponse() : new Response('ok'));
  await checkLinks([link, ...otherLinks]);
  for (const { arguments: [url, options] } of fetch.mock.calls) {
    if (new URL(url).hostname === 'api.github.com') {
      assert.equal(options.headers.Authorization, 'Bearer fixture-token');
      assert.equal(options.redirect, 'error');
    } else {
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(options.redirect, 'follow');
      assert.equal(options.headers.Accept, 'text/html');
    }
  }
});
