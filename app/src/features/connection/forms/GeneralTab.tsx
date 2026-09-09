import { useController, useFormContext } from "react-hook-form";
import { Check, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PALETTE, resolveColor } from "@/lib/colors";
import FormRow from "@/components/form-ui/form-row";
import ProtocolSelect from "@/components/form-ui/protocol-select";
import PasswordField from "@/components/form-ui/password-field";
import ClientIdField from "@/components/form-ui/client-id-field";
import { Input } from "@/components/ui/input";
import { useState } from "react";

function ConnectionPreview() {
  const { watch } = useFormContext();
  const protocol = watch("protocol");
  const host = watch("host");
  const port = watch("port");
  const [copied, setCopied] = useState(false);
  const url = `${protocol}://${host || "broker"}:${port || 1883}`;

  const copy = () => {
    if (!host) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        disabled={!host}
        className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function LabelDotField({ name = "color" }: { name?: string }) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  const current = resolveColor(field.value);

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Label</label>
      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((hex) => {
          const selected = current.toLowerCase() === hex.toLowerCase();
          return (
            <button
              key={hex}
              type="button"
              onClick={() => field.onChange(hex)}
              style={{ backgroundColor: hex }}
              className={cn(
                "grid size-7 place-items-center rounded-full transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                selected && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
              aria-label={`Label colour ${hex}`}
            >
              {selected && <Check className="size-4 text-white drop-shadow" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function GeneralTab() {
  const { register } = useFormContext();

  return (
    <>
      <ConnectionPreview />

      <FormRow>
        <div>
          <label className="block text-sm font-medium mb-1">
            Name <span className="text-destructive">*</span>
          </label>
          <Input {...register("name")} />
        </div>

        <div>
          <LabelDotField />
        </div>
      </FormRow>

      <div className="grid grid-cols-[minmax(11rem,13rem)_minmax(14rem,1fr)_96px] gap-4 mb-4">
        <div>
          <ProtocolSelect name="protocol" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Host <span className="text-destructive">*</span>
          </label>
          <Input {...register("host")} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Port <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            min={0}
            {...register("port", { valueAsNumber: true })}
          />
        </div>
      </div>

      <FormRow>
        <div>
          <label className="block text-sm font-medium mb-1">Username</label>
          <Input {...register("username")} />
        </div>

        <div>
          <PasswordField name="password" />
        </div>
      </FormRow>

      <FormRow>
        <div className="col-span-2">
          <ClientIdField name="clientId" />
        </div>
      </FormRow>
    </>
  );
}
