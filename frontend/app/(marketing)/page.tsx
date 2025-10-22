import Link from "next/link";

import { fetchCurrentUser } from "@/lib/auth/server";

const features = [
  {
    title: "پیگیری زنده پردازش",
    description:
      "داشبورد هر ۱۰ ثانیه وضعیت جدید وظایف را دریافت می‌کند تا همیشه از آخرین تغییرات مطلع باشید.",
  },
  {
    title: "بارگذاری آسان",
    description:
      "فایل‌های صوتی را بکشید و رها کنید تا بدون معطلی در صف پردازش FastAPI قرار گیرند و نتیجه در داشبورد ثبت شود.",
  },
  {
    title: "ویرایش نتیجه درجا",
    description:
      "ویرایشگر غنی در صفحه هر وظیفه قرار دارد تا متون پردازش شده را تصحیح و ذخیره کنید.",
  },
];

const workflow = [
  {
    step: "۱",
    title: "ثبت‌نام یا ورود",
    description: "از فرم‌های امن استفاده کنید تا حساب کاربری شما ساخته و سشن با کوکی‌های httpOnly نگهداری شود.",
  },
  {
    step: "۲",
    title: "آپلود فایل صوتی",
    description: "فایل را انتخاب کنید تا FastAPI آن را پردازش و نتیجه را آماده نمایش در داشبورد کند.",
  },
  {
    step: "۳",
    title: "مدیریت نتایج",
    description: "با داشبورد RTL وضعیت‌ها را دنبال کنید، جزئیات هر وظیفه را ببینید و یادداشت بگذارید.",
  },
];

const securityHighlights = [
  {
    title: "کوکی‌های httpOnly",
    description:
      "اطلاعات احراز هویت تنها در سمت سرور قابل خواندن است و در معرض جاوااسکریپت قرار نمی‌گیرد.",
  },
  {
    title: "مسیرهای محافظت‌شده",
    description:
      "Middleware از ورود مستقیم به /dashboard جلوگیری می‌کند و کاربران بدون دسترسی را به /login هدایت می‌کند.",
  },
  {
    title: "پروکسی امن",
    description:
      "درخواست‌های frontend از طریق مسیرهای API Next.js به FastAPI ارسال و هدرهای حساس مدیریت می‌شود.",
  },
];

export default async function Home() {
  const user = await fetchCurrentUser();

  return (
    <main className="relative z-10 flex flex-col gap-24 px-6 py-16">
      <section className="mx-auto w-full max-w-6xl rounded-3xl border border-white/5 bg-slate-950/70 p-10 text-center shadow-[0_40px_120px_-40px_rgba(16,185,129,0.25)] backdrop-blur">
        <div className="mx-auto max-w-3xl space-y-6">
          <span className="inline-flex items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-medium text-emerald-200">
            پردازش صوت با FastAPI
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl">
            مدیریت متمرکز وظایف صوتی با یک داشبورد امن و تمام‌فارسی
          </h1>
          <p className="text-balance text-base leading-relaxed text-slate-300 sm:text-lg">
            جزءساز تمام مسیر احراز هویت، آپلود و مشاهده نتایج را با FastAPI و Next.js یکپارچه کرده است.
            تنها کاری که باید انجام دهید ورود یا ثبت‌نام و شروع پردازش فایل‌های صوتی است.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full max-w-xs rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                رفتن به داشبورد
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="w-full max-w-xs rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  شروع رایگان
                </Link>
                <Link
                  href="/login"
                  className="w-full max-w-xs rounded-full border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
                >
                  ورود به حساب
                </Link>
              </>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4">
              <p className="text-3xl font-semibold text-emerald-300">+۲K</p>
              <p className="text-xs text-slate-400">دقیقه صوت پردازش شده در آخرین ماه</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4">
              <p className="text-3xl font-semibold text-emerald-300">۹۹٪</p>
              <p className="text-xs text-slate-400">رضایت کاربران از فرایند ورود و ثبت‌نام</p>
            </div>
            <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-4">
              <p className="text-3xl font-semibold text-emerald-300">۲ دقیقه</p>
              <p className="text-xs text-slate-400">میانگین زمان تا دریافت اولین نتیجه</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl">
        <div className="mb-8 space-y-3 text-center">
          <h2 className="text-3xl font-semibold text-slate-50">چرا جزءساز؟</h2>
          <p className="text-sm leading-7 text-slate-300">
            از لحظه ورود تا مشاهده نتیجه، همه چیز برای سرعت و امنیت طراحی شده است.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group h-full rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 text-right transition hover:border-emerald-500/40 hover:bg-slate-900/80"
            >
              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-300">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="mx-auto w-full max-w-6xl rounded-3xl border border-white/5 bg-slate-900/40 p-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-slate-50">روند کار در سه گام</h2>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            تنها سه مرحله تا دریافت نتایج پردازش FastAPI فاصله دارید.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {workflow.map((item) => (
            <div
              key={item.title}
              className="relative rounded-2xl border border-slate-800 bg-slate-950/60 p-6"
            >
              <span className="absolute -top-4 right-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-semibold text-emerald-300">
                {item.step}
              </span>
              <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="mx-auto w-full max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-right">
            <h2 className="text-3xl font-semibold text-emerald-100">امنیت در قلب معماری</h2>
            <p className="mt-4 text-sm leading-7 text-emerald-50/90">
              احراز هویت با کوکی‌های ایمن، مسیرهای تفکیک شده و اتصال مستقیم به FastAPI تضمین می‌کند که فقط کاربران مجاز به داده‌ها دسترسی دارند.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-emerald-50/90">
              <li>• استفاده از httpOnly برای جلوگیری از دسترسی اسکریپت‌ها به توکن‌ها</li>
              <li>• رفرش خودکار اطلاعات کاربر در Provider سمت کلاینت</li>
              <li>• تفکیک layout برای مسیرهای عمومی و محافظت‌شده</li>
            </ul>
          </div>
          <div className="space-y-4">
            {securityHighlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
                <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center">
        <h2 className="text-3xl font-semibold text-slate-50">برای شروع آماده‌اید؟</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          همین حالا حساب خود را بسازید یا وارد شوید تا نخستین وظیفه را ایجاد کنید و نتیجه را تنها در چند دقیقه دریافت نمایید.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {user ? (
            <Link
              href="/dashboard"
              className="w-full max-w-xs rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              مشاهده داشبورد
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="w-full max-w-xs rounded-full bg-emerald-500 px-6 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                ساخت حساب جدید
              </Link>
              <Link
                href="/login"
                className="w-full max-w-xs rounded-full border border-slate-700 px-6 py-3 text-center text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-slate-50"
              >
                ورود برای کاربران قبلی
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
