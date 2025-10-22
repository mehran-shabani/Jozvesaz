"use client";

import { useAuth } from "@/hooks/use-auth";

export function useCurrentUser() {
  const { user, loading, error } = useAuth();
  return { user, loading, error };
}
