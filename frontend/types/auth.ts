export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
}

export interface AuthResponse {
  detail?: string;
  message?: string;
}
