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
- **MCP tools** (e.g. [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP)): the extension starts MCP servers itself and lets the model call their tools (shell, files, ...). See [MCP tools](#mcp-tools).
- **Collapsible tool calls and results** in the chat.
- **Sampling settings**: temperature, max tokens, top-p, top-k, min-p, repeat penalty, seed, reasoning effort, system prompt.
- **English and German UI**, selected automatically from the VS Code display language.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (with npm) to build the extension
- VS Code 1.85 or newer
- A running Unsloth server with an API key (created in Unsloth under *Settings > API*). The default endpoint is `http://localhost:8888/v1`.

## Build

```bash
git clone https://github.com/kaskagir/VS-CodeUnsloth.git
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

`baseUrl`, `apiKey`, `model`, `systemPrompt`, `temperature`, `maxTokens`, `topP`, `topK`, `minP`, `repeatPenalty`, `seed`, `reasoningEffort`, `enableTools`, `toolPython`, `toolWebSearch`, `toolTerminal`, `permissionMode`, `runFlags`, `mcpServers`, `mcpConfirm`, `mcpExclusive`.

## MCP tools

Unsloth's built-in tools run in its sandbox. To let the model work on your own files and run commands, configure MCP servers in your VS Code `settings.json`. The extension starts them (stdio), sends their tools to Unsloth as OpenAI `tools`, runs the tool calls the model requests and feeds the results back (up to 15 rounds per message).

```json
"unslothChat.mcpServers": {
  "desktop-commander": {
    "command": "npx",
    "args": ["-y", "@wonderwhy-er/desktop-commander@latest"]
  }
}
```

**Projects in WSL** (Unsloth and VS Code on Windows): add `"wsl"` to run the MCP server inside WSL. `true` uses the default distribution, or pass a distribution name (see `wsl -l -v`). Node.js/npx must be installed inside that distribution. Optional `cwd` sets the working directory inside WSL.

```json
"unslothChat.mcpServers": {
  "desktop-commander-wsl": {
    "command": "npx",
    "args": ["-y", "@wonderwhy-er/desktop-commander@latest"],
    "wsl": "Ubuntu",
    "cwd": "/home/<user>/project"
  }
}
```

The model then sees and edits WSL files by their Linux paths (e.g. `/home/<user>/project/...`) and its commands run in WSL. If you use the VS Code WSL extension instead (window connected to WSL), the chat extension must be installed in WSL too; then plain `npx` already runs in WSL and `wsl` is not needed.

- `unslothChat.mcpExclusive` (default `true`): while MCP tools are available, Unsloth's built-in sandbox tools are switched off, so the model cannot fall back to the sandbox. Set it to `false` to offer both.
- `unslothChat.mcpConfirm` (default `true`): ask with Allow/Deny buttons in the chat before MCP tool calls. This only applies to the permission modes `ask` and `auto`; with `off` and `full` (Unsupervised) MCP tools run without asking.
- Command `Unsloth Chat: Restart MCP servers` restarts the servers, e.g. after a failed start.
- The model must support tool calling, and your Unsloth server has to accept the `tools` parameter of the chat completions API.

## Security notes

- The API key is stored in your VS Code user settings in plain text.
- MCP servers run with your user rights and can read, change and delete files. Keep `mcpConfirm` enabled unless you trust the model.
- The `full` permission mode runs tool calls without confirmation and without a sandbox. Use it only if you trust the model and the environment.

## Project layout

```
src/extension.ts        extension host code and chat webview
media/icon.svg          activity bar icon
package.json            manifest, commands, settings
package.nls*.json       English and German manifest strings
```
