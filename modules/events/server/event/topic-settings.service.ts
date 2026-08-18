/**
 * 本站公开面启用哪些主题。
 *
 * 分类法是产品七格，不是租户自建树。这里只存子集，缺行 = 全开。
 */

import {
  prisma,
  ValidationError,
  withTenantScope,
} from "@rewindom/module-sdk/server";

import {
  ENABLED_TOPICS_SETTING,
  parseEnabledTopicsInput,
  resolveEnabledTopics,
  type EventTopic,
  type EventTopicSettings,
} from "../../shared/index.js";

export async function getEnabledTopics(tenantId: string): Promise<EventTopic[]> {
  const row = await prisma.tenantSetting.findFirst({
    where: withTenantScope(tenantId, { key: ENABLED_TOPICS_SETTING }),
    select: { value: true },
  });
  return resolveEnabledTopics(row?.value);
}

export async function getEnabledTopicSettings(
  tenantId: string,
): Promise<EventTopicSettings> {
  return { enabled_topics: await getEnabledTopics(tenantId) };
}

export async function updateEnabledTopics(
  tenantId: string,
  input: unknown,
): Promise<EventTopicSettings> {
  const enabled = parseEnabledTopicsInput(
    input && typeof input === "object" && "enabled_topics" in input
      ? (input as { enabled_topics: unknown }).enabled_topics
      : input,
  );
  if (!enabled) {
    throw new ValidationError("events.topics_required");
  }

  await prisma.tenantSetting.upsert({
    where: {
      tenant_id_key: { tenant_id: tenantId, key: ENABLED_TOPICS_SETTING },
    },
    create: {
      tenant_id: tenantId,
      key: ENABLED_TOPICS_SETTING,
      value: enabled,
    },
    update: { value: enabled },
  });

  return { enabled_topics: enabled };
}
