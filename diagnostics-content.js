/**
 * Lightweight responder used by the diagnostics popup.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(() => {
  'use strict';

  const extensionApi = globalThis.browser ?? globalThis.chrome;

  extensionApi.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'au2wt:diagnostics') {
      return false;
    }

    const getStatus = globalThis.AU2WTGetDiagnosticsStatus;
    sendResponse(typeof getStatus === 'function'
      ? getStatus()
      : { reachable: true, titleManaged: false });
    return false;
  });
})();
