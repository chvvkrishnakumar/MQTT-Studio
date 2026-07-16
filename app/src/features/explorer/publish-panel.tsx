import { useEffect, useState } from 'react';
import { AlertCircle, ChevronRight, Send, Wand2 } from 'lucide-react';
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
  formatPayload,
  formatPlaceholder,
  isValidPayload,
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

  useEffect(() => {
    if (topic) setTarget(topic);
  }, [topic]);

  const valid = isValidPayload(payload, format);

  const publish = () => {
    if (!target.trim()) return;
    window.api.mqtt.publish({ connectionId, topic: target, payload, qos, retain });
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={format === 'RAW' || !payload.trim()}
          onClick={() => setPayload(formatPayload(payload, format))}
          title="Prettify payload"
        >
          <Wand2 className="size-4" /> Format
        </Button>
      </div>

      <div className="flex items-end gap-2">
        <Textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder={formatPlaceholder[format]}
          className={cn('min-h-[64px] font-mono text-sm', !valid && 'border-destructive')}
        />
        <Button onClick={publish} disabled={disabled || !target.trim()} className="shrink-0">
          <Send className="size-4" /> Publish
        </Button>
      </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
