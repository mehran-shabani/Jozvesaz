export const API_BASE_URL =
  process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export const ACCESS_TOKEN_COOKIE_NAME =
  process.env.NEXT_PUBLIC_ACCESS_TOKEN_COOKIE_NAME ?? "access_token";

export const REFRESH_TOKEN_COOKIE_NAME =
  process.env.NEXT_PUBLIC_REFRESH_TOKEN_COOKIE_NAME ?? "refresh_token";
