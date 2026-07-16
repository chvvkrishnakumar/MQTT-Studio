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

export default function AdvancedTab() {
  const { control, register, watch, setValue } = useFormContext();
  const protocol = watch("protocol");
  const availableVersions = getProtocol(protocol)?.versions ?? ["3.1.1", "5.0"];

  const { field } = useController({ name: "protocolVersion", control });

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
            Reconnect Period
          </label>
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            {...register("reconnectPeriod", { valueAsNumber: true })}
          />
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
