import { NextRequest, NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/constants";
import { extractSetCookie, parseJsonSafe } from "@/lib/http";
import type { AuthUser } from "@/types/auth";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  const backendResponse = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  const data = (await parseJsonSafe<AuthUser | { detail?: string }>(backendResponse)) ?? {};

  const response = NextResponse.json(data, { status: backendResponse.status });

  const cookies = extractSetCookie(backendResponse.headers);
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }

  return response;
}
