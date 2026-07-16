import { useController, useFormContext } from "react-hook-form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { PROTOCOLS, getProtocol } from "@/features/connection/forms/protocols";

export default function ProtocolSelect({
  name = "protocol",
}: {
  name?: string;
}) {
  const { control, setValue } = useFormContext();
  const { field } = useController({ name, control });

  const onChange = (v: string) => {
    field.onChange(v);
    const sel = getProtocol(v);
    if (sel) setValue("port", sel.port);
  };

  return (
    <div>
      <Label>Protocol</Label>
      <Select value={field.value} onValueChange={(v) => onChange(v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROTOCOLS.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
