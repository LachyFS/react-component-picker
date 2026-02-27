import type { ComponentInfo } from "../shared/types";

const OVERLAY_ID = "__rcp-overlay";
const TOOLTIP_ID = "__rcp-tooltip";
const Z_INDEX = 2147483647;

let overlayEl: HTMLDivElement | null = null;
let tooltipEl: HTMLDivElement | null = null;

function createOverlay(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = OVERLAY_ID;
  Object.assign(el.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: String(Z_INDEX),
    border: "2px solid #61dafb",
    backgroundColor: "rgba(97, 218, 251, 0.1)",
    borderRadius: "3px",
    transition: "all 0.05s ease-out",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.documentElement.appendChild(el);
  return el;
}

function createTooltip(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = TOOLTIP_ID;
  Object.assign(el.style, {
    position: "fixed",
    pointerEvents: "none",
    zIndex: String(Z_INDEX),
    backgroundColor: "#1a1a2e",
    color: "#e0e0e0",
    padding: "8px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
    lineHeight: "1.5",
    maxWidth: "500px",
    whiteSpace: "pre",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    border: "1px solid rgba(97, 218, 251, 0.3)",
    display: "none",
  } satisfies Partial<CSSStyleDeclaration>);
  document.documentElement.appendChild(el);
  return el;
}

export function mountOverlay(): void {
  if (!overlayEl) overlayEl = createOverlay();
  if (!tooltipEl) tooltipEl = createTooltip();
}

export function unmountOverlay(): void {
  overlayEl?.remove();
  tooltipEl?.remove();
  overlayEl = null;
  tooltipEl = null;
}

export function updateOverlay(
  rect: { top: number; left: number; width: number; height: number } | null,
  components: ComponentInfo[],
  parentChainDepth: number,
): void {
  if (!overlayEl || !tooltipEl) return;

  if (!rect || components.length === 0) {
    overlayEl.style.display = "none";
    tooltipEl.style.display = "none";
    return;
  }

  // Position overlay
  overlayEl.style.display = "block";
  overlayEl.style.top = `${rect.top}px`;
  overlayEl.style.left = `${rect.left}px`;
  overlayEl.style.width = `${rect.width}px`;
  overlayEl.style.height = `${rect.height}px`;

  // Build tooltip content
  const primary = components[0];
  const parents = components.slice(1, parentChainDepth + 1);

  let html = `<span style="color:#61dafb;font-weight:bold;font-size:13px">${escapeHtml(primary.name)}</span>`;
  if (primary.fileName) {
    html += `\n<span style="color:#888;font-size:11px">${escapeHtml(formatPath(primary.fileName))}`;
    if (primary.lineNumber) html += `:${primary.lineNumber}`;
    html += `</span>`;
  }

  if (parents.length > 0) {
    html += `\n<span style="color:#666;font-size:10px">`;
    for (const parent of parents) {
      html += `\n  in <span style="color:#a0a0a0">${escapeHtml(parent.name)}</span>`;
      if (parent.fileName) {
        html += ` <span style="color:#666">(${escapeHtml(formatPath(parent.fileName))}`;
        if (parent.lineNumber) html += `:${parent.lineNumber}`;
        html += `)</span>`;
      }
    }
    html += `</span>`;
  }

  tooltipEl.innerHTML = html;
  tooltipEl.style.display = "block";

  // Position tooltip above or below the element
  const tooltipRect = tooltipEl.getBoundingClientRect();
  const gap = 8;
  let tooltipTop = rect.top - tooltipRect.height - gap;
  let tooltipLeft = rect.left;

  // If above doesn't fit, go below
  if (tooltipTop < 0) {
    tooltipTop = rect.top + rect.height + gap;
  }

  // Keep within viewport horizontally
  if (tooltipLeft + tooltipRect.width > window.innerWidth - 8) {
    tooltipLeft = window.innerWidth - tooltipRect.width - 8;
  }
  if (tooltipLeft < 8) tooltipLeft = 8;

  tooltipEl.style.top = `${tooltipTop}px`;
  tooltipEl.style.left = `${tooltipLeft}px`;
}

export function flashCopyFeedback(): void {
  if (!overlayEl) return;
  overlayEl.style.backgroundColor = "rgba(97, 218, 251, 0.35)";
  overlayEl.style.borderColor = "#fff";
  setTimeout(() => {
    if (!overlayEl) return;
    overlayEl.style.backgroundColor = "rgba(97, 218, 251, 0.1)";
    overlayEl.style.borderColor = "#61dafb";
  }, 200);
}

function formatPath(filePath: string): string {
  // Strip webpack/vite prefixes and common path noise
  let cleaned = filePath
    .replace(/^webpack-internal:\/\/\//, "")
    .replace(/^\/app-pages-browser\//, "")
    .replace(/^\(app-pages-browser\)\//, "")
    .replace(/^\.\//, "")
    .replace(/\?.*$/, "");

  // Try to find a meaningful relative path (from src/ or app/ or components/)
  for (const marker of ["src/", "app/", "components/", "pages/", "lib/"]) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1) {
      cleaned = cleaned.substring(idx);
      break;
    }
  }

  return cleaned;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
