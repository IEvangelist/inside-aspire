import assert from 'node:assert/strict';
import test from 'node:test';
import { notificationBody, validateLinks } from './notify-links.mjs';

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
