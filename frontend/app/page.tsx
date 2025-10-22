import Link from "next/link";

import { fetchCurrentUser } from "@/lib/auth/server";

export default async function Home() {
  const user = await fetchCurrentUser();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-6">
        <span className="text-sm uppercase tracking-[0.2em] text-slate-400">Task Manager</span>
        <h1 className="text-4xl sm:text-5xl font-semibold">
          کنترل کامل روی وظایف خود با یک داشبورد امن و مدرن
        </h1>
        <p className="text-slate-300 leading-relaxed">
          برای ایجاد حساب یا ورود از فرم‌های محافظت شده استفاده کنید. این رابط کاربری با FastAPI ادغام
          شده و از کوکی‌های httpOnly برای حفظ امنیت جلسات استفاده می‌کند.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {user ? (
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-md bg-emerald-500 text-slate-950 font-medium transition hover:bg-emerald-400"
            >
              رفتن به داشبورد
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="px-6 py-3 rounded-md bg-emerald-500 text-slate-950 font-medium transition hover:bg-emerald-400"
              >
                ایجاد حساب جدید
              </Link>
              <Link
                href="/login"
                className="px-6 py-3 rounded-md border border-slate-700 font-medium transition hover:border-slate-500"
              >
                ورود به حساب کاربری
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
