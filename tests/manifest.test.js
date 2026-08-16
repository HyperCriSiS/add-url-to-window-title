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

test('Firefox Android distribution is explicitly enabled', () => {
  assert.equal(
    manifest.browser_specific_settings.gecko_android.strict_min_version,
    '142.0'
  );
});

test('Firefox desktop minimum supports data consent metadata', () => {
  assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '140.0');
});

test('fork uses its own extension ID', () => {
  assert.notEqual(manifest.browser_specific_settings.gecko.id, 'autt@ericgoldman.name');
});

test('extension has no background worker', () => {
  assert.equal(manifest.background, undefined);
});

test('main-world navigation hook and isolated title script both run at document_start', () => {
  assert.equal(manifest.content_scripts.length, 2);
  assert.equal(manifest.content_scripts[0].world, 'MAIN');
  assert.equal(manifest.content_scripts[0].run_at, 'document_start');
  assert.deepEqual(manifest.content_scripts[1].js, ['title-core.js', 'managetitle.js']);
  assert.equal(manifest.content_scripts[1].run_at, 'document_start');
});
