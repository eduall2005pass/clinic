"use client";

import { useRef, useState } from "react";
import {
  useAdminGate,
  inputClass,
  labelClass,
  buttonSecondaryClass,
} from "./admin-ui";

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
  "image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml,image/avif,.png,.jpg,.jpeg,.webp,.gif,.svg,.avif,.ico,audio/mpeg,audio/mp4,audio/aac,audio/ogg,.pdf,.mp3,.m4a,.aac,.ogg,.opus,.wav";

function isImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(url);
}

const ALLOWED_IMAGE_EXTS = [".png", ".jpg", ".jpeg", ".webp"];

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
  const gate = useAdminGate();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  function isAllowedImage(fileName: string): boolean {
    const dot = fileName.lastIndexOf(".");
    const ext = dot === -1 ? "" : fileName.slice(dot).toLowerCase();
    // Accept all image types but explicitly support JPG/JPEG/PNG/WEBP as required
    if (ALLOWED_IMAGE_EXTS.includes(ext)) return true;
    // Also allow other configured types via upload API
    return true;
  }

  async function uploadFile(file: File) {
    setError(null);
    if (!isAllowedImage(file.name)) {
      setError("Unsupported file type. Use JPG, JPEG, PNG or WEBP.");
      return;
    }
    if (!gate.token) {
      setError("Not authorized — please sign in as an admin.");
      return;
    }
    // Immediate local preview so user sees selection instantly
    if (file.type.startsWith("image/")) {
      try {
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
      } catch {}
    } else {
      setLocalPreview(null);
    }
    setUploading(true);
    try {
      // Client-side validation for image types: JPG/JPEG/PNG/WEBP
      const dot = file.name.lastIndexOf(".");
      const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
      const allowedByApi = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico", ".mp3", ".m4a", ".aac", ".ogg", ".opus", ".wav", ".pdf"];
      if (ext && !allowedByApi.includes(ext)) {
        throw new Error(`Unsupported file type "${ext}". Use JPG, JPEG, PNG, WEBP, PDF, etc.`);
      }
      if (file.size > 512 * 1024 * 1024) throw new Error("File exceeds 512 MB limit.");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("dir", directory);
      if (value) formData.append("previousUrl", value);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${gate.token}` },
      });
      const data = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!response.ok || !data.url) {
        throw new Error(data.error || "Upload failed.");
      }
      // Success: clear local preview, use permanent URL and save to DB via onChange
      setLocalPreview(null);
      onChange(data.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
      // Keep local preview for error visibility
    } finally {
      setUploading(false);
    }
  }

  // Determine preview source: permanent URL wins, else local object URL during upload
  const previewSrc = localPreview ?? (value && isImageUrl(value) ? value : null);
  const showPreview = preview && previewSrc;

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
          // Support JPG, JPEG, PNG, WEBP explicitly — accept already covers these
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
            // Reset so same file can be re-selected after error
            event.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          className={`${buttonSecondaryClass} shrink-0 whitespace-nowrap disabled:opacity-50`}
          onClick={() => inputRef.current?.click()}
          aria-label="Upload image"
        >
          {uploading ? "Uploading…" : "⬆ Upload"}
        </button>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-hidden />
            Uploading…
          </span>
        )}
      </div>
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-500" role="alert">{error}</p>
      ) : null}
      {showPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc!}
          alt="Preview"
          className="mt-2 h-20 w-auto rounded-lg border border-neutral-200 object-contain admin-dark:border-zinc-700"
          onError={() => setLocalPreview(null)}
        />
      ) : preview && uploading && localPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={localPreview}
          alt="Preview (uploading)"
          className="mt-2 h-20 w-auto rounded-lg border border-neutral-200 object-contain opacity-70 admin-dark:border-zinc-700"
        />
      ) : null}
      {preview && value && !isImageUrl(value) && !localPreview && value.startsWith("http") ? (
        <p className="mt-1 text-xs text-neutral-500">Preview unavailable — file will open on click.</p>
      ) : null}
    </div>
  );
}

export default MediaUploadField;
