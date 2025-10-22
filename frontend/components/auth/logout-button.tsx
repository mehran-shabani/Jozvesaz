"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/use-auth";

export function LogoutButton() {
  const { logout, loading } = useAuth();
  const router = useRouter();

  const handleClick = async () => {
    await logout();
    router.replace("/");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-md border border-rose-500 px-3 py-1.5 text-sm font-medium text-rose-200 transition hover:bg-rose-500/10 disabled:opacity-60"
    >
      خروج از حساب
    </button>
  );
}
