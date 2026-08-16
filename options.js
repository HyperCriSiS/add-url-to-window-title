/**
 * Add URL To Window Title - options page
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

  const I18N_IDS = [
    'optionsSectionHeader',
    'optionsShowFullUrlHeader',
    'optionsShowFullUrlText',
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

  function localize() {
    for (const id of I18N_IDS) {
      const element = document.getElementById(id);
      const message = extensionApi.i18n.getMessage(id);
      if (element && message) {
        element.textContent = message;
      }
    }
  }

  async function restoreOptions() {
    const settings = await extensionApi.storage.sync.get(DEFAULTS);
    document.getElementById('showFullUrl').checked = Boolean(settings.showFullUrl);
    document.getElementById('showFieldAttributes').checked = Boolean(settings.showFieldAttributes);
    document.getElementById('separatorString').value = String(settings.separatorString || '-');
  }

  async function saveOptions() {
    const separatorString = document.getElementById('separatorString').value.trim() || '-';

    await extensionApi.storage.sync.set({
      showFullUrl: document.getElementById('showFullUrl').checked,
      showFieldAttributes: document.getElementById('showFieldAttributes').checked,
      separatorString: separatorString.slice(0, 20)
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
