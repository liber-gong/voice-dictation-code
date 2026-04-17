# Voice Dictation - Code

Streaming speech-to-text (ASR) voice dictation for Visual Studio Code.

Vendor-neutral by design. Tested with Doubao streaming ASR (`volc.seedasr.sauc.duration`).

## Get Started

1. Configure credentials in settings (`Cmd+,` → search `voice-dictation-code`).

2. Click the **Dictate** icon in the status bar to start. Recommended to use with the keyboard shortcut (Mac / Windows):
  - Default Mode: `Ctrl+Cmd+V` / `Ctrl+Alt+V`
  - Stream Mode: `Ctrl+Cmd+Shift+V` / `Ctrl+Alt+Shift+V`

> Note: VS Code needs accessibility permission to control the system. Without it, Stream Mode and Default Mode will all falls back to panel to output. The extension will prompt you when needed.

## Development

```bash
pnpm install
```

F5 to launch.

## Acknowledgements

Inspired by [Claude Voice](https://marketplace.visualstudio.com/items?itemName=jsaluja.claude-voice).

