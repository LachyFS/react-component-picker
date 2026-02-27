import type { PickerSettings } from "../shared/types";
import { DEFAULT_SETTINGS, STORAGE_KEY } from "../shared/constants";

const hotkeyBtn = document.getElementById("hotkey-btn") as HTMLButtonElement;
const parentChainCheckbox = document.getElementById("parent-chain") as HTMLInputElement;
const depthField = document.getElementById("depth-field") as HTMLDivElement;
const depthSlider = document.getElementById("depth-slider") as HTMLInputElement;
const depthValue = document.getElementById("depth-value") as HTMLSpanElement;
const pageUrlCheckbox = document.getElementById("page-url") as HTMLInputElement;
const previewText = document.getElementById("preview-text") as HTMLPreElement;

let settings: PickerSettings = { ...DEFAULT_SETTINGS };
let listening = false;

// Load current settings
chrome.storage.sync.get(STORAGE_KEY, (result) => {
  if (result[STORAGE_KEY]) {
    settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  }
  renderSettings();
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
