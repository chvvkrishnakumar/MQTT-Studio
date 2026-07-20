# MQTT Studio

A local-first desktop MQTT client with a live topic explorer — connect to
brokers, watch topics update in real time, chart numeric values, and publish,
all from a native app that keeps your connection configs and message history in
a local database on your machine.

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
- **Pause / resume / clear** — freeze the live view without dropping ingest,
  then replay a full snapshot on resume.
- **Live export** — stream incoming messages for selected topics to a file.
- **Cross-platform** — packaged installers for macOS (dmg), Windows (nsis) and
  Linux (AppImage/deb).

## Install

Grab the installer for your platform from the
[Releases](https://github.com/chvvkrishnakumar/MQTT-Studio/releases) page, or
build from source below.

> macOS builds are ad-hoc signed (not notarized). On first launch you may need
> to right-click the app → **Open**, or allow it under
> System Settings → Privacy & Security.

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
