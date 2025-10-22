import "server-only";

import { cookies } from "next/headers";

import { API_BASE_URL } from "@/lib/constants";
import { parseJsonSafe } from "@/lib/http";
import type { AuthUser } from "@/types/auth";

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const data = await parseJsonSafe<AuthUser>(response);
  return data ?? null;
}
