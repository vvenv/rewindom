import { describe, expect, it } from "vitest";

import {
  incidentDurationMinutes,
  incidentResolved,
  parseIncidentUpdates,
} from "./incident-updates.js";

const PUBLISHED = new Date("2026-08-18T11:42:00Z");

/*
 * 真实语料，逐字取自 githubstatus.com/history.rss（2026-08-19 抓取）。
 * 注意 `Aug 18 , 11:42` 里逗号前那个空格——那是源真实的排版，
 * 正则里那处宽松不是为了好看，是被这条打回来的。
 */
const GITHUB_REAL = [
  "Aug 18 , 11:42 UTC Resolved - This incident has been resolved. Thank you for your",
  "patience and understanding as we addressed this issue. A detailed root cause analysis",
  "will be shared as soon as it is available. Aug 18 , 11:24 UTC Update - We have applied",
  "a mitigation and are seeing recovery signals. We will continue monitoring recovery and",
  "providing updates. Aug 18 , 10:41 UTC Update - We have identified the source of a",
  "communication issue between Actions services and are working toward mitigation.",
  "Aug 18 , 07:40 UTC Monitoring - We are investigating reports of failure to load runner",
  "groups.",
].join(" ");

describe("parseIncidentUpdates", () => {
  it("把一条 incident 的正文拆成升序的更新序列", () => {
    const updates = parseIncidentUpdates(GITHUB_REAL, PUBLISHED);

    expect(updates.map((u) => u.phase)).toEqual([
      "Monitoring",
      "Update",
      "Update",
      "Resolved",
    ]);
    // 源是倒序输出的，解析后必须转成升序——时间线其余部分都是升序
    expect(updates[0].occurred_at).toBe("2026-08-18T07:40:00.000Z");
    expect(updates[3].occurred_at).toBe("2026-08-18T11:42:00.000Z");
    expect(updates[0].text).toContain("investigating reports of failure");
  });

  /*
   * 这是这个功能存在的理由：一条 incident 现在只占时间线的一格，
   * 而这一格里其实有四次带时刻的一手更新。
   */
  it("四格更新是从一条信号里来的，不是四条信号", () => {
    expect(parseIncidentUpdates(GITHUB_REAL, PUBLISHED)).toHaveLength(4);
  });

  it("阶段词是硬要求——只有时间戳的正文一律不当更新", () => {
    expect(
      parseIncidentUpdates(
        "Aug 18 , 11:42 UTC - The service was slow for a while.",
        PUBLISHED,
      ),
    ).toEqual([]);
  });

  it("普通文章正文匹配不上，整条弃权", () => {
    expect(
      parseIncidentUpdates(
        "Stripe will acquire OpenRouter for $7B, the companies said on Tuesday.",
        PUBLISHED,
      ),
    ).toEqual([]);
  });

  it("空正文不炸", () => {
    expect(parseIncidentUpdates("", PUBLISHED)).toEqual([]);
    expect(parseIncidentUpdates("   ", PUBLISHED)).toEqual([]);
  });

  /*
   * 正文里的时间戳不写年。按条目发布年硬填，跨年的 incident（12/31 开始、
   * 1/1 结束）里 12 月那几格会落到未来 11 个月——比事件本身还晚。
   */
  it("跨年时按发布时间校正年份，不产出未来的时刻", () => {
    const updates = parseIncidentUpdates(
      "Jan 01 , 00:20 UTC Resolved - Recovered. Dec 31 , 23:50 UTC Investigating - Errors.",
      new Date("2027-01-01T00:20:00Z"),
    );
    expect(updates.map((u) => u.occurred_at)).toEqual([
      "2026-12-31T23:50:00.000Z",
      "2027-01-01T00:20:00.000Z",
    ]);
  });

  it("正文自带年份时以正文为准", () => {
    const updates = parseIncidentUpdates(
      "Mar 02 , 2025 , 08:00 UTC Resolved - Done.",
      PUBLISHED,
    );
    expect(updates[0].occurred_at).toBe("2025-03-02T08:00:00.000Z");
  });
});

describe("incidentDurationMinutes / incidentResolved", () => {
  it("首末相减", () => {
    expect(incidentDurationMinutes(parseIncidentUpdates(GITHUB_REAL, PUBLISHED))).toBe(
      242,
    );
  });

  /*
   * 只有一格时是「说不出来」，不是「零分钟」——与 has_velocity_baseline
   * 那条完全同理：界面必须能区分这两者。
   */
  it("只有一格时给 null 而不是 0", () => {
    const one = parseIncidentUpdates(
      "Aug 18 , 11:42 UTC Resolved - All good.",
      PUBLISHED,
    );
    expect(one).toHaveLength(1);
    expect(incidentDurationMinutes(one)).toBeNull();
    expect(incidentResolved(one)).toBe(true);
  });

  it("没有更新序列时 resolved 是 null 而不是 false", () => {
    expect(incidentResolved([])).toBeNull();
  });

  it("最后一格不是收尾阶段就是进行中", () => {
    const ongoing = parseIncidentUpdates(
      "Aug 18 , 11:00 UTC Monitoring - Watching. Aug 18 , 10:00 UTC Investigating - Errors.",
      PUBLISHED,
    );
    expect(incidentResolved(ongoing)).toBe(false);
  });
});
