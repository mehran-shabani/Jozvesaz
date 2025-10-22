import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row-reverse">
        <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
          <div className="w-full max-w-md space-y-10">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 transition hover:text-slate-100">
              ← بازگشت به صفحه اصلی
            </Link>
            {children}
          </div>
        </div>
        <aside className="relative hidden w-full flex-col justify-between overflow-hidden border-l border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 px-10 py-12 lg:flex lg:w-1/2">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute right-[15%] top-[12%] h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
            <div className="absolute bottom-[10%] left-[10%] h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />
          </div>
          <div className="relative space-y-6">
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
              امنیت به سبک FastAPI
            </span>
            <h2 className="text-3xl font-semibold leading-tight text-slate-50">
              ساخت حساب کاربری و مدیریت وظایف در چند ثانیه
            </h2>
            <p className="text-sm leading-7 text-slate-300">
              با جزءساز، وظایف صوتی خود را بارگذاری کنید و وضعیت پردازش را در داشبورد امن و تمام‌فارسی دنبال کنید. همه‌چیز با کوکی‌های httpOnly و احراز هویت مطمئن انجام می‌شود.
            </p>
            <ul className="space-y-4 text-sm text-slate-200">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">۱</span>
                <div>
                  <p className="font-medium">ثبت‌نام یا ورود سریع</p>
                  <p className="text-slate-300">حساب خود را بسازید تا به تمام امکانات داشبورد دسترسی داشته باشید.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">۲</span>
                <div>
                  <p className="font-medium">آپلود فایل‌های صوتی</p>
                  <p className="text-slate-300">فایل را بکشید و رها کنید تا فرایند پردازش بلافاصله آغاز شود.</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">۳</span>
                <div>
                  <p className="font-medium">مشاهده نتایج آنی</p>
                  <p className="text-slate-300">از داشبورد وضعیت هر وظیفه را دنبال کنید و نتایج را مدیریت نمایید.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="relative text-xs text-slate-400">
            برای پشتیبانی با ما در <a className="font-medium text-emerald-300" href="mailto:support@jozvesaz.local">support@jozvesaz.local</a> در ارتباط باشید.
          </div>
        </aside>
      </div>
    </div>
  );
}
