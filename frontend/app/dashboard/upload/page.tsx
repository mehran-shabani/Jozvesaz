"use client";

import { useCallback, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/lib/constants";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const readableFileSizeLimit = "20 مگابایت";

const ACCEPTED_MIME_PREFIX = "audio/";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const isUploading = status === "uploading";

  const resetState = useCallback(() => {
    setStatus("idle");
    setError(null);
    setSelectedFileName(null);
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0 || isUploading) {
        return;
      }

      const file = fileList[0];

      if (!file.type.startsWith(ACCEPTED_MIME_PREFIX)) {
        setStatus("error");
        setError("لطفاً یک فایل صوتی معتبر انتخاب کنید.");
        setSelectedFileName(null);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setStatus("error");
        setError(`حجم فایل نباید بیشتر از ${readableFileSizeLimit} باشد.`);
        setSelectedFileName(null);
        return;
      }

      setStatus("uploading");
      setError(null);
      setSelectedFileName(file.name);

      const formData = new FormData();
      formData.append("file", file);
      const title = file.name.replace(/\.[^/.]+$/, "").trim() || "فایل صوتی";
      formData.append("title", title);

      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/tasks`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          const detail =
            payload && typeof payload === "object" && "detail" in payload
              ? Array.isArray(payload.detail)
                ? payload.detail.join(" ")
                : String(payload.detail)
              : "آپلود با خطا مواجه شد.";
          setStatus("error");
          setError(detail);
          return;
        }

        // FastAPI returns 202 Accepted with the created task payload.
        await response.json().catch(() => null);

        setStatus("success");
        router.push("/dashboard");
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
    },
    [isUploading, router],
  );

  const onInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      await handleFiles(files);
    },
    [handleFiles],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading) {
      setDragActive(true);
    }
  }, [isUploading]);

  const onDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }, []);

  const onDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDragActive(false);
      await handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onZoneClick = useCallback(() => {
    if (isUploading) {
      return;
    }
    inputRef.current?.click();
  }, [isUploading]);

  const onReset = useCallback(() => {
    if (isUploading) {
      return;
    }
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    resetState();
  }, [isUploading, resetState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">آپلود فایل صوتی</h1>
          <p className="mt-2 text-sm text-slate-300">
            یک فایل صوتی با حجم کمتر از {readableFileSizeLimit} را انتخاب یا در ناحیه زیر رها کنید تا پردازش آن آغاز شود.
          </p>
        </div>
        <div
          className={`flex flex-1 flex-col rounded-lg border-2 border-dashed transition ${
            dragActive ? "border-emerald-400 bg-emerald-500/5" : "border-slate-700 bg-slate-900/60"
          } ${isUploading ? "opacity-70" : "cursor-pointer"}`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={onZoneClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onZoneClick();
            }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onInputChange}
            disabled={isUploading}
          />
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <span className="rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
              فقط فایل‌های صوتی تا {readableFileSizeLimit}
            </span>
            <p className="text-lg font-medium text-slate-100">فایل خود را اینجا رها کنید یا کلیک کنید</p>
            <p className="text-sm text-slate-400">
              فرمت‌های رایج مانند MP3، WAV و M4A پشتیبانی می‌شوند.
            </p>
            {selectedFileName ? (
              <p className="mt-4 text-sm text-emerald-300">{selectedFileName}</p>
            ) : (
              <p className="mt-4 text-xs text-slate-500">هیچ فایلی انتخاب نشده است.</p>
            )}
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          {status === "uploading" ? (
            <p className="text-amber-300">در حال آپلود فایل، لطفاً منتظر بمانید...</p>
          ) : null}
          {status === "success" ? (
            <p className="text-emerald-400">فایل با موفقیت ارسال شد. در حال انتقال...</p>
          ) : null}
          {status === "error" && error ? (
            <div className="rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-red-300">
              {error}
            </div>
          ) : null}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            onClick={onZoneClick}
            disabled={isUploading}
            className="rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            انتخاب فایل
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isUploading}
            className="rounded-md border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-500 hover:text-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            بازنشانی
          </button>
        </div>
      </div>
    </div>
  );
}
