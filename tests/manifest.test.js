'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8')
);

test('Firefox manifest declares no data collection', () => {
  assert.deepEqual(
    manifest.browser_specific_settings.gecko.data_collection_permissions.required,
    ['none']
  );
});

test('Firefox Android distribution is explicitly enabled without a product-version gate', () => {
  assert.deepEqual(manifest.browser_specific_settings.gecko_android, {});
});

test('Gecko compatibility is not gated by Firefox product version', () => {
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, undefined);
});

test('fork uses its own extension ID', () => {
  assert.notEqual(manifest.browser_specific_settings.gecko.id, 'autt@ericgoldman.name');
});

test('extension has no background worker', () => {
  assert.equal(manifest.background, undefined);
});

test('required website access is declared explicitly', () => {
  assert.deepEqual(manifest.host_permissions, ['http://*/*', 'https://*/*']);
});

test('main-world navigation hook and isolated title script both run at document_start', () => {
  assert.equal(manifest.content_scripts.length, 2);
  assert.equal(manifest.content_scripts[0].world, 'MAIN');
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
  assert.deepEqual(manifest.content_scripts[1].js, ['title-core.js', 'managetitle.js', 'diagnostics-content.js']);
  assert.equal(manifest.content_scripts[1].run_at, 'document_start');
});

test('diagnostics action uses temporary active-tab access without broader tab or scripting permissions', () => {
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab']);
  assert.equal(manifest.permissions.includes('tabs'), false);
  assert.equal(manifest.permissions.includes('scripting'), false);
  assert.equal(manifest.action.default_popup, 'diagnostics.html');
  assert.equal(manifest.action.default_title, '__MSG_diagnosticsActionTitle__');
});
