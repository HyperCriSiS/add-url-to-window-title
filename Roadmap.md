# Roadmap

This fork focuses on reliability in modern browsers, especially dynamic web applications and browser-hosted views, while keeping the extension small and auditable.

## Upstream review

Relevant upstream reports and pull requests reviewed before the modernization work:

- Issue #42 — GitHub Issues and X.com frequently overwrite or bypass the injected title.
- Issue #41 — Chase changes the page title after the extension updates it.
- Issue #40 — temu.com browser freeze; performance-sensitive title handling is required.
- Issue #38 — performance degradation with very large tab counts.
- Issue #35 — login page incompatibility.
- Issue #34 — apostrophes are removed from original titles.
- Issue #26 — request for a URL mode without query strings.
- PR #33 — improves MutationObserver handling for malformed/moved title elements but still misses title creation after load.
- PR #32 — cross-browser manifest cleanup.

## P0 — Reliability and compatibility

- [x] Fork upstream into `HyperCriSiS/add-url-to-window-title`.
- [x] Create modernization branch `dev-modernization`.
- [x] Review upstream issues and pull requests.
- [x] Replace the fragile `head > title` observer with title-node lifecycle tracking.
- [x] Detect title elements outside `<head>` and title elements created after page start.
- [x] Handle repeated site-driven title changes without duplicating the URL suffix.
- [x] Rebase page mutations derived from the previously rendered title before appending the URL again.
- [x] Add rate limiting/backoff for sites that continuously fight the extension over `document.title`.
- [x] Track SPA/navigation URL changes through the Navigation API where available.
- [x] Track `history.pushState()` and `history.replaceState()` without a permanent per-tab polling timer.
- [x] Keep `hashchange`, `popstate`, `pageshow`, focus, and visibility fallbacks.
- [x] Run content scripts at `document_start` so late page scripts cannot permanently win the first title update.
- [x] Enable inherited-origin handling for `about:blank`, `about:srcdoc`, `data:` and `blob:` documents where browser policy permits it.
- [x] Preserve apostrophes and normal punctuation in page titles; remove only control characters.
- [x] Remove the unused background service worker, avoiding unnecessary Firefox MV3 incompatibility.
- [x] Give the fork its own Firefox extension ID instead of reusing the upstream signing identity.
- [x] Explicitly enable Firefox for Android distribution with `gecko_android`.
- [x] Declare that the extension performs no data collection/transmission using Firefox's built-in manifest consent metadata.
- [x] Use an explicit Gecko minimum of Firefox 128 for the APIs and manifest metadata used by the fork, while keeping Waterfox compatibility as a separate runtime validation target.

## P1 — Performance and maintenance

- [x] Replace per-input listeners plus a whole-body MutationObserver with delegated `focusin` / `focusout` handling.
- [x] Restrict field-attribute tracking to text-like input types.
- [x] Remove the 1-second URL polling timer from every Firefox tab.
- [x] Avoid History API monkey-patching in Chromium when the native Navigation API is available.
- [x] Remove the vendored Bulma runtime dependency (~158 KB) from the options UI.
- [x] Replace Bulma with a small native CSS file using browser/system colors and dark-mode support.
- [x] Modernize options code to Promise-based WebExtension storage APIs.
- [x] Keep localization writes safe while converting legacy localized markup/entities to plain text.
- [x] Limit separator length and normalize stored values.
- [x] Remove the obsolete donation link from the options page.
- [x] Upgrade GitHub Actions to Node-24-based `actions/checkout@v6` and `actions/setup-node@v6`.
- [x] Add CI syntax, manifest/locale validation, dependency-free Node unit tests, and Mozilla `web-ext` lint.
- [x] Add a reproducible `web-ext build` configuration that excludes development-only files from packages.
- [x] Rewrite the README for the maintained fork and document platform limits instead of linking users to obsolete test/store instructions.

## P2 — Validation before release

