import { Logo, Wordmark } from "@be-water/client-kit";
import { APP_TAGLINE } from "@be-water/shared";
import { Blocks, Building2, Layers, ShieldCheck } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    title: "多租户隔离",
    description: "租户数据严格隔离，权限与配置独立管理",
  },
  {
    icon: Blocks,
    title: "模块化扩展",
    description: "按业务域拆分模块，按需启用与组合",
  },
  {
    icon: ShieldCheck,
    title: "审计可追溯",
    description: "操作全程记录，满足企业安全与运维要求",
  },
] as const;

export function AuthLoginHero({ variant }: { variant: "desktop" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="auth-logo-glow h-12 w-12 text-primary" />
        <div className="flex flex-col items-center gap-1.5">
          <Wordmark className="auth-logo-glow h-5 text-foreground" />
          {/* 不加 uppercase：中文不受影响，只会把 "SaaS" 压成 "SAAS" */}
          <p className="text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground">
            {APP_TAGLINE}
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
            模块化 Monolith 底座
          </span>
          <h1 className="bg-linear-to-br from-white via-white to-primary/80 bg-clip-text text-4xl leading-[1.15] font-semibold tracking-tight text-balance text-transparent xl:text-[2.75rem]">
            水无定形
            <br />
            遇器成形
          </h1>
          <p className="max-w-sm text-[0.9375rem] leading-relaxed text-white/65">
            认证、租户、权限、审计沉淀为底座，业务模块按需注入——让平台随业务成形，而不是业务迁就平台。
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex items-start gap-4 rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/8"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-white/10">
                <feature.icon className="size-5" aria-hidden />
              </div>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <span className="text-sm font-medium text-white">
                  {feature.title}
                </span>
                <span className="text-[0.8125rem] leading-relaxed text-white/55">
                  {feature.description}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/45">
        <ShieldCheck className="size-3.5" />
        企业级安全 · 开箱即用
      </div>
    </div>
  );
}
