import { z } from 'zod';

/** Kept in one place so the form, DB, and IPC all agree. */
export const HISTORY_LIMIT = 20;

export const qos = z.union([z.literal(0), z.literal(1), z.literal(2)]);
export type QoS = z.infer<typeof qos>;

export const protocol = z.enum(['mqtt', 'mqtts', 'ws', 'wss']);
export type Protocol = z.infer<typeof protocol>;

export const protocolVersion = z.enum(['3.1.1', '5.0']);
export type ProtocolVersion = z.infer<typeof protocolVersion>;

export const subscription = z.object({
  topic: z.string().min(1),
  qos: qos.default(0),
});
export type Subscription = z.infer<typeof subscription>;

export const payloadFormat = z.enum(['RAW', 'JSON', 'XML', 'YAML']);
export type PayloadFormat = z.infer<typeof payloadFormat>;

export const lastWill = z.object({
  enabled: z.boolean().default(false),
  topic: z.string().default(''),
  payload: z.string().default(''),
  payloadFormat: payloadFormat.default('RAW'),
  qos: qos.default(0),
  retain: z.boolean().default(false),
});
export type LastWill = z.infer<typeof lastWill>;

/** A broker connection. Flat by design so the form and store stay ergonomic;
 *  the DB layer decides which fields become columns vs. JSON. */
export const connection = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string().default('sky'),

  // general
  protocol: protocol.default('mqtt'),
  host: z.string().min(1),
  port: z.number().int().positive().default(1883),
  clientId: z.string().default(''),
  username: z.string().optional(),
  password: z.string().optional(),

  // advanced
  protocolVersion: protocolVersion.default('5.0'),
  keepalive: z.number().int().nonnegative().default(60),
  connectTimeout: z.number().int().positive().default(30_000),
  reconnectPeriod: z.number().int().nonnegative().default(1_000),
  clean: z.boolean().default(true),

  // collections
  subscriptions: z.array(subscription).default([]),
  will: lastWill.default({
    enabled: false,
    topic: '',
    payload: '',
    payloadFormat: 'RAW',
    qos: 0,
    retain: false,
  }),
});
export type Connection = z.infer<typeof connection>;

/** What the form submits: a Connection without an id yet (new) or with one (edit). */
export const connectionDraft = connection.omit({ id: true }).extend({
  id: z.string().optional(),
});
export type ConnectionDraft = z.infer<typeof connectionDraft>;

// --- Runtime (non-persisted) shapes exchanged over IPC ---------------------

export type ConnStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface MqttMessage {
  topic: string;
  payload: string;
  qos: QoS;
  retain: boolean;
  ts: number;
}

/** Latest value for a changed topic, coalesced within a flush window. */
export interface TopicUpdate extends MqttMessage {
  /** total messages seen on this topic this session */
  count: number;
}

export interface ConnectionDelta {
  connectionId: string;
  updates: TopicUpdate[];
}

export interface StatusUpdate {
  connectionId: string;
  status: ConnStatus;
  error?: string;
}

export interface PublishInput {
  connectionId: string;
  topic: string;
  payload: string;
  qos?: QoS;
  retain?: boolean;
}
