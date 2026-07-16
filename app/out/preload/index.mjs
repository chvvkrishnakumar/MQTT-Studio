import { contextBridge, ipcRenderer } from "electron";
function subscribe(channel, cb) {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}
const api = {
  connections: {
    list: () => ipcRenderer.invoke("connections:list"),
    get: (id) => ipcRenderer.invoke("connections:get", id),
    save: (draft) => ipcRenderer.invoke("connections:save", draft),
    remove: (id) => ipcRenderer.invoke("connections:remove", id)
  },
  mqtt: {
    connect: (id) => ipcRenderer.invoke("mqtt:connect", id),
    disconnect: (id) => ipcRenderer.invoke("mqtt:disconnect", id),
    publish: (input) => ipcRenderer.invoke("mqtt:publish", input),
    pause: (paused) => ipcRenderer.invoke("mqtt:pause", paused),
    history: (connectionId, topic) => ipcRenderer.invoke("mqtt:history", { connectionId, topic }),
    statuses: () => ipcRenderer.invoke("mqtt:statuses"),
    clear: (id) => ipcRenderer.invoke("mqtt:clear", id),
    onDelta: (cb) => subscribe("mqtt:delta", cb),
    onStatus: (cb) => subscribe("mqtt:status", cb)
  }
};
contextBridge.exposeInMainWorld("api", api);
