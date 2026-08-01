const OAUTH_ERROR_I18N_KEYS: Record<string, string> = {
  "auth.oauth_denied": "auth.oauth.denied",
  "auth.oauth_not_configured": "auth.oauth.notConfigured",
  "auth.oauth_state_invalid": "auth.oauth.stateInvalid",
  "auth.oauth_exchange_failed": "auth.oauth.exchangeFailed",
  "auth.oauth_profile_failed": "auth.oauth.profileFailed",
  "auth.oauth_registration_disabled": "auth.oauth.registrationDisabled",
  "auth.oauth_already_linked": "auth.oauth.alreadyLinked",
  "auth.oauth_failed": "auth.oauth.failed",
  "tenant.registration_disabled": "auth.oauth.registrationDisabled",
};

export function resolveOAuthErrorI18nKey(errorCode: string): string {
  return OAUTH_ERROR_I18N_KEYS[errorCode] ?? "auth.oauth.failed";
}

export function parseOAuthHashTokens(hash: string): {
  accessToken: string;
  refreshToken: string;
} | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}
