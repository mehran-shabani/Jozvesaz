"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, type ChangeEvent } from "react";

import { useAuth } from "@/hooks/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error } = useAuth();
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [fieldErrors, setFieldErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    form?: string;
  }>({});

  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  const handleChange = (field: keyof typeof values) => (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined, form: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = values.email.trim();
    const trimmedName = values.full_name.trim();
    const nextErrors: typeof fieldErrors = {};

    if (trimmedName.length > 0 && trimmedName.length < 3) {
      nextErrors.full_name = "نام باید حداقل ۳ کاراکتر باشد.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "ایمیل الزامی است.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "فرمت ایمیل صحیح نیست.";
    }

    if (!values.password) {
      nextErrors.password = "رمز عبور را وارد کنید.";
    } else if (values.password.length < 8) {
      nextErrors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    }

    if (!values.confirm) {
      nextErrors.confirm = "تکرار رمز عبور را وارد کنید.";
    } else if (values.confirm !== values.password) {
      nextErrors.confirm = "رمز عبور و تکرار آن مطابقت ندارد.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    try {
      setFieldErrors({});
      await register({ email: trimmedEmail, password: values.password, full_name: trimmedName || undefined });
      router.replace("/dashboard");
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "ثبت نام ناموفق بود";
      setFieldErrors({ form: message });
    }
  };

  return (
    <div className="space-y-8 text-right">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-50">ایجاد حساب جدید</h1>
        <p className="text-sm leading-7 text-slate-300">
          اطلاعات خود را وارد کنید تا دسترسی به داشبورد و امکانات پردازش صوت فعال شود.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-[0_20px_80px_-50px_rgba(59,130,246,0.35)]"
      >
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm font-medium text-slate-200">
            نام و نام خانوادگی (اختیاری)
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            autoComplete="name"
            value={values.full_name}
            onChange={handleChange("full_name")}
            aria-invalid={Boolean(fieldErrors.full_name)}
            aria-describedby={fieldErrors.full_name ? "full-name-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.full_name ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.full_name ? (
            <p id="full-name-error" className="text-xs text-rose-400">
              {fieldErrors.full_name}
            </p>
          ) : (
            <p className="text-xs text-slate-400">وارد کردن نام کمک می‌کند تا داشبورد شخصی‌تر شود.</p>
          )}
        </div>
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
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.email ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.email ? (
            <p id="register-email-error" className="text-xs text-rose-400">
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
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange("password")}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.password ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.password ? (
            <p id="register-password-error" className="text-xs text-rose-400">
              {fieldErrors.password}
            </p>
          ) : (
            <p className="text-xs text-slate-400">حداقل طول رمز عبور ۸ کاراکتر است.</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm" className="text-sm font-medium text-slate-200">
            تکرار رمز عبور
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={values.confirm}
            onChange={handleChange("confirm")}
            aria-invalid={Boolean(fieldErrors.confirm)}
            aria-describedby={fieldErrors.confirm ? "register-confirm-error" : undefined}
            className={`w-full rounded-lg border bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              fieldErrors.confirm ? "border-rose-500/70" : "border-slate-700"
            }`}
          />
          {fieldErrors.confirm ? (
            <p id="register-confirm-error" className="text-xs text-rose-400">
              {fieldErrors.confirm}
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
          {loading ? "در حال ایجاد حساب..." : "ثبت نام"}
        </button>
      </form>
      <p className="text-sm text-slate-300">
        قبلاً ثبت نام کرده‌اید؟{" "}
        <Link href="/login" className="font-medium text-emerald-400 transition hover:text-emerald-300">
          وارد شوید
        </Link>
      </p>
    </div>
  );
}
