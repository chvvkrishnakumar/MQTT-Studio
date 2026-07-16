import { useFieldArray, useFormContext } from "react-hook-form";
import QosSelect from "@/components/form-ui/qos-select";
import { Input } from "@/components/ui/input";

export default function SubscriptionsTab() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    name: "subscriptions",
    control,
  });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_96px_40px] gap-2 items-center px-2 pb-2 text-sm font-medium text-muted-foreground">
        <div>Topic</div>
        <div>QoS</div>
        <div />
      </div>

      {fields.map((f, idx) => (
        <div
          key={f.id}
          className="grid grid-cols-[1fr_96px_40px] gap-2 items-center"
        >
          <Input {...register(`subscriptions.${idx}.topic`)} />
          <QosSelect name={`subscriptions.${idx}.qos`} hideLabel />
          <button type="button" onClick={() => remove(idx)} className="btn">
            Delete
          </button>
        </div>
      ))}

      <div>
        <button
          type="button"
          onClick={() => append({ topic: "", qos: 0 })}
          className="btn"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
