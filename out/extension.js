"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const FIELDS = {
    baseUrl: 's', apiKey: 's', model: 's', systemPrompt: 's', reasoningEffort: 's', runFlags: 's',
    temperature: 'n', maxTokens: 'n', topP: 'n', topK: 'n', minP: 'n', repeatPenalty: 'n', seed: 'n',
    enableTools: 'b', permissionMode: 's', toolPython: 'b', toolWebSearch: 'b', toolTerminal: 'b'
};
const I18N = {
    modelSet: ["Modell gesetzt: {0}", "Model set: {0}"],
    truncated: ["...(gekürzt)", "...(truncated)"],
    fileRef: ["Datei @{0}:", "File @{0}:"],
    dirRef: ["Verzeichnis @{0}:", "Directory @{0}:"],
    empty: ["(leer)", "(empty)"],
    activeFile: ["Aktuell geöffnete Datei {0}:", "Currently open file {0}:"],
    errPerm: ["Berechtigung konnte nicht gespeichert werden: {0}", "Could not save permission: {0}"],
    errSave: ["Speichern fehlgeschlagen: {0}", "Saving failed: {0}"],
    errModels: ["Modelle laden fehlgeschlagen: {0}", "Loading models failed: {0}"],
    errAuth: ["401 Unauthorized: API-Key fehlt oder ist ungültig (Unsloth: Settings > API).", "401 Unauthorized: API key missing or invalid (Unsloth: Settings > API)."],
    errModelName: ["Ungültiger Modellname für \"unsloth run\".", "Invalid model name for \"unsloth run\"."],
    errFlags: ["Ungültige Zeichen in runFlags.", "Invalid characters in runFlags."],
    termStarted: ["Terminal gestartet: unsloth run --model {0}. Nach dem Laden \"Modelle laden\" klicken.", "Terminal started: unsloth run --model {0}. After loading, click \"Load models\"."],
    toolLabel: ["Tool: {0}", "Tool: {0}"],
    resultLabel: ["Ergebnis ({0}):", "Result ({0}):"],
    askTool: ["Unsloth will das Tool \"{0}\" ausführen:\n{1}", "Unsloth wants to run the tool \"{0}\":\n{1}"],
    allow: ["Erlauben", "Allow"],
    deny: ["Ablehnen", "Deny"],
    errConfirm: ["Bestätigung fehlgeschlagen ({0}). Stelle ggf. \"Berechtigungsmodus\" auf \"off\".", "Confirmation failed ({0}). If needed, set \"Permission mode\" to \"off\"."],
    refreshTip: ["Modelle von Unsloth abrufen (GET /v1/models)", "Fetch models from Unsloth (GET /v1/models)"],
    settings: ["Einstellungen", "Settings"],
    baseUrl: ["Basis-URL", "Base URL"],
    model: ["Modell", "Model"],
    loadModels: ["Modelle laden", "Load models"],
    runModelTip: ["Startet 'unsloth run --model ...' in einem Terminal", "Starts 'unsloth run --model ...' in a terminal"],
    runModel: ["Modell per CLI starten", "Start model via CLI"],
    runFlags: ["Zusätzliche Flags für \"unsloth run\"", "Additional flags for \"unsloth run\""],
    systemPrompt: ["System-Prompt", "System prompt"],
    reasoning: ["Reasoning-Aufwand", "Reasoning effort"],
    default: ["Standard", "Default"],
    temperature: ["Temperatur", "Temperature"],
    maxTokens: ["Max. Tokens", "Max. tokens"],
    random: ["zufällig", "random"],
    enableTools: ["Unsloth-Tools aktivieren (serverseitig)", "Enable Unsloth tools (server-side)"],
    webSearch: ["Websuche", "Web search"],
    permMode: ["Berechtigungsmodus für Tools", "Permission mode for tools"],
    pmOff: ["off (ohne Rückfrage, Sandbox an)", "off (no prompts, sandbox on)"],
    pmFull: ["full (ohne Rückfrage, ohne Sandbox)", "full (no prompts, no sandbox)"],
    pmAuto: ["auto (Rückfrage nur bei riskanten Aufrufen)", "auto (prompt only for risky calls)"],
    pmAsk: ["ask (Rückfrage bei jedem Aufruf)", "ask (prompt for every call)"],
    save: ["Speichern", "Save"],
    saved: ["Gespeichert", "Saved"],
    chipTip: ["Klicken, um die aktuell geöffnete Datei nicht mitzusenden", "Click to not send the currently open file"],
    inputPh: ["Nachricht (@Datei oder @Ordner referenzieren, Enter = senden, Shift+Enter = Zeilenumbruch)", "Message (reference @file or @folder, Enter = send, Shift+Enter = new line)"],
    send: ["Senden", "Send"],
    stop: ["Stop", "Stop"],
    clear: ["Leeren", "Clear"],
    pickModel: ["Modell wählen", "Select model"],
    modelsNotLoaded: ["(Modelle nicht geladen)", "(models not loaded)"],
    permTip: ["Berechtigungen für Tool-Aufrufe", "Permissions for tool calls"],
    closeChat: ["Chat schließen", "Close chat"],
    newChat: ["Neuer Chat", "New chat"],
    pNoneT: ["Keine Tools", "No tools"],
    pNoneD: ["Reiner Chat: der Server führt keine Tools aus.", "Plain chat: the server runs no tools."],
    pAutoD: ["Läuft freihändig; nur riskante Aufrufe (z. B. Zugangsdaten, Löschen, Netzwerk-Exfiltration) fragen nach.", "Runs hands-free; only risky calls (e.g. credentials, deleting, network exfiltration) ask first."],
    pAskD: ["Fragt vor jedem Tool-Aufruf (Dialog in VS Code).", "Asks before every tool call (dialog in VS Code)."],
    pOffT: ["Ohne Rückfrage", "No prompts"],
    pOffD: ["Führt Tools ohne Nachfrage aus; Sandbox bleibt aktiv.", "Runs tools without asking; sandbox stays on."],
    pFullD: ["Führt jeden Befehl ohne Nachfrage und ohne Sandbox aus. Gefährlich!", "Runs every command without asking and without sandbox. Dangerous!"],
    noModels: ["(keine Modelle gefunden)", "(no models found)"],
    waiting: ["Warte auf Antwort von Unsloth …", "Waiting for response from Unsloth …"],
};
const LANG = vscode.env.language.toLowerCase().startsWith('de') ? 0 : 1;
function t(key, ...args) {
    return I18N[key][LANG].replace(/\{(\d+)\}/g, (_m, i) => String(args[Number(i)]));
}
function j(key) {
    return JSON.stringify(t(key)).replace(/</g, '\\u003c');
}
function activeFileMsg() {
    const ed = vscode.window.activeTextEditor;
    const uri = ed?.document.uri;
    const path = uri && uri.scheme === 'file' ? vscode.workspace.asRelativePath(uri, false) : null;
    return { type: 'activeFile', path };
}
class ChatEngine {
    id;
    sink;
    history = [];
    abort;
    sessionId = `vscode-${Date.now()}`;
    constructor(id, sink) {
        this.id = id;
        this.sink = sink;
    }
    dispose() {
        this.abort?.abort();
    }
    async handle(msg) {
        if (msg.type === 'send') {
            await this.send(String(msg.text ?? ''), Boolean(msg.attachActive));
        }
        else if (msg.type === 'mentionQuery') {
            await this.mentionQuery(String(msg.query ?? ''));
        }
        else if (msg.type === 'getActiveFile') {
            this.postActiveFile();
        }
        else if (msg.type === 'stop') {
            this.abort?.abort();
        }
        else if (msg.type === 'clear') {
            this.clear();
        }
        else if (msg.type === 'getConfig') {
            this.postConfig();
            await this.listModels();
        }
        else if (msg.type === 'saveConfig') {
            await this.saveConfig(msg.values ?? {});
        }
        else if (msg.type === 'listModels') {
            await this.listModels();
        }
        else if (msg.type === 'setPermission') {
            await this.setPermission(String(msg.value ?? ''));
        }
        else if (msg.type === 'setModel') {
            await vscode.workspace.getConfiguration('unslothChat')
                .update('model', String(msg.model ?? ''), vscode.ConfigurationTarget.Global);
            this.post({ type: 'info', text: t('modelSet', msg.model) });
        }
        else if (msg.type === 'runModel') {
            this.runModel(String(msg.model ?? ''));
        }
    }
    postActiveFile() {
        this.post(activeFileMsg());
    }
    async mentionQuery(query) {
        const q = query.trim().toLowerCase();
        try {
            const uris = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/out/**}', 500);
            const rel = uris.map(u => vscode.workspace.asRelativePath(u, false).replace(/\\/g, '/'));
            const dirs = new Set();
            for (const r of rel) {
                const parts = r.split('/');
                for (let i = 1; i < parts.length; i++) {
                    dirs.add(parts.slice(0, i).join('/'));
                }
            }
            const matchFiles = rel.filter(r => !q || r.toLowerCase().includes(q)).slice(0, 25);
            const matchDirs = [...dirs].filter(r => !q || r.toLowerCase().includes(q)).slice(0, 10);
            const items = [
                ...matchDirs.map(p => ({ path: p, kind: 'dir' })),
                ...matchFiles.map(p => ({ path: p, kind: 'file' }))
            ];
            this.post({ type: 'mentionResults', items });
        }
        catch {
            this.post({ type: 'mentionResults', items: [] });
        }
    }
    async listDir(uri, rel, depth, out) {
        if (depth > 3 || out.length > 200) {
            return;
        }
        let entries;
        try {
            entries = await vscode.workspace.fs.readDirectory(uri);
        }
        catch {
            return;
        }
        for (const [name, type] of entries) {
            if (name === 'node_modules' || name === '.git' || name === 'out') {
                continue;
            }
            const childRel = `${rel}/${name}`;
            if (type === vscode.FileType.Directory) {
                out.push(`${childRel}/`);
                await this.listDir(vscode.Uri.joinPath(uri, name), childRel, depth + 1, out);
            }
            else {
                out.push(childRel);
            }
            if (out.length > 200) {
                break;
            }
        }
    }
    truncate(content, max = 20000) {
        return content.length > max ? `${content.slice(0, max)}\n${t('truncated')}` : content;
    }
    async resolveMentions(text) {
        const folder = vscode.workspace.workspaceFolders?.[0];
        if (!folder) {
            return '';
        }
        const re = /(^|\s)@([^\s]+)/g;
        const paths = new Set();
        let m;
        while ((m = re.exec(text))) {
            paths.add(m[2].replace(/\/+$/, ''));
        }
        if (!paths.size) {
            return '';
        }
        const blocks = [];
        for (const p of paths) {
            const uri = vscode.Uri.joinPath(folder.uri, p);
            try {
                const stat = await vscode.workspace.fs.stat(uri);
                if (stat.type === vscode.FileType.Directory) {
                    const entries = [];
                    await this.listDir(uri, p, 0, entries);
                    blocks.push(`${t('dirRef', p)}\n${entries.join('\n') || t('empty')}`);
                }
                else {
                    const bytes = await vscode.workspace.fs.readFile(uri);
                    const content = this.truncate(Buffer.from(bytes).toString('utf8'));
                    blocks.push(`${t('fileRef', p)}\n\`\`\`\n${content}\n\`\`\``);
                }
            }
            catch {
                // Referenz konnte nicht aufgelöst werden, ignorieren
            }
        }
        return blocks.join('\n\n');
    }
    activeFileBlock() {
        const ed = vscode.window.activeTextEditor;
        if (!ed || ed.document.uri.scheme !== 'file') {
            return '';
        }
        const rel = vscode.workspace.asRelativePath(ed.document.uri, false);
        const content = this.truncate(ed.document.getText());
        return `${t('activeFile', rel)}\n\`\`\`${ed.document.languageId}\n${content}\n\`\`\``;
    }
    async setPermission(value) {
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        try {
            if (value === 'none') {
                await cfg.update('enableTools', false, vscode.ConfigurationTarget.Global);
            }
            else if (['ask', 'auto', 'off', 'full'].includes(value)) {
                await cfg.update('enableTools', true, vscode.ConfigurationTarget.Global);
                await cfg.update('permissionMode', value, vscode.ConfigurationTarget.Global);
            }
            else {
                return;
            }
            this.postConfig();
        }
        catch (e) {
            this.post({ type: 'error', text: t('errPerm', e?.message ?? e) });
        }
    }
    postConfig() {
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        const values = {};
        for (const k of Object.keys(FIELDS)) {
            values[k] = cfg.get(k);
        }
        this.post({ type: 'config', values });
    }
    async saveConfig(values) {
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        try {
            for (const [k, kind] of Object.entries(FIELDS)) {
                const v = values[k];
                if (kind === 's' && typeof v === 'string') {
                    await cfg.update(k, v, vscode.ConfigurationTarget.Global);
                }
                else if (kind === 'b' && typeof v === 'boolean') {
                    await cfg.update(k, v, vscode.ConfigurationTarget.Global);
                }
                else if (kind === 'n') {
                    if (v === '' || v === null || v === undefined) {
                        await cfg.update(k, undefined, vscode.ConfigurationTarget.Global);
                    }
                    else if (Number.isFinite(Number(v))) {
                        await cfg.update(k, Number(v), vscode.ConfigurationTarget.Global);
                    }
                }
            }
            this.postConfig();
            this.post({ type: 'saved' });
        }
        catch (e) {
            this.post({ type: 'error', text: t('errSave', e?.message ?? e) });
        }
    }
    conn() {
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        const baseUrl = cfg.get('baseUrl', '').replace(/\/+$/, '');
        const apiKey = cfg.get('apiKey', '');
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
        return { baseUrl, headers };
    }
    async listModels() {
        const { baseUrl, headers } = this.conn();
        try {
            const res = await fetch(`${baseUrl}/models`, { headers, signal: AbortSignal.timeout(10000) });
            if (res.status === 401) {
                throw new Error(t('errAuth'));
            }
            if (!res.ok) {
                throw new Error(`HTTP ${res.status} ${res.statusText}`);
            }
            const json = await res.json();
            const ids = (json.data ?? []).map((m) => String(m.id));
            this.post({ type: 'models', ids });
        }
        catch (e) {
            this.post({ type: 'error', text: t('errModels', e?.message ?? e) });
        }
    }
    runModel(model) {
        if (!/^[\w.\-\/:]+$/.test(model)) {
            this.post({ type: 'error', text: t('errModelName') });
            return;
        }
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        const flags = (cfg.get('runFlags', '') || '').trim();
        if (/[;&|<>`$\n]/.test(flags)) {
            this.post({ type: 'error', text: t('errFlags') });
            return;
        }
        const term = vscode.window.createTerminal('Unsloth');
        term.show();
        term.sendText(`unsloth run --model ${model}${flags ? ' ' + flags : ''}`);
        this.post({ type: 'info', text: t('termStarted', model) });
    }
    clear() {
        this.abort?.abort();
        this.history = [];
        this.sessionId = `vscode-${Date.now()}`;
        this.post({ type: 'cleared' });
    }
    post(m) {
        this.sink({ ...m, c: this.id });
    }
    buildBody(cfg, messages) {
        const body = {
            model: cfg.get('model', 'unsloth'),
            messages,
            temperature: cfg.get('temperature', 0.7),
            max_tokens: cfg.get('maxTokens', 2048),
            stream: true
        };
        const opt = [
            ['topP', 'top_p'], ['topK', 'top_k'], ['minP', 'min_p'],
            ['repeatPenalty', 'repeat_penalty'], ['seed', 'seed']
        ];
        for (const [k, apiName] of opt) {
            const v = cfg.get(k);
            if (typeof v === 'number') {
                body[apiName] = v;
            }
        }
        const effort = cfg.get('reasoningEffort', '');
        if (effort) {
            body.reasoning_effort = effort;
        }
        if (cfg.get('enableTools', false)) {
            const tools = [];
            if (cfg.get('toolPython', true)) {
                tools.push('python');
            }
            if (cfg.get('toolWebSearch', true)) {
                tools.push('web_search');
            }
            if (cfg.get('toolTerminal', false)) {
                tools.push('terminal');
            }
            body.enable_tools = true;
            body.enabled_tools = tools;
            body.session_id = this.sessionId;
            const mode = cfg.get('permissionMode', 'off');
            if (mode) {
                body.permission_mode = mode;
            }
        }
        return body;
    }
    async handleToolEvent(ev) {
        if (ev.type === 'tool_start') {
            const name = String(ev.tool_name ?? 'tool');
            const args = ev.arguments ?? ev.args ?? ev.input ?? ev.command ?? ev.code;
            const detail = args !== undefined
                ? (typeof args === 'string' ? args : JSON.stringify(args))
                : JSON.stringify(ev, (k, v) => (k === 'approval_id' || k === 'provenance' ? undefined : v));
            this.post({ type: 'tool', text: `${t('toolLabel', name)}\n${detail.slice(0, 1500)}` });
            if (ev.awaiting_confirmation && ev.approval_id) {
                const pick = await vscode.window.showWarningMessage(t('askTool', name, detail.slice(0, 500)), { modal: true }, t('allow'), t('deny'));
                await this.confirmTool(String(ev.approval_id), pick === t('allow') ? 'allow' : 'deny');
            }
        }
        else if (ev.type === 'tool_end') {
            const r = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result ?? '');
            if (r) {
                this.post({ type: 'tool', text: `${t('resultLabel', ev.tool_name ?? 'tool')}\n${r.slice(0, 3000)}` });
            }
        }
    }
    async confirmTool(approvalId, decision) {
        const { baseUrl, headers } = this.conn();
        const origin = baseUrl.replace(/\/v1$/, '');
        try {
            const res = await fetch(`${origin}/api/inference/tool-confirm`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ session_id: this.sessionId, approval_id: approvalId, decision })
            });
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${await res.text()}`);
            }
        }
        catch (e) {
            this.post({
                type: 'error',
                text: t('errConfirm', e?.message ?? e)
            });
        }
    }
    async send(text, attachActive) {
        if (!text.trim()) {
            return;
        }
        const cfg = vscode.workspace.getConfiguration('unslothChat');
        const { baseUrl, headers } = this.conn();
        const toolsOn = cfg.get('enableTools', false);
        if (toolsOn && cfg.get('permissionMode', 'off') !== 'off') {
            headers['X-Unsloth-Events'] = '1';
        }
        const system = cfg.get('systemPrompt', '');
        this.history.push({ role: 'user', content: text });
        const messages = system
            ? [{ role: 'system', content: system }, ...this.history]
            : [...this.history];
        const contextBlocks = [];
        const mentionBlock = await this.resolveMentions(text);
        if (mentionBlock) {
            contextBlocks.push(mentionBlock);
        }
        if (attachActive) {
            const af = this.activeFileBlock();
            if (af) {
                contextBlocks.push(af);
            }
        }
        if (contextBlocks.length) {
            const last = messages[messages.length - 1];
            messages[messages.length - 1] = { ...last, content: `${contextBlocks.join('\n\n')}\n\n${last.content}` };
        }
        this.abort = new AbortController();
        this.post({ type: 'start' });
        let answer = '';
        try {
            const res = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers,
                signal: this.abort.signal,
                body: JSON.stringify(this.buildBody(cfg, messages))
            });
            if (!res.ok || !res.body) {
                throw new Error(`HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';
                for (const raw of lines) {
                    const line = raw.trim();
                    if (!line.startsWith('data:')) {
                        continue;
                    }
                    const data = line.slice(5).trim();
                    if (data === '[DONE]') {
                        continue;
                    }
                    try {
                        const json = JSON.parse(data);
                        if (json && typeof json.type === 'string' && !json.choices) {
                            await this.handleToolEvent(json);
                            continue;
                        }
                        const delta = json.choices?.[0]?.delta?.content;
                        if (delta) {
                            answer += delta;
                            this.post({ type: 'delta', text: delta });
                        }
                    }
                    catch {
                        // unvollständiger Chunk ignorieren
                    }
                }
            }
        }
        catch (e) {
            if (e?.name !== 'AbortError') {
                this.post({ type: 'error', text: String(e?.message ?? e) });
            }
        }
        finally {
            if (answer) {
                this.history.push({ role: 'assistant', content: answer });
            }
            this.post({ type: 'end' });
        }
    }
}
function chatHtml() {
    const nonce = Math.random().toString(36).slice(2);
    return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
body{font-family:var(--vscode-font-family);color:var(--vscode-foreground);display:flex;flex-direction:column;height:100vh;margin:0;padding:8px;box-sizing:border-box}
#tabs{display:flex;gap:2px;flex-wrap:wrap;margin-bottom:4px;flex:none}
.tab{display:flex;gap:6px;align-items:center;padding:3px 8px;cursor:pointer;border:1px solid var(--vscode-panel-border,#555);border-radius:4px;font-size:12px;max-width:150px}
.tab span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tab.on{background:var(--vscode-button-background);color:var(--vscode-button-foreground)}
.wait{opacity:.7;font-style:italic;animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{opacity:.3}}
.tool summary{cursor:pointer;user-select:none}
.tool .tb{margin-top:6px;white-space:pre-wrap}
.tab .x{opacity:.7}
#tabs button{padding:2px 8px}
.lg{flex:1 1 auto;overflow-y:auto;min-height:150px}
body{overflow-y:auto}
#bar,#tb,#top,#activeFileBar{flex:none}
#inWrap{min-width:0}
#in{width:100%;box-sizing:border-box;height:110px;min-height:60px;max-height:50vh;resize:vertical;display:block}
#cfg{flex:none}
.msg{margin:6px 0;padding:8px;border-radius:6px;white-space:pre-wrap;word-break:break-word}
.user{background:var(--vscode-input-background)}
.assistant{background:var(--vscode-editor-inactiveSelectionBackground)}
.tool{background:var(--vscode-textCodeBlock-background);font-family:var(--vscode-editor-font-family);font-size:12px}
.error{color:var(--vscode-errorForeground)}
pre{background:var(--vscode-textCodeBlock-background);padding:6px;overflow-x:auto}
#bar{display:flex;gap:4px;margin-top:8px}
textarea{flex:1;resize:none;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border,transparent);padding:6px;font-family:inherit}
#cfg{display:none;border:1px solid var(--vscode-panel-border,#555);border-radius:6px;padding:8px;margin-bottom:6px}
#cfg label{display:block;font-size:11px;margin-top:6px}
#cfg{max-height:60vh;overflow-y:auto}
#cfg input[type=checkbox]{width:auto}
#cfg select{width:100%;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);padding:4px}
#cfg input,#cfg textarea{width:100%;box-sizing:border-box;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border,transparent);padding:4px;font-family:inherit}
#top{display:flex;gap:4px;margin-bottom:4px}
#tb{display:flex;gap:6px;align-items:center;margin-top:6px}
#permWrap{position:relative}
#permBtn{background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border,transparent);border-radius:4px;padding:4px 8px;white-space:nowrap}
#permMenu{display:none;position:absolute;bottom:100%;right:0;margin-bottom:4px;width:260px;max-width:90vw;background:var(--vscode-menu-background,var(--vscode-dropdown-background));color:var(--vscode-menu-foreground,var(--vscode-foreground));border:1px solid var(--vscode-menu-border,var(--vscode-widget-border,#555));border-radius:6px;box-shadow:0 2px 8px var(--vscode-widget-shadow,#0008);z-index:10;padding:4px}
.pi{padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;gap:6px}
.pi:hover{background:var(--vscode-menu-selectionBackground,var(--vscode-list-hoverBackground));color:var(--vscode-menu-selectionForeground,inherit)}
.pi b{display:block;font-size:12px}.pi small{display:block;opacity:.75;font-size:11px;white-space:normal}.pi .ck{width:14px;flex:none}
#modelSel{flex:1;min-width:0;background:var(--vscode-dropdown-background);color:var(--vscode-dropdown-foreground);border:1px solid var(--vscode-dropdown-border,transparent);padding:4px}
button{background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;padding:6px 10px;cursor:pointer}
#activeFileBar{display:none;align-items:center;gap:6px;font-size:12px;margin-bottom:4px}
#activeFileChip{display:flex;align-items:center;gap:4px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);border-radius:12px;padding:2px 8px 2px 10px;cursor:pointer;user-select:none}
#activeFileChip.off{opacity:.5;text-decoration:line-through}
#activeFileChip .x{opacity:.8}
#inWrap{position:relative;flex:1}
#mentionMenu{display:none;position:absolute;bottom:100%;left:0;margin-bottom:4px;width:100%;max-height:220px;overflow-y:auto;background:var(--vscode-menu-background,var(--vscode-dropdown-background));color:var(--vscode-menu-foreground,var(--vscode-foreground));border:1px solid var(--vscode-menu-border,var(--vscode-widget-border,#555));border-radius:6px;box-shadow:0 2px 8px var(--vscode-widget-shadow,#0008);z-index:10}
.mi{padding:4px 8px;cursor:pointer;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mi.sel{background:var(--vscode-menu-selectionBackground,var(--vscode-list-hoverBackground));color:var(--vscode-menu-selectionForeground,inherit)}
.mi .k{opacity:.6;margin-right:4px}
</style></head><body>
<div id="top"><span style="flex:1"></span><button id="refresh" title="${t('refreshTip')}">&#8635;</button><button id="gear" title="${t('settings')}">&#9881;</button></div>
<div id="cfg">
<label>${t('baseUrl')}</label><input id="c_baseUrl">
<label>API-Key (sk-unsloth-...)</label><input id="c_apiKey" type="password">
<label>${t('model')}</label>
<div style="display:flex;gap:4px"><input id="c_model" list="models" style="flex:1"><button id="loadModels" title="GET /v1/models">${t('loadModels')}</button></div>
<datalist id="models"></datalist>
<div style="display:flex;gap:4px;margin-top:4px"><button id="runModel" title="${t('runModelTip')}">${t('runModel')}</button></div>
<label>${t('runFlags')}</label><input id="c_runFlags" placeholder="-c 131072 --threads 8">
<label>${t('systemPrompt')}</label><textarea id="c_systemPrompt" rows="3"></textarea>
<label>${t('reasoning')}</label><select id="c_reasoningEffort"><option value="">${t('default')}</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select>
<label>${t('temperature')}</label><input id="c_temperature" type="number" step="0.1" min="0" max="2">
<label>${t('maxTokens')}</label><input id="c_maxTokens" type="number" step="1" min="1">
<label>Top-P</label><input id="c_topP" type="number" step="0.05" min="0" max="1" placeholder="${t('default')}">
<label>Top-K</label><input id="c_topK" type="number" step="1" min="0" placeholder="${t('default')}">
<label>Min-P</label><input id="c_minP" type="number" step="0.05" min="0" max="1" placeholder="${t('default')}">
<label>Repeat-Penalty</label><input id="c_repeatPenalty" type="number" step="0.05" min="0" placeholder="${t('default')}">
<label>Seed</label><input id="c_seed" type="number" step="1" placeholder="${t('random')}">
<label><input type="checkbox" id="c_enableTools"> ${t('enableTools')}</label>
<label style="margin-left:16px"><input type="checkbox" id="c_toolPython"> Python</label>
<label style="margin-left:16px"><input type="checkbox" id="c_toolWebSearch"> ${t('webSearch')}</label>
<label style="margin-left:16px"><input type="checkbox" id="c_toolTerminal"> Terminal (Bash)</label>
<label>${t('permMode')}</label><select id="c_permissionMode"><option value="off">${t('pmOff')}</option><option value="full">${t('pmFull')}</option><option value="auto">${t('pmAuto')}</option><option value="ask">${t('pmAsk')}</option></select>
<div style="margin-top:8px"><button id="save">${t('save')}</button> <span id="savedMsg"></span></div>
</div>
<div id="tabs"></div>
<div id="activeFileBar"><span id="activeFileChip" title="${t('chipTip')}"><span id="activeFileName"></span><span class="x">✕</span></span></div>
<div id="bar"><div id="inWrap"><div id="mentionMenu"></div><textarea id="in" rows="3" placeholder="${t('inputPh')}"></textarea></div>
<div style="display:flex;flex-direction:column;gap:4px"><button id="send">${t('send')}</button><button id="stop" style="display:none">${t('stop')}</button><button id="clear">${t('clear')}</button></div></div>
<div id="tb">
<select id="modelSel" title="${t('pickModel')}"><option value="">${t('modelsNotLoaded')}</option></select>
<div id="permWrap"><div id="permMenu"></div><button id="permBtn" title="${t('permTip')}"></button></div>
</div>
<script nonce="${nonce}">
const MENTION_RE = /(^|\s)@([^\s]*)$/;
const vs0=acquireVsCodeApi();let activeId=null,seq=0,log=null;const chats={};
const vs={postMessage:m=>vs0.postMessage({...m,c:activeId})};
const inp=document.getElementById('in'),
send=document.getElementById('send'),stop=document.getElementById('stop');
const tabsEl=document.getElementById('tabs');
function updateBusy(){const b=!!(chats[activeId]&&chats[activeId].busy);send.disabled=b;stop.style.display=b?'':'none'}
function renderTabs(){tabsEl.innerHTML='';for(const k in chats){const t=document.createElement('div');t.className='tab'+(k===activeId?' on':'');const s=document.createElement('span');s.textContent=chats[k].title;const x=document.createElement('span');x.className='x';x.textContent='\u2715';x.title=${j('closeChat')};x.onclick=e=>{e.stopPropagation();closeTab(k)};t.onclick=()=>selectTab(k);t.appendChild(s);t.appendChild(x);tabsEl.appendChild(t)}const p=document.createElement('button');p.textContent='+';p.title=${j('newChat')};p.onclick=newTab;tabsEl.appendChild(p)}
function selectTab(id){activeId=id;log=chats[id].log;for(const k in chats)chats[k].log.style.display=k===id?'':'none';renderTabs();updateBusy();inp.focus()}
function newTab(){const id='c'+(++seq)+'_'+Date.now().toString(36);const l=document.createElement('div');l.className='lg';document.body.insertBefore(l,document.getElementById('activeFileBar'));chats[id]={log:l,cur:null,busy:false,named:false,title:'Chat '+seq};selectTab(id)}
function closeTab(id){vs0.postMessage({type:'closeChat',c:id});chats[id].log.remove();delete chats[id];const ks=Object.keys(chats);if(!ks.length)newTab();else if(activeId===id)selectTab(ks[ks.length-1]);else renderTabs()}
newTab();
const keys=['baseUrl','apiKey','model','systemPrompt','reasoningEffort','runFlags','temperature','maxTokens','topP','topK','minP','repeatPenalty','seed','enableTools','toolPython','toolWebSearch','toolTerminal','permissionMode'],val=el=>el.type==='checkbox'?el.checked:el.value,setv=(el,v)=>{if(el.type==='checkbox')el.checked=!!v;else el.value=v??''},cfgEl=document.getElementById('cfg');
document.getElementById('gear').onclick=()=>{cfgEl.style.display=cfgEl.style.display==='block'?'none':'block'};
document.getElementById('save').onclick=()=>{const v={};keys.forEach(k=>v[k]=val(document.getElementById('c_'+k)));vs.postMessage({type:'saveConfig',values:v})};
vs.postMessage({type:'getConfig'});
const PERMS=[
{v:'none',t:${j('pNoneT')},d:${j('pNoneD')}},
{v:'auto',t:'Auto',d:${j('pAutoD')}},
{v:'ask',t:'Supervise',d:${j('pAskD')}},
{v:'off',t:${j('pOffT')},d:${j('pOffD')}},
{v:'full',t:'Unsupervised',d:${j('pFullD')}}];
let perm='none';
const permBtn=document.getElementById('permBtn'),permMenu=document.getElementById('permMenu');
function renderPerm(){const p=PERMS.find(x=>x.v===perm)||PERMS[0];permBtn.textContent=p.t+' \u25BE';permMenu.innerHTML='';
PERMS.forEach(x=>{const d=document.createElement('div');d.className='pi';const c=document.createElement('span');c.className='ck';c.textContent=x.v===perm?'\u2713':'';const w=document.createElement('div');const b=document.createElement('b');b.textContent=x.t;const s=document.createElement('small');s.textContent=x.d;w.appendChild(b);w.appendChild(s);d.appendChild(c);d.appendChild(w);
d.onclick=()=>{permMenu.style.display='none';perm=x.v;renderPerm();vs.postMessage({type:'setPermission',value:x.v})};permMenu.appendChild(d)})}
permBtn.onclick=e=>{e.stopPropagation();permMenu.style.display=permMenu.style.display==='block'?'none':'block'};
document.addEventListener('click',()=>{permMenu.style.display='none'});
renderPerm();
const sel=document.getElementById('modelSel');
let curModel='';
function fillModels(ids){sel.innerHTML='';const list=ids.slice();if(curModel&&!list.includes(curModel))list.unshift(curModel);if(!list.length){const o=document.createElement('option');o.value='';o.textContent=${j('noModels')};sel.appendChild(o);return}list.forEach(i=>{const o=document.createElement('option');o.value=i;o.textContent=i;sel.appendChild(o)});sel.value=curModel||list[0]}
document.getElementById('refresh').onclick=()=>vs.postMessage({type:'listModels'});
sel.onchange=()=>{curModel=sel.value;document.getElementById('c_model').value=curModel;vs.postMessage({type:'setModel',model:curModel})};
document.getElementById('loadModels').onclick=()=>vs.postMessage({type:'listModels'});
document.getElementById('runModel').onclick=()=>vs.postMessage({type:'runModel',model:document.getElementById('c_model').value});
function add(cls,t,l){l=l||log;const d=document.createElement('div');d.className='msg '+cls;d.textContent=t;l.appendChild(d);l.scrollTop=l.scrollHeight;return d}
function addTool(t,l){const i=t.indexOf('\\n'),head=i<0?t:t.slice(0,i),body=i<0?'':t.slice(i+1);const d=document.createElement('details');d.className='msg tool';const sm=document.createElement('summary');sm.textContent=head;d.appendChild(sm);const b=document.createElement('div');b.className='tb';b.textContent=body;d.appendChild(b);l.appendChild(d);l.scrollTop=l.scrollHeight}
let activeFilePath=null,attachActive=true;
const afBar=document.getElementById('activeFileBar'),afChip=document.getElementById('activeFileChip'),afName=document.getElementById('activeFileName');
function renderActiveFile(){if(!activeFilePath){afBar.style.display='none';return}afBar.style.display='flex';afName.textContent=activeFilePath;afChip.classList.toggle('off',!attachActive)}
afChip.onclick=()=>{attachActive=!attachActive;renderActiveFile()};
const mentionMenu=document.getElementById('mentionMenu');
let mentionItems=[],mentionSel=-1,mentionStart=-1;
function closeMention(){mentionMenu.style.display='none';mentionItems=[];mentionSel=-1;mentionStart=-1}
function renderMention(){if(!mentionItems.length){closeMention();return}mentionMenu.innerHTML='';mentionItems.forEach((it,i)=>{const d=document.createElement('div');d.className='mi'+(i===mentionSel?' sel':'');d.innerHTML='<span class="k">'+(it.kind==='dir'?'📁':'📄')+'</span>'+it.path;d.onclick=()=>applyMention(i);mentionMenu.appendChild(d)});mentionMenu.style.display='block'}
function applyMention(i){const it=mentionItems[i];if(!it)return;const before=inp.value.slice(0,mentionStart),after=inp.value.slice(inp.selectionStart);const insert='@'+it.path+(it.kind==='dir'?'/':'')+' ';inp.value=before+insert+after;const pos=before.length+insert.length;inp.selectionStart=inp.selectionEnd=pos;closeMention();inp.focus()}
let mentionTimer=null;
inp.addEventListener('input',()=>{
const pos=inp.selectionStart,before=inp.value.slice(0,pos);
const m=before.match(MENTION_RE);
if(!m){closeMention();return}
mentionStart=m.index+(m[1]===' '?1:0);
const q=m[2];
clearTimeout(mentionTimer);
mentionTimer=setTimeout(()=>vs.postMessage({type:'mentionQuery',query:q}),120);
});
function go(){if(mentionItems.length&&mentionSel>=0)return;const t=inp.value.trim();if(!t||send.disabled)return;const ch0=chats[activeId];if(!ch0.named){ch0.named=true;ch0.title=t.slice(0,18);renderTabs()}add('user',t);inp.value='';closeMention();vs.postMessage({type:'send',text:t,attachActive:attachActive&&!!activeFilePath})}
send.onclick=go;stop.onclick=()=>vs.postMessage({type:'stop'});
document.getElementById('clear').onclick=()=>vs.postMessage({type:'clear'});
inp.addEventListener('keydown',e=>{
if(mentionItems.length){
if(e.key==='ArrowDown'){e.preventDefault();mentionSel=(mentionSel+1)%mentionItems.length;renderMention();return}
if(e.key==='ArrowUp'){e.preventDefault();mentionSel=(mentionSel-1+mentionItems.length)%mentionItems.length;renderMention();return}
if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();applyMention(mentionSel>=0?mentionSel:0);return}
if(e.key==='Escape'){closeMention();return}
}
if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}
});
window.addEventListener('message',e=>{const m=e.data;const ch=chats[m.c]||chats[activeId];
if(m.type==='newTab'){newTab()}
else if(m.type==='clearActive'){vs.postMessage({type:'clear'})}
else if(m.type==='start'){ch.cur=add('assistant',${j('waiting')},ch.log);ch.cur.classList.add('wait');ch.waiting=true;ch.busy=true;updateBusy()}
else if(m.type==='delta'&&ch.cur){if(ch.waiting){ch.waiting=false;ch.cur.classList.remove('wait');ch.cur.textContent=''}ch.cur.textContent+=m.text;ch.log.scrollTop=ch.log.scrollHeight}
else if(m.type==='config'){perm=m.values.enableTools?(m.values.permissionMode||'off'):'none';renderPerm();keys.forEach(k=>setv(document.getElementById('c_'+k),m.values[k]));curModel=m.values.model||'';if(![...sel.options].some(o=>o.value===curModel)&&curModel){const o=document.createElement('option');o.value=curModel;o.textContent=curModel;sel.appendChild(o)}if(curModel)sel.value=curModel}
else if(m.type==='saved'){const s=document.getElementById('savedMsg');s.textContent=${j('saved')};setTimeout(()=>s.textContent='',2000)}
else if(m.type==='models'){const dl=document.getElementById('models');dl.innerHTML='';m.ids.forEach(i=>{const o=document.createElement('option');o.value=i;dl.appendChild(o)});fillModels(m.ids)}
else if(m.type==='activeFile'){activeFilePath=m.path;renderActiveFile()}
else if(m.type==='mentionResults'){mentionItems=m.items||[];mentionSel=mentionItems.length?0:-1;renderMention()}
else if(m.type==='tool'){addTool(m.text,ch.log)}
else if(m.type==='info'){add('assistant',m.text,ch.log)}
else if(m.type==='error'){add('error',m.text,ch.log)}
else if(m.type==='end'){if(ch.waiting&&ch.cur){ch.cur.remove()}ch.waiting=false;ch.cur=null;ch.busy=false;updateBusy()}
else if(m.type==='cleared'){ch.log.innerHTML='';ch.waiting=false;ch.cur=null;ch.busy=false;updateBusy()}});
</script></body></html>`;
}
class ChatHost {
    webview;
    engines = new Map();
    resolveWebviewView(view) {
        const webview = view.webview;
        this.webview = webview;
        webview.options = { enableScripts: true };
        webview.html = chatHtml();
        const sub = vscode.window.onDidChangeActiveTextEditor(() => webview.postMessage(activeFileMsg()));
        view.onDidDispose(() => {
            sub.dispose();
            this.engines.forEach(e => e.dispose());
            this.engines.clear();
            this.webview = undefined;
        });
        webview.onDidReceiveMessage(async (msg) => {
            const id = String(msg?.c ?? '');
            if (!id) {
                return;
            }
            if (msg.type === 'closeChat') {
                this.engines.get(id)?.dispose();
                this.engines.delete(id);
                return;
            }
            let engine = this.engines.get(id);
            if (!engine) {
                engine = new ChatEngine(id, m => webview.postMessage(m));
                this.engines.set(id, engine);
            }
            await engine.handle(msg);
        });
    }
    hasView() {
        return !!this.webview;
    }
    postToView(m) {
        this.webview?.postMessage(m);
    }
}
function activate(context) {
    const host = new ChatHost();
    const open = () => vscode.commands.executeCommand('workbench.view.extension.unslothChat');
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('unslothChat.view', host, {
        webviewOptions: { retainContextWhenHidden: true }
    }), vscode.commands.registerCommand('unslothChat.open', open), vscode.commands.registerCommand('unslothChat.newChat', async () => {
        const had = host.hasView();
        await open();
        if (had) {
            host.postToView({ type: 'newTab' });
        }
    }), vscode.commands.registerCommand('unslothChat.clear', () => host.postToView({ type: 'clearActive' })));
}
//# sourceMappingURL=extension.js.map