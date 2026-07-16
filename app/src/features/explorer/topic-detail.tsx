import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HISTORY_LIMIT, type MqttMessage } from '@shared/schema';
import type { TopicState } from './store';

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

function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    },
  };
}

export default function TopicDetail({ connectionId, topic, live }: Props) {
  const [history, setHistory] = useState<MqttMessage[]>([]);
  const path = useCopy();
  const value = useCopy();

  useEffect(() => {
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
        <Button variant="outline" size="sm" onClick={() => path.copy(topic)}>
          {path.copied ? <Check className="size-4 text-emerald-500" /> : <Copy className="size-4" />}
          {path.copied ? 'Copied' : 'Copy'}
        </Button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        {/* Current value block */}
        <section className="overflow-hidden rounded-xl border bg-card/60 shadow-sm">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Latest value
            </span>
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => value.copy(current.payload)}
                >
                  {value.copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
              </>
            )}
          </div>
          <pre className="max-h-72 overflow-auto p-3 font-mono text-xs leading-relaxed">
            {current ? pretty(current.payload) : 'Waiting for a message…'}
          </pre>
        </section>

        {/* Numeric chart */}
        {numeric && (
          <section className="rounded-xl border bg-card/60 p-3 shadow-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Value over time
            </div>
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
          </section>
        )}

        {/* History */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History
            <Badge variant="secondary" className="text-[10px]">
              last {HISTORY_LIMIT}
            </Badge>
          </div>
          <div className="space-y-1.5">
            {history.map((m, i) => (
              <div
                key={`${m.ts}-${i}`}
                className="rounded-lg border bg-muted/30 p-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">{clock(m.ts)}</span>
                  <span>QoS {m.qos}</span>
                  {m.retain && <span className="text-primary">retained</span>}
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-all font-mono text-xs">
                  {m.payload}
                </pre>
              </div>
            ))}
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground">No messages recorded yet.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
