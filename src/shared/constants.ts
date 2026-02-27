import type { PickerSettings } from "./types";

export const MESSAGE_PREFIX = "RCP_";
export const OVERLAY_ID = "__rcp-overlay";
export const TOOLTIP_ID = "__rcp-tooltip";
export const ACTIVE_CLASS = "__rcp-active";
export const STORAGE_KEY = "rcp_settings";
export const OVERLAY_Z_INDEX = 2147483647;

export const DEFAULT_SETTINGS: PickerSettings = {
  hotkey: "Alt",
  includeParentChain: true,
  includePageUrl: false,
  parentChainDepth: 3,
};

// Internal React fiber property prefixes
export const FIBER_PREFIXES = [
  "__reactFiber$",
  "__reactInternalInstance$",
] as const;

// React internal component names to skip
export const INTERNAL_NAMES = new Set([
  "Fragment",
  "Suspense",
  "StrictMode",
  "Profiler",
  "Provider",
  "Consumer",
  "ForwardRef",
  "Context",
]);
