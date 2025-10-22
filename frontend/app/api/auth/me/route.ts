import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/constants";
import { extractSetCookie, parseJsonSafe } from "@/lib/http";
import type { AuthUser } from "@/types/auth";

export async function GET(request: NextRequest) {
  const backendResponse = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
    credentials: "include",
    cache: "no-store",
  });

  const data = (await parseJsonSafe<AuthUser | { detail?: string }>(backendResponse)) ?? {};
  const response = NextResponse.json(data, { status: backendResponse.status });

  const cookies = extractSetCookie(backendResponse.headers);
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}
