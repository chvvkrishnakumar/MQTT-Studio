import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUpload, type UploadResult } from "@/lib/use-upload";

/**
 * Minimal file-upload control built on `useUpload`. Pick a file → it uploads to
 * storage and calls `onUploaded` with the result (persist `result.key` on your
 * resource). Generic and domain-free; style/extend as needed.
 */
export function FileUpload({
  prefix,
  accept,
  label = "Upload file",
  onUploaded,
}: {
  prefix?: string;
  accept?: string;
  label?: string;
  onUploaded?: (result: UploadResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, error } = useUpload();
  const [lastKey, setLastKey] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await upload(file, prefix);
      setLastKey(result.key);
      onUploaded?.(result);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {isUploading ? "Uploading…" : label}
      </Button>
      {lastKey && (
        <p className="truncate text-xs text-muted-foreground">Uploaded: {lastKey}</p>
      )}
      {error && <p className="text-sm text-destructive">{error.message}</p>}
    </div>
  );
}
