#!/usr/bin/env bash
# MQTT Studio dev launcher
# Fixes: (1) space in path via symlink, (2) Python 3.14 pyexpat crash, (3) Node version
# Usage: bash scripts/dev.sh

set -e

# --- 1. Symlink to avoid space-in-path breaking node-gyp ---
LINK="/tmp/mqtt-studio"
SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
if [[ "$SOURCE" == *" "* ]]; then
  ln -sfn "$SOURCE" "$LINK"
  APP_DIR="$LINK/app"
  echo "[dev] Using symlink $LINK (source has spaces)"
else
  APP_DIR="$SOURCE/app"
fi

# --- 2. Pick the best Node (22+ preferred) ---
NODE_BIN=""
for candidate in \
  "/Users/krishnakumar/.workbuddy-ai/binaries/node/versions/22.22.2-2/bin" \
  "$(brew --prefix node@22 2>/dev/null)/bin" \
  "$(brew --prefix node 2>/dev/null)/bin" \
  "$(dirname "$(command -v node 2>/dev/null)")"; do
  if [ -n "$candidate" ] && [ -x "$candidate/node" ]; then
    VER=$("$candidate/node" --version 2>/dev/null | tr -d 'v')
    MAJOR=${VER%%.*}
    if [ "$MAJOR" -ge 22 ] 2>/dev/null; then
      NODE_BIN="$candidate"
      break
    fi
  fi
done

if [ -n "$NODE_BIN" ]; then
  export PATH="$NODE_BIN:$PATH"
  echo "[dev] Node: $(node --version) from $NODE_BIN"
else
  echo "[dev] Warning: Node 22+ not found, using: $(node --version 2>/dev/null || echo 'none')"
  echo "[dev] Install Node 22: brew install node@22"
fi

# --- 3. Pick the best Python (3.13 preferred, avoid 3.14 pyexpat bug) ---
PY_BIN=""
for candidate in \
  "/Users/krishnakumar/.workbuddy-ai/binaries/python/versions/3.13.12/bin/python3" \
  "$(brew --prefix python@3.13 2>/dev/null)/bin/python3.13" \
  "$(brew --prefix python@3.12 2>/dev/null)/bin/python3.12"; do
  if [ -x "$candidate" ]; then
    if "$candidate" -c "from xml.parsers.expat import ParserCreate" 2>/dev/null; then
      PY_BIN="$candidate"
      break
    fi
  fi
done

if [ -n "$PY_BIN" ]; then
  export PYTHON="$PY_BIN"
  echo "[dev] Python: $PY_BIN"
else
  echo "[dev] Warning: no compatible Python found (3.14 has a pyexpat bug)"
  echo "[dev] Install Python 3.13: brew install python@3.13"
fi

# --- 4. Clean stale build artifacts to avoid conflicted versions ---
echo "[dev] Cleaning stale build artifacts..."
rm -rf out/ dist/
# Remove macOS clutter that can confuse file watchers
find . -maxdepth 2 -name ".DS_Store" -delete 2>/dev/null || true

# --- 5. Install if needed, then rebuild native deps, then dev ---
cd "$APP_DIR"

if [ ! -d node_modules ]; then
  echo "[dev] Installing dependencies..."
  npm install
fi

# Rebuild better-sqlite3 for Electron's ABI (not Node's)
if [ ! -f node_modules/better-sqlite3/build/Release/better_sqlite3.node ]; then
  echo "[dev] Rebuilding native deps for Electron..."
  npm run rebuild-deps
fi

echo "[dev] Starting dev server..."
exec npm run dev
