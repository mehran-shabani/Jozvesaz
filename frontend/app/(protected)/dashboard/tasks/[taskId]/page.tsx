"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import { API_BASE_URL } from "@/lib/constants";

import "react-quill/dist/quill.snow.css";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

const TASK_RESULT_ENDPOINT = (taskId: string) => `/api/tasks/${taskId}/result`;

const TASK_DETAILS_ENDPOINT = (taskId: string) => `/api/tasks/${taskId}`;

const toolbarOptions = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike", "blockquote"],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ script: "sub" }, { script: "super" }],
  [{ indent: "-1" }, { indent: "+1" }],
  [{ direction: "rtl" }],
  [{ align: [] }],
  ["link", "code-block"],
  ["clean"],
];

const fetchTask = async (url: string): Promise<Task> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed-to-fetch-task");
  }

  return response.json();
};

const statusConfig: Record<
  TaskStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "در انتظار",
    badgeClass: "border border-amber-500/30 bg-amber-500/10 text-amber-300",
    dotClass: "bg-amber-400",
  },
  PROCESSING: {
    label: "در حال پردازش",
    badgeClass: "border border-sky-500/30 bg-sky-500/10 text-sky-300",
    dotClass: "bg-sky-400",
  },
  COMPLETED: {
    label: "تکمیل شده",
    badgeClass: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    dotClass: "bg-emerald-400",
  },
  FAILED: {
    label: "ناموفق",
    badgeClass: "border border-rose-500/40 bg-rose-500/10 text-rose-300",
    dotClass: "bg-rose-400",
  },
  CANCELLED: {
    label: "لغو شده",
    badgeClass: "border border-slate-500/40 bg-slate-500/10 text-slate-300",
    dotClass: "bg-slate-400",
  },
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
};

const formatDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return "—";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime()) ||
    endDate.getTime() < startDate.getTime()
  ) {
    return "—";
  }

  const totalSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${hours}:${minutes}:${seconds}`;
};

const storageKeyForTask = (taskId: string) => `task-editor-${taskId}`;

type DraftRecord = {
  content: string;
  savedAt: number;
};

async function fetchTaskResultCandidates(task: Task): Promise<string> {
  const attempted: string[] = [];
  const errors: Error[] = [];
  const candidates: string[] = [TASK_RESULT_ENDPOINT(task.id)];

  if (task.result_path) {
    if (/^https?:\/\//i.test(task.result_path)) {
      candidates.push(task.result_path);
    } else if (task.result_path.startsWith("/")) {
      candidates.push(task.result_path);
      candidates.push(`${API_BASE_URL}${task.result_path}`);

      const storageIndex = task.result_path.indexOf("/storage/");
      if (storageIndex !== -1) {
        const relative = task.result_path.slice(storageIndex);
        candidates.push(`${API_BASE_URL}${relative}`);
      }
    }
  }

  for (const candidate of candidates) {
    if (attempted.includes(candidate)) continue;
    attempted.push(candidate);

    try {
      const response = await fetch(candidate, {
        credentials: "include",
      });
      if (!response.ok) {
        errors.push(new Error(`Request failed with status ${response.status}`));
        continue;
      }
      const text = await response.text();
      if (text) {
        return text;
      }
      return "";
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error("unknown-error"));
    }
  }

  const message =
    errors.length > 0
      ? errors[errors.length - 1]?.message ?? "Unable to fetch task result"
      : "Unable to fetch task result";

  throw new Error(message);
}

export default function TaskDetailsPage({
  params,
}: {
  params: { taskId: string };
}) {
  const taskId = params.taskId;
  const [editorContent, setEditorContent] = useState<string>("");
  const [isResultLoading, setIsResultLoading] = useState<boolean>(false);
  const [resultError, setResultError] = useState<string | null>(null);
  const [hasLoadedInitialContent, setHasLoadedInitialContent] =
    useState<boolean>(false);
  const [localDraftTimestamp, setLocalDraftTimestamp] = useState<number | null>(
    null,
  );
  const [localSaveFeedback, setLocalSaveFeedback] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [apiSaveState, setApiSaveState] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [apiSaveMessage, setApiSaveMessage] = useState<string | null>(null);

  const {
    data: task,
    error,
    isLoading,
    mutate,
  } = useSWR<Task>(TASK_DETAILS_ENDPOINT(taskId), fetchTask, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKeyForTask(taskId));
      if (!raw) {
        setLocalDraftTimestamp(null);
        return;
      }

      const parsed: DraftRecord = JSON.parse(raw);
      if (parsed && typeof parsed.content === "string") {
        setEditorContent(parsed.content);
        setHasLoadedInitialContent(true);
        setLocalDraftTimestamp(parsed.savedAt ?? null);
      }
    } catch (err) {
      console.error("Failed to load local draft", err);
    }
  }, [taskId]);

  useEffect(() => {
    if (!task || hasLoadedInitialContent) {
      return;
    }

    let cancelled = false;
    const loadResult = async () => {
      if (!task) return;

      if (!task.result_path) {
        return;
      }

      if (!cancelled) {
        setIsResultLoading(true);
        setResultError(null);
      }

      try {
        const text = await fetchTaskResultCandidates(task);
        if (!cancelled) {
          setEditorContent(text);
          setHasLoadedInitialContent(true);
        }
      } catch (err) {
        if (!cancelled) {
          setResultError(
            err instanceof Error ? err.message : "امکان دریافت نتیجه وجود ندارد.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsResultLoading(false);
        }
      }
    };

    void loadResult();

    return () => {
      cancelled = true;
    };
  }, [task, hasLoadedInitialContent]);

  const statusBadge = useMemo(() => {
    if (!task) return null;

    const status = statusConfig[task.status] ?? statusConfig.PENDING;
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}
      >
        <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
        {status.label}
      </span>
    );
  }, [task]);

  const handleManualRefresh = () => {
    void mutate();
  };

  const handleSaveLocally = () => {
    if (typeof window === "undefined") return;

    try {
      const payload: DraftRecord = {
        content: editorContent,
        savedAt: Date.now(),
      };
      window.localStorage.setItem(
        storageKeyForTask(taskId),
        JSON.stringify(payload),
      );
      setLocalDraftTimestamp(payload.savedAt);
      setLocalSaveFeedback("پیش‌نویس به صورت محلی ذخیره شد.");
      setTimeout(() => {
        setLocalSaveFeedback(null);
      }, 4000);
    } catch (err) {
      console.error("Failed to save draft locally", err);
      setLocalSaveFeedback("ذخیره محلی با خطا مواجه شد.");
    }
  };

  const handleClearLocalDraft = () => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.removeItem(storageKeyForTask(taskId));
      setLocalDraftTimestamp(null);
      setLocalSaveFeedback("پیش‌نویس محلی حذف شد.");
      setTimeout(() => {
        setLocalSaveFeedback(null);
      }, 4000);
    } catch (err) {
      console.error("Failed to clear draft", err);
      setLocalSaveFeedback("حذف پیش‌نویس با خطا مواجه شد.");
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const blob = new Blob([editorContent ?? ""], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${task?.title ?? "task-output"}.md`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReloadResult = async () => {
    if (!task) return;

    setIsResultLoading(true);
    setResultError(null);
    setHasLoadedInitialContent(false);
    try {
      const text = await fetchTaskResultCandidates(task);
      setEditorContent(text);
      setHasLoadedInitialContent(true);
    } catch (err) {
      setResultError(
        err instanceof Error ? err.message : "امکان دریافت نتیجه وجود ندارد.",
      );
    } finally {
      setIsResultLoading(false);
    }
  };

  const handleSyncToServer = async () => {
    setApiSaveState("saving");
    setApiSaveMessage(null);

    try {
      const response = await fetch(TASK_RESULT_ENDPOINT(taskId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content: editorContent ?? "" }),
      });

      if (!response.ok) {
        const errorMessage =
          response.status === 404
            ? "مسیر بروزرسانی در API یافت نشد."
            : "خطا در ذخیره تغییرات در سرور.";
        setApiSaveState("error");
        setApiSaveMessage(errorMessage);
        return;
      }

      setApiSaveState("success");
      setApiSaveMessage("تغییرات با موفقیت به سرور ارسال شد.");
      setTimeout(() => {
        setApiSaveState("idle");
        setApiSaveMessage(null);
      }, 4000);
    } catch (err) {
      console.error("Failed to sync changes", err);
      setApiSaveState("error");
      setApiSaveMessage("برقراری ارتباط با سرور ممکن نشد.");
    }
  };

  const processingDuration = useMemo(
    () => formatDuration(task?.created_at, task?.completed_at),
    [task?.created_at, task?.completed_at],
  );

  const formattedLocalDraftTimestamp = useMemo(() => {
    if (!localDraftTimestamp) return null;

    try {
      return new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(new Date(localDraftTimestamp));
    } catch {
      return new Date(localDraftTimestamp).toLocaleString();
    }
  }, [localDraftTimestamp]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">جزئیات تسک</h1>
          <p className="text-sm text-slate-300">
            جزئیات خروجی پردازش و امکان ویرایش محتوای متنی.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            بازگشت به داشبورد
          </Link>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="rounded-md border border-emerald-600/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-200 transition hover:bg-emerald-500/20"
          >
            بروزرسانی وضعیت
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          در حال بارگذاری اطلاعات تسک…
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-6 text-sm text-rose-200">
          خطایی در دریافت اطلاعات تسک رخ داد. لطفاً دوباره تلاش کنید.
        </div>
      ) : !task ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
          تسک مورد نظر یافت نشد.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            <div className="flex flex-col gap-2">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                وضعیت فعلی
              </div>
              {statusBadge}
            </div>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">عنوان</dt>
                <dd className="text-base text-slate-100">{task.title}</dd>
              </div>
              {task.description ? (
                <div>
                  <dt className="text-xs text-slate-500">توضیحات</dt>
                  <dd className="whitespace-pre-wrap text-slate-200">
                    {task.description}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-slate-500">ایجاد</dt>
                <dd>{formatDate(task.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">آخرین بروزرسانی</dt>
                <dd>{formatDate(task.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">تکمیل</dt>
                <dd>{formatDate(task.completed_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">زمان پردازش</dt>
                <dd>{processingDuration}</dd>
              </div>
              {task.result_path ? (
                <div>
                  <dt className="text-xs text-slate-500">مسیر نتیجه</dt>
                  <dd className="break-all text-slate-400">{task.result_path}</dd>
                </div>
              ) : null}
              {formattedLocalDraftTimestamp ? (
                <div>
                  <dt className="text-xs text-slate-500">آخرین ذخیره محلی</dt>
                  <dd>{formattedLocalDraftTimestamp}</dd>
                </div>
              ) : null}
            </dl>
          </aside>

          <section className="flex flex-col gap-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    خروجی متنی
                  </h2>
                  <p className="text-sm text-slate-400">
                    محتوای قابل ویرایش از نتیجه پردازش. تغییرات شما تنها پس از
                    ذخیره محلی یا ارسال به سرور حفظ می‌شود.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReloadResult}
                    disabled={isResultLoading}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    بارگیری مجدد نتیجه
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isDownloading ? "در حال آماده‌سازی…" : "دانلود Markdown"}
                  </button>
                </div>
              </div>

              {resultError ? (
                <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                  {resultError}
                </div>
              ) : null}

              {isResultLoading ? (
                <div className="rounded-md border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-300">
                  در حال بارگیری نتیجه…
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-slate-800">
                  <ReactQuill
                    value={editorContent}
                    onChange={setEditorContent}
                    theme="snow"
                    modules={{
                      toolbar: toolbarOptions,
                    }}
                    placeholder="محتوای تولید شده در اینجا نمایش داده می‌شود…"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveLocally}
                className="rounded-md border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
              >
                ذخیره محلی
              </button>
              <button
                type="button"
                onClick={handleClearLocalDraft}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
              >
                حذف پیش‌نویس محلی
              </button>
              <button
                type="button"
                onClick={handleSyncToServer}
                disabled={apiSaveState === "saving"}
                className="rounded-md border border-emerald-600/60 bg-emerald-500/20 px-4 py-2 text-sm text-emerald-100 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {apiSaveState === "saving" ? "در حال ارسال…" : "ارسال تغییرات به API"}
              </button>
            </div>

            {localSaveFeedback ? (
              <div className="rounded-md border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-slate-200">
                {localSaveFeedback}
              </div>
            ) : null}

            {apiSaveMessage ? (
              <div
                className={`rounded-md border px-4 py-2 text-sm ${
                  apiSaveState === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-100"
                }`}
              >
                {apiSaveMessage}
              </div>
            ) : null}
          </section>
        </div>
      )}

      <style jsx global>{`
        .ql-toolbar.ql-snow {
          border-color: rgb(51 65 85);
          background-color: rgb(15 23 42 / 0.8);
        }
        .ql-toolbar.ql-snow .ql-picker {
          color: rgb(226 232 240);
        }
        .ql-toolbar.ql-snow .ql-picker-options {
          background-color: rgb(15 23 42);
          border-color: rgb(51 65 85);
          color: rgb(226 232 240);
        }
        .ql-container.ql-snow {
          border-color: rgb(51 65 85);
        }
        .ql-container {
          background-color: rgb(15 23 42 / 0.6);
          color: rgb(226 232 240);
          font-family: var(--font-sans), "Vazirmatn", system-ui, -apple-system,
            "Segoe UI", sans-serif;
        }
        .ql-container .ql-editor {
          min-height: 320px;
          direction: rtl;
          font-family: inherit;
        }
        .ql-editor.ql-blank::before {
          color: rgba(148, 163, 184, 0.8);
          right: 16px;
          left: unset;
        }
        .ql-snow .ql-stroke {
          stroke: rgb(226 232 240);
        }
        .ql-snow .ql-fill, .ql-snow .ql-stroke.ql-fill {
          fill: rgb(226 232 240);
        }
        .ql-snow.ql-toolbar button:hover .ql-fill,
        .ql-snow.ql-toolbar button.ql-active .ql-fill,
        .ql-snow.ql-toolbar button:hover .ql-stroke,
        .ql-snow.ql-toolbar button.ql-active .ql-stroke {
          color: rgb(16 185 129);
          stroke: rgb(16 185 129);
        }
      `}</style>
    </div>
  );
}

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  owner_id: string;
  result_path?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

type TaskStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
