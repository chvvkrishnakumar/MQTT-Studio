# MQTT Studio — v0.1.1

A local-first desktop MQTT client with a live topic explorer — connect to
brokers, watch topics update in real time, chart numeric values, and publish,
all from a native app that keeps your connection configs and message history in
a local database on your machine.

> **v0.1.1 — Auto-update test.** `v0.1.0` was first updater-enabled build; this is OTA test (tiny UI tweak). See [Release Notes](#release-notes) below.

> **Local-first.** There is no backend and no account. Everything —
> connections, passwords, and recent message history — lives in a local SQLite
> database on your computer. Passwords are encrypted at rest using your OS
> keychain (Electron `safeStorage`).

## Features

- **Connection manager** — save multiple broker connections (host, port,
  credentials, TLS, keepalive, clean session, last will, client ID) with a
  colour tag per connection.
- **Live topic explorer** — an MQTT Explorer-style tree of every topic seen,
  with the latest value inline and a live-update flash as messages arrive.
- **Per-topic history** — recent messages per topic, with a numeric chart for
  topics that carry numbers.
- **Publish** — send messages to any topic with QoS and retain controls.
- **Payload diff viewer** — highlights exactly what changed between
  consecutive messages on a topic, with line-level and inline char diffs.
- **Auto-format payloads** — auto-detects JSON/XML/YAML and pretty-prints
  before publishing, with a manual Format button and CLI command export.
- **Actionable error messages** — connection failures show parsed,
  human-readable hints with `protocol://host:port` and per-protocol `Available: 3.1, 3.1.1, 5.0 → try 5.0` suggestions (no hardcoded `3.1.1`).
- **Stable error banner** — stays mounted during auto-reconnect (no `error↔reconnecting` flicker), steady `Retrying…` badge + **Stop retrying** button.
- **Auto-reconnect control** — `Reconnect Period` (`Advanced → 0 = no auto-retry`) and header **Disconnect** both stop the retry loop.
- **Native MQTT only** — `mqtt:1883` / `mqtts:8883` transports (`ws`/`wss` hidden; MQTT `3.1`/`3.1.1`/`5.0` versions are packet-level, so `wss` would use same versions — re-enable in `protocols.ts` if needed).
- **Hex view** — toggle between text and hex dump for binary payloads.
- **Message rate indicator** — shows total messages and msgs/sec in the
  explorer header.
- **Pause / resume / clear** — freeze the live view without dropping ingest,
  then replay a full snapshot on resume.
- **Live export** — stream incoming messages for selected topics to a file.
- **Cross-platform** — packaged installers for macOS (dmg), Windows (nsis) and
  Linux (AppImage/deb).

## Install

### Stable Release — v0.1.1

Download from the **[Releases](https://github.com/chvvkrishnakumar/MQTT-Studio/releases/tag/v0.1.1)** page (recommended):

- **🍎 macOS (.dmg, arm64 + x64)** — `MQTT-Studio-0.1.1-arm64.dmg` / `*-x64.dmg`
- **🪟 Windows (.exe / NSIS, x64)** — `MQTT-Studio-0.1.1-x64.exe`
- **🐧 Linux (.AppImage / .deb, x64)** — `MQTT-Studio-0.1.1-x64.AppImage` / `*.deb`

Tag and publish via workflow:
```bash
git tag v0.1.1 && git push origin v0.1.1
# .github/workflows/build.yml builds on v* tags and attaches to GitHub Release
```

### Latest Build Artifacts (dev) — auto-linked to latest run

Download the latest development build (always points to newest `main` run, no README edit needed):

- **🍎 macOS (.dmg)** — [Latest run artifacts](https://github.com/chvvkrishnakumar/MQTT-Studio/actions/workflows/build.yml) → click latest run → `installers-macos-latest`
- **🪟 Windows (.exe / NSIS)** — same page → `installers-windows-latest`
- **🐧 Linux (.AppImage / .deb)** — same page → `installers-ubuntu-latest`

> **How auto-update works:** Stable links above use `releases/tag/vX.Y.Z` and `MQTT-Studio-X.Y.Z` — the `update-readme` job (`.github/workflows/build.yml:78`) runs on every `v*` tag, does `sed` on `README.md` and pushes `docs: update README download links for vX.Y.Z [skip ci]`. Dev artifacts are not hard-coded; the workflow badge `https://github.com/.../actions/workflows/build.yml` always resolves to the newest run, so no per-run ID update is needed. If you still want per-artifact direct links, the `update-dev-links` job can rewrite them via `github.rest.actions.listWorkflowRunArtifacts`.

> **Note**
>
> Dev artifacts require GitHub sign-in and expire after 90 days. For stable installers use the **Releases** section above.

> **macOS**
>
> Builds are ad-hoc signed (not notarized). On first launch you may need to right-click the app → **Open**, or allow it under **System Settings → Privacy & Security**.

## Build from source

Requires Node.js 20+.

```bash
cd app
npm install
npm run rebuild-deps   # rebuild native better-sqlite3 for Electron's ABI
npm run dev            # launch the app in development
```

Package installers for the current platform:

```bash
npm run dist           # all default targets for this OS
npm run dist:mac       # macOS dmg (arm64 + x64)
npm run dist:win       # Windows nsis
npm run dist:linux     # Linux AppImage + deb
```

Installers land in `app/release/`.

## Tech stack

Electron 41 (ESM) · electron-vite · React 18 + TypeScript · TanStack Router
(file-based) · Tailwind v4 · shadcn/ui (Radix) · zustand · react-hook-form ·
zod · mqtt.js · better-sqlite3 · recharts.

## Architecture

Three worlds, one rule: **all I/O lives in the Electron main process; the
renderer is pure UI.**

- **Main process** (`app/electron/`) owns every MQTT client and all SQLite
  access, and holds the live topic tree + a per-topic ring buffer in memory as
  the source of truth. Per-message updates never cross IPC — a 120 ms timer
  coalesces changed topics into one batched delta event and one batched SQLite
  transaction.
- **Preload** (`app/electron/preload.ts`) exposes a typed `window.api` over a
  `contextBridge` with context isolation on and node integration off.
- **Renderer** (`app/src/`) reads a zustand store hydrated from batched deltas;
  components subscribe to slices.

`app/shared/schema.ts` (zod) is the single source of truth for connection and
message shapes, shared by the form, DB, IPC, and store.

## Release Notes

### v0.1.1 — 2026-09-09

OTA test — header shows `v0.1.1`, `Download` button triggers `autoUpdater` (`main.ts:88`).

### v0.1.0 — 2026-09-09

**Flicker & auto-retry**

- Banner no longer flickers `error ↔ reconnecting` every `reconnectPeriod` — `electron/mqtt/manager.ts` keeps sticky `lastError` and suppresses `reconnect` while in `error`; `explorer.tsx` shows stable `error` banner + steady `Retrying…` badge.
- Added **Stop retrying** button in banner and clarified `Disconnect` both call `manager.disconnect()` to end the `mqtt.js` loop.
- `Advanced → Reconnect Period` hint clarified: `0 = no auto-retry`, increase to `5000+` to reduce spam.

**Protocols & versions**

- `shared/schema.ts` is single source: `protocolVersion: ['3.1','3.1.1','5.0']`, `PROTOCOL_VERSIONS`, `DEFAULT_PROTOCOL_VERSION='3.1.1'`. `protocols.ts` now `mqtt`/`mqtts` only (native MQTT); `ws`/`wss` are same MQTT versions over WebSocket — hidden for `mqtt`-only app, re-add to re-enable. Per-protocol `versions` drive `AdvancedTab` dropdown.
- `AdvancedTab` auto-corrects `protocolVersion` when switching `mqtt` (`3.1` allowed) → `wss` (only `3.1.1`/`5.0`).

**Error hints**

- `src/lib/error-hints.ts` is now `parseError(raw, {protocol, protocolVersion, host, port})` — per-protocol `Available: … → try …` instead of hardcoded `try 3.1.1`. TLS/ECONNRESET hints use `host:port` and suggest `mqtts↔mqtt` with correct default ports.

**Version bump:** `app/package.json` `0.0.0 → 0.1.0`.

## Contributing

Issues and pull requests are welcome. There's no lint/typecheck npm script;
typecheck manually before opening a PR:

```bash
cd app
npx tsc -p tsconfig.app.json --noEmit    # renderer
npx tsc -p tsconfig.node.json --noEmit   # main / preload / shared
```

## License

[MIT](LICENSE) © 2026 Krishna
