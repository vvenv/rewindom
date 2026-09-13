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
