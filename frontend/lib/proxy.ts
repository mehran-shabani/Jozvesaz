import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE_NAME,
  API_BASE_URL,
} from "@/lib/constants";
import { extractSetCookie, parseJsonSafe } from "@/lib/http";

type ProxyResponseType = "json" | "text";

interface ProxyOptions {
  targetPath: string;
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  requireAuth?: boolean;
  responseType?: ProxyResponseType;
  forwardSearchParams?: boolean;
}

function hasReadableStream(body: BodyInit | null | undefined): boolean {
  if (!body || typeof body !== "object") {
    return false;
  }

  return typeof (body as ReadableStream<Uint8Array>).getReader === "function";
}

function buildForwardHeaders(
  request: NextRequest,
  explicitHeaders?: HeadersInit,
): Headers {
  const headers = new Headers();

  if (explicitHeaders) {
    const initial = new Headers(explicitHeaders);
    initial.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (lower === "host" || lower === "connection" || lower === "content-length") {
      return;
    }

    if (!headers.has(key)) {
      headers.set(key, value);
    }
  });

  const incomingCookieHeader = request.headers.get("cookie");
  if (incomingCookieHeader) {
    headers.set("cookie", incomingCookieHeader);
  } else {
    const serialized = request
      .cookies
      .getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");

    if (serialized) {
      headers.set("cookie", serialized);
    }
  }

  return headers;
}

function appendBackendCookies(
  response: NextResponse,
  backendHeaders: Headers,
) {
  const cookies = extractSetCookie(backendHeaders);
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
}

export async function proxyRequest(
  request: NextRequest,
  {
    targetPath,
    method,
    body,
    headers: explicitHeaders,
    requireAuth = true,
    responseType = "json",
    forwardSearchParams = true,
  }: ProxyOptions,
): Promise<NextResponse> {
  if (requireAuth && !request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)) {
    return NextResponse.json({ detail: "Not authenticated" }, { status: 401 });
  }

  const finalMethod = method ?? request.method ?? "GET";
  const shouldIncludeBody =
    body !== undefined && body !== null
      ? true
      : !["GET", "HEAD"].includes(finalMethod.toUpperCase()) && request.body !== null;

  const forwardBody = body ?? (shouldIncludeBody ? request.body : null);
  const headers = buildForwardHeaders(request, explicitHeaders);

  const search = forwardSearchParams ? request.nextUrl.search : "";
  const targetUrl = `${API_BASE_URL}${targetPath}${search}`;

  let backendResponse: Response;
  try {
    const init: RequestInit = {
      method: finalMethod,
      headers,
      body: forwardBody ?? undefined,
      cache: "no-store",
    };

    if (hasReadableStream(forwardBody)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore Node.js fetch requires duplex="half" when streaming a request body
      init.duplex = "half";
    }

    backendResponse = await fetch(targetUrl, init);
  } catch (error) {
    console.error("Failed to contact backend API", error);
    return NextResponse.json(
      { detail: "Failed to contact API" },
      { status: 502 },
    );
  }

  if (responseType === "text") {
    const textBody = backendResponse.status === 204 ? "" : await backendResponse.text();
    const response = new NextResponse(textBody, { status: backendResponse.status });

    const contentType = backendResponse.headers.get("content-type");
    response.headers.set(
      "content-type",
      contentType ?? "text/plain; charset=utf-8",
    );

    appendBackendCookies(response, backendResponse.headers);
    return response;
  }

  if (backendResponse.status === 204) {
    const response = new NextResponse(null, { status: backendResponse.status });
    appendBackendCookies(response, backendResponse.headers);
    return response;
  }

  const payload = await parseJsonSafe<unknown>(backendResponse);
  if (payload === undefined) {
    const fallbackText = await backendResponse.text().catch(() => "");
    const response = NextResponse.json(
      fallbackText
        ? { detail: fallbackText }
        : { detail: "Unexpected response from API" },
      { status: backendResponse.status },
    );
    appendBackendCookies(response, backendResponse.headers);
    return response;
  }

  const response = NextResponse.json(payload, { status: backendResponse.status });
  appendBackendCookies(response, backendResponse.headers);
  return response;
}

export async function proxyAuthenticatedJson(
  request: NextRequest,
  options: Omit<ProxyOptions, "responseType">,
) {
  return proxyRequest(request, { ...options, responseType: "json" });
}

export async function proxyAuthenticatedText(
  request: NextRequest,
  options: Omit<ProxyOptions, "responseType">,
) {
  return proxyRequest(request, { ...options, responseType: "text" });
}

