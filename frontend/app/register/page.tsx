"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const full_name = String(formData.get("full_name") ?? "").trim() || undefined;

    try {
      setFormError(null);
      await register({ email, password, full_name });
      router.replace("/dashboard");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "ثبت نام ناموفق بود";
      setFormError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold">ایجاد حساب جدید</h1>
          <p className="text-sm text-slate-300">اطلاعات خود را وارد کنید تا دسترسی به داشبورد فراهم شود.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-900/60 border border-slate-800 rounded-lg p-6">
          <div className="space-y-2">
            <label htmlFor="full_name" className="text-sm font-medium text-slate-300">
              نام و نام خانوادگی (اختیاری)
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {(error || formError) && (
            <p className="text-sm text-rose-400">{formError ?? error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {loading ? "در حال ایجاد حساب..." : "ثبت نام"}
          </button>
        </form>
        <p className="text-center text-sm text-slate-300">
          قبلاً ثبت نام کرده‌اید؟{" "}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            وارد شوید
          </Link>
        </p>
      </div>
    </div>
  );
}
