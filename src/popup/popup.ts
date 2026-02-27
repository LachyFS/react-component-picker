import type { PickerSettings } from "../shared/types";
import { DEFAULT_SETTINGS, LOCALHOST_HOSTS, STORAGE_KEY } from "../shared/constants";

const hotkeyBtn = document.getElementById("hotkey-btn") as HTMLButtonElement;
const parentChainCheckbox = document.getElementById("parent-chain") as HTMLInputElement;
const depthField = document.getElementById("depth-field") as HTMLDivElement;
const depthSlider = document.getElementById("depth-slider") as HTMLInputElement;
const depthValue = document.getElementById("depth-value") as HTMLSpanElement;
const pageUrlCheckbox = document.getElementById("page-url") as HTMLInputElement;
const previewText = document.getElementById("preview-text") as HTMLPreElement;

const siteToggleContainer = document.getElementById("site-toggle") as HTMLDivElement;
const siteEnabledCheckbox = document.getElementById("site-enabled") as HTMLInputElement;
const siteToggleText = document.getElementById("site-toggle-text") as HTMLSpanElement;
const siteHostnameEl = document.getElementById("site-hostname") as HTMLParagraphElement;
const statusBadge = document.getElementById("status-badge") as HTMLSpanElement;

let settings: PickerSettings = { ...DEFAULT_SETTINGS };
let listening = false;
let currentHostname = "";

function isLocalhostHost(hostname: string): boolean {
  return (LOCALHOST_HOSTS as readonly string[]).includes(hostname);
}

// Get the active tab's hostname
async function getCurrentHostname(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return "";
  try {
    return new URL(tab.url).hostname;
  } catch {
    return "";
  }
}

// Load current settings and hostname
Promise.all([
  new Promise<void>((resolve) => {
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      if (result[STORAGE_KEY]) {
        settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
      }
      resolve();
    });
  }),
  getCurrentHostname(),
]).then(([, hostname]) => {
  currentHostname = hostname;
  renderSettings();
  renderSiteToggle();
});

function updateStatusBadge(enabled: boolean): void {
  statusBadge.textContent = enabled ? "Enabled" : "Disabled";
  statusBadge.classList.toggle("enabled", enabled);
}

function renderSiteToggle(): void {
  if (!currentHostname) {
    siteToggleContainer.style.display = "none";
    updateStatusBadge(false);
    return;
  }

  siteToggleContainer.style.display = "block";
  siteHostnameEl.textContent = currentHostname;

  if (isLocalhostHost(currentHostname)) {
    siteToggleContainer.classList.add("always-on");
    siteEnabledCheckbox.checked = true;
    siteEnabledCheckbox.disabled = true;
    siteToggleText.textContent = "Always enabled";
    updateStatusBadge(true);
  } else {
    siteToggleContainer.classList.remove("always-on");
    const enabled = settings.allowedSites.includes(currentHostname);
    siteEnabledCheckbox.checked = enabled;
    siteEnabledCheckbox.disabled = false;
    siteToggleText.textContent = enabled ? "Enabled on this site" : "Disabled on this site";
    updateStatusBadge(enabled);
  }
}

siteEnabledCheckbox.addEventListener("change", () => {
  if (isLocalhostHost(currentHostname)) return;

  if (siteEnabledCheckbox.checked) {
    if (!settings.allowedSites.includes(currentHostname)) {
      settings.allowedSites = [...settings.allowedSites, currentHostname];
    }
  } else {
    settings.allowedSites = settings.allowedSites.filter((h) => h !== currentHostname);
  }

  renderSiteToggle();
  saveSettings();
});

function renderSettings(): void {
  hotkeyBtn.textContent = settings.hotkey;
  parentChainCheckbox.checked = settings.includeParentChain;
  depthSlider.value = String(settings.parentChainDepth);
  depthValue.textContent = String(settings.parentChainDepth);
  depthField.style.display = settings.includeParentChain ? "block" : "none";
  pageUrlCheckbox.checked = settings.includePageUrl;
  updatePreview();
}

function updatePreview(): void {
  let text = "ComponentName (path/to/file.tsx:23)";

  if (settings.includeParentChain) {
    const parents = [
      "ParentComponent (path/to/Parent.tsx:45)",
      "GrandparentComponent (path/to/Grandparent.tsx:12)",
      "AppLayout (app/layout.tsx:8)",
    ];
    const shown = parents.slice(0, settings.parentChainDepth);
    for (const p of shown) {
      text += `\n  in ${p}`;
    }
  }

  if (settings.includePageUrl) {
    text += "\n\nPage: http://localhost:3000/app/planner";
  }

  previewText.textContent = text;
}

function saveSettings(): void {
  chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  chrome.runtime.sendMessage({ type: "SETTINGS_UPDATED", settings });
}

// Hotkey button — click to listen, then capture keydown
hotkeyBtn.addEventListener("click", () => {
  if (listening) return;
  listening = true;
  hotkeyBtn.textContent = "Press a key...";
  hotkeyBtn.classList.add("listening");
});

document.addEventListener("keydown", (e) => {
  if (!listening) return;
  e.preventDefault();
  listening = false;

  settings.hotkey = e.key;
  hotkeyBtn.classList.remove("listening");
  renderSettings();
  saveSettings();
});

// Close listening if clicking away
document.addEventListener("click", (e) => {
  if (listening && e.target !== hotkeyBtn) {
    listening = false;
    hotkeyBtn.classList.remove("listening");
    renderSettings();
  }
});

// Parent chain toggle
parentChainCheckbox.addEventListener("change", () => {
  settings.includeParentChain = parentChainCheckbox.checked;
  depthField.style.display = settings.includeParentChain ? "block" : "none";
  updatePreview();
  saveSettings();
});

// Depth slider
depthSlider.addEventListener("input", () => {
  settings.parentChainDepth = parseInt(depthSlider.value, 10);
  depthValue.textContent = depthSlider.value;
  updatePreview();
  saveSettings();
});

// Page URL toggle
pageUrlCheckbox.addEventListener("change", () => {
  settings.includePageUrl = pageUrlCheckbox.checked;
  updatePreview();
  saveSettings();
});
