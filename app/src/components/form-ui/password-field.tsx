import { useState } from "react";
import { useController, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function PasswordField({
  name = "password",
}: {
  name?: string;
}) {
  const { control } = useFormContext();
  const { field } = useController({ name, control });
  const [show, setShow] = useState(false);

  return (
    <div>
      <Label>Password</Label>
      <div className="relative">
        <Input {...field} type={show ? "text" : "password"} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2"
        >
          {show ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}
