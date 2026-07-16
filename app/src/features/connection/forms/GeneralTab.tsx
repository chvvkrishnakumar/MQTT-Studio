import { useController, useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import FormRow from "@/components/form-ui/form-row";
import ProtocolSelect from "@/components/form-ui/protocol-select";
import PasswordField from "@/components/form-ui/password-field";
import ClientIdField from "@/components/form-ui/client-id-field";
import { Input } from "@/components/ui/input";

const LABEL_OPTIONS = [
  { label: "Red", value: "red", color: "bg-red-500" },
  { label: "Green", value: "green", color: "bg-emerald-500" },
  { label: "Blue", value: "blue", color: "bg-sky-500" },
  { label: "Purple", value: "purple", color: "bg-violet-500" },
];

function LabelDotField({ name = "color" }: { name?: string }) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });

  return (
    <div>
      <label className="block text-sm font-medium mb-1">Label</label>
      <div className="flex items-center gap-2">
        {LABEL_OPTIONS.map((option) => {
          const selected = field.value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => field.onChange(option.value)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                selected
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-input hover:border-foreground"
              )}
              aria-label={option.label}
            >
              <span className={`block h-4 w-4 rounded-full ${option.color}`} />
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
