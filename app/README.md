# MQTT Studio — app

This is the Electron application. See the [repository README](../README.md) for
an overview, features, and install instructions.

## Commands

```bash
npm install
npm run rebuild-deps   # rebuild native better-sqlite3 for Electron's ABI
npm run dev            # electron-vite dev — launches the app
npm run build          # bundle main + preload + renderer into out/ (no typecheck)
npm run dist           # build + package installers into release/
```

There is no lint or typecheck npm script, and `build` does **not** typecheck.
Typecheck manually per project:

```bash
npx tsc -p tsconfig.app.json --noEmit    # renderer
npx tsc -p tsconfig.node.json --noEmit   # main / preload / shared
```

## Layout

- `electron/` — main process (MQTT clients, SQLite, IPC) and preload.
- `src/` — React renderer (routes, features, UI).
- `shared/` — zod schema + typed API surface shared across processes.
