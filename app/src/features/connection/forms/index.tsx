import { FormProvider, useForm } from 'react-hook-form';
import { Settings2, ListTree, Sliders, Skull } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import type { Connection, ConnectionDraft } from '@shared/schema';
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
  will: { enabled: false, topic: '', payload: '', qos: 0, retain: false },
};

const TABS = [
  { value: 'general', label: 'General', icon: Settings2 },
  { value: 'subscriptions', label: 'Subscriptions', icon: ListTree },
  { value: 'advanced', label: 'Advanced', icon: Sliders },
  { value: 'lastwill', label: 'Last Will', icon: Skull },
];

type Props = {
  defaultValues?: Partial<Connection> | null;
  onSubmit: (data: ConnectionDraft) => void;
  onCancel?: () => void;
  submitting?: boolean;
};

export default function ConnectionForm({ defaultValues, onSubmit, onCancel, submitting }: Props) {
  const methods = useForm({ defaultValues: { ...DEFAULTS, ...(defaultValues ?? {}) } });
  const editing = !!defaultValues?.id;

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit((d) => onSubmit(d as ConnectionDraft))}
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
          <div className="flex gap-2">
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {editing ? 'Save changes' : 'Create'}
            </Button>
          </div>
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
      </form>
    </FormProvider>
  );
}
