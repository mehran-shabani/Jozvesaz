import type { NextRequest } from "next/server";

import { proxyAuthenticatedJson } from "@/lib/proxy";

const TASKS_PATH = "/api/v1/tasks";

export async function GET(request: NextRequest) {
  return proxyAuthenticatedJson(request, { targetPath: TASKS_PATH });
}

export async function POST(request: NextRequest) {
  return proxyAuthenticatedJson(request, {
    targetPath: TASKS_PATH,
    method: "POST",
  });
}

