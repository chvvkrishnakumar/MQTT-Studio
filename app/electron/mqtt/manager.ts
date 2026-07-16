import mqtt, { type MqttClient } from 'mqtt';
import { connections as connectionsRepo, messages as messagesRepo } from '../db';
import type {
  Connection,
  ConnectionDelta,
  ConnStatus,
  MqttMessage,
  PublishInput,
  QoS,
  StatusUpdate,
  TopicUpdate,
} from '@shared/schema';

/** Coalesce ingest into one IPC event + one DB transaction per window. */
const FLUSH_MS = 120;

type Emit = (channel: string, payload: unknown) => void;

interface Live {
  client: MqttClient;
  latest: Map<string, TopicUpdate>; // topic -> most recent value (+ session count)
  dirty: Set<string>; // topics changed since last flush
  pending: MqttMessage[]; // awaiting persistence
}

class MqttManager {
  private live = new Map<string, Live>();
  private status = new Map<string, ConnStatus>();
  private paused = false;
  private emit: Emit = () => {};

  init(emit: Emit) {
    this.emit = emit;
    setInterval(() => this.flush(), FLUSH_MS).unref();
  }

  connect(id: string) {
    if (this.live.has(id)) return;
    const c = connectionsRepo.get(id);
    if (!c) throw new Error(`Unknown connection ${id}`);

    this.setStatus(id, 'connecting');
    const url = `${c.protocol}://${c.host}:${c.port}`;
    const options = buildOptions(c);
    console.log('[mqtt] connecting', id, url, {
      protocolVersion: options.protocolVersion,
      clientId: options.clientId,
      clean: options.clean,
      keepalive: options.keepalive,
    });
    const client = mqtt.connect(url, options);
    const entry: Live = { client, latest: new Map(), dirty: new Set(), pending: [] };
    this.live.set(id, entry);

    client.on('connect', () => {
      console.log('[mqtt] connected', id);
      this.setStatus(id, 'connected');
      for (const s of c.subscriptions) client.subscribe(s.topic, { qos: s.qos });
    });
    client.on('reconnect', () => this.setStatus(id, 'reconnecting'));
    client.on('close', () => {
      console.log('[mqtt] close', id);
      this.setStatus(id, 'disconnected');
    });
    client.on('error', (err) => {
      console.error('[mqtt] error', id, err.message);
      this.setStatus(id, 'error', err.message);
    });
    client.on('message', (topic, payload, packet) => {
      const prev = entry.latest.get(topic);
      const msg: MqttMessage = {
        topic,
        payload: payload.toString('utf8'),
        qos: (packet.qos ?? 0) as QoS,
        retain: !!packet.retain,
        ts: Date.now(),
      };
      entry.latest.set(topic, { ...msg, count: (prev?.count ?? 0) + 1 });
      entry.dirty.add(topic);
      entry.pending.push(msg);
    });
  }

  disconnect(id: string) {
    const entry = this.live.get(id);
    if (!entry) return;
    this.persist(id, entry);
    entry.client.end(true);
    this.live.delete(id);
    this.setStatus(id, 'disconnected');
  }

  publish({ connectionId, topic, payload, qos = 0, retain = false }: PublishInput) {
    const entry = this.live.get(connectionId);
    if (!entry) throw new Error('Not connected');
    entry.client.publish(topic, payload, { qos, retain });
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    if (!paused) {
      // Resume: replay full live state so the UI catches up in one shot.
      for (const [id, entry] of this.live) {
        entry.dirty.clear();
        const updates = [...entry.latest.values()];
        if (updates.length) this.emit('mqtt:delta', { connectionId: id, updates } as ConnectionDelta);
      }
    }
  }

  statuses(): Record<string, ConnStatus> {
    return Object.fromEntries(this.status);
  }

  shutdown() {
    for (const [id, entry] of this.live) {
      this.persist(id, entry);
      entry.client.end(true);
    }
    this.live.clear();
  }

  private flush() {
    for (const [id, entry] of this.live) {
      this.persist(id, entry); // persist even while paused
      if (this.paused || entry.dirty.size === 0) continue;

      const updates: TopicUpdate[] = [];
      for (const topic of entry.dirty) {
        const u = entry.latest.get(topic);
        if (u) updates.push(u);
      }
      entry.dirty.clear();
      this.emit('mqtt:delta', { connectionId: id, updates } as ConnectionDelta);
    }
  }

  private persist(id: string, entry: Live) {
    if (entry.pending.length === 0) return;
    messagesRepo.insertBatch(id, entry.pending);
    entry.pending = [];
  }

  private setStatus(id: string, status: ConnStatus, error?: string) {
    this.status.set(id, status);
    this.emit('mqtt:status', { connectionId: id, status, error } as StatusUpdate);
  }
}

function buildOptions(c: Connection): mqtt.IClientOptions {
  return {
    clientId: c.clientId || undefined,
    username: c.username || undefined,
    password: c.password || undefined,
    keepalive: c.keepalive,
    connectTimeout: c.connectTimeout,
    reconnectPeriod: c.reconnectPeriod,
    clean: c.clean,
    protocolVersion: c.protocolVersion === '5.0' ? 5 : 4,
    will: c.will.enabled
      ? {
          topic: c.will.topic,
          payload: Buffer.from(c.will.payload),
          qos: c.will.qos,
          retain: c.will.retain,
        }
      : undefined,
  };
}

export const manager = new MqttManager();
