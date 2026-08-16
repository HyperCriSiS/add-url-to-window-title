# Add URL To Window Title

[![Extension validation](https://github.com/HyperCriSiS/add-url-to-window-title/actions/workflows/ci.yml/badge.svg?branch=dev-modernization)](https://github.com/HyperCriSiS/add-url-to-window-title/actions/workflows/ci.yml)

A modernized fork of [erichgoldman/add-url-to-window-title](https://github.com/erichgoldman/add-url-to-window-title). The extension appends the current page address to `document.title`, allowing desktop applications such as password managers and activity trackers to identify the active browser page without direct browser integration.

> **Release status:** `v3.2.0` is the first stable release of the modernized fork. Development continues on `dev-modernization`; upstream store listings remain separate from this fork.

## What this fork changes

The original extension is useful but several assumptions no longer hold on modern SPAs and frequently mutating websites. This fork focuses on reliability and low overhead:

- robust tracking when `<title>` is replaced, moved, created late, or changed repeatedly;
- SPA navigation detection without a permanent one-second polling timer in every tab;
- native Navigation API use where available, with History API fallback where needed;
- rate limiting when a site continuously overwrites `document.title`;
- protection against duplicated URL suffixes when a site modifies the already-rendered title;
- delegated input-focus handling instead of listeners and MutationObservers for every input;
- three URL modes: hostname, full URL, or full URL without query/fragment;
- preservation of normal punctuation such as apostrophes;
- Manifest V3, Firefox Android metadata, and explicit `none` data-collection declaration;
- no runtime third-party dependencies and no background worker;
- dependency-free unit tests, strict Mozilla `web-ext` validation, package validation, and real Chromium/Firefox extension E2E tests in GitHub Actions.

See [Roadmap.md](Roadmap.md) for the complete migration and validation status.

## URL display modes

Given `https://example.com/account/login?next=/settings#password`, the extension can append:

| Mode | Value |
| --- | --- |
| Hostname only | `example.com/` |
| Full URL | `https://example.com/account/login?next=/settings#password` |
| Full URL without query/fragment | `https://example.com/account/login` |

A configurable separator is placed between the original title and the URL. Optionally, the `name` and `id` attributes of focused text-like input fields can also be appended for more specific password-manager auto-type rules.

## Browser support for this development branch

The current manifest targets:

- Firefox / Gecko desktop 128 or newer;
- Firefox for Android 128 or newer;
- Chromium-based browsers 121 or newer.

Release-gating CI verifies a temporary installation of the exact built package in current Firefox and a real loaded Chromium MV3 extension. Waterfox is tracked separately because its current WebDriver temporary-install path accepts the add-on but does not inject even a minimal content script; direct Waterfox desktop and physical Android checks are therefore post-release compatibility validation rather than stable-release gates.

### Android System WebView limitation

A WebExtension only runs where the browser injects its content scripts. A third-party Android app's own `android.webkit.WebView` / System WebView is not a Firefox or Chrome tab and does not load browser extensions. This fork therefore cannot force support inside arbitrary app-owned WebViews.

It does improve browser-owned inherited-origin documents such as eligible `about:blank`, `about:srcdoc`, `data:` and `blob:` pages where the browser permits content-script injection.

## Privacy and permissions

The extension uses the WebExtension `storage` permission for settings and `activeTab` for the toolbar diagnostics popup. `activeTab` grants temporary access only after the user invokes the browser action; the diagnostics path uses it to ask the already-running content script whether the current page is reachable and whether the extension-managed title is still active. No broad `tabs` or `scripting` permission is requested.

The extension does not declare data collection or transmission. There is no analytics SDK, remote script, runtime framework, background service worker, or network API used by the extension code. The content script necessarily reads the current page URL/title because placing that information in the browser window title is the extension's purpose. Settings are stored with the browser's extension storage API.

## Development

No `npm install` is required for the extension itself or for its unit tests.

Run the dependency-free tests with Node.js:

```bash
node --test tests/*.test.js
```

Validate JavaScript syntax:

```bash
node --check title-core.js
node --check navigation-hook.js
node --check managetitle.js
node --check options.js
```

Mozilla linting uses `web-ext` 10.5.0:

```bash
npx --yes web-ext@10.5.0 lint --source-dir . --warnings-as-errors
```

Build the installable ZIP:

```bash
npx --yes web-ext@10.5.0 build --source-dir . --artifacts-dir web-ext-artifacts --overwrite-dest
```

Development-only files are excluded through `web-ext-config.mjs`.

## Automated browser testing

GitHub Actions builds one validated extension package and reuses that package for Firefox testing. Chromium loads the repository as an unpacked MV3 extension.

The automated browser suite currently covers:

- static and dynamically rewritten titles;
- SPA `pushState` navigation;
- `<title>` elements created late, replaced, or moved;
- pages that derive a new title from the extension-modified title;
- rapid repeated title mutations without duplicate URL suffixes;
- options UI and live `storage.sync` updates;
- focused input field attributes;
- the URL-without-query/fragment mode;
- the diagnostics popup through the real active-tab messaging path;
- a 40-simultaneous-tab Chromium smoke test;
- temporary installation of the built package in current Firefox.

## Temporary installation

### Firefox / Waterfox

Open `about:debugging`, choose **This Firefox**, select **Load Temporary Add-on**, and choose `manifest.json` from the repository checkout. The CI suite additionally verifies temporary installation of the built package through Firefox WebDriver.

### Chromium / Chrome

Open the extensions management page, enable **Developer mode**, choose **Load unpacked**, and select the repository directory. This loading mode is exercised automatically in Chromium CI.

## Release validation and remaining compatibility checks

The `v3.2.0` release is gated by unit/manifest checks, Mozilla `web-ext` lint, package validation, real Chromium extension E2E, and temporary installation of the exact built package in current Firefox. The GitHub/X regression from upstream issue #42 and the delayed Chase title-overwrite regression from issue #41 are also covered by the separate live-site smoke workflow.

A controlled high-tab workflow passed 250 and 500 simultaneous loaded tabs. At 750/1000 tabs the GitHub/Playwright harness itself becomes the limiting factor without an extension crash or OOM, so the reported ~2700-tab scenario from upstream issue #38 is not treated as a meaningful extension release gate.

The following checks remain useful after release but are not blockers for `v3.2.0`:

- direct Waterfox desktop testing outside the WebDriver temporary-install path;
- physical Firefox/Waterfox Android testing where extension installation is supported;
- optional branded Google Chrome/store-path verification before Chrome Web Store publication.

## Upstream and license

Original project and copyright: Eric H. Goldman and upstream contributors.

This fork preserves the project's GPLv3 licensing. See [LICENSE.txt](LICENSE.txt). Changes in this fork remain under GPL-3.0-or-later.

Upstream project: [erichgoldman/add-url-to-window-title](https://github.com/erichgoldman/add-url-to-window-title)
