/**
 * Add URL To Window Title - options page
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

  const I18N_IDS = [
    'optionsSectionHeader',
    'optionsShowFullUrlHeader',
    'optionsUrlModeHostname',
    'optionsUrlModeFull',
    'optionsUrlModeFullNoQuery',
    'optionsShowFullUrlHelp',
    'optionsSeparatorStringHeader',
    'optionsSeparatorStringHelp',
    'optionsShowFieldAttributesHeader',
    'optionsShowFieldAttributesText',
    'optionsShowFieldAttributesHelp',
    'optionsSaveButtonText',
    'optionsSavedHeader',
    'optionsSavedMessage',
    'optionsHelpLinkText'
  ];

  let statusTimer;

  function toPlainText(message) {
    const parsed = new DOMParser().parseFromString(message, 'text/html');
    return parsed.body.textContent ?? message;
  }

  function localize() {
    for (const id of I18N_IDS) {
      const element = document.getElementById(id);
      const message = extensionApi.i18n.getMessage(id);
      if (element && message) {
        element.textContent = toPlainText(message);
      }
    }
  }

  async function restoreOptions() {
    const settings = await extensionApi.storage.sync.get(DEFAULTS);
    document.getElementById('urlMode').value = core.normalizeUrlMode(
      settings.urlMode,
      Boolean(settings.showFullUrl)
    );
    document.getElementById('showFieldAttributes').checked = Boolean(settings.showFieldAttributes);
    document.getElementById('separatorString').value = core.cleanText(settings.separatorString).slice(0, 20) || '-';
  }

  async function saveOptions() {
    const urlMode = core.normalizeUrlMode(document.getElementById('urlMode').value);
    const separatorString = core.cleanText(document.getElementById('separatorString').value).slice(0, 20) || '-';

    await extensionApi.storage.sync.set({
      urlMode,
      showFullUrl: urlMode === core.URL_MODES.FULL,
      showFieldAttributes: document.getElementById('showFieldAttributes').checked,
      separatorString
    });

    const status = document.getElementById('status');
    status.style.display = 'block';
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {
      status.style.display = 'none';
    }, 2500);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    localize();

    try {
      await restoreOptions();
    } catch (error) {
      console.warn('Add URL To Window Title: could not restore settings.', error);
    }

    document.getElementById('optionsSaveButtonText').addEventListener('click', () => {
      void saveOptions();
    });
  });
})();
