#!/usr/bin/env python3
"""Unit tests for the ip-access rate-limit report."""
from __future__ import annotations

import importlib.util
import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path

SPEC = importlib.util.spec_from_file_location(
    "ip_access_report", Path(__file__).with_name("ip-access-report.py")
)
assert SPEC and SPEC.loader
report = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(report)


def log_line(**fields: object) -> str:
    return json.dumps({"level": 40, **fields})


class ParseEventsTest(unittest.TestCase):
    def test_splits_rate_limit_and_shadow_rule_hits(self) -> None:
        lines = [
            log_line(msg="[ip-access] 限流命中：切 enforce 后此请求会被拦", ip="1.2.3.4", tier="auth", path="/api/auth/login"),
            log_line(msg="[ip-access] log_only 命中：切 enforce 后此请求会被拦", ip="5.6.7.8", cidr="5.6.7.0/24"),
            log_line(msg="[ip-access] 限流已拦截", ip="1.2.3.4", tier="auth", enforcing=True),
        ]
        rate, shadow = report.parse_events(lines)

        self.assertEqual(len(rate), 2)
        self.assertEqual(len(shadow), 1)

    def test_ignores_non_json_and_unrelated_lines(self) -> None:
        lines = [
            "[entrypoint] 执行 prisma migrate deploy...",
            "not json at all",
            log_line(msg="[slow-query] 慢查询", ip="9.9.9.9"),
            "",
        ]
        rate, shadow = report.parse_events(lines)

        self.assertEqual(rate, [])
        self.assertEqual(shadow, [])

    def test_tolerates_docker_timestamp_prefix(self) -> None:
        prefixed = "2026-09-09T01:02:03.000Z " + log_line(
            msg="[ip-access] 限流命中", ip="1.1.1.1", tier="public"
        )
        rate, _ = report.parse_events([prefixed])

        self.assertEqual(len(rate), 1)
        self.assertEqual(rate[0]["ip"], "1.1.1.1")


class SummariseTest(unittest.TestCase):
    def test_counts_by_key_most_common_first(self) -> None:
        events = [{"ip": "a"}, {"ip": "b"}, {"ip": "a"}]

        self.assertEqual(report.summarise(events, "ip"), [("a", 2), ("b", 1)])

    def test_groups_distinct_ips_per_tier(self) -> None:
        events = [
            {"tier": "auth", "ip": "a"},
            {"tier": "auth", "ip": "a"},
            {"tier": "auth", "ip": "b"},
            {"tier": "public", "ip": "c"},
        ]
        grouped = report.ips_per_tier(events)

        self.assertEqual(len(grouped["auth"]), 2)
        self.assertEqual(len(grouped["public"]), 1)


class RenderTest(unittest.TestCase):
    def test_empty_report_says_nothing_would_be_blocked(self) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            report.render([], [], "168h")

        self.assertIn("没有任何请求会被拦", buffer.getvalue())

    def test_report_names_the_switch_to_flip(self) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            report.render([{"ip": "1.2.3.4", "tier": "auth", "path": "/api/auth/login"}], [], "24h")

        output = buffer.getvalue()
        self.assertIn("IP_ACCESS_RATE_LIMIT_MODE=enforce", output)
        self.assertIn("IP_ACCESS_ALWAYS_ALLOW", output)


class ContainerNameTest(unittest.TestCase):
    def test_test_environment_uses_prefixed_container(self) -> None:
        self.assertEqual(report.container_for_env("test"), "rewindom-test-app")
        self.assertEqual(report.container_for_env("production"), "rewindom-app")


if __name__ == "__main__":
    unittest.main()
