// electron-builder afterPack hook: deep ad-hoc re-sign the macOS .app.
//
// electron-builder unpacks the native better-sqlite3 module (asarUnpack) AFTER
// Electron signed the bundle, which invalidates Electron's signature. On CI we
// have no Apple identity, so electron-builder skips re-signing and ships a
// BROKEN signature — macOS then reports the app as "damaged and can't be
// opened", a dead end for normal users.
//
// Re-signing ad-hoc ("-") here produces a VALID (though unidentified) signature.
// Gatekeeper downgrades the block to the normal "unidentified developer"
// warning, which users can clear with a one-time right-click -> Open. This is
// the best we can do without a paid Apple Developer ID + notarization.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[adhoc-sign] deep ad-hoc signing ${appPath}`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], {
    stdio: 'inherit',
  });
}
