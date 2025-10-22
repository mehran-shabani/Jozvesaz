export async function parseJsonSafe<T>(response: Response): Promise<T | undefined> {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      return (await response.json()) as T;
    } catch (error) {
      console.error("Failed to parse JSON response", error);
    }
  }
  return undefined;
}

export function extractSetCookie(headers: Headers): string[] {
  const possible = (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.();
  if (possible && Array.isArray(possible)) {
    return possible;
  }
  const header = headers.get("set-cookie");
  return header ? [header] : [];
}
