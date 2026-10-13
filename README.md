# Unsloth Chat for VS Code

A lightweight VS Code extension that adds a chat panel for a local [Unsloth](https://github.com/unslothai/unsloth) server. It talks to Unsloth's OpenAI-compatible API (`/v1/chat/completions`) and streams the answers into a sidebar view.

## Features

- **Streaming chat** in the VS Code activity bar, with a "waiting for response" indicator.
- **Multiple chats as tabs** inside the same view. Each tab has its own history and session; they can run in parallel and be cleared or closed individually.
- **File and folder context**: reference files or folders with `@` (with autocomplete) and optionally attach the currently open editor file.
- **Model management**: pick a model from the models served by Unsloth (`GET /v1/models`), or start one via the CLI (`unsloth run --model ...`) in a terminal.
- **Server-side tools** (Python, web search, terminal) with a permission mode:
  - `ask` (Supervise): confirmation dialog in VS Code for every tool call
  - `auto`: only risky calls ask for confirmation
  - `off`: no prompts, sandbox stays on
  - `full` (Unsupervised): no prompts and no sandbox (dangerous)
- **Collapsible tool calls and results** in the chat.
- **Sampling settings**: temperature, max tokens, top-p, top-k, min-p, repeat penalty, seed, reasoning effort, system prompt.
- **English and German UI**, selected automatically from the VS Code display language.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (with npm) to build the extension
- VS Code 1.85 or newer
- A running Unsloth server with an API key (created in Unsloth under *Settings > API*). The default endpoint is `http://localhost:8888/v1`.

## Build

```bash
git clone <your-repository-url>
cd VS-CodeUnsloth
npm install
npm run package
```

`npm run package` compiles the TypeScript sources (`src/` to `out/`) and creates `unsloth-chat-<version>.vsix` in the project root.

Note: `npm run compile` and `npm run package` automatically bump the patch version in `package.json` on every run.

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run compile` | Bump the patch version and compile only |
| `npm run watch` | Compile on file changes (for development) |
| `npm run package` | Compile and build the `.vsix` package |

To debug without packaging, open the folder in VS Code and press `F5` to start an Extension Development Host.

## Install

1. Open VS Code.
2. Open the Extensions view, click the `...` menu in the top right and choose **Install from VSIX...**, then select the generated `.vsix` file.
3. Reload the window.

Or from the command line:

```bash
code --install-extension unsloth-chat-<version>.vsix
```

## Usage

1. Start your Unsloth server.
2. Click the **Unsloth Chat** icon in the activity bar.
3. Click the gear button, enter the base URL and your API key, load the models, choose one and click **Save**.
4. Type a message and press `Enter` to send (`Shift+Enter` for a new line).
5. Use the `+` button to open another chat tab, and **Clear** to empty the current one.

### Commands

| Command | Description |
| --- | --- |
| `Unsloth Chat: Open` | Open the chat view |
| `Unsloth Chat: New chat` | Open a new chat tab |
| `Unsloth Chat: Clear history` | Clear the active chat |

### Settings

All settings live under `unslothChat.*` in the VS Code settings (or in the gear panel of the chat):

`baseUrl`, `apiKey`, `model`, `systemPrompt`, `temperature`, `maxTokens`, `topP`, `topK`, `minP`, `repeatPenalty`, `seed`, `reasoningEffort`, `enableTools`, `toolPython`, `toolWebSearch`, `toolTerminal`, `permissionMode`, `runFlags`.

## Security notes

- The API key is stored in your VS Code user settings in plain text.
- The `full` permission mode runs tool calls without confirmation and without a sandbox. Use it only if you trust the model and the environment.

## Project layout

```
src/extension.ts        extension host code and chat webview
media/icon.svg          activity bar icon
package.json            manifest, commands, settings
package.nls*.json       English and German manifest strings
```
