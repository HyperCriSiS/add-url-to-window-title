/**
 * Add URL To Window Title
 * Modernized content script for Manifest V3 browsers.
 *
 * Copyright (c) 2018 Eric H. Goldman
 * Modifications copyright (c) 2026 contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
  'use strict';

  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const DEFAULTS = Object.freeze({
    showFullUrl: false,
    showFieldAttributes: false,
    separatorString: '-'
  });

  const state = {
    options: { ...DEFAULTS },
    originalTitle: '',
    lastRenderedTitle: '',
    lastKnownUrl: location.href,
    currentInputFieldAttributes: '',
    observedTitleElement: null,
    titleContentObserver: null,
    titleStructureObserver: null,
    noTitleObserver: null,
    urlPollTimer: null,
    updateScheduled: false
  };

  function cleanText(value) {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }

  function getDisplayedUrl() {
    if (state.options.showFullUrl) {
      return location.href;
    }

    return location.hostname ? `${location.hostname}/` : location.href;
  }

  function formatTitle(baseTitle) {
    const parts = [cleanText(baseTitle)];
    const separator = cleanText(state.options.separatorString) || '-';
    const displayedUrl = cleanText(getDisplayedUrl());

    if (displayedUrl) {
      parts.push(separator, displayedUrl);
    }

    if (state.currentInputFieldAttributes) {
      parts.push(state.currentInputFieldAttributes);
    }

    return parts.filter(Boolean).join(' ');
  }

  function stripOwnSuffix(title) {
    const value = cleanText(title);
    if (!value || value !== state.lastRenderedTitle) {
      return value;
    }
    return state.originalTitle;
  }

  function renderTitle({ captureExternalTitle = false } = {}) {
    if (captureExternalTitle) {
      const current = cleanText(document.title);
      if (current && current !== state.lastRenderedTitle) {
        state.originalTitle = current;
      }
    }

    const rendered = formatTitle(state.originalTitle);
    if (!rendered || document.title === rendered) {
      state.lastRenderedTitle = rendered;
      return;
    }

    state.lastRenderedTitle = rendered;
    document.title = rendered;
  }

  function scheduleRender({ captureExternalTitle = false } = {}) {
    if (state.updateScheduled) {
      return;
    }

    state.updateScheduled = true;
    queueMicrotask(() => {
      state.updateScheduled = false;
      renderTitle({ captureExternalTitle });
    });
  }

  function onTitleMutation() {
    const current = cleanText(document.title);

    if (current === state.lastRenderedTitle) {
      return;
    }

    if (current) {
      state.originalTitle = stripOwnSuffix(current);
    }

    scheduleRender();
  }

  function findTitleElement() {
    return document.querySelector('title');
  }

  function disconnectObserver(observerName) {
    state[observerName]?.disconnect();
    state[observerName] = null;
  }

  function observeTitleElement(titleElement) {
    if (!titleElement || titleElement === state.observedTitleElement) {
      return;
    }

    disconnectObserver('titleContentObserver');
    disconnectObserver('titleStructureObserver');
    disconnectObserver('noTitleObserver');

    state.observedTitleElement = titleElement;

    state.titleContentObserver = new MutationObserver(onTitleMutation);
    state.titleContentObserver.observe(titleElement, {
      childList: true,
      characterData: true,
      subtree: true
    });

    const parent = titleElement.parentNode;
    if (parent) {
      state.titleStructureObserver = new MutationObserver(() => {
        const currentTitleElement = findTitleElement();
        if (currentTitleElement !== state.observedTitleElement) {
          state.observedTitleElement = null;
          attachTitleObservers();
          onTitleMutation();
        }
      });
      state.titleStructureObserver.observe(parent, { childList: true });
    }
  }

  function observeUntilTitleExists() {
    if (state.noTitleObserver || !document.documentElement) {
      return;
    }

    state.noTitleObserver = new MutationObserver(() => {
      const titleElement = findTitleElement();
      if (titleElement) {
        state.observedTitleElement = null;
        observeTitleElement(titleElement);
        onTitleMutation();
      }
    });

    state.noTitleObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function attachTitleObservers() {
    const titleElement = findTitleElement();
    if (titleElement) {
      observeTitleElement(titleElement);
    } else {
      state.observedTitleElement = null;
      disconnectObserver('titleContentObserver');
      disconnectObserver('titleStructureObserver');
      observeUntilTitleExists();
    }
  }

  function onUrlMayHaveChanged() {
    if (location.href === state.lastKnownUrl) {
      return;
    }

    state.lastKnownUrl = location.href;
    scheduleRender();
  }

  function installNavigationTracking() {
    window.addEventListener('hashchange', onUrlMayHaveChanged, { passive: true });
    window.addEventListener('popstate', onUrlMayHaveChanged, { passive: true });
    window.addEventListener('pageshow', () => {
      attachTitleObservers();
      onUrlMayHaveChanged();
      scheduleRender({ captureExternalTitle: true });
    });

    if (globalThis.navigation?.addEventListener) {
      globalThis.navigation.addEventListener('currententrychange', onUrlMayHaveChanged);
      return;
    }

    state.urlPollTimer = setInterval(onUrlMayHaveChanged, 1000);
  }

  function buildInputAttributes(input) {
    const name = cleanText(input.getAttribute('name'));
    const id = cleanText(input.getAttribute('id'));
    return `[Input Name: "${name}"] [Input ID: "${id}"]`;
  }

  function onFocusIn(event) {
    if (!state.options.showFieldAttributes || !(event.target instanceof HTMLInputElement)) {
      return;
    }

    state.currentInputFieldAttributes = buildInputAttributes(event.target);
    scheduleRender();
  }

  function onFocusOut(event) {
    if (!state.options.showFieldAttributes || !(event.target instanceof HTMLInputElement)) {
      return;
    }

    queueMicrotask(() => {
      if (document.activeElement !== event.target) {
        state.currentInputFieldAttributes = '';
        scheduleRender();
      }
    });
  }

  function installFieldTracking() {
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
  }

  async function loadOptions() {
    const previousShowFieldAttributes = state.options.showFieldAttributes;
    const settings = await extensionApi.storage.sync.get(DEFAULTS);

    state.options = {
      showFullUrl: Boolean(settings.showFullUrl),
      showFieldAttributes: Boolean(settings.showFieldAttributes),
      separatorString: cleanText(settings.separatorString) || '-'
    };

    if (previousShowFieldAttributes && !state.options.showFieldAttributes) {
      state.currentInputFieldAttributes = '';
    }

    scheduleRender();
  }

  function installStorageTracking() {
    extensionApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (
        changes.showFullUrl ||
        changes.showFieldAttributes ||
        changes.separatorString
      )) {
        void loadOptions();
      }
    });
  }

  async function init() {
    state.originalTitle = cleanText(document.title);
    state.lastKnownUrl = location.href;

    attachTitleObservers();
    installNavigationTracking();
    installFieldTracking();
    installStorageTracking();

    try {
      await loadOptions();
    } catch (error) {
      console.warn('Add URL To Window Title: could not load settings; using defaults.', error);
      renderTitle();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        attachTitleObservers();
        scheduleRender({ captureExternalTitle: true });
      }, { once: true });
    }
  }

  void init();
})();
