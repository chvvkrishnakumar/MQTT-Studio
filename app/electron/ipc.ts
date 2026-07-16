import { ipcMain, type BrowserWindow } from 'electron';
import { connections as connectionsRepo, messages as messagesRepo } from './db';
import { manager } from './mqtt/manager';
import type { ConnectionDraft, PublishInput } from '@shared/schema';

/** Wire the renderer <-> main bridge. One window, so we emit to its webContents. */
export function registerIpc(win: BrowserWindow) {
  manager.init((channel, payload) => {
    if (!win.isDestroyed()) win.webContents.send(channel, payload);
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
  ipcMain.handle('mqtt:statuses', () => manager.statuses());
  ipcMain.handle('mqtt:history', (_e, { connectionId, topic }: { connectionId: string; topic: string }) =>
    messagesRepo.recent(connectionId, topic),
  );
  ipcMain.handle('mqtt:clear', (_e, id: string) => messagesRepo.clear(id));
}
