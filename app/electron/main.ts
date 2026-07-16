import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { initDb } from './db';
import { registerIpc } from './ipc';
import { manager } from './mqtt/manager';

let win: BrowserWindow | null = null;

// Source icon (used for the Win/Linux window and the macOS dev dock). Packaged
// builds get their real icon from electron-builder's build/icon.icns instead.
const iconPath = path.join(import.meta.dirname, '../../build/icon.png');

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => win?.show());
  registerIpc(win);

  // Open external links in the OS browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  // macOS shows the Electron icon in the dock during `npm run dev`; override it.
  if (process.platform === 'darwin' && app.dock && existsSync(iconPath)) {
    app.dock.setIcon(iconPath);
  }
  initDb();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => manager.shutdown());

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
