import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, Copy, Download, Square, X } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { HISTORY_LIMIT, type MqttMessage } from '@shared/schema';
import type { TopicState } from './store';
import { exportKey, useExports } from './exports-store';

interface Props {
  connectionId: string;
  topic?: string;
  live?: TopicState;
}

const clock = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour12: false }) +
  '.' +
  String(ts % 1000).padStart(3, '0');

/** Pretty-print JSON payloads; leave everything else untouched. */
function pretty(payload: string) {
  const t = payload.trim();
  if (t.startsWith('{') || t.startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(t), null, 2);
    } catch {
      /* not json */
    }
  }
  return payload;
}

/** Collapse a payload to a single line for the compact history row. */
const inline = (payload: string) => payload.replace(/\s+/g, ' ').trim();

/** Small self-contained copy button that flashes a check on success. */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant={label ? 'outline' : 'ghost'}
      size={label ? 'sm' : 'icon'}
      className={cn(!label && 'size-6')}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy"
    >
      {copied ? (
        <Check className={cn(label ? 'size-4' : 'size-3.5', 'text-emerald-500')} />
      ) : (
        <Copy className={label ? 'size-4' : 'size-3.5'} />
      )}
      {label && (copied ? 'Copied' : label)}
    </Button>
  );
}

/** Start/stop a main-process live export for the current topic. The export
 *  keeps running across tab switches; this button only reflects + toggles it. */
function LiveExportButton({ connectionId, topic }: { connectionId: string; topic: string }) {
  // The exports store (fed by the main process) is the single source of truth,
  // so this button stays in sync with the tree and with exports still running
  // after the user switched topics or tabs.
  const status = useExports((s) => s.byKey[exportKey(connectionId, topic)] ?? null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      // The resulting status flows back through the export progress stream.
      if (status) await window.api.export.stop(connectionId, topic);
      else await window.api.export.start(connectionId, topic);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant={status ? 'default' : 'outline'}
      size="sm"
      onClick={toggle}
      disabled={busy}
      title={
        status
          ? `Exporting to ${status.path} (${status.format.toUpperCase()}) — click to stop`
          : 'Live-export this topic to a file (JSON / CSV / text log)'
      }
    >
      {status ? (
        <>
          <Square className="size-3.5 fill-current" />
          Stop
          <Badge variant="secondary" className="ml-0.5 tabular-nums">
            {status.count}
          </Badge>
        </>
      ) : (
        <>
          <Download className="size-4" /> Export
        </>
      )}
    </Button>
  );
}

/** Chevron trigger shared by every collapsible section header. */
function SectionTrigger({ title }: { title: string }) {
  return (
    <CollapsibleTrigger className="group flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
      <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
      {title}
    </CollapsibleTrigger>
  );
}

/** Compact single-line history entry; clicking selects it for the detail pane. */
function HistoryRow({
  msg,
  selected,
  onSelect,
}: {
  msg: MqttMessage;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
        selected
          ? 'border-primary/60 bg-primary/10'
          : 'bg-muted/30 hover:bg-muted/50',
      )}
    >
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{clock(msg.ts)}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">QoS {msg.qos}</span>
      {msg.retain && <span className="shrink-0 text-[10px] text-primary">retained</span>}
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80">
        {inline(msg.payload)}
      </span>
    </button>
  );
}

