/**
 * 退信与投诉的处置：把发不到的地址停掉。
 *
 * 上游是 mailer 广播的领域事件（`mail.bounced` / `mail.complained`）——**不反向
 * import mailer**：跨限界上下文的写用 EventBus（决策表那一行），mailer 不认识
 * 「订阅者」这个概念，也不该替业务决定某个地址以后还发不发。
 *
 * 不做的代价是复利式的：死地址一直留在名单里，每一轮摘要都对着它发一次，
 * 退信率持续走高 → 发信域声誉下滑 → **活着的订阅者**也开始进垃圾箱。
 */
import { prisma, withTenantScope } from "@rewindom/module-sdk/server";

import type { SubscriberBounceType } from "../shared/index.js";

/**
 * 软退信要连续几次才停。
 *
 * 一次就停的话，对方邮箱满一天、或者他们的服务器抽风一次，我们就永久丢掉一个
 * 真实读者。反过来硬退信（地址不存在）没有「过几天会好」这回事，一次就够。
 */
const SOFT_BOUNCE_LIMIT = 3;

export type SuppressResult = "suppressed" | "counted" | "unknown";

/**
 * 处理一次退信。
 *
 * 找不到订阅者不是错误——这封信可能是 site-member 的验证信之类，跟订阅无关。
 */
export async function handleBounce(input: {
  tenant_id: string;
  email: string;
  bounce_type: SubscriberBounceType;
}): Promise<SuppressResult> {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: withTenantScope(input.tenant_id, { email: input.email }),
    select: { id: true, bounce_count: true, status: true },
  });
  if (!subscriber) return "unknown";

  const nextCount =
    input.bounce_type === "hard"
      ? SOFT_BOUNCE_LIMIT
      : subscriber.bounce_count + 1;
  const suppress =
    input.bounce_type === "hard" || nextCount >= SOFT_BOUNCE_LIMIT;

  await prisma.newsletterSubscriber.updateMany({
    where: withTenantScope(input.tenant_id, { id: subscriber.id }),
    data: {
      bounce_count: nextCount,
      last_bounce_type: input.bounce_type,
      last_bounce_at: new Date(),
      ...(suppress
        ? {
            status: "bounced",
            suppressed_reason:
              input.bounce_type === "hard"
                ? "newsletter.suppressed.hard_bounce"
                : "newsletter.suppressed.soft_bounce",
          }
        : {}),
    },
  });

  return suppress ? "suppressed" : "counted";
}

/**
 * 处理一次投诉。**立刻停发，没有累计。**
 *
 * 而且**绝不给他发任何「你被停发了」的通知信**——那是往一个刚举报过你的人再发一封，
 * 等着第二次举报。这里只改库，不触发任何发信。
 */
export async function handleComplaint(input: {
  tenant_id: string;
  email: string;
}): Promise<SuppressResult> {
  const result = await prisma.newsletterSubscriber.updateMany({
    where: withTenantScope(input.tenant_id, { email: input.email }),
    data: {
      status: "complained",
      suppressed_reason: "newsletter.suppressed.complaint",
      last_bounce_at: new Date(),
    },
  });
  return result.count > 0 ? "suppressed" : "unknown";
}

/**
 * 一次成功投递后清零软退信计数。
 *
 * 「连续 3 次」里的**连续**就靠这一步。不清零的话，一个订阅者三年里零散退信三次
 * 也会被停发，而他其实一直收得到。
 */
export async function clearBounceCount(input: {
  tenant_id: string;
  email: string;
}): Promise<void> {
  await prisma.newsletterSubscriber.updateMany({
    where: withTenantScope(input.tenant_id, {
      email: input.email,
      status: "confirmed",
      bounce_count: { gt: 0 },
    }),
    data: { bounce_count: 0, suppressed_reason: null },
  });
}

/**
 * 人工恢复停发。
 *
 * **只放行退信，不放行投诉**：把一个举报过你的人重新加回名单，法律与声誉上都是
 * 站长在给自己挖坑。投诉过的地址要恢复得手工改库——**故意做得比点一下麻烦**。
 */
export async function reactivateSubscriber(
  tenantId: string,
  subscriberId: string,
): Promise<"reactivated" | "not_found" | "complained"> {
  const subscriber = await prisma.newsletterSubscriber.findFirst({
    where: withTenantScope(tenantId, { id: subscriberId }),
    select: { id: true, status: true, confirmed_at: true },
  });
  if (!subscriber) return "not_found";
  if (subscriber.status === "complained") return "complained";

  await prisma.newsletterSubscriber.updateMany({
    where: withTenantScope(tenantId, { id: subscriberId }),
    data: {
      // 当初确认过就回 confirmed，没确认过的回 pending——恢复不该顺手替人完成双重确认
      status: subscriber.confirmed_at ? "confirmed" : "pending",
      bounce_count: 0,
      suppressed_reason: null,
    },
  });
  return "reactivated";
}
