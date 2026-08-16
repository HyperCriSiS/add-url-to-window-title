/**
 * Runs in the page's MAIN world and emits a harmless DOM event when History API
 * navigation changes the current URL. No extension APIs or page data are used.
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
(() => {
  'use strict';

  const EVENT_NAME = 'au2wt:navigation';
  const notify = () => window.dispatchEvent(new Event(EVENT_NAME));

  for (const methodName of ['pushState', 'replaceState']) {
    const original = history[methodName];
    if (typeof original !== 'function') {
      continue;
    }

    history[methodName] = function wrappedHistoryMethod(...args) {
      const previousUrl = location.href;
      const result = Reflect.apply(original, this, args);
      if (location.href !== previousUrl) {
        queueMicrotask(notify);
      }
      return result;
    };
  }
})();