- [x] Confirm core validation, package build, Chromium E2E, and Firefox E2E pass on GitHub Actions; Waterfox is tracked separately below.
- [x] Confirm CI-generated extension package structure passes validation and is reusable across jobs.
- [x] Test on current Firefox desktop using a temporary installation of the exact CI-built package.
- [ ] Test on current Waterfox desktop outside WebDriver. Automated Waterfox 6.6.17 temporary installation succeeds, but the WebDriver temporary-install path does not inject even a minimal MV3 content script on localhost or public HTTPS, so it is retained only as a non-gating diagnostic and cannot validate product behavior.
- [x] Test on Chromium using a real loaded MV3 extension.
- [x] Verify branded Google Chrome automation constraints: Chrome 139+ removed the command-line side-loading flags used by Playwright, so branded Chrome is not a valid automated unpacked-extension gate. Chromium remains the supported automated Chrome-extension E2E target; branded Chrome requires a manually installed/signed extension path if store-specific validation is needed.
- [ ] Test on Firefox/Waterfox Android where extension support is enabled.
- [x] Reproduce and verify upstream Issue #42 on the live GitHub Issues and X.com sites using the separate non-gating live-site smoke workflow.
- [x] Reproduce and verify upstream Issue #41 on the live Chase homepage; the URL remained present in the title across 30 samples over 15 seconds.
- [x] Stress-test mutation-heavy pages and a 40-simultaneous-tab Chromium smoke scenario.
- [ ] Run an extreme long-lived tab-count test comparable to upstream Issue #38 (~2700 tabs) if practical.
- [x] Validate temporary Firefox package installation and Chromium unpacked loading.

## P3 — Follow-up features

- [x] Add a third URL display mode: full URL without query/fragment (upstream Issue #26).
- [x] Preserve migration compatibility with the legacy `showFullUrl` boolean setting.
- [x] Add dependency-free unit tests for title cleanup, formatting, URL modes, title rebasing, and manifest invariants.
- [x] Add optional diagnostics showing why a page cannot be modified (restricted URL, browser UI, unsupported host view), and verify the real active-tab messaging/UI path in Chromium E2E.
- [x] Replace the legacy Katalon Recorder fixtures with automated real-browser tests for title replacement, title creation, malformed/moved title placement, SPA navigation, live settings changes, input focus attributes, rapid title mutations, and many-tab behavior.

## Automated browser coverage

The CI suite now loads the extension into real browser processes instead of relying only on unit tests:

- Chromium: static/dynamic titles, SPA navigation, late-created titles, replaced/moved `<title>`, title rebasing, rapid mutation stress, options UI, `storage.sync` live updates, focused input attributes, URL-without-query mode, the diagnostics popup through its real active-tab message path, and 40 simultaneous tabs. This is also the supported automated Chrome-extension target because current branded Chrome no longer permits command-line side-loading.
- Firefox: temporary installation of the exact CI-built package followed by static/dynamic titles, SPA navigation, late-created titles, replaced/moved `<title>`, title rebasing, and rapid mutation stress.
- Live-site smoke: current GitHub Issues, X.com, and Chase pages. Chase is sampled repeatedly for 15 seconds to catch delayed title overwrites; external sites remain separate from release-gating CI because they can change independently of the extension.
- Waterfox: exact CI-built package installation plus a non-gating diagnostic matrix. Waterfox 6.6.17 accepts the temporary add-on but does not inject even a minimal MV3 content script on public HTTPS through this WebDriver path, so this job documents harness behavior rather than claiming product compatibility.

## Platform limitation: Android System WebView / embedded app views

A WebExtension can only modify documents into which the browser actually injects its content script. Android `WebView` instances owned by another app are not browser tabs and do not load Firefox/Chrome WebExtensions. Likewise, privileged browser pages and some restricted surfaces reject content-script injection by design.

This fork improves `about:blank`, `data:` and `blob:` inherited-origin cases that still run inside a supporting browser. It cannot make a third-party Android System WebView load an extension; solving that case requires the host app/browser to expose extension support or a separate Android-level integration.
