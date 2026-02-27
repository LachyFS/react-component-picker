<div align="center">

# React Component Picker

**Inspect any React component on the page. Hover, click, copy.**

[![CI](https://github.com/lachyfs/react-component-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/lachyfs/react-component-picker/actions/workflows/ci.yml)
[![Release](https://github.com/lachyfs/react-component-picker/actions/workflows/release.yml/badge.svg)](https://github.com/lachyfs/react-component-picker/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](manifest.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![React 16–19](https://img.shields.io/badge/React-16--19-61DAFB?logo=react&logoColor=black)](https://react.dev)

<br />

Hold a hotkey, hover over elements to see their component name, source file, props, and parent chain — then click to copy it all to your clipboard.

</div>

---

## Features

- **Hover to inspect** — highlights React components with an overlay showing the component name, file path, and line number
- **Click to copy** — copies component info to clipboard in a readable format
- **Parent chain** — optionally shows the parent component hierarchy
- **Props display** — shows the component's current props (excluding children, className, style)
- **Source paths** — cleans up webpack/Vite internal paths to show meaningful file locations
- **Per-site toggle** — enable/disable on specific sites via the popup
- **Configurable hotkey** — change the activation key from the popup (default: Alt)
- **Works with React 16–19** — supports `_debugSource` (React 16–18) and `_debugOwnerStack` (React 19+)

## Install

### From source

```bash
# Clone the repo
git clone https://github.com/lachyfs/react-component-picker.git
cd react-component-picker

# Install dependencies
pnpm install

# Build
pnpm build
```

Then load the extension in Chrome:

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the project root directory

### Development

```bash
pnpm watch
```

This rebuilds on file changes. Reload the extension in Chrome after each rebuild.

## Usage

1. Navigate to any page built with React
2. Hold the activation hotkey (default: **Alt**)
3. Hover over elements — a blue overlay highlights the React component with a tooltip showing:
   - Component name
   - Source file path and line number
   - Props
   - Parent component chain
4. Click to copy the component info to your clipboard
5. Press **Escape** to cancel

### Copied output format

```
ComponentName (src/components/Component.tsx:23) { onClick: [Function handleClick], disabled: false }
  in ParentComponent (src/layouts/Parent.tsx:45)
  in GrandparentComponent (src/app/layout.tsx:12)

Page: https://example.com/page
```

### Popup settings

- **Enable/disable per site** — toggle the extension for the current domain
- **Activation hotkey** — click the button and press any key to rebind
- **Include parent chain** — toggle parent component display
- **Parent chain depth** — how many parent components to include (1–10)
- **Include page URL** — append the current page URL to copied output

## Project structure

```
├── src/
│   ├── background/
│   │   └── service-worker.ts    # Extension background script
│   ├── content/
│   │   ├── index.ts             # Content script entry (isolated world)
│   │   ├── picker.ts            # Picker activation/deactivation logic
│   │   ├── overlay.ts           # Highlight overlay and tooltip rendering
│   │   └── page-script.ts       # Main world script (React fiber access)
│   ├── popup/
│   │   ├── popup.html           # Extension popup UI
│   │   ├── popup.css            # Popup styles
│   │   └── popup.ts             # Popup logic and settings management
│   └── shared/
│       ├── types.ts             # Shared TypeScript types
│       └── constants.ts         # Shared constants and defaults
├── icons/                       # Extension icons (16, 48, 128px)
├── manifest.json                # Chrome extension manifest (MV3)
├── esbuild.config.mjs           # Build configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

## How it works

The extension uses two content scripts injected into every page:

1. **Page script** (`MAIN` world) — has access to the DOM's React fiber internals. When it receives a query with mouse coordinates, it uses `document.elementFromPoint()` to find the element, walks the React fiber tree to collect component names and source info, and posts the result back.

2. **Content script** (`ISOLATED` world) — listens for the activation hotkey, manages the visual overlay, and bridges messages between the page script and the extension runtime.

Communication between the two worlds uses `window.postMessage`. The popup and background script communicate settings via `chrome.storage` and `chrome.runtime` messaging.

## Requirements

- Chrome 120+
- Node.js 18+
- pnpm

## License

MIT — see [LICENSE](LICENSE)
