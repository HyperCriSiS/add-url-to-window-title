# Add URL To Window Title

[![Extension validation](https://github.com/HyperCriSiS/add-url-to-window-title/actions/workflows/ci.yml/badge.svg?branch=dev-modernization)](https://github.com/HyperCriSiS/add-url-to-window-title/actions/workflows/ci.yml)

A modernized fork of [erichgoldman/add-url-to-window-title](https://github.com/erichgoldman/add-url-to-window-title). The extension appends the current page address to `document.title`, allowing desktop applications such as password managers and activity trackers to identify the active browser page without direct browser integration.

> **Development status:** the modernization work is currently on the `dev-modernization` branch. It is not yet a published replacement for the upstream store versions.

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
- dependency-free unit tests plus strict Mozilla `web-ext` validation in GitHub Actions.

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

- Firefox / Gecko desktop 140 or newer;
- Firefox for Android 142 or newer;
- Chromium-based browsers 121 or newer.

Waterfox builds based on a sufficiently new Gecko version are expected to use the Firefox path, but real-browser validation remains tracked in the roadmap.

### Android System WebView limitation

A WebExtension only runs where the browser injects its content scripts. A third-party Android app's own `android.webkit.WebView` / System WebView is not a Firefox or Chrome tab and does not load browser extensions. This fork therefore cannot force support inside arbitrary app-owned WebViews.

It does improve browser-owned inherited-origin documents such as eligible `about:blank`, `about:srcdoc`, `data:` and `blob:` pages where the browser permits content-script injection.

## Privacy and permissions

The extension requires only the WebExtension `storage` permission for its settings. It does not declare data collection or transmission. There is no analytics SDK, remote script, runtime framework, background service worker, or network API used by the extension code.

The content script necessarily reads the current page URL/title because placing that information in the browser window title is the extension's purpose. Settings are stored with the browser's extension storage API.

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

## Temporary installation

### Firefox / Waterfox

Open `about:debugging`, choose **This Firefox**, select **Load Temporary Add-on**, and choose `manifest.json` from the repository checkout. A built ZIP can also be used where the browser's development workflow permits it.

### Chromium / Chrome

Open the extensions management page, enable **Developer mode**, choose **Load unpacked**, and select the repository directory.

## Testing priorities

Before a first fork release, manual/real-browser validation is still required for:

- current Firefox and Waterfox desktop;
- current Chromium/Chrome;
- Firefox/Waterfox Android where extension installation is supported;
- GitHub Issues and X.com, corresponding to upstream issue #42;
- aggressive title rewriting such as upstream issue #41;
- mutation-heavy SPAs and high tab counts.

The automated suite already covers title formatting, legacy-setting migration, URL modes, apostrophe preservation, title rebasing, manifest invariants, locale JSON validity and Mozilla extension linting.

## Upstream and license

Original project and copyright: Eric H. Goldman and upstream contributors.

This fork preserves the project's GPLv3 licensing. See [LICENSE.txt](LICENSE.txt). Changes in this fork remain under GPL-3.0-or-later.

Upstream project: [erichgoldman/add-url-to-window-title](https://github.com/erichgoldman/add-url-to-window-title)
