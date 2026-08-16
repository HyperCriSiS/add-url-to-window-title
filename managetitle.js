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
  const core = globalThis.AU2WTCore;
  const DEFAULTS = Object.freeze({
    urlMode: core.URL_MODES.HOSTNAME,
    showFullUrl: false,
    showFieldAttributes: false,
    separatorString: '-'
  });
  const NAVIGATION_EVENT = 'au2wt:navigation';
  const EXTERNAL_MUTATION_WINDOW_MS = 2000;

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
    renderTimer: null,
    pendingCaptureExternalTitle: false,
    nextAllowedRenderAt: 0,
    externalMutationTimes: []
  };

  function capturePageTitle() {
    const current = core.cleanText(document.title);
    if (current === state.lastRenderedTitle) {
      return;
    }

    state.originalTitle = core.rebaseExternalTitle(
      current,
      state.lastRenderedTitle,
      state.originalTitle
    );
  }

  function getDisplayedUrl() {
    return core.getDisplayedUrl(location.href, location.hostname, state.options.urlMode);
  }

  function formatTitle(baseTitle) {
    return core.formatTitle({
      baseTitle,
      displayedUrl: getDisplayedUrl(),
      separatorString: state.options.separatorString,
      fieldAttributes: state.currentInputFieldAttributes
    });
  }

  function renderTitle({ captureExternalTitle = false } = {}) {
    if (captureExternalTitle) {
      capturePageTitle();
    }

    const rendered = formatTitle(state.originalTitle);
    state.lastRenderedTitle = rendered;

    if (document.title !== rendered) {
      document.title = rendered;
    }
  }

  function scheduleRender({ captureExternalTitle = false } = {}) {
    state.pendingCaptureExternalTitle ||= captureExternalTitle;
    if (state.renderTimer !== null) {
      return;
    }

    const delay = Math.max(0, state.nextAllowedRenderAt - performance.now());
    state.renderTimer = setTimeout(() => {
      state.renderTimer = null;
      const shouldCapture = state.pendingCaptureExternalTitle;
      state.pendingCaptureExternalTitle = false;
      renderTitle({ captureExternalTitle: shouldCapture });
    }, delay);
  }

  function registerExternalTitleChange() {
    const now = performance.now();
    state.externalMutationTimes.push(now);
    state.externalMutationTimes = state.externalMutationTimes.filter(
      timestamp => now - timestamp <= EXTERNAL_MUTATION_WINDOW_MS
    );

    const count = state.externalMutationTimes.length;
    const cooldown = count >= 10 ? 2000 : count >= 5 ? 250 : 0;
    if (cooldown) {
      state.nextAllowedRenderAt = Math.max(state.nextAllowedRenderAt, now + cooldown);
    }
  }

  function onTitleMutation() {
    const current = core.cleanText(document.title);
    if (current === state.lastRenderedTitle) {
      return;
    }

    capturePageTitle();
    registerExternalTitleChange();
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
    scheduleRender({ captureExternalTitle: true });
  }

  function installNavigationTracking() {
    window.addEventListener(NAVIGATION_EVENT, onUrlMayHaveChanged);
    window.addEventListener('hashchange', onUrlMayHaveChanged, { passive: true });
    window.addEventListener('popstate', onUrlMayHaveChanged, { passive: true });
    window.addEventListener('focus', onUrlMayHaveChanged, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        onUrlMayHaveChanged();
      }
    }, { passive: true });
    window.addEventListener('pageshow', () => {
      attachTitleObservers();
      onUrlMayHaveChanged();
      scheduleRender({ captureExternalTitle: true });
    });

    if (globalThis.navigation?.addEventListener) {
      globalThis.navigation.addEventListener('currententrychange', onUrlMayHaveChanged);
    }
  }

  function buildInputAttributes(input) {
    const name = core.cleanText(input.getAttribute('name'));
    const id = core.cleanText(input.getAttribute('id'));
    return `[Input Name: "${name}"] [Input ID: "${id}"]`;
  }

  function isSupportedInput(target) {
    if (!(target instanceof HTMLInputElement)) {
      return false;
    }
    return ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(target.type);
  }

  function onFocusIn(event) {
    if (!state.options.showFieldAttributes || !isSupportedInput(event.target)) {
      return;
    }

    state.currentInputFieldAttributes = buildInputAttributes(event.target);
    scheduleRender();
  }

  function onFocusOut(event) {
    if (!state.options.showFieldAttributes || !isSupportedInput(event.target)) {
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
    const urlMode = core.normalizeUrlMode(settings.urlMode, Boolean(settings.showFullUrl));

    state.options = {
      urlMode,
      showFullUrl: urlMode === core.URL_MODES.FULL,
      showFieldAttributes: Boolean(settings.showFieldAttributes),
      separatorString: core.cleanText(settings.separatorString).slice(0, 20) || '-'
    };

    if (previousShowFieldAttributes && !state.options.showFieldAttributes) {
      state.currentInputFieldAttributes = '';
    }

    scheduleRender();
  }

  function installStorageTracking() {
    extensionApi.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync' && (
        changes.urlMode ||
        changes.showFullUrl ||
        changes.showFieldAttributes ||
        changes.separatorString
      )) {
        void loadOptions();
      }
    });
  }

  async function init() {
    state.originalTitle = core.cleanText(document.title);
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
