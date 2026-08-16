'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../title-core.js');

test('cleanText preserves normal punctuation including apostrophes', () => {
  assert.equal(core.cleanText("Ash's Profile\u0007"), "Ash's Profile");
});

test('legacy full URL setting migrates to full mode', () => {
  assert.equal(core.normalizeUrlMode(undefined, true), core.URL_MODES.FULL);
  assert.equal(core.normalizeUrlMode(undefined, false), core.URL_MODES.HOSTNAME);
});

test('hostname mode shows hostname with trailing slash', () => {
  assert.equal(
    core.getDisplayedUrl('https://example.com/a?b=1#c', 'example.com', core.URL_MODES.HOSTNAME),
    'example.com/'
  );
});

test('full URL mode preserves query and fragment', () => {
  const href = 'https://example.com/a?b=1#c';
  assert.equal(core.getDisplayedUrl(href, 'example.com', core.URL_MODES.FULL), href);
});

test('full URL without query mode removes query and fragment', () => {
  assert.equal(
    core.getDisplayedUrl('https://example.com/a?b=1#c', 'example.com', core.URL_MODES.FULL_NO_QUERY),
    'https://example.com/a'
  );
});

test('formatTitle does not add a leading separator when page title is empty', () => {
  assert.equal(core.formatTitle({ baseTitle: '', displayedUrl: 'example.com/' }), 'example.com/');
});

test('formatTitle appends field attributes after URL', () => {
  assert.equal(
    core.formatTitle({
      baseTitle: 'Login',
      displayedUrl: 'example.com/',
      separatorString: '::',
      fieldAttributes: '[Input ID: "user"]'
    }),
    'Login :: example.com/ [Input ID: "user"]'
  );
});
