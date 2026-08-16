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

## P1 — Performance and maintenance

- [x] Replace per-input listeners plus a whole-body MutationObserver with delegated `focusin` / `focusout` handling.
- [x] Restrict field-attribute tracking to text-like input types.
- [x] Remove the 1-second URL polling timer from every Firefox tab.
- [x] Remove the vendored Bulma runtime dependency (~158 KB) from the options UI.
- [x] Replace Bulma with a small native CSS file using browser/system colors and dark-mode support.
- [x] Modernize options code to Promise-based WebExtension storage APIs.
- [x] Keep localization writes safe while converting legacy localized markup/entities to plain text.
- [x] Limit separator length and normalize stored values.
- [x] Remove the obsolete donation link from the options page.
- [x] Upgrade GitHub Actions to Node-24-based `actions/checkout@v6` and `actions/setup-node@v6`.
- [x] Add CI syntax, manifest/locale validation, dependency-free Node unit tests, and Mozilla `web-ext` lint.

## P2 — Validation before release

- [ ] Confirm the revised CI workflow passes on GitHub Actions.
- [ ] Test on current Firefox desktop.
- [ ] Test on current Waterfox desktop.
- [ ] Test on current Chromium/Chrome.
- [ ] Test on Firefox/Waterfox Android where extension support is enabled.
- [ ] Reproduce and verify upstream Issue #42 on GitHub Issues and X.com.
- [ ] Reproduce and verify upstream Issue #41 on Chase if access is possible.
- [ ] Stress-test with many tabs and mutation-heavy SPAs.
- [ ] Validate temporary installation/package loading in Firefox and Chromium.

## P3 — Follow-up features

- [x] Add a third URL display mode: full URL without query/fragment (upstream Issue #26).
- [x] Preserve migration compatibility with the legacy `showFullUrl` boolean setting.
- [x] Add dependency-free unit tests for title cleanup, formatting, URL modes, and manifest invariants.
- [ ] Add optional diagnostics showing why a page cannot be modified (restricted URL, browser UI, unsupported host view).
- [ ] Replace the legacy Katalon Recorder fixtures with automated real-browser tests for title replacement, title creation, malformed title placement, SPA navigation, and input focus attributes.

## Platform limitation: Android System WebView / embedded app views

A WebExtension can only modify documents into which the browser actually injects its content script. Android `WebView` instances owned by another app are not browser tabs and do not load Firefox/Chrome WebExtensions. Likewise, privileged browser pages and some restricted surfaces reject content-script injection by design.

This fork improves `about:blank`, `data:` and `blob:` inherited-origin cases that still run inside a supporting browser. It cannot make a third-party Android System WebView load an extension; solving that case requires the host app/browser to expose extension support or a separate Android-level integration.
