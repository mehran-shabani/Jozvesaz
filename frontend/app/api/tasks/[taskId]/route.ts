import type { NextRequest } from "next/server";

import { proxyAuthenticatedJson } from "@/lib/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const { taskId } = params;
  return proxyAuthenticatedJson(request, {
    targetPath: `/api/v1/tasks/${taskId}`,
  });
}

