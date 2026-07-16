import { dialog, ipcMain, type BrowserWindow } from "electron";
import { connections as connectionsRepo, messages as messagesRepo } from "./db";
import { manager } from "./mqtt/manager";
import { exporter } from "./export/exporter";
import type { ConnectionDraft, PublishInput } from "@shared/schema";

/**
 * Wire the renderer <-> main bridge. `ipcMain.handle` registers process-wide
 * handlers, so this must run exactly ONCE for the app's lifetime — not per
 * window. On macOS the app outlives its window, and re-running this would throw
 * "Attempted to register a second handler". `getWin` is read lazily so emits
 * always target the current (possibly recreated) window.
 */
export function registerIpc(getWin: () => BrowserWindow | null) {
  const send = (channel: string, payload: unknown) => {
    const win = getWin();
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  manager.init(send);
  exporter.init(send);
  // Tap ingest so live exports keep writing regardless of the visible tab.
  manager.onMessage((connectionId, msg) => exporter.handle(connectionId, msg));

  ipcMain.handle("connections:list", () => connectionsRepo.list());
  ipcMain.handle("connections:get", (_e, id: string) =>
    connectionsRepo.get(id)
  );
  ipcMain.handle("connections:save", (_e, draft: ConnectionDraft) =>
    connectionsRepo.save(draft)
  );
  ipcMain.handle("connections:remove", (_e, id: string) => {
    manager.disconnect(id);
    connectionsRepo.remove(id);
  });

  ipcMain.handle("mqtt:connect", (_e, id: string) => manager.connect(id));
  ipcMain.handle("mqtt:disconnect", (_e, id: string) => manager.disconnect(id));
  ipcMain.handle("mqtt:publish", (_e, input: PublishInput) =>
    manager.publish(input)
  );
  ipcMain.handle("mqtt:pause", (_e, paused: boolean) =>
    manager.setPaused(paused)
  );
  ipcMain.handle("mqtt:setActive", (_e, id: string | null) =>
    manager.setActive(id)
  );
  ipcMain.handle("mqtt:statuses", () => manager.statuses());
  ipcMain.handle(
    "mqtt:history",
    (_e, { connectionId, topic }: { connectionId: string; topic: string }) =>
      messagesRepo.recent(connectionId, topic)
  );
  ipcMain.handle("mqtt:clear", (_e, id: string) => messagesRepo.clear(id));

  ipcMain.handle(
    "export:start",
    async (_e, { connectionId, topic }: { connectionId: string; topic: string }) => {
      const safe = topic.replace(/[\\/:*?"<>|]+/g, "_").replace(/^_+|_+$/g, "") || "topic";
      const win = getWin();
      const opts = {
        title: "Live export",
        defaultPath: `${safe}.json`,
        filters: [
          { name: "JSON", extensions: ["json"] },
          { name: "CSV", extensions: ["csv"] },
          { name: "Text log", extensions: ["txt", "log"] },
        ],
      };
      const res = win
        ? await dialog.showSaveDialog(win, opts)
        : await dialog.showSaveDialog(opts);
      if (res.canceled || !res.filePath) return null;
      return exporter.start(connectionId, topic, res.filePath);
    }
  );
  ipcMain.handle(
    "export:stop",
    (_e, { connectionId, topic }: { connectionId: string; topic: string }) =>
      exporter.stop(connectionId, topic)
  );
  ipcMain.handle(
    "export:status",
    (_e, { connectionId, topic }: { connectionId: string; topic: string }) =>
      exporter.get(connectionId, topic)
  );
  ipcMain.handle("export:list", () => exporter.list());
}
