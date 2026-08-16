/**
 * Lightweight responder used by the diagnostics popup.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(() => {
  'use strict';

  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const core = globalThis.AU2WTCore;

  function titleContainsManagedUrl() {
    if (!core) {
      return false;
    }

    return Object.values(core.URL_MODES).some(mode => {
      const displayedUrl = core.getDisplayedUrl(location.href, location.hostname, mode);
      return Boolean(displayedUrl) && document.title.includes(displayedUrl);
    });
  }

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'au2wt:diagnostics') {
      return false;
    }

    sendResponse({
      reachable: true,
      titleManaged: titleContainsManagedUrl()
    });
    return false;
  });
})();
