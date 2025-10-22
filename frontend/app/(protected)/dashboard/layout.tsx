import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchCurrentUser } from "@/lib/auth/server";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await fetchCurrentUser();

  if (!user) {
    redirect("/login?from=/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400/80">داشبورد جزءساز</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-50">
              خوش آمدید، {user.full_name ?? user.email}
            </h1>
            <p className="text-sm text-slate-300">
              تسک‌ها و نتایج پردازش شما همیشه در اینجا در دسترس هستند.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/"
              className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
            >
              صفحه اصلی
            </Link>
            <Link
              href="/dashboard/upload"
              className="rounded-full border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-medium text-emerald-200 transition hover:bg-emerald-500/20"
            >
              آپلود وظیفه جدید
            </Link>
            <LogoutButton />
          </div>
        </div>
        <div className="border-t border-slate-800/60 bg-slate-900/70">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-6 overflow-x-auto px-6 py-2 text-xs text-slate-300">
            <Link href="/dashboard" className="rounded-full px-3 py-1 transition hover:bg-slate-800/80 hover:text-slate-100">
              خلاصه داشبورد
            </Link>
            <Link href="/dashboard/upload" className="rounded-full px-3 py-1 transition hover:bg-slate-800/80 hover:text-slate-100">
              آپلود فایل
            </Link>
            <Link href="/dashboard#tasks" className="rounded-full px-3 py-1 transition hover:bg-slate-800/80 hover:text-slate-100">
              فهرست وظایف
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
