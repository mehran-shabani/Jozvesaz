"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { AuthUser } from "@/types/auth";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: { email: string; password: string; full_name?: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function handleJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { detail?: string; message?: string }).detail ?? "Request failed";
    throw new Error(message);
  }
  return data as AuthUser;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        setUser(null);
        setError(null);
        return null;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = (data as { detail?: string; message?: string }).detail ?? "Unable to fetch user";
        setError(message);
        setUser(null);
        return null;
      }

      setError(null);
      setUser(data as AuthUser);
      return data as AuthUser;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Unable to fetch user";
      setError(message);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });

        const data = await handleJsonResponse(response);
        setUser(data);
        setError(null);
        return data;
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Login failed";
        setError(message);
        setUser(null);
        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: { email: string; password: string; full_name?: string }) => {
      setLoading(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        const data = await handleJsonResponse(response);
        setUser(data);
        setError(null);
        return data;
      } catch (caughtError) {
        const message = caughtError instanceof Error ? caughtError.message : "Registration failed";
        setError(message);
        setUser(null);
        throw caughtError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
      setError(null);
      setLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, register, logout, refresh }),
    [user, loading, error, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
