// MAIN world script — has access to React fiber internals on DOM elements
// No access to Chrome extension APIs

import type { ComponentInfo, RCPQueryMessage, RCPResultMessage } from "../shared/types";

const FIBER_PREFIXES = ["__reactFiber$", "__reactInternalInstance$"];
const SKIP_NAMES = new Set([
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
  "Provider",
  "Consumer",
  "Context",
]);

function getFiberFromElement(element: Element): any | null {
  const keys = Object.keys(element);
  for (const key of keys) {
    for (const prefix of FIBER_PREFIXES) {
      if (key.startsWith(prefix)) {
        return (element as any)[key];
      }
    }
  }
  return null;
}

function getComponentName(fiber: any): string | null {
  if (!fiber || !fiber.type) return null;

  // Function/class components
  if (typeof fiber.type === "function" || typeof fiber.type === "object") {
    // Forward refs, memos, etc.
    const displayName =
      fiber.type.displayName ||
      fiber.type.name ||
      (fiber.type.render && (fiber.type.render.displayName || fiber.type.render.name));

    if (!displayName) return null;

    // Skip React internals
    if (SKIP_NAMES.has(displayName)) return null;

    return displayName;
  }

  return null;
}

function getSourceInfo(fiber: any): { fileName?: string; lineNumber?: number; columnNumber?: number } {
  // React 16-18: _debugSource
  if (fiber._debugSource) {
    return {
      fileName: fiber._debugSource.fileName,
      lineNumber: fiber._debugSource.lineNumber,
      columnNumber: fiber._debugSource.columnNumber,
    };
  }

  // React 19+: _debugOwnerStack (string stack trace)
  if (typeof fiber._debugOwnerStack === "string" && fiber._debugOwnerStack) {
    const match = fiber._debugOwnerStack.match(/\(([^)]+):(\d+):(\d+)\)/);
    if (match) {
      return {
        fileName: match[1],
        lineNumber: parseInt(match[2], 10),
        columnNumber: parseInt(match[3], 10),
      };
    }
  }

  return {};
}

function collectComponents(element: Element, maxDepth: number): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  let fiber = getFiberFromElement(element);

  // Walk up to the nearest named component from this fiber
  while (fiber && components.length < maxDepth + 1) {
    const name = getComponentName(fiber);
    if (name) {
      const source = getSourceInfo(fiber);
      components.push({
        name,
        fileName: source.fileName,
        lineNumber: source.lineNumber,
        columnNumber: source.columnNumber,
      });
    }
    fiber = fiber.return;
  }

  return components;
}

function getElementRect(element: Element): { top: number; left: number; width: number; height: number } | null {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

// Listen for queries from the ISOLATED world content script
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "RCP_QUERY") return;

  const msg = event.data as RCPQueryMessage;
  const element = document.elementFromPoint(msg.x, msg.y);

  if (!element) {
    const response: RCPResultMessage = { type: "RCP_RESULT", components: [], rect: null };
    window.postMessage(response, "*");
    return;
  }

  // Walk up DOM to find an element with a fiber if current one doesn't have one
  let target: Element | null = element;
  let fiber: any = null;
  while (target && !fiber) {
    fiber = getFiberFromElement(target);
    if (!fiber) target = target.parentElement;
  }

  // Collect up to 11 components (1 target + 10 parents max)
  const components = target ? collectComponents(target, 10) : [];
  const rect = target ? getElementRect(target) : getElementRect(element);

  const response: RCPResultMessage = { type: "RCP_RESULT", components, rect };
  window.postMessage(response, "*");
});
