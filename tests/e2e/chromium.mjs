import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const extensionPath = resolve(process.cwd());
const extensionName = 'Add URL To Window Title';
const expectedHost = '127.0.0.1/';

const fixtures = new Map([
  ['/static', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Static Title</title></head>
    <body>static</body></html>`],

  ['/dynamic', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Initial</title></head>
    <body>dynamic<script>
      setTimeout(() => { document.title = 'Updated'; }, 100);
    </script></body></html>`],

  ['/spa', `<!doctype html>
    <html><head><meta charset="utf-8"><title>SPA Start</title></head>
    <body>spa<script>
      setTimeout(() => {
        history.pushState({}, '', '/spa-next?source=test#result');
        document.title = 'SPA Next';
      }, 100);
    </script></body></html>`],

  ['/late-title', `<!doctype html>
    <html><head><meta charset="utf-8"></head>
    <body>late<script>
      setTimeout(() => { document.title = 'Late Title'; }, 100);
    </script></body></html>`],

  ['/replace-title', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Before Replace</title></head>
    <body>replace<script>
      setTimeout(() => {
        const oldTitle = document.querySelector('title');
        const newTitle = document.createElement('title');
        newTitle.textContent = 'After Replace';
        oldTitle.replaceWith(newTitle);
      }, 100);
    </script></body></html>`],

  ['/move-title', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Before Move</title></head>
    <body>move<script>
      setTimeout(() => {
        const title = document.querySelector('title');
        document.body.appendChild(title);
        title.textContent = 'After Move';
      }, 100);
    </script></body></html>`],

  ['/rebase', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Inbox</title></head>
    <body>rebase<script>
      setTimeout(() => { document.title = '(2) ' + document.title; }, 250);
    </script></body></html>`],

  ['/stress', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Stress 0</title></head>
    <body>stress<script>
      let i = 0;
      const timer = setInterval(() => {
        i += 1;
        document.title = 'Stress ' + i;
        if (i === 30) clearInterval(timer);
      }, 20);
    </script></body></html>`],

  ['/input', `<!doctype html>
    <html><head><meta charset="utf-8"><title>Login</title></head>
    <body>
      <label>User <input id="user" name="username" type="text"></label>
      <button id="outside" type="button">Outside</button>
    </body></html>`]
]);

function startServer() {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url, 'http://127.0.0.1');
    const body = fixtures.get(requestUrl.pathname);

    if (!body) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    });
    response.end(body);
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolveServer({ server, port: address.port });
    });
  });
}

async function waitForTitle(page, expected, timeout = 5000) {
  await page.waitForFunction(
    expectedTitle => document.title === expectedTitle,
    expected,
    { timeout }
  );
  assert.equal(await page.title(), expected);
}

