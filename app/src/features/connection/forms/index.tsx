import { FormProvider, useForm } from 'react-hook-form';
import { Settings2, ListTree, Sliders, Skull, PlugZap, Compass, Plug } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Connection, ConnectionDraft, ConnStatus } from '@shared/schema';
import GeneralTab from './GeneralTab';
import SubscriptionsTab from './SubscriptionsTab';
import AdvancedTab from './AdvancedTab';
import LastWillTab from './LastWillTab';

const DEFAULTS = {
  name: '',
  color: 'sky',
  protocol: 'mqtt',
  protocolVersion: '5.0',
  host: '',
  port: 1883,
  clientId: '',
  username: '',
  password: '',
  keepalive: 60,
  connectTimeout: 30_000,
  reconnectPeriod: 1_000,
  clean: true,
  subscriptions: [
    { topic: '#', qos: 0 },
    { topic: '$SYS/#', qos: 0 },
  ],
  will: { enabled: false, topic: '', payload: '', payloadFormat: 'RAW', qos: 0, retain: false },
};

const TABS = [
  { value: 'general', label: 'General', icon: Settings2 },
  { value: 'subscriptions', label: 'Subscriptions', icon: ListTree },
  { value: 'advanced', label: 'Advanced', icon: Sliders },
  { value: 'lastwill', label: 'Last Will', icon: Skull },
];

type Props = {
  defaultValues?: Partial<Connection> | null;
  /** Persist the connection and stay on the form. */
  onSave: (data: ConnectionDraft) => void;
  /** Persist, open the connection, and jump to the live explorer. */
  onConnect: (data: ConnectionDraft) => void;
  /** Jump to the live explorer for an already-running connection. */
  onOpen?: () => void;
  /** Drop an already-running connection. */
  onDisconnect?: () => void;
  onCancel?: () => void;
  submitting?: boolean;
  /** Live status of this connection (undefined for a brand-new one). */
  status?: ConnStatus;
};

const STATUS_DOT: Record<ConnStatus, string> = {
  connected: 'bg-emerald-500 shadow-[0_0_8px] shadow-emerald-500/60',
  connecting: 'bg-amber-500 animate-pulse',
  reconnecting: 'bg-amber-500 animate-pulse',
  disconnected: 'bg-muted-foreground/50',
  error: 'bg-destructive',
};

export default function ConnectionForm({
  defaultValues,
  onSave,
  onConnect,
  onOpen,
  onDisconnect,
  onCancel,
  submitting,
  status,
}: Props) {
  const methods = useForm({ defaultValues: { ...DEFAULTS, ...(defaultValues ?? {}) } });
  const editing = !!defaultValues?.id;
  // "Live" = already talking to the broker, so offer Open/Disconnect over Connect.
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit((d) => onSave(d as ConnectionDraft))}
        className="flex h-full flex-col"
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {editing ? 'Edit connection' : 'New connection'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure how MQTT Studio reaches your broker.
            </p>
          </div>
          {live ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                <span className={cn('size-2 rounded-full', STATUS_DOT[status!])} />
                {status}
              </span>
              {onDisconnect && (
                <Button type="button" variant="outline" onClick={onDisconnect}>
                  <Plug className="size-4" /> Disconnect
                </Button>
              )}
              {onOpen && (
                <Button type="button" onClick={onOpen}>
                  <Compass className="size-4" /> Open explorer
                </Button>
              )}
            </div>
          ) : (
            <Button
              type="button"
              disabled={submitting}
              onClick={methods.handleSubmit((d) => onConnect(d as ConnectionDraft))}
            >
              <PlugZap className="size-4" /> Connect
            </Button>
          )}
        </div>

        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-6 pt-3">
            <TabsList className="bg-transparent p-0">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-1.5">
                  <Icon className="size-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-3xl">
              <TabsContent value="general" className="mt-0">
                <GeneralTab />
              </TabsContent>
              <TabsContent value="subscriptions" className="mt-0">
                <SubscriptionsTab />
              </TabsContent>
              <TabsContent value="advanced" className="mt-0">
                <AdvancedTab />
              </TabsContent>
              <TabsContent value="lastwill" className="mt-0">
                <LastWillTab />
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <div className="flex items-center justify-end gap-2 border-t px-6 py-3">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="outline" disabled={submitting}>
            {editing ? 'Save changes' : 'Save'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
