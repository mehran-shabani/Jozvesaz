import { NextRequest, NextResponse } from "next/server";

import { proxyAuthenticatedJson, proxyAuthenticatedText } from "@/lib/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const { taskId } = params;
  return proxyAuthenticatedText(request, {
    targetPath: `/api/v1/tasks/${taskId}/result`,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { taskId: string } },
) {
  const { taskId } = params;

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    console.error("Failed to parse JSON payload for task result", error);
    return NextResponse.json(
      { detail: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  return proxyAuthenticatedJson(request, {
    targetPath: `/api/v1/tasks/${taskId}/result`,
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "content-type": "application/json" },
  });
}

