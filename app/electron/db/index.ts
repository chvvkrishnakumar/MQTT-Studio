import Database from 'better-sqlite3';
import { app, safeStorage } from 'electron';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import {
  connectionDraft,
  HISTORY_LIMIT,
  type Connection,
  type ConnectionDraft,
  type MqttMessage,
  type QoS,
} from '@shared/schema';

const SCHEMA = /* sql */ `
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
`;

let db: Database.Database;

export function initDb() {
  const file = path.join(app.getPath('userData'), 'mqtt-studio.db');
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.exec(SCHEMA);
}

// --- password at rest (safeStorage, base64) --------------------------------

function encrypt(value?: string): string | null {
  if (!value) return null;
  if (!safeStorage.isEncryptionAvailable()) return `raw:${value}`;
  return `enc:${safeStorage.encryptString(value).toString('base64')}`;
}

function decrypt(stored?: string | null): string | undefined {
  if (!stored) return undefined;
  if (stored.startsWith('raw:')) return stored.slice(4);
  if (stored.startsWith('enc:')) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.slice(4), 'base64'));
    } catch {
      return undefined;
    }
  }
  return stored;
}

// --- connections -----------------------------------------------------------

interface ConnRow {
  id: string;
  name: string;
  color: string;
  protocol: string;
  host: string;
  port: number;
  client_id: string;
  username: string | null;
  password: string | null;
  options_json: string;
  subscriptions_json: string;
  will_json: string;
}

function rowToConnection(r: ConnRow): Connection {
  const options = JSON.parse(r.options_json);
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    protocol: r.protocol as Connection['protocol'],
    host: r.host,
    port: r.port,
    clientId: r.client_id,
    username: r.username ?? undefined,
    password: decrypt(r.password),
    protocolVersion: options.protocolVersion ?? '5.0',
    keepalive: options.keepalive ?? 60,
    connectTimeout: options.connectTimeout ?? 30_000,
    reconnectPeriod: options.reconnectPeriod ?? 1_000,
    clean: options.clean ?? true,
    subscriptions: JSON.parse(r.subscriptions_json),
    will: { payloadFormat: 'RAW', ...JSON.parse(r.will_json) },
  };
}

export const connections = {
  list(): Connection[] {
    return (db.prepare('SELECT * FROM connections ORDER BY created_at').all() as ConnRow[]).map(
      rowToConnection,
    );
  },

  get(id: string): Connection | undefined {
    const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as ConnRow | undefined;
    return row && rowToConnection(row);
  },

  save(input: ConnectionDraft): Connection {
    const c = connectionDraft.parse(input);
    const id = c.id ?? randomUUID();
    const now = Date.now();
    const options = JSON.stringify({
      protocolVersion: c.protocolVersion,
      keepalive: c.keepalive,
      connectTimeout: c.connectTimeout,
      reconnectPeriod: c.reconnectPeriod,
      clean: c.clean,
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
         updated_at=@now`,
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
      now,
    });

    return this.get(id)!;
  },

  remove(id: string) {
    db.prepare('DELETE FROM connections WHERE id = ?').run(id);
    db.prepare('DELETE FROM messages WHERE connection_id = ?').run(id);
  },
};

// --- messages (capped history) --------------------------------------------

const insertMessage = () =>
  db.prepare(
    `INSERT INTO messages (connection_id, topic, payload, qos, retain, ts)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

const pruneTopic = () =>
  db.prepare(
    `DELETE FROM messages
       WHERE connection_id = ? AND topic = ? AND id NOT IN (
         SELECT id FROM messages
           WHERE connection_id = ? AND topic = ?
           ORDER BY ts DESC, id DESC
           LIMIT ?
       )`,
  );

export const messages = {
  /** Persist a batch and prune each touched topic to HISTORY_LIMIT, in one txn. */
  insertBatch(connectionId: string, batch: MqttMessage[]) {
    if (batch.length === 0) return;
    const insert = insertMessage();
    const prune = pruneTopic();
    const touched = new Set<string>();

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

  recent(connectionId: string, topic: string, limit = HISTORY_LIMIT): MqttMessage[] {
    const rows = db
      .prepare(
        `SELECT topic, payload, qos, retain, ts FROM messages
           WHERE connection_id = ? AND topic = ?
           ORDER BY ts DESC, id DESC LIMIT ?`,
      )
      .all(connectionId, topic, limit) as Array<{
      topic: string;
      payload: string;
      qos: number;
      retain: number;
      ts: number;
    }>;
    return rows.map((r) => ({
      topic: r.topic,
      payload: r.payload,
      qos: r.qos as QoS,
      retain: !!r.retain,
      ts: r.ts,
    }));
  },

  clear(connectionId: string) {
    db.prepare('DELETE FROM messages WHERE connection_id = ?').run(connectionId);
  },
};
