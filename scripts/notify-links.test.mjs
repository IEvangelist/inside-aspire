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
  ]);
  assert.equal(links.length, 5);
  assert.match(notificationBody(links), /^@IEvangelist,/);
  assert.match(notificationBody(links), /email delivery is not guaranteed/);
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
