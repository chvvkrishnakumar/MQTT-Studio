import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
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
import type { QoS } from '@shared/schema';

interface Props {
  connectionId: string;
  topic?: string;
  disabled?: boolean;
}

export default function PublishPanel({ connectionId, topic, disabled }: Props) {
  const [target, setTarget] = useState(topic ?? '');
  const [payload, setPayload] = useState('');
  const [qos, setQos] = useState<QoS>(0);
  const [retain, setRetain] = useState(false);

  useEffect(() => {
    if (topic) setTarget(topic);
  }, [topic]);

  const publish = () => {
    if (!target.trim()) return;
    window.api.mqtt.publish({ connectionId, topic: target, payload, qos, retain });
  };

  return (
    <div className="glass space-y-3 border-t p-4">
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
      <div className="flex items-end gap-2">
        <Textarea
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          placeholder="Payload"
          className="min-h-[64px] font-mono text-sm"
        />
        <Button onClick={publish} disabled={disabled || !target.trim()} className="shrink-0">
          <Send className="size-4" /> Publish
        </Button>
      </div>
    </div>
  );
}
