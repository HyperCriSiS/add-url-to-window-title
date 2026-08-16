/**
 * Pure title/URL formatting helpers shared by the content script and options UI.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(function initTitleCore(root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = core;
  } else {
    root.AU2WTCore = core;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const URL_MODES = Object.freeze({
    HOSTNAME: 'hostname',
    FULL: 'full',
    FULL_NO_QUERY: 'fullNoQuery'
  });

  function cleanText(value) {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }

  function normalizeUrlMode(value, legacyShowFullUrl = false) {
    if (Object.values(URL_MODES).includes(value)) {
      return value;
    }
    return legacyShowFullUrl ? URL_MODES.FULL : URL_MODES.HOSTNAME;
  }

  function getDisplayedUrl(href, hostname, mode) {
    const safeHref = String(href ?? '');
    const safeHostname = String(hostname ?? '');
    const normalizedMode = normalizeUrlMode(mode);

    if (normalizedMode === URL_MODES.HOSTNAME) {
      return safeHostname ? `${safeHostname}/` : safeHref;
    }

    if (normalizedMode === URL_MODES.FULL_NO_QUERY) {
      try {
        const url = new URL(safeHref);
        url.search = '';
        url.hash = '';
        return url.href;
      } catch {
        return safeHref.split(/[?#]/, 1)[0];
      }
    }

    return safeHref;
  }

  function formatTitle({ baseTitle, displayedUrl, separatorString = '-', fieldAttributes = '' }) {
    const base = cleanText(baseTitle);
    const url = cleanText(displayedUrl);
    const separator = cleanText(separatorString) || '-';
    const field = cleanText(fieldAttributes);
    const parts = [];

    if (base) {
      parts.push(base);
    }
    if (url) {
      if (base) {
        parts.push(separator);
      }
      parts.push(url);
    }
    if (field) {
      parts.push(field);
    }

    return parts.join(' ');
  }

  return Object.freeze({
    URL_MODES,
    cleanText,
    normalizeUrlMode,
    getDisplayedUrl,
    formatTitle
  });
});
