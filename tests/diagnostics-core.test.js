'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const diagnostics = require('../diagnostics-core.js');

const { STATES } = diagnostics;

test('reachable pages distinguish managed and overwritten titles', () => {
  assert.equal(diagnostics.classifyPage('https://example.com/', true, true), STATES.REACHABLE);
  assert.equal(diagnostics.classifyPage('https://example.com/', true, false), STATES.OVERRIDDEN);
});

test('ordinary web pages without a content-script response are reported separately', () => {
  assert.equal(diagnostics.classifyPage('https://example.com/', false), STATES.WEB_UNREACHABLE);
});

test('inherited-origin documents are recognized', () => {
  assert.equal(diagnostics.classifyPage('about:blank', false), STATES.INHERITED_ORIGIN);
  assert.equal(diagnostics.classifyPage('about:srcdoc', false), STATES.INHERITED_ORIGIN);
  assert.equal(diagnostics.classifyPage('data:text/plain,test', false), STATES.INHERITED_ORIGIN);
  assert.equal(diagnostics.classifyPage('blob:https://example.com/id', false), STATES.INHERITED_ORIGIN);
});

test('restricted, file, and extension pages are classified without exposing full URLs', () => {
  assert.equal(diagnostics.classifyPage('about:config', false), STATES.RESTRICTED);
  assert.equal(diagnostics.classifyPage('chrome://settings/', false), STATES.RESTRICTED);
  assert.equal(diagnostics.classifyPage('file:///tmp/secret.txt', false), STATES.FILE);
  assert.equal(diagnostics.classifyPage('moz-extension://id/options.html', false), STATES.EXTENSION_PAGE);
  assert.equal(diagnostics.safePageLabel('https://example.com/private?token=secret#section'), 'https://example.com');
  assert.equal(diagnostics.safePageLabel('file:///tmp/secret.txt'), 'file:');
});
