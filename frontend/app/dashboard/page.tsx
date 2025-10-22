import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { fetchCurrentUser } from "@/lib/auth/server";

export default async function DashboardPage() {
  const user = await fetchCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">داشبورد</h1>
            <p className="text-sm text-slate-300">به سیستم خوش آمدید، {user.full_name ?? user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-emerald-400 hover:text-emerald-300 transition"
            >
              بازگشت به صفحه اصلی
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold mb-3">اطلاعات کاربر</h2>
          <dl className="space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-200">ایمیل</dt>
              <dd>{user.email}</dd>
            </div>
            {user.full_name ? (
              <div className="flex items-center justify-between">
                <dt className="font-medium text-slate-200">نام و نام خانوادگی</dt>
                <dd>{user.full_name}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <dt className="font-medium text-slate-200">شناسه کاربر</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold mb-3">وضعیت سیستم</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            درخواست‌های این داشبورد از طریق مسیرهای App Router به FastAPI ارسال می‌شوند و از کوکی‌های httpOnly
            برای تأیید هویت استفاده می‌کنند. برای مدیریت وظایف می‌توانید توسعه‌های بعدی را به همین ساختار اضافه
            کنید.
          </p>
        </section>
      </main>
    </div>
  );
}
