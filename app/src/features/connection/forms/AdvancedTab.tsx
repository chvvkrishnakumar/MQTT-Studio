import { useEffect } from "react";
import FormRow from "@/components/form-ui/form-row";
import { useController, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getProtocol } from "@/features/connection/forms/protocols";
import { DEFAULT_PROTOCOL_VERSION, PROTOCOL_VERSIONS } from "@shared/schema";

export default function AdvancedTab() {
  const { control, register, watch, setValue } = useFormContext();
  const protocol = watch("protocol");
  const availableVersions = getProtocol(protocol)?.versions ?? [...PROTOCOL_VERSIONS];

  const { field } = useController({ name: "protocolVersion", control });

  // Keep protocolVersion valid when protocol switches (e.g. mqtt 3.1 → wss only 3.1.1/5.0)
  useEffect(() => {
    const v = field.value as string | undefined;
    if (v && !availableVersions.includes(v as never) && availableVersions.length > 0) {
      const fallback = availableVersions.includes(DEFAULT_PROTOCOL_VERSION as never)
        ? DEFAULT_PROTOCOL_VERSION
        : availableVersions[0];
      setValue("protocolVersion", fallback, { shouldDirty: true });
    }
  }, [protocol, availableVersions, field.value, setValue]);

  return (
    <>
      <FormRow>
        <div>
          <Label>Protocol Version</Label>
          <Select
            value={field.value}
            onValueChange={(value) => setValue("protocolVersion", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableVersions.map((version) => (
                <SelectItem key={version} value={version}>
                  {version}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Available for <span className="font-medium">{protocol ?? "mqtt"}</span>: {availableVersions.join(", ")}.{" "}
            {DEFAULT_PROTOCOL_VERSION} is most widely supported
            {availableVersions.includes("5.0" as never) ? ` — use 5.0 only if your broker requires it.` : `.`}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Keep Alive</label>
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            {...register("keepalive", { valueAsNumber: true })}
          />
        </div>
      </FormRow>

      <FormRow>
        <div>
          <label className="block text-sm font-medium mb-1">
            Connect Timeout
          </label>
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            {...register("connectTimeout", { valueAsNumber: true })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Reconnect Period <span className="text-xs font-normal text-muted-foreground">(ms, 0 = no auto-retry)</span>
          </label>
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            {...register("reconnectPeriod", { valueAsNumber: true })}
          />
          <p className="mt-1 text-xs text-muted-foreground">0 disables auto-reconnect. Increase to 5000+ to reduce retry spam.</p>
        </div>
      </FormRow>

      <FormRow>
        <div>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("clean")} /> Clean Session
          </label>
        </div>
      </FormRow>
    </>
  );
}
