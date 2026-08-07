import { Button } from "@be-water/ui/button";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.15 3.58-8.64Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3a7.2 7.2 0 0 1-10.78-3.79H1.3v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.58.38-2.3V6.61H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.39l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.14 15.24 0 12 0A12 12 0 0 0 1.3 6.61l3.99 3.09A7.17 7.17 0 0 1 12 4.75Z"
      />
    </svg>
  );
}

function MicrosoftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path fill="#F25022" d="M1 1h10v10H1z" />
      <path fill="#7FBA00" d="M13 1h10v10H13z" />
      <path fill="#00A4EF" d="M1 13h10v10H1z" />
      <path fill="#FFB900" d="M13 13h10v10H13z" />
    </svg>
  );
}

function oauthStartHref(
  provider: "github" | "google" | "microsoft",
  redirect: string | null,
): string {
  const url = new URL(
    `/api/member/oauth/${provider}`,
    window.location.origin,
  );
  if (redirect) {
    url.searchParams.set("redirect", redirect);
  }
  return url.pathname + url.search;
}

export function MemberOAuthButtons({
  githubEnabled,
  googleEnabled,
  microsoftEnabled,
  disabled = false,
}: {
  githubEnabled: boolean;
  googleEnabled: boolean;
  microsoftEnabled: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation("site-member");
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const enabled = githubEnabled || googleEnabled || microsoftEnabled;
  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>{t("oauth.or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {githubEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            window.location.href = oauthStartHref("github", redirect);
          }}
        >
          <GitHubMark className="size-4" />
          {t("oauth.continueWithGitHub")}
        </Button>
      ) : null}
      {googleEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            window.location.href = oauthStartHref("google", redirect);
          }}
        >
          <GoogleMark className="size-4" />
          {t("oauth.continueWithGoogle")}
        </Button>
      ) : null}
      {microsoftEnabled ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={disabled}
          onClick={() => {
            window.location.href = oauthStartHref("microsoft", redirect);
          }}
        >
          <MicrosoftMark className="size-4" />
          {t("oauth.continueWithMicrosoft")}
        </Button>
      ) : null}
    </div>
  );
}
