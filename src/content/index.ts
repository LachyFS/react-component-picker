// ISOLATED world content script — has access to Chrome extension APIs
// Communicates with page-script.ts (MAIN world) via window.postMessage

import type { PickerSettings, RCPResultMessage, RuntimeMessage } from "../shared/types";
import { DEFAULT_SETTINGS, LOCALHOST_HOSTS, STORAGE_KEY } from "../shared/constants";
import { activate, deactivate, isActive, handleResult } from "./picker";

let settings: PickerSettings = { ...DEFAULT_SETTINGS };
let hotkeyPressed = false;

function isAllowedSite(hostname: string, s: PickerSettings): boolean {
  if ((LOCALHOST_HOSTS as readonly string[]).includes(hostname)) return true;
  return s.allowedSites.includes(hostname);
}

// Load settings
chrome.storage.sync.get(STORAGE_KEY, (result) => {
  if (result[STORAGE_KEY]) {
    settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  }
});

// Listen for postMessage results from page-script (MAIN world)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "RCP_RESULT") return;
  handleResult(event.data as RCPResultMessage);
});

// Hotkey handling — hold to activate
document.addEventListener("keydown", (e) => {
  if (hotkeyPressed) return;
  if (e.key === settings.hotkey) {
    hotkeyPressed = true;
    if (!isActive() && isAllowedSite(location.hostname, settings)) {
      activate(settings);
    }
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key === settings.hotkey) {
    hotkeyPressed = false;
    if (isActive()) {
      deactivate();
    }
  }
});

// Deactivate on window blur (e.g., switching tabs while holding hotkey)
window.addEventListener("blur", () => {
  hotkeyPressed = false;
  if (isActive()) {
    deactivate();
  }
});

// Listen for settings updates from popup via background service worker
chrome.runtime.onMessage.addListener((message: RuntimeMessage) => {
  if (message.type === "SETTINGS_UPDATED") {
    settings = message.settings;
    // If active and site is no longer allowed, deactivate
    if (isActive() && !isAllowedSite(location.hostname, settings)) {
      deactivate();
    } else if (isActive()) {
      // Restart with new settings
      deactivate();
      activate(settings);
    }
  }
});
