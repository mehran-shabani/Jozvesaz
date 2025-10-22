import { redirect } from "next/navigation";

import { fetchCurrentUser } from "@/lib/auth/server";

import { TaskList } from "./task-list";

export default async function DashboardPage() {
  const user = await fetchCurrentUser();

  if (!user) {
    redirect("/login?from=/dashboard");
  }

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-xl font-semibold">اطلاعات کاربر</h2>
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
        <h2 className="mb-3 text-xl font-semibold">وضعیت سیستم</h2>
        <div className="space-y-3 text-sm leading-relaxed text-slate-300">
          <p>
            درخواست‌ها از طریق مسیرهای App Router به FastAPI ارسال می‌شوند و با کوکی‌های httpOnly امنیت
            نشست تضمین می‌شود. به محض ورود، توکن‌ها در بک‌اند مدیریت شده و تنها داده‌های ضروری به رابط کاربری می‌رسد.
          </p>
          <p>
            برای افزودن قابلیت‌های جدید کافی است مسیرهای محافظت‌شده را در همین ساختار قرار دهید و از provider احراز هویت برای مصرف داده‌های کاربر استفاده کنید.
          </p>
        </div>
      </section>
      <div id="tasks" className="scroll-mt-24">
        <TaskList />
      </div>
    </div>
  );
}
