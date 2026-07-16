import { app, safeStorage, ipcMain, BrowserWindow, shell } from "electron";
import path from "node:path";
import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import mqtt from "mqtt";
const HISTORY_LIMIT = 20;
const qos = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const protocol = z.enum(["mqtt", "mqtts", "ws", "wss"]);
const protocolVersion = z.enum(["3.1.1", "5.0"]);
const subscription = z.object({
  topic: z.string().min(1),
  qos: qos.default(0)
});
const lastWill = z.object({
  enabled: z.boolean().default(false),
  topic: z.string().default(""),
  payload: z.string().default(""),
  qos: qos.default(0),
  retain: z.boolean().default(false)
});
const connection = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().default("sky"),
  // general
  protocol: protocol.default("mqtt"),
  host: z.string().min(1),
  port: z.number().int().positive().default(1883),
  clientId: z.string().default(""),
  username: z.string().optional(),
  password: z.string().optional(),
  // advanced
  protocolVersion: protocolVersion.default("5.0"),
  keepalive: z.number().int().nonnegative().default(60),
  connectTimeout: z.number().int().positive().default(3e4),
  reconnectPeriod: z.number().int().nonnegative().default(1e3),
  clean: z.boolean().default(true),
  // collections
  subscriptions: z.array(subscription).default([]),
  will: lastWill.default({ enabled: false, topic: "", payload: "", qos: 0, retain: false })
});
const connectionDraft = connection.omit({ id: true }).extend({
  id: z.string().optional()
});
const SCHEMA = (
  /* sql */
  `
CREATE TABLE IF NOT EXISTS connections (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  color              TEXT NOT NULL DEFAULT 'sky',
  protocol           TEXT NOT NULL,
  host               TEXT NOT NULL,
  port               INTEGER NOT NULL,
  client_id          TEXT NOT NULL DEFAULT '',
  username           TEXT,
  password           TEXT,
  options_json       TEXT NOT NULL DEFAULT '{}',
  subscriptions_json TEXT NOT NULL DEFAULT '[]',
  will_json          TEXT NOT NULL DEFAULT '{}',
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id TEXT NOT NULL,
  topic         TEXT NOT NULL,
  payload       TEXT NOT NULL,
  qos           INTEGER NOT NULL DEFAULT 0,
  retain        INTEGER NOT NULL DEFAULT 0,
  ts            INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_topic ON messages (connection_id, topic, ts);
`
);
let db;
function initDb() {
  const file = path.join(app.getPath("userData"), "mqtt-studio.db");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(SCHEMA);
}
function encrypt(value) {
  if (!value) return null;
  if (!safeStorage.isEncryptionAvailable()) return `raw:${value}`;
  return `enc:${safeStorage.encryptString(value).toString("base64")}`;
}
function decrypt(stored) {
  if (!stored) return void 0;
  if (stored.startsWith("raw:")) return stored.slice(4);
  if (stored.startsWith("enc:")) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), "base64"));
    } catch {
      return void 0;
    }
  }
  return stored;
}
function rowToConnection(r) {
  const options = JSON.parse(r.options_json);
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    protocol: r.protocol,
    host: r.host,
    port: r.port,
    clientId: r.client_id,
    username: r.username ?? void 0,
    password: decrypt(r.password),
    protocolVersion: options.protocolVersion ?? "5.0",
    keepalive: options.keepalive ?? 60,
    connectTimeout: options.connectTimeout ?? 3e4,
    reconnectPeriod: options.reconnectPeriod ?? 1e3,
    clean: options.clean ?? true,
    subscriptions: JSON.parse(r.subscriptions_json),
    will: JSON.parse(r.will_json)
  };
}
const connections = {
  list() {
    return db.prepare("SELECT * FROM connections ORDER BY created_at").all().map(
      rowToConnection
    );
  },
  get(id) {
    const row = db.prepare("SELECT * FROM connections WHERE id = ?").get(id);
    return row && rowToConnection(row);
  },
  save(input) {
    const c = connectionDraft.parse(input);
    const id = c.id ?? randomUUID();
    const now = Date.now();
    const options = JSON.stringify({
      protocolVersion: c.protocolVersion,
      keepalive: c.keepalive,
      connectTimeout: c.connectTimeout,
      reconnectPeriod: c.reconnectPeriod,
      clean: c.clean
    });
    db.prepare(
      `INSERT INTO connections
         (id, name, color, protocol, host, port, client_id, username, password,
          options_json, subscriptions_json, will_json, created_at, updated_at)
       VALUES
         (@id, @name, @color, @protocol, @host, @port, @clientId, @username, @password,
          @options, @subscriptions, @will, @now, @now)
       ON CONFLICT(id) DO UPDATE SET
         name=@name, color=@color, protocol=@protocol, host=@host, port=@port,
         client_id=@clientId, username=@username, password=@password,
         options_json=@options, subscriptions_json=@subscriptions, will_json=@will,
         updated_at=@now`
    ).run({
      id,
      name: c.name,
      color: c.color,
      protocol: c.protocol,
      host: c.host,
      port: c.port,
      clientId: c.clientId,
      username: c.username ?? null,
      password: encrypt(c.password),
      options,
      subscriptions: JSON.stringify(c.subscriptions),
      will: JSON.stringify(c.will),
      now
    });
    return this.get(id);
  },
  remove(id) {
    db.prepare("DELETE FROM connections WHERE id = ?").run(id);
    db.prepare("DELETE FROM messages WHERE connection_id = ?").run(id);
  }
};
const insertMessage = () => db.prepare(
  `INSERT INTO messages (connection_id, topic, payload, qos, retain, ts)
     VALUES (?, ?, ?, ?, ?, ?)`
);
const pruneTopic = () => db.prepare(
  `DELETE FROM messages
       WHERE connection_id = ? AND topic = ? AND id NOT IN (
         SELECT id FROM messages
           WHERE connection_id = ? AND topic = ?
           ORDER BY ts DESC, id DESC
           LIMIT ?
       )`
);
const messages = {
  /** Persist a batch and prune each touched topic to HISTORY_LIMIT, in one txn. */
  insertBatch(connectionId, batch) {
    if (batch.length === 0) return;
    const insert = insertMessage();
    const prune = pruneTopic();
    const touched = /* @__PURE__ */ new Set();
    db.transaction(() => {
      for (const m of batch) {
        insert.run(connectionId, m.topic, m.payload, m.qos, m.retain ? 1 : 0, m.ts);
        touched.add(m.topic);
      }
      for (const topic of touched) {
        prune.run(connectionId, topic, connectionId, topic, HISTORY_LIMIT);
      }
    })();
  },
  recent(connectionId, topic, limit = HISTORY_LIMIT) {
    const rows = db.prepare(
      `SELECT topic, payload, qos, retain, ts FROM messages
           WHERE connection_id = ? AND topic = ?
           ORDER BY ts DESC, id DESC LIMIT ?`
    ).all(connectionId, topic, limit);
    return rows.map((r) => ({
      topic: r.topic,
      payload: r.payload,
      qos: r.qos,
      retain: !!r.retain,
      ts: r.ts
    }));
  },
  clear(connectionId) {
    db.prepare("DELETE FROM messages WHERE connection_id = ?").run(connectionId);
  }
};
const FLUSH_MS = 120;
class MqttManager {
  live = /* @__PURE__ */ new Map();
  status = /* @__PURE__ */ new Map();
  paused = false;
  emit = () => {
  };
  init(emit) {
    this.emit = emit;
    setInterval(() => this.flush(), FLUSH_MS).unref();
  }
  connect(id) {
    if (this.live.has(id)) return;
    const c = connections.get(id);
    if (!c) throw new Error(`Unknown connection ${id}`);
    this.setStatus(id, "connecting");
    const url = `${c.protocol}://${c.host}:${c.port}`;
    const options = buildOptions(c);
    console.log("[mqtt] connecting", id, url, {
      protocolVersion: options.protocolVersion,
      clientId: options.clientId,
      clean: options.clean,
      keepalive: options.keepalive
    });
    const client = mqtt.connect(url, options);
    const entry = { client, latest: /* @__PURE__ */ new Map(), dirty: /* @__PURE__ */ new Set(), pending: [] };
    this.live.set(id, entry);
    client.on("connect", () => {
      console.log("[mqtt] connected", id);
      this.setStatus(id, "connected");
      for (const s of c.subscriptions) client.subscribe(s.topic, { qos: s.qos });
    });
    client.on("reconnect", () => this.setStatus(id, "reconnecting"));
    client.on("close", () => {
      console.log("[mqtt] close", id);
      this.setStatus(id, "disconnected");
    });
    client.on("error", (err) => {
      console.error("[mqtt] error", id, err.message);
      this.setStatus(id, "error", err.message);
    });
    client.on("message", (topic, payload, packet) => {
      const prev = entry.latest.get(topic);
      const msg = {
        topic,
        payload: payload.toString("utf8"),
        qos: packet.qos ?? 0,
        retain: !!packet.retain,
        ts: Date.now()
      };
      entry.latest.set(topic, { ...msg, count: (prev?.count ?? 0) + 1 });
      entry.dirty.add(topic);
      entry.pending.push(msg);
    });
  }
  disconnect(id) {
    const entry = this.live.get(id);
    if (!entry) return;
    this.persist(id, entry);
    entry.client.end(true);
    this.live.delete(id);
    this.setStatus(id, "disconnected");
  }
  publish({ connectionId, topic, payload, qos: qos2 = 0, retain = false }) {
    const entry = this.live.get(connectionId);
    if (!entry) throw new Error("Not connected");
    entry.client.publish(topic, payload, { qos: qos2, retain });
  }
  setPaused(paused) {
    this.paused = paused;
    if (!paused) {
      for (const [id, entry] of this.live) {
        entry.dirty.clear();
        const updates = [...entry.latest.values()];
        if (updates.length) this.emit("mqtt:delta", { connectionId: id, updates });
      }
    }
  }
  statuses() {
    return Object.fromEntries(this.status);
  }
  shutdown() {
    for (const [id, entry] of this.live) {
      this.persist(id, entry);
      entry.client.end(true);
    }
    this.live.clear();
  }
  flush() {
    for (const [id, entry] of this.live) {
      this.persist(id, entry);
      if (this.paused || entry.dirty.size === 0) continue;
      const updates = [];
      for (const topic of entry.dirty) {
        const u = entry.latest.get(topic);
        if (u) updates.push(u);
      }
      entry.dirty.clear();
      this.emit("mqtt:delta", { connectionId: id, updates });
    }
  }
  persist(id, entry) {
    if (entry.pending.length === 0) return;
    messages.insertBatch(id, entry.pending);
    entry.pending = [];
  }
  setStatus(id, status, error) {
    this.status.set(id, status);
    this.emit("mqtt:status", { connectionId: id, status, error });
  }
}
function buildOptions(c) {
  return {
    clientId: c.clientId || void 0,
    username: c.username || void 0,
    password: c.password || void 0,
    keepalive: c.keepalive,
    connectTimeout: c.connectTimeout,
    reconnectPeriod: c.reconnectPeriod,
    clean: c.clean,
    protocolVersion: c.protocolVersion === "5.0" ? 5 : 4,
    will: c.will.enabled ? {
      topic: c.will.topic,
      payload: Buffer.from(c.will.payload),
      qos: c.will.qos,
      retain: c.will.retain
    } : void 0
  };
}
const manager = new MqttManager();
function registerIpc(win2) {
  manager.init((channel, payload) => {
    if (!win2.isDestroyed()) win2.webContents.send(channel, payload);
  });
  ipcMain.handle("connections:list", () => connections.list());
  ipcMain.handle("connections:get", (_e, id) => connections.get(id));
  ipcMain.handle("connections:save", (_e, draft) => connections.save(draft));
  ipcMain.handle("connections:remove", (_e, id) => {
    manager.disconnect(id);
    connections.remove(id);
  });
  ipcMain.handle("mqtt:connect", (_e, id) => manager.connect(id));
  ipcMain.handle("mqtt:disconnect", (_e, id) => manager.disconnect(id));
  ipcMain.handle("mqtt:publish", (_e, input) => manager.publish(input));
  ipcMain.handle("mqtt:pause", (_e, paused) => manager.setPaused(paused));
  ipcMain.handle("mqtt:statuses", () => manager.statuses());
  ipcMain.handle(
    "mqtt:history",
    (_e, { connectionId, topic }) => messages.recent(connectionId, topic)
  );
  ipcMain.handle("mqtt:clear", (_e, id) => messages.clear(id));
}
let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  win.once("ready-to-show", () => win?.show());
  registerIpc(win);
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(import.meta.dirname, "../renderer/index.html"));
  }
}
app.whenReady().then(() => {
  initDb();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("before-quit", () => manager.shutdown());
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
