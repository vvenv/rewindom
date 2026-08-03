import { BrandMark, Wordmark, usePublicConfig } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

export function RegisterDisabledView() {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const {
    data: { bound_tenant },
  } = usePublicConfig();
  const logoUrl = bound_tenant?.logo_url ?? null;
  const brandName = bound_tenant?.name ?? "be-water";

  return (
    <div className="auth-glass-card relative overflow-hidden rounded-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent dark:via-primary/50"
      />

      <div className="relative p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <BrandMark
            src={logoUrl}
            alt={brandName}
            className="auth-logo-glow h-14 w-14 text-primary"
          />
          <div className="flex flex-col items-center gap-2">
            {logoUrl ? (
              <span className="auth-logo-glow text-lg font-semibold text-foreground">
                {brandName}
              </span>
            ) : (
              <Wordmark className="auth-logo-glow h-6 text-foreground" />
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {t("auth.registerDisabledTitle")}
            </p>
          </div>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground">
            {t("auth.registerDisabledDescription")}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/login")}
          >
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function RegisterLoginLink() {
  const { t } = useTranslation("shell");

  return (
    <p className="mt-8 text-center text-sm text-muted-foreground">
      {t("auth.hasAccount")}{" "}
      <Link to="/login" className="text-primary hover:underline">
        {t("auth.loginNow")}
      </Link>
    </p>
  );
}
