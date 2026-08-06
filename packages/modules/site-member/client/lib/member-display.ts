import type { SiteMemberProfile } from "../../shared/site-member.js";

type PartialMember = Pick<SiteMemberProfile, "display_name" | "email">;

/**
 * 页头显示哪一串。
 *
 * 昵称是选填的（注册时可以不填），空着就退回邮箱——页头上必须有个能认出「这是我」
 * 的字样，宁可显示邮箱也不能是一个空按钮。
 */
export function memberDisplayName(member: PartialMember | null): string {
  const name = member?.display_name?.trim();
  if (name) return name;
  return member?.email?.trim() ?? "";
}

/**
 * 头像里的缩写。
 *
 * 拉丁名取各词首字母（`Zhang San` → `ZS`）；中日韩姓名没有空格，整段取前两字
 * （`张三丰` → `张三`）。都没有则退回邮箱首字母。
 */
export function memberInitials(member: PartialMember | null): string {
  const source = memberDisplayName(member);
  if (!source) return "";

  const words = source.split(/\s+/u).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((word) => [...word][0] ?? "")
      .join("")
      .toUpperCase();
  }

  // `[...]` 而不是 slice：按码点切，免得把 emoji / 星平面字符劈成半个
  return [...(words[0] ?? "")]
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
