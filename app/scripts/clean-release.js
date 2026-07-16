// Strip everything from release/ except the actual installers.
// electron-builder also emits auto-update metadata (*.blockmap, *.yml) and
// intermediate unpacked app folders — none of which users need to install.
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';

const dir = 'release';
const KEEP = new Set(['.dmg', '.exe', '.appimage', '.deb', '.rpm', '.snap', '.zip', '.msi']);

if (!existsSync(dir)) {
  console.log('[clean:release] nothing to clean (no release/ dir)');
  process.exit(0);
}

let removed = 0;
const kept = [];
for (const name of readdirSync(dir)) {
  const full = path.join(dir, name);
  const isDir = statSync(full).isDirectory();
  const ext = path.extname(name).toLowerCase();

  // Drop unpacked build folders and any non-installer file (blockmap, yml, ...).
  if (isDir || !KEEP.has(ext)) {
    rmSync(full, { recursive: true, force: true });
    removed++;
  } else {
    kept.push(name);
  }
}

console.log(`[clean:release] removed ${removed} non-installer item(s).`);
console.log('[clean:release] installers:');
for (const f of kept) console.log('  •', f);
