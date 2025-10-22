import Link from "next/link";
import type { ReactNode } from "react";

import { fetchCurrentUser } from "@/lib/auth/server";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await fetchCurrentUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-10%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-[180px]" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[28rem] w-[28rem] rounded-full bg-sky-500/10 blur-[160px]" />
      </div>
      <div className="relative flex min-h-screen flex-col">
        <header className="border-b border-white/5 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="text-lg font-semibold text-slate-100">
              جزءساز
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="#features"
                className="text-slate-300 transition hover:text-slate-100"
              >
                امکانات
              </Link>
              <Link
                href="#workflow"
                className="text-slate-300 transition hover:text-slate-100"
              >
                روند کار
              </Link>
              <Link
                href="#security"
                className="text-slate-300 transition hover:text-slate-100"
              >
                امنیت
              </Link>
            </nav>
            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <Link
                  href="/dashboard"
                  className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-emerald-400"
                >
                  ورود به داشبورد
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-full border border-slate-700 px-4 py-2 font-medium text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
                  >
                    ورود
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full bg-emerald-500 px-4 py-2 font-medium text-slate-900 transition hover:bg-emerald-400"
                  >
                    شروع رایگان
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/5 bg-slate-950/80">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} جزءساز. تمامی حقوق محفوظ است.</p>
            <div className="flex items-center gap-3">
              <Link href="/login" className="transition hover:text-slate-200">
                ورود
              </Link>
              <Link href="/register" className="transition hover:text-slate-200">
                ثبت‌نام
              </Link>
              <Link href="#security" className="transition hover:text-slate-200">
                امنیت</Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