/** Pinned detail pane for the selected history record; survives incoming data. */
function RecordDetail({ msg, onClose }: { msg: MqttMessage; onClose: () => void }) {
  return (
    <div className="shrink-0 border-b bg-muted/20">
      <div className="flex items-center gap-2 px-3 py-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{clock(msg.ts)}</span>
        <Badge variant="secondary" className="text-[10px]">
          QoS {msg.qos}
        </Badge>
        {msg.retain && (
          <Badge variant="outline" className="text-[10px] text-primary">
            retained
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-1">
          <CopyButton text={pretty(msg.payload)} />
          <Button variant="ghost" size="icon" className="size-6" onClick={onClose} title="Close">
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all px-3 pb-2.5 font-mono text-xs leading-relaxed">
        {pretty(msg.payload)}
      </pre>
    </div>
  );
}

export default function TopicDetail({ connectionId, topic, live }: Props) {
  const [history, setHistory] = useState<MqttMessage[]>([]);
  const [showLatest, setShowLatest] = useState(true);
  const [showChart, setShowChart] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  // The opened history record is kept as a stable snapshot (not an index), so
  // incoming messages that reorder/trim the list never collapse the detail.
  const [selected, setSelected] = useState<MqttMessage | null>(null);

  useEffect(() => {
    setSelected(null);
    if (!topic) return setHistory([]);
    let active = true;
    window.api.mqtt.history(connectionId, topic).then((h) => active && setHistory(h));
    return () => {
      active = false;
    };
  }, [connectionId, topic]);

  useEffect(() => {
    if (!live || live.topic !== topic) return;
    setHistory((prev) => {
      if (prev[0]?.ts === live.ts) return prev;
      const msg: MqttMessage = {
        topic: live.topic,
        payload: live.payload,
        qos: live.qos,
        retain: live.retain,
        ts: live.ts,
      };
      return [msg, ...prev].slice(0, HISTORY_LIMIT);
    });
  }, [live, topic]);

  const numeric = useMemo(() => {
    const pts = [...history]
      .reverse()
      .map((m) => ({ ts: m.ts, value: Number(m.payload) }))
      .filter((p) => Number.isFinite(p.value));
    return pts.length >= 2 ? pts : null;
  }, [history]);

  if (!topic) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Select a topic from the tree to inspect its live value and history.
      </div>
    );
  }

  const current = history[0];

  return (
    <div className="flex h-full flex-col">
      {/* Topic path */}
      <div className="glass flex items-center gap-2 border-b px-4 py-3">
        <code className="min-w-0 flex-1 truncate rounded-md bg-muted/60 px-2.5 py-1.5 font-mono text-sm">
          {topic}
        </code>
        <CopyButton text={topic} label="Copy" />
        <LiveExportButton connectionId={connectionId} topic={topic} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        {/* Current value block */}
        <Collapsible
          open={showLatest}
          onOpenChange={setShowLatest}
          className="shrink-0 overflow-hidden rounded-xl border bg-card/60 shadow-sm"
        >
          <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <SectionTrigger title="Latest value" />
            {current && (
              <>
                <Badge variant="secondary" className="text-[10px]">
                  QoS {current.qos}
                </Badge>
                {current.retain && (
                  <Badge variant="outline" className="text-[10px] text-primary">
                    retained
                  </Badge>
                )}
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {clock(current.ts)}
                </span>
                <CopyButton text={pretty(current.payload)} />
              </>
            )}
          </div>
          <CollapsibleContent>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-relaxed">
              {current ? pretty(current.payload) : 'Waiting for a message…'}
            </pre>
          </CollapsibleContent>
        </Collapsible>

        {/* Numeric chart */}
        {numeric && (
          <Collapsible
            open={showChart}
            onOpenChange={setShowChart}
            className="shrink-0 overflow-hidden rounded-xl border bg-card/60 shadow-sm"
          >
            <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
              <SectionTrigger title="Value over time" />
            </div>
            <CollapsibleContent>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={numeric} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                    <XAxis dataKey="ts" tickFormatter={clock} fontSize={10} minTickGap={44} />
                    <YAxis fontSize={10} width={44} domain={['auto', 'auto']} />
                    <Tooltip
                      labelFormatter={(v) => clock(Number(v))}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--popover)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* History — grows to fill remaining space and scrolls internally */}
        <Collapsible
          open={showHistory}
          onOpenChange={setShowHistory}
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card/60 shadow-sm',
            showHistory ? 'flex-1' : 'shrink-0',
          )}
        >
          <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <SectionTrigger title="History" />
            <Badge variant="secondary" className="text-[10px]">
              last {HISTORY_LIMIT}
            </Badge>
          </div>
          <CollapsibleContent className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selected && (
              <RecordDetail msg={selected} onClose={() => setSelected(null)} />
            )}
            <div className="min-h-0 flex-1 space-y-1.5 overflow-auto p-2">
              {history.map((m, i) => (
                <HistoryRow
                  key={`${m.ts}-${i}`}
                  msg={m}
                  selected={selected?.ts === m.ts}
                  onSelect={() => setSelected((prev) => (prev?.ts === m.ts ? null : m))}
                />
              ))}
              {history.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">No messages recorded yet.</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
