import { useMemo } from "react";
import { useFormContext, useWatch, Controller } from "react-hook-form";
import QosSelect from "@/components/form-ui/qos-select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  PAYLOAD_FORMATS,
  formatPayload,
  formatPlaceholder,
  type PayloadFormat,
} from "@/lib/payload-format";

export default function LastWillTab() {
  const { register, control, setValue } = useFormContext();
  const payloadFormat: PayloadFormat =
    useWatch({ control, name: "will.payloadFormat" }) || "RAW";
  const enabled = useWatch({ control, name: "will.enabled" });
  const payload = useWatch({ control, name: "will.payload" }) || "";

  const payloadPlaceholder = useMemo(
    () => formatPlaceholder[payloadFormat] ?? formatPlaceholder.RAW,
    [payloadFormat]
  );

  const handleFormat = () => {
    // If payload is empty, insert a small placeholder for the selected format
    if (!payload.trim()) {
      const placeholder = payloadPlaceholder || "";
      setValue("will.payload", placeholder, { shouldDirty: true });
      setValue("will.enabled", true, { shouldDirty: true });
      return;
    }

    const formatted = formatPayload(payload, payloadFormat);
    setValue("will.payload", formatted, { shouldDirty: true });
    // ensure the Last Will is enabled when formatting
    setValue("will.enabled", true, { shouldDirty: true });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(180px,240px)_minmax(320px,1fr)]">
        <div className="flex items-center gap-3 rounded-2xl border border-input/70 bg-muted/5 px-4 py-3">
          <Controller
            control={control}
            name="will.enabled"
            render={({ field }) => (
              <Switch
                checked={!!field.value}
                onCheckedChange={(v) => field.onChange(v)}
              />
            )}
          />
          <span className="text-sm font-medium">Enable</span>
        </div>

        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Topic <span className="text-destructive">*</span>
            </label>
            <Input {...register("will.topic")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-[108px_1fr] sm:items-end">
            <div>
              <label className="block text-sm font-medium mb-2">QoS</label>
              <QosSelect name="will.qos" hideLabel />
            </div>
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="will.retain"
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onCheckedChange={(v) => field.onChange(v)}
                  />
                )}
              />
              <span className="text-sm font-medium">Retain</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-input/70 bg-muted/5 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {PAYLOAD_FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => setValue("will.payloadFormat", format)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition",
                  payloadFormat === format
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:border-foreground"
                )}
              >
                {format}
              </button>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={handleFormat}>
            Format
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Payload <span className="text-destructive">*</span>
          </label>
          <Textarea
            {...register("will.payload")}
            className="font-mono min-h-[220px]"
            placeholder={payloadPlaceholder}
            disabled={!enabled}
          />
        </div>
      </div>
    </div>
  );
}
