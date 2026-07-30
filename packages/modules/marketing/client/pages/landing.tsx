import { Logo } from "@be-water/client-kit";
import { Button } from "@be-water/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { BUILTIN_MODULES, HERO, SITE, TECH_STACK } from "../../shared/index.js";
import { FeatureGrid } from "../components/FeatureGrid.js";
import {
  MarketingLayout,
  MarketingSection,
} from "../components/MarketingLayout.js";
import { DOC_PAGES } from "../lib/docs.js";

function Hero() {
  return (
    <MarketingSection className="relative overflow-hidden pt-16 pb-20 sm:pt-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -bottom-32 -z-10 hidden lg:block"
      >
        <Logo className="size-[26rem] text-foreground/[0.03]" />
      </div>

      <p className="text-sm font-medium tracking-wide text-primary">
        {SITE.tagline}
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl sm:leading-[1.1]">
        {HERO.headline}
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
        {HERO.subline}
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="h-11 px-5 text-base">
          <Link to={HERO.primaryCta.href}>
            {HERO.primaryCta.label}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-11 px-5 text-base"
        >
          <Link to={HERO.secondaryCta.href}>{HERO.secondaryCta.label}</Link>
        </Button>
      </div>

      <dl className="mt-14 grid max-w-2xl gap-6 sm:grid-cols-3">
        {[
          {
            term: "基础设施模块",
            detail: `${BUILTIN_MODULES.length} 个开箱可用`,
          },
          { term: "部署形态", detail: "单进程 · Docker Compose" },
          { term: "租户隔离", detail: "Prisma 层 fail-closed" },
        ].map((item) => (
          <div key={item.term}>
            <dt className="text-xs tracking-wide text-muted-foreground uppercase">
              {item.term}
            </dt>
            <dd className="mt-1 text-sm font-medium">{item.detail}</dd>
          </div>
        ))}
      </dl>
    </MarketingSection>
  );
}

function BuiltinModules() {
  return (
    <MarketingSection className="py-20">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        基础设施开箱即用
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        认证、租户、权限、审计、通知、任务、可观测性——这些每个 SaaS
        都要重写一遍的东西， 底座已经写好了，而且都是可开关的模块而非硬编码。
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BUILTIN_MODULES.map((module) => (
          <li
            key={module.name}
            className="rounded-xl border border-border/60 bg-background p-4"
          >
            <code className="text-sm font-medium text-primary">
              {module.name}
            </code>
            <p className="mt-1 text-sm text-muted-foreground">
              {module.description}
            </p>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

function TechStack() {
  return (
    <MarketingSection className="py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            技术栈没有惊喜
          </h2>
          <p className="mt-3 text-muted-foreground">
            全是主流且长期维护的选择：招人好招，出问题搜得到答案，升级路径清晰。
            底座的价值在边界与约束，不在堆新框架。
          </p>
          <Button asChild variant="outline" className="mt-6 h-10 px-4">
            <Link to="/docs">
              读文档
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60">
          {TECH_STACK.map((row) => (
            <div
              key={row.layer}
              className="grid grid-cols-[5rem_1fr] gap-4 bg-background px-5 py-4 text-sm"
            >
              <dt className="text-muted-foreground">{row.layer}</dt>
              <dd className="font-medium">{row.items}</dd>
            </div>
          ))}
        </dl>
      </div>
    </MarketingSection>
  );
}

function DocsTeaser() {
  return (
    <MarketingSection className="py-20">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        从这里开始
      </h2>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {DOC_PAGES.map((page) => (
          <li key={page.slug}>
            <Link
              to={page.path}
              className="group block h-full rounded-xl border border-border/60 bg-background p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span className="flex items-center gap-1.5 font-medium">
                {page.title}
                <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-70" />
              </span>
              <span className="mt-1.5 block text-sm text-muted-foreground">
                {page.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </MarketingSection>
  );
}

function ClosingCta() {
  return (
    <MarketingSection className="pt-4 pb-24">
      <div className="rounded-2xl border border-border/60 bg-muted/30 px-6 py-12 text-center sm:px-12">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          先把底座跑起来，再谈业务
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          本地 5 分钟起服务，生产一条命令部署。免费版可以一直用下去。
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-11 px-5 text-base">
            <Link to="/register">免费开始</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-11 px-5 text-base"
          >
            <Link to="/pricing">看定价</Link>
          </Button>
        </div>
      </div>
    </MarketingSection>
  );
}

export function Landing() {
  return (
    <MarketingLayout path="/">
      <Hero />
      <MarketingSection className="pb-4">
        <FeatureGrid />
      </MarketingSection>
      <BuiltinModules />
      <TechStack />
      <DocsTeaser />
      <ClosingCta />
    </MarketingLayout>
  );
}
