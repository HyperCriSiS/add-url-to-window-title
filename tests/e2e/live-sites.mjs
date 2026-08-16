import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const extensionPath = resolve(process.cwd());
const extensionName = 'Add URL To Window Title';
const userDataDir = await mkdtemp(join(tmpdir(), 'au2wt-live-'));
let context;

async function findExtensionId() {
  const page = await context.newPage();
  try {
    await page.goto('chrome://extensions/');
    const item = page.locator('extensions-item').filter({ hasText: extensionName }).first();
    await item.waitFor({ state: 'attached', timeout: 10000 });
    const id = await item.getAttribute('id');
    assert.match(id ?? '', /^[a-p]{32}$/);
    return id;
  } finally {
    await page.close();
  }
}

async function enableFullUrl(extensionId) {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    await page.locator('#urlMode').selectOption('full');
    await page.locator('#optionsSaveButtonText').click();
    await page.locator('#status').waitFor({ state: 'visible', timeout: 5000 });
  } finally {
    await page.close();
  }
}

async function waitForTitleToContainCurrentUrl(page, expectedUrl, timeout = 20000) {
  await page.waitForFunction(
    url => document.title.includes(url),
    expectedUrl,
    { timeout }
  );
  const title = await page.title();
  assert.ok(title.includes(expectedUrl), `${title} does not include ${expectedUrl}`);
  console.log(`PASS ${expectedUrl}: ${title}`);
}

async function openAndVerify(url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForTitleToContainCurrentUrl(page, url);
    return page;
  } catch (error) {
    await page.close();
    throw error;
  }
}

try {
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ]
  });

  const extensionId = await findExtensionId();
  await enableFullUrl(extensionId);

  const githubIssuesUrl = 'https://github.com/erichgoldman/add-url-to-window-title/issues';
  const githubIssue42Url = 'https://github.com/erichgoldman/add-url-to-window-title/issues/42';
  const githubPage = await openAndVerify(githubIssuesUrl);
  try {
    const issue42Link = githubPage.locator('a[href="/erichgoldman/add-url-to-window-title/issues/42"]').first();
    await issue42Link.waitFor({ state: 'visible', timeout: 15000 });
    await issue42Link.click();
    await githubPage.waitForURL(githubIssue42Url, { timeout: 20000 });
    await waitForTitleToContainCurrentUrl(githubPage, githubIssue42Url);
    console.log('PASS GitHub Issues in-page navigation');
  } finally {
    await githubPage.close();
  }

  const xProfileUrl = 'https://x.com/quotepage';
  const xStatusUrl = 'https://x.com/quotepage/status/1345777268900188168';
  const xProfile = await openAndVerify(xProfileUrl);
  await xProfile.close();
  const xStatus = await openAndVerify(xStatusUrl);
  await xStatus.close();
} finally {
  await context?.close();
  await rm(userDataDir, { recursive: true, force: true });
}
