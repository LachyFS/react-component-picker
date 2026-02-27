# Contributing

Thanks for your interest in contributing to React Component Picker!

## Getting started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/react-component-picker.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b my-feature`
5. Make your changes
6. Build and test: `pnpm build`
7. Load the extension in Chrome (`chrome://extensions` > Load unpacked) and verify your changes
8. Commit and push your branch
9. Open a pull request

## Development

```bash
pnpm watch    # Rebuild on file changes
pnpm build    # Production build
```

After rebuilding, reload the extension in Chrome to pick up the changes.

## Guidelines

- Keep changes focused — one feature or fix per PR
- Follow the existing code style (TypeScript strict mode, no `any` leaks)
- Test on a React app (any version 16–19) before submitting
- Update the README if your change affects usage or configuration

## Reporting bugs

Open an issue with:
- What you expected to happen
- What actually happened
- The React version of the page you were inspecting
- Chrome version
- Steps to reproduce

## Feature requests

Open an issue describing the feature and why it would be useful. Discussion before implementation helps avoid wasted effort.
