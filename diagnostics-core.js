/**
 * Pure helpers for the diagnostics popup.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(function initDiagnosticsCore(root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  } else {
    root.AU2WTDiagnostics = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const STATES = Object.freeze({
    REACHABLE: 'reachable',
    OVERRIDDEN: 'overridden',
    WEB_UNREACHABLE: 'webUnreachable',
    INHERITED_ORIGIN: 'inheritedOrigin',
    RESTRICTED: 'restricted',
    FILE: 'file',
    EXTENSION_PAGE: 'extensionPage',
    UNKNOWN: 'unknown'
  });

  function parseScheme(url) {
    const value = String(url ?? '').trim();
    const match = /^([a-z][a-z0-9+.-]*):/i.exec(value);
    return match ? match[1].toLowerCase() : '';
  }

  function classifyPage(url, reachable, titleManaged = true) {
    if (reachable) {
      return titleManaged === false ? STATES.OVERRIDDEN : STATES.REACHABLE;
    }

    const value = String(url ?? '').trim();
    const scheme = parseScheme(value);

    if (scheme === 'http' || scheme === 'https') {
      return STATES.WEB_UNREACHABLE;
    }

    if (
      value === 'about:blank' ||
      value === 'about:srcdoc' ||
      ['data', 'blob'].includes(scheme)
    ) {
      return STATES.INHERITED_ORIGIN;
    }

    if (scheme === 'file') {
      return STATES.FILE;
    }

    if (scheme === 'chrome-extension' || scheme === 'moz-extension') {
      return STATES.EXTENSION_PAGE;
    }

    if (
      scheme === 'about' ||
      scheme === 'chrome' ||
      scheme === 'edge' ||
      scheme === 'brave' ||
      scheme === 'opera' ||
      scheme === 'vivaldi'
    ) {
      return STATES.RESTRICTED;
    }

    return STATES.UNKNOWN;
  }

  function safePageLabel(url) {
    const value = String(url ?? '').trim();
    if (!value) {
      return '';
    }

    try {
      const parsed = new URL(value);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
      if (parsed.protocol === 'file:') {
        return 'file:';
      }
      return parsed.protocol;
    } catch {
      const scheme = parseScheme(value);
      return scheme ? `${scheme}:` : '';
    }
  }

  return Object.freeze({ STATES, parseScheme, classifyPage, safePageLabel });
});
