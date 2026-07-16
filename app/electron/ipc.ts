import { ipcMain, type BrowserWindow } from 'electron';
import { connections as connectionsRepo, messages as messagesRepo } from './db';
import { manager } from './mqtt/manager';
import type { ConnectionDraft, PublishInput } from '@shared/schema';

/**
 * Wire the renderer <-> main bridge. `ipcMain.handle` registers process-wide
 * handlers, so this must run exactly ONCE for the app's lifetime — not per
 * window. On macOS the app outlives its window, and re-running this would throw
 * "Attempted to register a second handler". `getWin` is read lazily so emits
 * always target the current (possibly recreated) window.
 */
export function registerIpc(getWin: () => BrowserWindow | null) {
  manager.init((channel, payload) => {
    const win = getWin();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  });

  ipcMain.handle('connections:list', () => connectionsRepo.list());
  ipcMain.handle('connections:get', (_e, id: string) => connectionsRepo.get(id));
  ipcMain.handle('connections:save', (_e, draft: ConnectionDraft) => connectionsRepo.save(draft));
  ipcMain.handle('connections:remove', (_e, id: string) => {
    manager.disconnect(id);
    connectionsRepo.remove(id);
  });

  ipcMain.handle('mqtt:connect', (_e, id: string) => manager.connect(id));
  ipcMain.handle('mqtt:disconnect', (_e, id: string) => manager.disconnect(id));
  ipcMain.handle('mqtt:publish', (_e, input: PublishInput) => manager.publish(input));
  ipcMain.handle('mqtt:pause', (_e, paused: boolean) => manager.setPaused(paused));
  ipcMain.handle('mqtt:setActive', (_e, id: string | null) => manager.setActive(id));
  ipcMain.handle('mqtt:statuses', () => manager.statuses());
  ipcMain.handle('mqtt:history', (_e, { connectionId, topic }: { connectionId: string; topic: string }) =>
    messagesRepo.recent(connectionId, topic),
  );
  ipcMain.handle('mqtt:clear', (_e, id: string) => messagesRepo.clear(id));
}
