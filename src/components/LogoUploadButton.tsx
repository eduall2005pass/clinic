"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useLogo } from "@/components/LogoProvider";
import { saveActiveLogo } from "@/lib/logo-store";
import { MAX_LOGO_FILE_SIZE } from "@/lib/logo";
import { isFirebaseConfigured } from "@/lib/firebase";

const ACCEPT = ".png,.jpg,.jpeg,.webp";
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const ERROR_DISMISS_MS = 6000;

export default function LogoUploadButton({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const { setLogo } = useLogo();
  const inputRef = useRef<HTMLInputElement>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!isFirebaseConfigured) {
    return (
      <Link
        href={href}
        className="flex w-1/3 max-w-[384px] shrink-0 transition-opacity hover:opacity-90"
      >
        {children}
      </Link>
    );
  }

  const showError = (message: string) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setError(message);
    dismissTimer.current = setTimeout(() => setError(null), ERROR_DISMISS_MS);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      showError("Unsupported file type. Use PNG, JPG or WebP.");
      return;
    }
    if (file.size > MAX_LOGO_FILE_SIZE) {
      showError("Logo file must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const dimensions = await readImageDimensions(file);
      const saved = await saveActiveLogo(file, dimensions.width, dimensions.height);
      setLogo(saved);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Could not update the logo. Your current logo is unchanged.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex w-1/3 max-w-[384px] shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void handleFile(file);
        }}
      />
      <button
        type="button"
        disabled={uploading}
        aria-label="Change website logo"
        title="Change website logo"
        onClick={() => inputRef.current?.click()}
        className="flex min-w-0 flex-1 cursor-pointer items-center transition-opacity hover:opacity-90 disabled:cursor-wait"
      >
        <span
          className={`relative block w-full transition-opacity ${
            uploading ? "opacity-50" : ""
          }`}
        >
          {children}
          {uploading && (
            <span
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </span>
          )}
        </span>
      </button>

      {error && (
        <div
          role="alert"
          className="fixed left-1/2 top-20 z-[80] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-primary-500/40 bg-dark-900 px-4 py-3 text-center text-sm text-primary-300 shadow-2xl shadow-black/50"
        >
          {error}
        </div>
      )}
    </div>
  );
}

function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const { naturalWidth, naturalHeight } = image;
      URL.revokeObjectURL(objectUrl);
      if (!naturalWidth || !naturalHeight) {
        reject(new Error("Could not read the image size."));
        return;
      }
      resolve({ width: naturalWidth, height: naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected file is not a valid image."));
    };
    image.src = objectUrl;
  });
}
