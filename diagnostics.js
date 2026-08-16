(() => {
  'use strict';

  const extensionApi = globalThis.browser ?? globalThis.chrome;
  const diagnostics = globalThis.AU2WTDiagnostics;
  const result = document.getElementById('result');
  const resultTitle = document.getElementById('result-title');
  const resultDetail = document.getElementById('result-detail');
  const pageLabel = document.getElementById('page');
  const settingsButton = document.getElementById('settings');

  const STATE_MESSAGES = Object.freeze({
    [diagnostics.STATES.REACHABLE]: ['diagnosticsReachableTitle', 'diagnosticsReachableDetail', 'ok'],
    [diagnostics.STATES.OVERRIDDEN]: ['diagnosticsOverriddenTitle', 'diagnosticsOverriddenDetail', 'warning'],
    [diagnostics.STATES.WEB_UNREACHABLE]: ['diagnosticsWebUnreachableTitle', 'diagnosticsWebUnreachableDetail', 'error'],
    [diagnostics.STATES.INHERITED_ORIGIN]: ['diagnosticsInheritedTitle', 'diagnosticsInheritedDetail', 'warning'],
    [diagnostics.STATES.RESTRICTED]: ['diagnosticsRestrictedTitle', 'diagnosticsRestrictedDetail', 'warning'],
    [diagnostics.STATES.FILE]: ['diagnosticsFileTitle', 'diagnosticsFileDetail', 'warning'],
    [diagnostics.STATES.EXTENSION_PAGE]: ['diagnosticsExtensionPageTitle', 'diagnosticsExtensionPageDetail', 'warning'],
    [diagnostics.STATES.UNKNOWN]: ['diagnosticsUnknownTitle', 'diagnosticsUnknownDetail', 'warning']
  });

  function message(key, fallback = '') {
    return extensionApi.i18n?.getMessage(key) || fallback;
  }

  function localizeDocument() {
    document.documentElement.lang = extensionApi.i18n?.getUILanguage?.() || 'en';
    for (const element of document.querySelectorAll('[data-i18n]')) {
      const translated = message(element.dataset.i18n);
      if (translated) {
        element.textContent = translated;
      }
    }
  }

  function renderState(state) {
    const [titleKey, detailKey, visualState] = STATE_MESSAGES[state] ?? STATE_MESSAGES[diagnostics.STATES.UNKNOWN];
    result.dataset.state = visualState;
    resultTitle.textContent = message(titleKey, state);
    resultDetail.textContent = message(detailKey);
  }

  async function diagnose() {
    let tab;
    try {
      [tab] = await extensionApi.tabs.query({ active: true, currentWindow: true });
    } catch {
      renderState(diagnostics.STATES.UNKNOWN);
      return;
    }

    const label = diagnostics.safePageLabel(tab?.url);
    if (label) {
      pageLabel.hidden = false;
      pageLabel.textContent = `${message('diagnosticsPageLabel', 'Page')}: ${label}`;
    }

    let response = null;
    if (Number.isInteger(tab?.id)) {
      try {
        response = await extensionApi.tabs.sendMessage(tab.id, { type: 'au2wt:diagnostics' });
      } catch {
        response = null;
      }
    }

    renderState(diagnostics.classifyPage(
      tab?.url,
      response?.reachable === true,
      response?.titleManaged !== false
    ));
  }

  settingsButton.addEventListener('click', () => {
    void extensionApi.runtime.openOptionsPage();
  });

  localizeDocument();
  void diagnose();
})();
