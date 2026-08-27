#!/usr/bin/env python3
"""Unit tests for acme-helper listen bind + iptables restriction."""
from __future__ import annotations

import importlib.util
import subprocess
import unittest
from pathlib import Path
from typing import Any

SPEC = importlib.util.spec_from_file_location(
    "acme_helper",
    Path(__file__).with_name("acme-helper.py"),
)
assert SPEC is not None and SPEC.loader is not None
helper = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(helper)


def _ok() -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(args=[], returncode=0, stdout="", stderr="")


def _fail() -> subprocess.CompletedProcess[str]:
    return subprocess.CompletedProcess(args=[], returncode=1, stdout="", stderr="err")


class ResolveListenHostTest(unittest.TestCase):
    def test_default_is_all_interfaces(self) -> None:
        self.assertEqual(helper.resolve_listen_host(None), "0.0.0.0")
        self.assertEqual(helper.resolve_listen_host(""), "0.0.0.0")
        self.assertEqual(helper.resolve_listen_host("  "), "0.0.0.0")

    def test_loopback_allowed(self) -> None:
        self.assertEqual(helper.resolve_listen_host("127.0.0.1"), "127.0.0.1")

    def test_rejects_other_hosts(self) -> None:
        with self.assertRaises(ValueError):
            helper.resolve_listen_host("172.17.0.1")
        with self.assertRaises(ValueError):
            helper.resolve_listen_host("::")


class RestrictPortTest(unittest.TestCase):
    def test_creates_chain_and_input_jump(self) -> None:
        calls: list[list[str]] = []

        def run(argv: list[str]) -> subprocess.CompletedProcess[str]:
            calls.append(argv)
            if argv[:2] == ["iptables", "-nL"]:
                return _fail()
            if argv[:2] == ["iptables", "-C"]:
                return _fail()
            return _ok()

        self.assertTrue(helper.restrict_tcp_port_to_private_networks(9370, run=run))
        self.assertEqual(calls[0], ["iptables", "-nL", "REWINDOM_ACME"])
        self.assertEqual(calls[1], ["iptables", "-N", "REWINDOM_ACME"])
        self.assertEqual(calls[2], ["iptables", "-F", "REWINDOM_ACME"])
        accepts = [c for c in calls if c[:2] == ["iptables", "-A"] and "ACCEPT" in c]
        self.assertEqual(len(accepts), 4)
        self.assertIn(
            ["iptables", "-I", "INPUT", "-p", "tcp", "--dport", "9370", "-j", "REWINDOM_ACME"],
            calls,
        )

    def test_skips_insert_when_jump_exists(self) -> None:
        calls: list[list[str]] = []

        def run(argv: list[str]) -> subprocess.CompletedProcess[str]:
            calls.append(argv)
            return _ok()

        self.assertTrue(helper.restrict_tcp_port_to_private_networks(9370, run=run))
        inserts = [c for c in calls if c[:2] == ["iptables", "-I"]]
        self.assertEqual(inserts, [])

    def test_missing_iptables_returns_false(self) -> None:
        def run(_argv: list[str]) -> subprocess.CompletedProcess[str]:
            raise FileNotFoundError("iptables")

        self.assertFalse(helper.restrict_tcp_port_to_private_networks(9370, run=run))

    def test_create_chain_failure_returns_false(self) -> None:
        def run(argv: list[str]) -> subprocess.CompletedProcess[str]:
            if argv[:2] == ["iptables", "-nL"]:
                return _fail()
            if argv[:2] == ["iptables", "-N"]:
                return _fail()
            return _ok()

        self.assertFalse(helper.restrict_tcp_port_to_private_networks(9370, run=run))


if __name__ == "__main__":
    unittest.main()
