import type {
  Connection,
  ConnectionDelta,
  ConnectionDraft,
  ConnStatus,
  ExportStatus,
  MqttMessage,
  PublishInput,
  StatusUpdate,
} from './schema';

/** The surface exposed to the renderer as `window.api` (implemented in preload). */
export interface StudioApi {
  connections: {
    list(): Promise<Connection[]>;
    get(id: string): Promise<Connection | undefined>;
    save(draft: ConnectionDraft): Promise<Connection>;
    remove(id: string): Promise<void>;
  };
  mqtt: {
    connect(id: string): Promise<void>;
    disconnect(id: string): Promise<void>;
    publish(input: PublishInput): Promise<void>;
    pause(paused: boolean): Promise<void>;
    /** Mark which connection's tab is visible; null silences all. */
    setActive(id: string | null): Promise<void>;
    history(connectionId: string, topic: string): Promise<MqttMessage[]>;
    statuses(): Promise<Record<string, ConnStatus>>;
    clear(id: string): Promise<void>;
    /** Batched live topic updates. Returns an unsubscribe fn. */
    onDelta(cb: (delta: ConnectionDelta) => void): () => void;
    /** Connection status changes. Returns an unsubscribe fn. */
    onStatus(cb: (status: StatusUpdate) => void): () => void;
  };
  /** Live export: stream a topic's incoming messages to a file (json/csv).
   *  Runs in the main process, so it continues across tab switches. */
  export: {
    /** Prompt for a destination and begin; resolves null if cancelled. */
    start(connectionId: string, topic: string): Promise<ExportStatus | null>;
    stop(connectionId: string, topic: string): Promise<void>;
    status(connectionId: string, topic: string): Promise<ExportStatus | null>;
    list(): Promise<ExportStatus[]>;
    /** Progress + start/stop events for any topic. Returns an unsubscribe fn. */
    onProgress(cb: (status: ExportStatus) => void): () => void;
  };
}
