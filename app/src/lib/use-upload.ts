/**
 * useUpload — reusable file upload against the backend's /files endpoints.
 *
 * Defaults to the direct (proxy) upload (`POST /files/upload`), which is the
 * simplest: one request, returns the stored object `key` you persist on your
 * resource (e.g. `project.image = key`). For large files switch to the presigned
 * flow (see `usePostApiV1FilesPresignUpload` in services/files).
 */
import { useCallback } from "react";
import { usePostApiV1FilesUpload } from "@/services/files";

export interface UploadResult {
  key: string;
  size: number;
  contentType?: string;
  publicUrl?: string;
}

export function useUpload() {
  const mutation = usePostApiV1FilesUpload();

  const upload = useCallback(
    async (file: File, prefix?: string): Promise<UploadResult> => {
      const res = await mutation.mutateAsync({ data: { file, prefix } });
      const d = res?.data;
      if (!d?.key) throw new Error("Upload failed: no key returned");
      return {
        key: d.key,
        size: d.size,
        contentType: d.contentType,
        publicUrl: d.publicUrl,
      };
    },
    [mutation]
  );

  return {
    upload,
    isUploading: mutation.isPending,
    error: mutation.error as Error | null,
    reset: mutation.reset,
  };
}
