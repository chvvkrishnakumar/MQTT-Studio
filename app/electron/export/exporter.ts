import fs from 'node:fs';
import path from 'node:path';
import type { ExportFormat, ExportStatus, MqttMessage } from '@shared/schema';

type Emit = (channel: string, payload: unknown) => void;

/** Progress is coalesced onto a timer instead of emitted per message, matching
 *  the manager's IPC-batching philosophy. */
const PROGRESS_MS = 500;

interface Writer {
  connectionId: string;
  topic: string;
  path: string;
  format: ExportFormat;
  /** open file descriptor; writes are synchronous so a crash can't lose them */
  fd: number;
  count: number;
  emittedCount: number;
  /** JSON only: byte offset where the next array element is written (i.e. just
   *  before the trailing `] }`). The closing is re-written after every element,
   *  so the file is a complete, valid JSON object at all times. */
  bodyLen: number;
}

const SEP = ' ';
const key = (connectionId: string, topic: string) => `${connectionId}${SEP}${topic}`;

const CSV_HEADER = 'ts,iso,qos,retain,payload\n';
const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const csvRow = (m: MqttMessage) =>
  [m.ts, new Date(m.ts).toISOString(), m.qos, m.retain ? 1 : 0, m.payload]
    .map((v) => csvCell(String(v)))
    .join(',') + '\n';

/** Raw log entry: a header line then the payload verbatim, blank-line separated.
 *  Keeps XML/YAML/plain-text exactly as received. */
const textEntry = (m: MqttMessage) =>
  `[${new Date(m.ts).toISOString()} QoS${m.qos}${m.retain ? ' retain' : ''}]\n${m.payload}\n\n`;

/** Embed JSON payloads as real nested objects (not an escaped string); leave
 *  non-JSON payloads as their raw string. */
function decodePayload(payload: string): unknown {
  const t = payload.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.parse(t);
    } catch {
      /* not json */
    }
  }
  return payload;
}

const jsonRecord = (m: MqttMessage) =>
  JSON.stringify({
    ts: m.ts,
    iso: new Date(m.ts).toISOString(),
    qos: m.qos,
    retain: m.retain,
    payload: decodePayload(m.payload),
  });

const JSON_CLOSE = '\n  ]\n}\n';

function formatFor(filePath: string): ExportFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv') return 'csv';
  if (ext === '.txt' || ext === '.log') return 'text';
  return 'json';
}

/**
 * Streams messages for individual topics to disk. Lives entirely in the main
 * process and is keyed by connection+topic, so an export keeps running while
 * the user switches tabs or navigates away — only closing the app (or an
 * explicit stop) ends it.
 *
 * Formats (chosen by the file extension picked in the Save dialog):
 *  - `.json` → a single `{ topic, data: [...] }` object. The closing `] }` is
 *    re-written after every message, so the file is valid JSON at all times
 *    (see the durability note on `write`).
 *  - `.csv`  → header + one row per message.
 *  - `.txt`/`.log` → raw log: a header line then the payload verbatim. Best for
 *    non-JSON payloads (XML/YAML/text).
 *
 * All writes are synchronous (`fs.writeSync`) so an abrupt process exit or
 * disconnect can't leave buffered, unwritten data.
 */
class Exporter {
  private writers = new Map<string, Writer>();
  private emit: Emit = () => {};

  init(emit: Emit) {
    this.emit = emit;
    setInterval(() => {
      for (const w of this.writers.values()) {
        if (w.count !== w.emittedCount) {
          w.emittedCount = w.count;
          this.emit('export:progress', this.status(w, true));
        }
      }
    }, PROGRESS_MS).unref();
  }

  /** Begin (or return the already-running) export for a topic. */
  start(connectionId: string, topic: string, filePath: string): ExportStatus {
    const existing = this.writers.get(key(connectionId, topic));
    if (existing) return this.status(existing, true);

    const format = formatFor(filePath);
    // Fresh file per session; the user confirmed overwrite in the dialog.
    const fd = fs.openSync(filePath, 'w');
    let bodyLen = 0;
    if (format === 'csv') {
      fs.writeSync(fd, CSV_HEADER);
    } else if (format === 'json') {
      const open = `{\n  "topic": ${JSON.stringify(topic)},\n  "data": [`;
      fs.writeSync(fd, open + JSON_CLOSE);
      bodyLen = Buffer.byteLength(open);
    }

    const w: Writer = {
      connectionId,
      topic,
      path: filePath,
      format,
      fd,
      count: 0,
      emittedCount: 0,
      bodyLen,
    };
    this.writers.set(key(connectionId, topic), w);
    const s = this.status(w, true);
    this.emit('export:progress', s);
    return s;
  }

  stop(connectionId: string, topic: string) {
    const k = key(connectionId, topic);
    const w = this.writers.get(k);
    if (!w) return;
    this.close(w);
    this.writers.delete(k);
    this.emit('export:progress', this.status(w, false));
  }

  /** Feed every ingested message; writes only for topics being exported. */
  handle(connectionId: string, msg: MqttMessage) {
    const w = this.writers.get(key(connectionId, msg.topic));
    if (!w) return;
    this.write(w, msg);
    w.count++;
  }

  private write(w: Writer, msg: MqttMessage) {
    if (w.format === 'json') {
      // Write the element followed by the closing `] }`, starting exactly where
      // the previous closing began. Because element+close is longer than the
      // old close, it fully overwrites it in one syscall — so the file always
      // ends with a valid `] }` and never needs truncation. A crash between
      // messages therefore leaves a complete, parseable JSON object.
      const element = `${w.count === 0 ? '' : ','}\n    ${jsonRecord(msg)}`;
      fs.writeSync(w.fd, element + JSON_CLOSE, w.bodyLen);
      w.bodyLen += Buffer.byteLength(element);
    } else {
      // Append-only formats: each write is independently valid on disk.
      fs.writeSync(w.fd, w.format === 'csv' ? csvRow(msg) : textEntry(msg));
    }
  }

  get(connectionId: string, topic: string): ExportStatus | null {
    const w = this.writers.get(key(connectionId, topic));
    return w ? this.status(w, true) : null;
  }

  list(): ExportStatus[] {
    return [...this.writers.values()].map((w) => this.status(w, true));
  }

  shutdown() {
    for (const w of this.writers.values()) this.close(w);
    this.writers.clear();
  }

  private close(w: Writer) {
    try {
      fs.closeSync(w.fd);
    } catch {
      /* already closed */
    }
  }

  private status(w: Writer, active: boolean): ExportStatus {
    return {
      connectionId: w.connectionId,
      topic: w.topic,
      path: w.path,
      format: w.format,
      count: w.count,
      active,
    };
  }
}

export const exporter = new Exporter();
