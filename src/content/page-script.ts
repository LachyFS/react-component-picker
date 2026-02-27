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

function getTextPreview(fiber: any): string | null {
  const node = fiber.stateNode;
  if (!node || !(node instanceof HTMLElement)) return null;
  const text = node.textContent?.trim();
  if (!text) return null;
  if (text.length <= 50) return text;
  return text.substring(0, 47) + "...";
}

function getComponentName(fiber: any, includeTextPreview = false): string | null {
  if (!fiber || !fiber.type) return null;

  // Host elements (div, span, button, etc.)
  if (typeof fiber.type === "string") {
    if (includeTextPreview) {
      const textPreview = getTextPreview(fiber);
      if (textPreview) return `${fiber.type} "${textPreview}"`;
    }
    return fiber.type;
  }

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
    const match = fiber._debugOwnerStack.match(/\((.+):(\d+):(\d+)\)/);
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

function findNearestSourceOwner(fiber: any): { name: string; fileName: string; lineNumber?: number; columnNumber?: number } | null {
  let current = fiber.return;
  while (current) {
    // Skip host elements (div, span, etc.) — we want user-defined components
    if (current.type && typeof current.type !== "string") {
      const name = getComponentName(current);
      if (name) {
        const source = getSourceInfo(current);
        if (source.fileName) {
          return { name, fileName: source.fileName, lineNumber: source.lineNumber, columnNumber: source.columnNumber };
        }
      }
    }
    current = current.return;
  }
  return null;
}

function collectComponents(element: Element, maxDepth: number): ComponentInfo[] {
  const components: ComponentInfo[] = [];
  let fiber = getFiberFromElement(element);

  // Walk up to the nearest named component from this fiber
  let isFirst = true;
  while (fiber && components.length < maxDepth + 1) {
    const name = getComponentName(fiber, isFirst);
    if (name) {
      isFirst = false;
      const source = getSourceInfo(fiber);
      const info: ComponentInfo = {
        name,
        fileName: source.fileName,
        lineNumber: source.lineNumber,
        columnNumber: source.columnNumber,
      };
      if (!info.fileName) {
        const owner = findNearestSourceOwner(fiber);
        if (owner) {
          info.ownerName = owner.name;
          info.ownerFileName = owner.fileName;
          info.ownerLineNumber = owner.lineNumber;
          info.ownerColumnNumber = owner.columnNumber;
        }
      }
      components.push(info);
    }
    fiber = fiber.return;
  }

  return components;
}

const SKIP_PROPS = new Set(["children", "className", "style"]);
const MAX_PROPS_LENGTH = 500;

function isReactElement(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "$$typeof" in (value as Record<string, unknown>)
  );
}

function serializeValue(value: unknown, depth: number): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean" || typeof value === "number") return String(value);

  if (typeof value === "string") {
    if (value.length > 100) return `"${value.substring(0, 97)}..."`;
    return `"${value}"`;
  }

  if (typeof value === "function") {
    const name = (value as Function).name;
    return name && name !== "anonymous" ? `[Function ${name}]` : "[Function]";
  }

  if (isReactElement(value)) return "[ReactElement]";

  if (Array.isArray(value)) {
    if (depth >= 3) return "[Array]";
    const items = value.slice(0, 5).map((v) => serializeValue(v, depth + 1));
    const suffix = value.length > 5 ? `, [...${value.length - 5} more]` : "";
    return `[${items.join(", ")}${suffix}]`;
  }

  if (typeof value === "object") {
    if (depth >= 3) return "[Object]";
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 10)
      .map(([k, v]) => `${k}: ${serializeValue(v, depth + 1)}`);
    return `{ ${entries.join(", ")} }`;
  }

  return String(value);
}

function serializeProps(fiber: any): string | null {
  const props = fiber.memoizedProps;
  if (!props || typeof props !== "object") return null;

  const entries: string[] = [];
  for (const key of Object.keys(props)) {
    if (SKIP_PROPS.has(key)) continue;
    entries.push(`${key}: ${serializeValue(props[key], 0)}`);
  }

  if (entries.length === 0) return null;

  let result = `{ ${entries.join(", ")} }`;
  if (result.length > MAX_PROPS_LENGTH) {
    result = result.substring(0, MAX_PROPS_LENGTH - 3) + "...";
  }
  return result;
}

/** Find the first named React component fiber (not a host element like div/span). */
function findFirstComponentFiber(element: Element): any | null {
  let fiber = getFiberFromElement(element);
  while (fiber) {
    if (
      fiber.type &&
      typeof fiber.type !== "string" &&
      getComponentName(fiber) !== null
    ) {
      return fiber;
    }
    fiber = fiber.return;
  }
  return null;
}

const MAX_CONTENT_LENGTH = 2000;

function getElementContent(element: Element): string | null {
  const html = element.outerHTML;
  if (!html) return null;
  if (html.length <= MAX_CONTENT_LENGTH) return html;
  return html.substring(0, MAX_CONTENT_LENGTH) + "\n<!-- truncated -->";
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
    const response: RCPResultMessage = { type: "RCP_RESULT", components: [], rect: null, content: null, props: null };
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
  const content = getElementContent(target || element);

  // Extract props from the first named React component (not host elements)
  const componentFiber = target ? findFirstComponentFiber(target) : null;
  const props = componentFiber ? serializeProps(componentFiber) : null;

  const response: RCPResultMessage = { type: "RCP_RESULT", components, rect, content, props };
  window.postMessage(response, "*");
});
