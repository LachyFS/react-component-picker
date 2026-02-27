import type { ComponentInfo, RCPResultMessage, PickerSettings } from "../shared/types";
import { mountOverlay, unmountOverlay, updateOverlay, flashCopyFeedback } from "./overlay";

const ACTIVE_CLASS = "__rcp-active";

let active = false;
let latestComponents: ComponentInfo[] = [];
let latestRect: RCPResultMessage["rect"] = null;
let latestContent: string | null = null;
let latestProps: string | null = null;
let rafId: number | null = null;
let pendingQuery = false;
let settings: PickerSettings;

// Event handler references for cleanup
let onMouseMove: ((e: MouseEvent) => void) | null = null;
let onClick: ((e: MouseEvent) => void) | null = null;
let onKeyDown: ((e: KeyboardEvent) => void) | null = null;

export function isActive(): boolean {
  return active;
}

export function activate(currentSettings: PickerSettings): void {
  if (active) return;
  active = true;
  settings = currentSettings;

  mountOverlay();
  document.documentElement.classList.add(ACTIVE_CLASS);

  // Inject cursor style if not already present
  if (!document.getElementById("__rcp-style")) {
    const style = document.createElement("style");
    style.id = "__rcp-style";
    style.textContent = `.${ACTIVE_CLASS}, .${ACTIVE_CLASS} * { cursor: crosshair !important; }`;
    document.head.appendChild(style);
  }

  onMouseMove = (e: MouseEvent) => {
    if (pendingQuery) return;
    pendingQuery = true;

    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      window.postMessage({ type: "RCP_QUERY", x: e.clientX, y: e.clientY }, "*");
      rafId = null;
    });
  };

  onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    if (latestComponents.length > 0) {
      const text = formatCopyText(latestComponents, settings, latestContent, latestProps);
      navigator.clipboard.writeText(text).then(() => {
        flashCopyFeedback();
        setTimeout(() => deactivate(), 250);
      });
    } else {
      deactivate();
    }
  };

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      deactivate();
    }
  };

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);
}

export function deactivate(): void {
  if (!active) return;
  active = false;

  document.documentElement.classList.remove(ACTIVE_CLASS);
  unmountOverlay();

  if (onMouseMove) document.removeEventListener("mousemove", onMouseMove, true);
  if (onClick) document.removeEventListener("click", onClick, true);
  if (onKeyDown) document.removeEventListener("keydown", onKeyDown, true);
  onMouseMove = null;
  onClick = null;
  onKeyDown = null;

  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  latestComponents = [];
  latestRect = null;
  latestContent = null;
  latestProps = null;
  pendingQuery = false;
}

export function handleResult(msg: RCPResultMessage): void {
  if (!active) return;
  pendingQuery = false;
  latestComponents = msg.components;
  latestRect = msg.rect;
  latestContent = msg.content;
  latestProps = msg.props;
  updateOverlay(msg.rect, msg.components, settings.parentChainDepth, msg.props);
}

function formatCopyText(components: ComponentInfo[], settings: PickerSettings, content: string | null, props: string | null): string {
  if (components.length === 0) return "";

  const primary = components[0];
  let text = formatComponent(primary);
  if (props) text += ` ${props}`;

  if (settings.includeParentChain && components.length > 1) {
    const parents = components.slice(1, settings.parentChainDepth + 1);
    for (const parent of parents) {
      text += `\n  in ${formatComponent(parent)}`;
    }
  }

  if (content) {
    text += `\n\n\`\`\`html\n${content}\n\`\`\``;
  }

  if (settings.includePageUrl) {
    text += `\n\nPage: ${window.location.href}`;
  }

  return text;
}

function formatComponent(comp: ComponentInfo): string {
  if (!comp.fileName) return comp.name;

  const path = cleanPath(comp.fileName);
  let result = `${comp.name} (${path}`;
  if (comp.lineNumber) result += `:${comp.lineNumber}`;
  result += `)`;
  return result;
}

function cleanPath(filePath: string): string {
  let cleaned = filePath
    .replace(/^webpack-internal:\/\/\//, "")
    .replace(/^\/app-pages-browser\//, "")
    .replace(/^\(app-pages-browser\)\//, "")
    .replace(/^\.\//, "")
    .replace(/\?.*$/, "");

  for (const marker of ["src/", "app/", "components/", "pages/", "lib/"]) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1) {
      cleaned = cleaned.substring(idx);
      break;
    }
  }

  return cleaned;
}
