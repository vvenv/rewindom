/* eslint-disable no-console */
/**
 * 用 Stripe CLI 取出本地 listen 的 webhook signing secret，写入默认站点的
 * shop_stripe_provider（不覆盖已有 secret_key / publishable_key）。
 *
 *   pnpm --filter server exec tsx scripts/set-shop-stripe-webhook.ts
 *   pnpm --filter server exec tsx scripts/set-shop-stripe-webhook.ts --listen
 *
 * `--listen` 会在写入 secret 后前台转发到
 * http://localhost:3700/api/shop/webhooks/stripe。Dashboard 无法打 localhost，
 * 本地结账必须保持这条 listen。
 */
import { spawn } from "node:child_process";

import { prisma } from "@rewindom/server-kernel/lib/prisma.js";
import { DEFAULT_TENANT_ID } from "@rewindom/shared";

import {
  resolveShopStripeCredentials,
  updateShopProvider,
} from "../../../modules/shop/server/payment/credentials.js";

const FORWARD_TO = "http://localhost:3700/api/shop/webhooks/stripe";
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
].join(",");

function mask(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••";
  return `••••${trimmed.slice(-4)}`;
}

function runStripe(
  args: string[],
  apiKey: string,
  inheritStdio: boolean,
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("stripe", args, {
      env: { ...process.env, STRIPE_API_KEY: apiKey },
      stdio: inheritStdio ? "inherit" : ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function extractWebhookSecret(text: string): string | null {
  const match = text.match(/whsec_[A-Za-z0-9]+/);
  return match?.[0] ?? null;
}

async function printCliWebhookSecret(apiKey: string): Promise<string> {
  const { code, stdout, stderr } = await runStripe(
    ["listen", "--print-secret"],
    apiKey,
    false,
  );
  const secret = extractWebhookSecret(`${stdout}\n${stderr}`);
  if (!secret) {
    throw new Error(
      `stripe listen --print-secret failed (exit ${code ?? "null"})`,
    );
  }
  return secret;
}

async function saveWebhookSecret(): Promise<string> {
  const credentials = await resolveShopStripeCredentials(DEFAULT_TENANT_ID);
  if (!credentials?.secretKey) {
    throw new Error("default tenant has no Stripe secret key");
  }
  const webhookSecret = await printCliWebhookSecret(credentials.secretKey);
  const status = await updateShopProvider(DEFAULT_TENANT_ID, {
    webhook_secret: webhookSecret,
  });
  console.log(
    `[shop-stripe-webhook] saved webhook_secret=${mask(webhookSecret)} source=${status.source} set=${status.webhook_secret_set} url=${status.webhook_url}`,
  );
  return credentials.secretKey;
}

async function main(): Promise<void> {
  const listen = process.argv.includes("--listen");
  const apiKey = await saveWebhookSecret();
  if (!listen) return;
  console.log(
    `[shop-stripe-webhook] listening → ${FORWARD_TO} events=${EVENTS}`,
  );
  await prisma.$disconnect();
  const { code } = await runStripe(
    ["listen", "--forward-to", FORWARD_TO, "--events", EVENTS, "--skip-update"],
    apiKey,
    true,
  );
  process.exit(code ?? 1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    if (!process.argv.includes("--listen")) {
      await prisma.$disconnect();
    }
  });
