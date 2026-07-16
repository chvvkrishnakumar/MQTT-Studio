import { useController, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

function generateId() {
  // combine timestamp with random suffix to reduce collision probability
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ClientIdField({
  name = "clientId",
}: {
  name?: string;
}) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  const onGenerate = () => field.onChange(generateId());
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(field.value || "");
    } catch {}
  };

  return (
    <div>
      <Label>Client ID</Label>
      <div className="flex gap-2">
        <Input {...field} />
        <Button type="button" variant="outline" size="sm" onClick={onGenerate}>
          Generate
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
          Copy
        </Button>
      </div>
    </div>
  );
}
