import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as listTasks } from "@/app/api/tasks/route";
import { GET as getTask } from "@/app/api/tasks/[taskId]/route";
import {
  GET as getTaskResult,
  PUT as updateTaskResult,
} from "@/app/api/tasks/[taskId]/result/route";
import { API_BASE_URL } from "@/lib/constants";

const BACKEND_BASE_URL = API_BASE_URL;

function createRequest(url: string, init?: RequestInit) {
  return new NextRequest(new Request(url, init));
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API proxy routes", () => {
  it("rejects unauthenticated requests with 401", async () => {
    const request = createRequest("http://localhost/api/tasks");

    const response = await listTasks(request);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ detail: "Not authenticated" });
  });

  it("forwards authenticated task list requests to the backend", async () => {
    const request = createRequest("http://localhost/api/tasks?page=2", {
      headers: {
        cookie: "access_token=abc; refresh_token=def",
      },
    });

    const backendPayload = [{ id: "1" }];
    const backendResponse = new Response(JSON.stringify(backendPayload), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": "access_token=new; Path=/; HttpOnly",
      },
    });

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(backendResponse);

    const response = await listTasks(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_BASE_URL}/api/v1/tasks?page=2`);

    const forwardedHeaders = new Headers((init as RequestInit).headers);
    expect(forwardedHeaders.get("cookie")).toContain("access_token=abc");
    expect(forwardedHeaders.get("cookie")).toContain("refresh_token=def");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(backendPayload);
    expect(response.headers.get("set-cookie")).toContain("access_token=new");
  });

  it("surfaces backend connectivity failures as 502 errors", async () => {
    const request = createRequest("http://localhost/api/tasks", {
      headers: { cookie: "access_token=abc" },
    });

    vi.spyOn(global, "fetch").mockRejectedValue(new Error("boom"));

    const response = await listTasks(request);

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ detail: "Failed to contact API" });
  });

  it("proxies task details requests with search params", async () => {
    const request = createRequest("http://localhost/api/tasks/123?include=relations", {
      headers: { cookie: "access_token=abc" },
    });

    const backendResponse = new Response(JSON.stringify({ id: "123" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(backendResponse);

    const response = await getTask(request, { params: { taskId: "123" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_BASE_URL}/api/v1/tasks/123?include=relations`);
    expect((init as RequestInit).method).toBe("GET");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: "123" });
  });

  it("returns plain text task results", async () => {
    const request = createRequest("http://localhost/api/tasks/abc/result", {
      headers: { cookie: "access_token=abc" },
    });

    const backendResponse = new Response("transcribed text", {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "set-cookie": "refresh_token=new; Path=/; HttpOnly",
      },
    });

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(backendResponse);

    const response = await getTaskResult(request, { params: { taskId: "abc" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_BASE_URL}/api/v1/tasks/abc/result`);
    expect((init as RequestInit).method).toBe("GET");

    await expect(response.text()).resolves.toBe("transcribed text");
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("set-cookie")).toContain("refresh_token=new");
  });

  it("forwards updates to task results with JSON bodies", async () => {
    const body = JSON.stringify({ content: "updated text" });
    const request = createRequest("http://localhost/api/tasks/xyz/result", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        cookie: "access_token=abc",
      },
      body,
    });

    const backendResponse = new Response(JSON.stringify({ result_path: "/foo" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    const fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(backendResponse);

    const response = await updateTaskResult(request, { params: { taskId: "xyz" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BACKEND_BASE_URL}/api/v1/tasks/xyz/result`);
    expect((init as RequestInit).method).toBe("PUT");
    expect((init as RequestInit).body).toBe(body);

    const forwardedHeaders = new Headers((init as RequestInit).headers);
    expect(forwardedHeaders.get("content-type")).toBe("application/json");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ result_path: "/foo" });
  });
});

