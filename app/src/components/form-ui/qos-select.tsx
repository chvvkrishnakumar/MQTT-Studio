import { useController, useFormContext } from "react-hook-form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function QosSelect({
  name = "qos",
  hideLabel = false,
}: {
  name?: string;
  hideLabel?: boolean;
}) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <div>
      {!hideLabel && <Label>QoS</Label>}
      <Select
        value={String(field.value ?? 0)}
        onValueChange={(v: string) => field.onChange(Number(v))}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={"0"}>0</SelectItem>
          <SelectItem value={"1"}>1</SelectItem>
          <SelectItem value={"2"}>2</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
