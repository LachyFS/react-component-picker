export interface ComponentInfo {
  name: string;
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export interface PickerSettings {
  hotkey: string;
  includeParentChain: boolean;
  includePageUrl: boolean;
  parentChainDepth: number;
}

// Messages between page-script (MAIN world) and content script (ISOLATED world)
export interface RCPQueryMessage {
  type: "RCP_QUERY";
  x: number;
  y: number;
}

export interface RCPResultMessage {
  type: "RCP_RESULT";
  components: ComponentInfo[];
  rect: { top: number; left: number; width: number; height: number } | null;
}

export type RCPPostMessage = RCPQueryMessage | RCPResultMessage;

// Messages via chrome.runtime between popup/background and content script
export interface SettingsUpdatedMessage {
  type: "SETTINGS_UPDATED";
  settings: PickerSettings;
}

export type RuntimeMessage = SettingsUpdatedMessage;
