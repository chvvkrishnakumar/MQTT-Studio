import { app, BrowserWindow, dialog, shell } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { initDb } from './db';
import { registerIpc } from './ipc';
import { manager } from './mqtt/manager';
import { exporter } from './export/exporter';
import log from 'electron-log';
import * as updater from 'electron-updater';
const autoUpdater = (updater as unknown as { autoUpdater: typeof import('electron-updater').autoUpdater }).autoUpdater
  ?? (updater as unknown as { default: { autoUpdater: typeof import('electron-updater').autoUpdater } }).default?.autoUpdater;

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
  // Register IPC handlers once for the app's lifetime; emits target the current
  // window via the lazy getter. createWindow() may run again on macOS (activate),
  // so registration must NOT live inside it.
  registerIpc(() => win);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Auto-update — packaged only; set FORCE_UPDATER=1 to test in dev against GitHub
  const canUpdate = app.isPackaged || process.env.FORCE_UPDATER === '1';
  if (canUpdate) {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    if (process.env.FORCE_UPDATER === '1') autoUpdater.forceDevUpdateConfig = true;

    autoUpdater.on('update-available', () => {
      log.info('update available');
    });
    autoUpdater.on('update-downloaded', () => {
      const res = dialog.showMessageBoxSync(win!, {
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        title: 'Update ready',
        message: 'A new version of MQTT Studio has been downloaded. Restart to apply?',
      });
      if (res === 0) autoUpdater.quitAndInstall();
    });
    autoUpdater.on('error', (err) => log.error('autoUpdater error', err));

    // Initial check + poll every 6h
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 6 * 60 * 60 * 1000).unref();
  }
});

/** Manual check — exposed via IPC for a Help → Check for updates menu */
export function checkForUpdates() {
  if (!app.isPackaged && process.env.FORCE_UPDATER !== '1') return;
  autoUpdater.checkForUpdatesAndNotify();
}

app.on('before-quit', () => {
  exporter.shutdown();
  manager.shutdown();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
