import { useEffect, useState } from 'react';
import { AlertCircle, Check, ChevronRight, Send, Terminal, Wand2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import {
  PAYLOAD_FORMATS,
  autoFormat,
  detectFormat,
  formatPlaceholder,
  isValidPayload,
  tryFormatPayload,
  type PayloadFormat,
} from '@/lib/payload-format';
import type { QoS } from '@shared/schema';

interface Props {
  connectionId: string;
  topic?: string;
  disabled?: boolean;
}

export default function PublishPanel({ connectionId, topic, disabled }: Props) {
  const [target, setTarget] = useState(topic ?? '');
  const [payload, setPayload] = useState('');
  const [format, setFormat] = useState<PayloadFormat>('RAW');
  const [qos, setQos] = useState<QoS>(0);
  const [retain, setRetain] = useState(false);
  const [open, setOpen] = useState(true);
  const [autoFormatOnSend, setAutoFormatOnSend] = useState(true);

  useEffect(() => {
    if (topic) setTarget(topic);
  }, [topic]);

  // Auto-detect format when the payload changes (only if the user hasn't
  // manually picked one, i.e. format is RAW).
  useEffect(() => {
    if (format !== 'RAW' || !payload.trim()) return;
    const detected = detectFormat(payload);
    if (detected !== 'RAW') setFormat(detected);
  }, [payload, format]);

  const valid = isValidPayload(payload, format);

  const doAutoFormat = () => {
    if (!payload.trim()) return;
    const { formatted, format: detected } = autoFormat(payload);
    if (detected !== 'RAW') {
      setFormat(detected);
      setPayload(formatted);
    } else {
      // Even for RAW, try formatting with the current selection.
      const result = tryFormatPayload(payload, format);
      if (result && result !== payload) setPayload(result);
    }
  };

  const publish = () => {
    if (!target.trim()) return;
    let finalPayload = payload;
    if (autoFormatOnSend && payload.trim()) {
      const { formatted, format: detected } = autoFormat(payload);
      if (detected !== 'RAW') finalPayload = formatted;
    }
    window.api.mqtt.publish({ connectionId, topic: target, payload: finalPayload, qos, retain });
  };

  const [cliCopied, setCliCopied] = useState(false);
  const copyCli = () => {
    if (!target.trim()) return;
    const flags = [`-t ${JSON.stringify(target)}`, `-m ${JSON.stringify(payload)}`, `-q ${qos}`];
    if (retain) flags.push('-r');
    const cmd = `mosquitto_pub ${flags.join(' ')}`;
    navigator.clipboard.writeText(cmd);
    setCliCopied(true);
    setTimeout(() => setCliCopied(false), 1200);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="glass border-t">
      <CollapsibleTrigger className="group flex w-full items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRight className="size-3.5 transition-transform group-data-[state=open]:rotate-90" />
        Publish
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-4 pb-4">
      <div className="flex items-center gap-2">
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="topic/to/publish"
          className="font-mono"
        />
        <Select value={String(qos)} onValueChange={(v) => setQos(Number(v) as QoS)}>
          <SelectTrigger className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">QoS 0</SelectItem>
            <SelectItem value="1">QoS 1</SelectItem>
            <SelectItem value="2">QoS 2</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex shrink-0 items-center gap-2">
          <Switch id="retain" checked={retain} onCheckedChange={setRetain} />
          <Label htmlFor="retain" className="text-xs">
            Retain
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PAYLOAD_FORMATS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
              format === f
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-input text-muted-foreground hover:border-foreground/40 hover:text-foreground',
            )}
          >
            {f}
          </button>
        ))}
        {!valid && (
          <span className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="size-3.5" /> Invalid {format}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={autoFormatOnSend} onCheckedChange={setAutoFormatOnSend} />
            Auto-format on send
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!payload.trim()}
            onClick={doAutoFormat}
            title="Auto-detect format and prettify"
          >
            <Wand2 className="size-4" /> Format
          </Button>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={formatPlaceholder[format]}
          className={cn('min-h-[64px] font-mono text-sm', !valid && 'border-destructive')}
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button onClick={publish} disabled={disabled || !target.trim()}>
            <Send className="size-4" /> Publish
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={copyCli}
            disabled={!target.trim() || !payload.trim()}
            title="Copy as mosquitto_pub CLI command"
          >
            {cliCopied ? (
              <Check className="size-3.5 text-emerald-500" />
            ) : (
              <Terminal className="size-3.5" />
            )}
            CLI
          </Button>
        </div>
      </div>

      {autoFormatOnSend && payload.trim() && format !== 'RAW' && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Zap className="size-3" />
          Will be auto-formatted as {format} before publishing
        </p>
      )}
      </CollapsibleContent>
    </Collapsible>
  );
}
