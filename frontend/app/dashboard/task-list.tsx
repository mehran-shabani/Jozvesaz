"use client";

import Link from "next/link";
import useSWR from "swr";

const TASKS_ENDPOINT = "/api/v1/tasks";

const fetchTasks = async (url: string): Promise<Task[]> => {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("failed-to-fetch");
  }

  return response.json();
};

const statusConfig: Record<
  TaskStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  PENDING: {
    label: "در انتظار",
    badgeClass:
      "border border-amber-500/30 bg-amber-500/10 text-amber-300",
    dotClass: "bg-amber-400",
  },
  PROCESSING: {
    label: "در حال پردازش",
    badgeClass:
      "border border-sky-500/30 bg-sky-500/10 text-sky-300",
    dotClass: "bg-sky-400",
  },
  COMPLETED: {
    label: "تکمیل شده",
    badgeClass:
      "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
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

export function TaskList() {
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<Task[]>(TASKS_ENDPOINT, fetchTasks, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  const handleManualRefresh = () => {
    void mutate();
  };

  const handleRetry = () => {
    void mutate();
  };

  const hasTasks = (data?.length ?? 0) > 0;

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">وظایف شما</h2>
          <p className="text-sm text-slate-300">
            وضعیت وظایف ایجاد شده را به صورت زنده دنبال کنید. فهرست هر ۱۰
            ثانیه به‌روزرسانی می‌شود.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isValidating ? (
            <span className="text-xs text-slate-400">در حال به‌روزرسانی…</span>
          ) : null}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isValidating}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            رفرش
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="text-sm text-slate-300">در حال بارگذاری تسک‌ها…</div>
      ) : error ? (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          <p className="font-medium">خطا در دریافت اطلاعات تسک‌ها.</p>
          <p className="mt-1">لطفاً ارتباط خود را بررسی کرده و دوباره تلاش کنید.</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 text-xs font-medium text-rose-100 underline decoration-dotted transition hover:text-rose-50"
          >
            تلاش مجدد
          </button>
        </div>
      ) : hasTasks ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="px-4 py-3">
                  عنوان
                </th>
                <th scope="col" className="px-4 py-3">
                  وضعیت
                </th>
                <th scope="col" className="px-4 py-3">
                  ایجاد
                </th>
                <th scope="col" className="px-4 py-3">
                  آخرین بروزرسانی
                </th>
                <th scope="col" className="px-4 py-3">
                  تکمیل
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {data?.map((task) => {
                const status = statusConfig[task.status] ?? statusConfig.PENDING;

                return (
                  <tr key={task.id} className="hover:bg-slate-900/80">
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium text-slate-100">{task.title}</div>
                      {task.description ? (
                        <p className="mt-1 max-w-xs truncate text-xs text-slate-400">
                          {task.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${status.dotClass}`}
                        />
                        {status.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(task.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(task.updated_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {formatDate(task.completed_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/tasks/${task.id}`}
                        className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300"
                      >
                        مشاهده جزئیات
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-300">
          هنوز هیچ تسکی ایجاد نشده است. از بخش آپلود برای ایجاد تسک جدید
          استفاده کنید.
        </div>
      )}
    </section>
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

