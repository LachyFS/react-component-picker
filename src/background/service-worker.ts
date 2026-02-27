import { DEFAULT_SETTINGS, STORAGE_KEY } from "../shared/constants";
import type { RuntimeMessage } from "../shared/types";

// Set default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
    }
  });
});

// Relay settings updates from popup to the active tab's content script
chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, _sendResponse) => {
  if (message.type === "SETTINGS_UPDATED") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message);
      }
    });
  }
});
