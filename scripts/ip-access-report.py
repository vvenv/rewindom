#!/usr/bin/env python3
"""Summarise ip-access rate-limit hits so `enforce` becomes a data-backed call.

Rate limiting ships as `log_only`: every request that *would* have been blocked
is logged instead of rejected. That is the right default — a wrong threshold
locks out real users, which is worse than the abuse it prevents — but it only
pays off if somebody reads the logs before flipping the switch.

This reads the app container's logs (pino JSON) and answers the one question
that matters: **who would have been blocked, and does that look like abuse or
like your own users?**

Usage:
    ./scripts/ip-access-report.py                     # 最近 7 天，production
    ./scripts/ip-access-report.py --since 24h
    ./scripts/ip-access-report.py --env test
    docker logs rewindom-app 2>&1 | ./scripts/ip-access-report.py --stdin
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from collections import Counter, defaultdict
from typing import Any, Iterable

# 两种模式下文案不同：log_only 记「限流命中」，enforce 记「限流已拦截」。
# 只匹配前者的话，真切到 enforce 之后这份报告就全是空的——而那时候你更需要它。
RATE_LIMIT_MARKER = "限流"
SHADOW_RULE_MARKER = "log_only 命中"


def container_for_env(env: str) -> str:
    """Container names carry an environment prefix (see docker-compose.prod.yml)."""
    return "rewindom-test-app" if env == "test" else "rewindom-app"


def read_docker_logs(container: str, since: str) -> Iterable[str]:
    proc = subprocess.run(
        ["docker", "logs", "--since", since, container],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(
            f"读取容器日志失败（{container}）：{proc.stderr.strip() or proc.returncode}"
        )
    # pino 写 stdout，docker 把两条流都收着；两边都扫
    return (proc.stdout + proc.stderr).splitlines()


def parse_events(lines: Iterable[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Split log lines into (rate-limit hits, shadow-rule hits).

    Non-JSON lines are ignored rather than fatal: docker interleaves plain-text
    output from the entrypoint with the app's JSON lines.
    """
    rate_hits: list[dict[str, Any]] = []
    shadow_hits: list[dict[str, Any]] = []
    for line in lines:
        line = line.strip()
        if not line or "ip-access" not in line:
            continue
        start = line.find("{")
        if start < 0:
            continue
        try:
            event = json.loads(line[start:])
        except json.JSONDecodeError:
            continue
        message = str(event.get("msg", ""))
        # 规则命中要先判：它的文案里不含「限流」，但顺序写反了会把两类混在一起
        if SHADOW_RULE_MARKER in message:
            shadow_hits.append(event)
        elif RATE_LIMIT_MARKER in message:
            rate_hits.append(event)
    return rate_hits, shadow_hits


def summarise(events: list[dict[str, Any]], key: str) -> list[tuple[str, int]]:
    counter: Counter[str] = Counter()
    for event in events:
        value = event.get(key)
        if value is not None:
            counter[str(value)] += 1
    return counter.most_common()


def ips_per_tier(events: list[dict[str, Any]]) -> dict[str, set[str]]:
    grouped: dict[str, set[str]] = defaultdict(set)
    for event in events:
        tier = str(event.get("tier", "?"))
        ip = event.get("ip")
        if ip is not None:
            grouped[tier].add(str(ip))
    return grouped


def _print_table(title: str, rows: list[tuple[str, int]], limit: int = 10) -> None:
    print(f"\n{title}")
    if not rows:
        print("  （无）")
        return
    width = max(len(name) for name, _ in rows[:limit])
    for name, count in rows[:limit]:
        print(f"  {name.ljust(width)}  {count}")
    if len(rows) > limit:
        print(f"  …… 另有 {len(rows) - limit} 项")


def render(rate_hits: list[dict[str, Any]], shadow_hits: list[dict[str, Any]], since: str) -> None:
    print(f"=== ip-access 报告（最近 {since}）===")
    print(f"限流命中: {len(rate_hits)} 次   规则命中(log_only): {len(shadow_hits)} 次")

    if rate_hits:
        already_enforcing = sum(1 for e in rate_hits if e.get("enforcing") is True)
        if already_enforcing:
            print(f"其中 {already_enforcing} 次是**已经拦下**的（当前是 enforce 模式）")

        _print_table("按来源 IP（命中次数）", summarise(rate_hits, "ip"))
        _print_table("按路径", summarise(rate_hits, "path"))

        print("\n按档位（会被拦的独立 IP 数）")
        for tier, ips in sorted(ips_per_tier(rate_hits).items()):
            print(f"  {tier.ljust(8)}  {len(ips)} 个 IP")

    if shadow_hits:
        _print_table("规则命中（切 enforce 后会被封的 IP）", summarise(shadow_hits, "ip"))

    print("\n--- 怎么读 ---")
    if not rate_hits and not shadow_hits:
        print("  这段时间没有任何请求会被拦。要么阈值太宽，要么确实没人打你。")
        print("  前者更常见：可以先把 auth 档调紧一档再观察。")
    else:
        distinct_ips = len({str(e.get("ip")) for e in rate_hits if e.get("ip")})
        print(f"  会被影响的独立 IP：{distinct_ips} 个。")
        print("  若这些 IP 集中在少数几个、且路径集中在 /api/auth/*，那是爆破，可以切 enforce。")
        print("  若分散在很多 IP、路径也很杂，先确认里面没有你自己的办公出口或监控。")
        print("  切换：IP_ACCESS_RATE_LIMIT_MODE=enforce（改 env 后 pnpm deploy 或 Ops → sync-env）")
        print("  兜底：IP_ACCESS_ALWAYS_ALLOW 里放上办公出口与监控地址，压过一切封禁。")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="ip-access 限流命中报告")
    parser.add_argument("--env", default="production", choices=["production", "test"])
    parser.add_argument("--since", default="168h", help="docker logs --since，默认 168h（7 天）")
    parser.add_argument("--container", default=None, help="覆盖容器名")
    parser.add_argument("--stdin", action="store_true", help="从标准输入读日志")
    args = parser.parse_args(argv)

    if args.stdin:
        lines: Iterable[str] = sys.stdin.read().splitlines()
    else:
        container = args.container or container_for_env(args.env)
        lines = read_docker_logs(container, args.since)

    rate_hits, shadow_hits = parse_events(lines)
    render(rate_hits, shadow_hits, args.since)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
