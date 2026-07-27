import type { AuthTokens, User } from "@be-water/shared";

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type { AuthTokens, User };
