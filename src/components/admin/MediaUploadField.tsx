"use client";

import { useRef, useState } from "react";
import { inputClass, labelClass, buttonSecondaryClass } from "./admin-ui";

type MediaUploadFieldProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (url: string) => void;
  /** Storage directory on the media server, e.g. "courses" or "jerseys". */
  directory?: string;
  accept?: string;
  /** Show an image preview when the value looks like an image URL. */
  preview?: boolean;
  placeholder?: string;
};

const DEFAULT_ACCEPT =
  "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,audio/mpeg,audio/mp4,audio/aac,audio/ogg,.pdf";

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(url);
}

/**
 * Text field + direct file upload for media URLs. Picking a file uploads it
 * to the Azure VM media service (/api/uploads → medifiles) and stores the
 * returned URL; the text input stays editable for manual/paste use.
 */
export function MediaUploadField({
  id,
  label,
  value,
  onChange,
  directory = "misc",
  accept = DEFAULT_ACCEPT,
  preview = false,
  placeholder = "Paste a URL or upload a file",
}: MediaUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dir", directory);
      if (value) formData.append("previousUrl", value);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Upload failed.");
      }
      onChange(data.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {label ? <span className={labelClass}>{label}</span> : null}
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          className={`${buttonSecondaryClass} shrink-0 whitespace-nowrap`}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : "⬆ Upload"}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-500">{error}</p>
      ) : null}
      {preview && value && isImageUrl(value) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Preview"
          className="mt-2 h-20 w-auto rounded-lg border border-neutral-200 object-contain admin-dark:border-zinc-700"
        />
      ) : null}
    </div>
  );
}

export default MediaUploadField;
