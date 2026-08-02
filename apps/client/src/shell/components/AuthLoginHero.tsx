import { Logo, Wordmark, usePublicConfig } from "@be-water/client-kit";
import { Layers, Building2, Blocks, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURE_KEYS = [
  { id: "tenancy", icon: Building2 },
  { id: "modules", icon: Blocks },
  { id: "audit", icon: ShieldCheck },
] as const;

export function AuthLoginHero({ variant }: { variant: "desktop" | "compact" }) {
  const { t } = useTranslation("shell");
  const {
    data: { single_tenant },
  } = usePublicConfig();
  const taglineKey = single_tenant
    ? "auth.taglineSingleTenant"
    : "auth.tagline";
  const tenancyFeatureKey = single_tenant
    ? "auth.heroFeatures.isolation"
    : "auth.heroFeatures.tenancy";

  if (variant === "compact") {
    return (
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="auth-logo-glow h-12 w-12 text-primary" />
        <div className="flex flex-col items-center gap-1.5">
          <Wordmark className="auth-logo-glow h-5 text-foreground" />
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {t(taglineKey)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-1 flex-col justify-between gap-12 text-white">
      <div className="flex items-center gap-3">
        <Logo className="size-12 text-primary auth-logo-glow" />
        <Wordmark className="h-6 w-auto text-white" />
      </div>

      <div className="flex max-w-md flex-col gap-8">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
            <Layers className="size-3.5 text-primary" />
            {t("auth.heroBadge")}
          </span>
          <h1 className="bg-linear-to-br from-white via-white to-primary/80 bg-clip-text text-4xl leading-tight font-semibold tracking-tight text-balance text-transparent xl:text-5xl">
            {t("auth.heroTitleLine1")}
            <br />
            {t("auth.heroTitleLine2")}
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            {t("auth.heroSubtitle")}
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {FEATURE_KEYS.map((feature) => {
            const featureKey =
              feature.id === "tenancy"
                ? tenancyFeatureKey
                : `auth.heroFeatures.${feature.id}`;
            return (
              <li
                key={feature.id}
                className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/8"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-white/10">
                  <feature.icon className="size-5" aria-hidden />
                </div>
                <div className="flex flex-col gap-0.5 pt-0.5">
                  <span className="text-sm font-medium text-white">
                    {t(`${featureKey}.title`)}
                  </span>
                  <span className="text-sm leading-relaxed text-white/55">
                    {t(`${featureKey}.description`)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
