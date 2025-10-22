"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState, type ChangeEvent } from "react";

import { useAuth } from "@/hooks/use-auth";

const DEFAULT_REDIRECT = "/dashboard";
const SAFE_REDIRECT_BASE_URL = "https://jozvesaz.local";

function getSafeRedirectPath(redirectParam: string | null): string {
  if (!redirectParam) {
    return DEFAULT_REDIRECT;
  }

  try {
    const candidate = new URL(redirectParam, SAFE_REDIRECT_BASE_URL);

    if (candidate.origin !== SAFE_REDIRECT_BASE_URL) {
      return DEFAULT_REDIRECT;
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("from");
  const redirectTo = getSafeRedirectPath(redirectParam);
  const { login, loading, error } = useAuth();
  const [values, setValues] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const handleChange = (field: "email" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = values.email.trim();
    const password = values.password;
    const nextErrors: { email?: string; password?: string; form?: string } = {};

    if (!trimmedEmail) {
      nextErrors.email = "لطفاً ایمیل خود را وارد کنید.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "فرمت ایمیل صحیح نیست.";
    }

    if (!password) {
      nextErrors.password = "رمز عبور را وارد کنید.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      setFieldErrors({});
      await login(trimmedEmail, password);
      router.replace(redirectTo);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "ورود ناموفق بود";
      setFieldErrors({ form: message });
    }
  };

  return (
    <div className="space-y-8 text-right">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-50">ورود به حساب کاربری</h1>
        <p className="text-sm leading-7 text-slate-300">
          برای دسترسی به داشبورد و پیگیری وظایف، ایمیل و رمز عبور خود را وارد کنید.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_20px_80px_-50px_rgba(16,185,129,0.4)]"
      >
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-200">
            ایمیل
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleChange("email")}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.email ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.email ? (
            <p id="email-error" className="text-xs text-rose-400">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-slate-200">
            رمز عبور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange("password")}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.password ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.password ? (
            <p id="password-error" className="text-xs text-rose-400">
              {fieldErrors.password}
            </p>
          ) : null}
        </div>
        {(fieldErrors.form || error) ? (
          <div className="rounded-md border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {fieldErrors.form ?? error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "در حال ورود..." : "ورود"}
        </button>
      </form>
      <p className="text-sm text-slate-300">
        حساب کاربری ندارید؟{" "}
        <Link href="/register" className="font-medium text-emerald-400 transition hover:text-emerald-300">
          ساخت حساب جدید
        </Link>
      </p>
    </div>
  );
}
