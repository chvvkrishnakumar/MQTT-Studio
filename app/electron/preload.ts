import { contextBridge, ipcRenderer } from 'electron';
import type { StudioApi } from '@shared/api';

function subscribe(channel: string, cb: (payload: never) => void) {
  const listener = (_e: unknown, payload: unknown) => cb(payload as never);
  ipcRenderer.on(channel, listener as (...args: unknown[]) => void);
  return () => ipcRenderer.removeListener(channel, listener as (...args: unknown[]) => void);
}

const api: StudioApi = {
  connections: {
    list: () => ipcRenderer.invoke('connections:list'),
    get: (id) => ipcRenderer.invoke('connections:get', id),
    save: (draft) => ipcRenderer.invoke('connections:save', draft),
    remove: (id) => ipcRenderer.invoke('connections:remove', id),
  },
  mqtt: {
    connect: (id) => ipcRenderer.invoke('mqtt:connect', id),
    disconnect: (id) => ipcRenderer.invoke('mqtt:disconnect', id),
    publish: (input) => ipcRenderer.invoke('mqtt:publish', input),
    pause: (paused) => ipcRenderer.invoke('mqtt:pause', paused),
    setActive: (id) => ipcRenderer.invoke('mqtt:setActive', id),
    history: (connectionId, topic) => ipcRenderer.invoke('mqtt:history', { connectionId, topic }),
    statuses: () => ipcRenderer.invoke('mqtt:statuses'),
    clear: (id) => ipcRenderer.invoke('mqtt:clear', id),
    onDelta: (cb) => subscribe('mqtt:delta', cb as (p: never) => void),
    onStatus: (cb) => subscribe('mqtt:status', cb as (p: never) => void),

  },
};

contextBridge.exposeInMainWorld('api', api);