async function runCase(context, baseUrl, path, expectedTitle, extraCheck) {
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}${path}`, { waitUntil: 'load' });
    await waitForTitle(page, expectedTitle);
    if (extraCheck) {
      await extraCheck(page);
    }
    console.log(`PASS ${path}: ${await page.title()}`);
  } finally {
    await page.close();
  }
}

async function runManyTabSmoke(context, baseUrl, count = 40) {
  const pages = await Promise.all(Array.from({ length: count }, () => context.newPage()));
  const expected = `Updated - ${baseUrl}/dynamic`;

  try {
    await Promise.all(
      pages.map(page => page.goto(`${baseUrl}/dynamic`, { waitUntil: 'load' }))
    );
    await Promise.all(pages.map(page => waitForTitle(page, expected, 10000)));
    assert.ok(pages.every(page => page.url() === `${baseUrl}/dynamic`));
    console.log(`PASS many-tab smoke: ${count} simultaneous tabs`);
  } finally {
    await Promise.all(pages.map(page => page.close()));
  }
}

async function findExtensionId(context) {
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/');
    const item = page.locator('extensions-item').filter({ hasText: extensionName }).first();
    await item.waitFor({ state: 'attached', timeout: 5000 });
    const extensionId = await item.getAttribute('id');
    assert.match(extensionId ?? '', /^[a-p]{32}$/);
    return extensionId;
  } finally {
    await page.close();
  }
}

async function saveOptions(context, extensionId, { urlMode, showFieldAttributes }) {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.locator('#urlMode').selectOption(urlMode);
    await page.locator('#showFieldAttributes').setChecked(showFieldAttributes);
    await page.locator('#optionsSaveButtonText').click();
    await page.locator('#status').waitFor({ state: 'visible' });
  } finally {
    await page.close();
  }
}

const { server, port } = await startServer();
const userDataDir = await mkdtemp(join(tmpdir(), 'au2wt-playwright-'));
const baseUrl = `http://127.0.0.1:${port}`;
let context;

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  await runCase(context, baseUrl, '/static', `Static Title - ${expectedHost}`);
  await runCase(context, baseUrl, '/dynamic', `Updated - ${expectedHost}`);
  await runCase(
    context,
    baseUrl,
    '/spa',
    `SPA Next - ${expectedHost}`,
    async page => assert.match(page.url(), /\/spa-next\?source=test#result$/)
  );
  await runCase(context, baseUrl, '/late-title', `Late Title - ${expectedHost}`);
  await runCase(context, baseUrl, '/replace-title', `After Replace - ${expectedHost}`);
  await runCase(context, baseUrl, '/move-title', `After Move - ${expectedHost}`);
  await runCase(context, baseUrl, '/rebase', `(2) Inbox - ${expectedHost}`);
  await runCase(context, baseUrl, '/stress', `Stress 30 - ${expectedHost}`, async page => {
    const title = await page.title();
    assert.equal(title.split(expectedHost).length - 1, 1, 'URL suffix must occur exactly once');
  });

  const extensionId = await findExtensionId(context);
  console.log(`PASS extension discovery: ${extensionId}`);

  const liveSettingsPage = await context.newPage();
  try {
    await liveSettingsPage.goto(`${baseUrl}/static`, { waitUntil: 'load' });
    await waitForTitle(liveSettingsPage, `Static Title - ${expectedHost}`);

    await saveOptions(context, extensionId, {
      urlMode: 'full',
      showFieldAttributes: true
    });

    await waitForTitle(liveSettingsPage, `Static Title - ${baseUrl}/static`);
    console.log(`PASS live settings update: ${await liveSettingsPage.title()}`);
  } finally {
    await liveSettingsPage.close();
  }

  const inputPage = await context.newPage();
  try {
    await inputPage.goto(`${baseUrl}/input`, { waitUntil: 'load' });
    await waitForTitle(inputPage, `Login - ${baseUrl}/input`);

    await inputPage.locator('#user').focus();
    await waitForTitle(
      inputPage,
      `Login - ${baseUrl}/input [Input Name: "username"] [Input ID: "user"]`
    );

    await inputPage.locator('#outside').focus();
    await waitForTitle(inputPage, `Login - ${baseUrl}/input`);
    console.log('PASS input focus attributes and blur cleanup');
  } finally {
    await inputPage.close();
  }

  await saveOptions(context, extensionId, {
    urlMode: 'fullNoQuery',
    showFieldAttributes: false
  });

  await runManyTabSmoke(context, baseUrl, 40);
  await runCase(
    context,
    baseUrl,
    '/spa',
    `SPA Next - ${baseUrl}/spa-next`,
    async page => {
      assert.match(page.url(), /\/spa-next\?source=test#result$/);
      assert.ok(!(await page.title()).includes('source=test'));
      assert.ok(!(await page.title()).includes('#result'));
    }
  );
} finally {
  await context?.close();
  await new Promise(resolveClose => server.close(resolveClose));
  await rm(userDataDir, { recursive: true, force: true });
}
