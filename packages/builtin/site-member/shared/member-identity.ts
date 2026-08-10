/**
 * 「这个会员叫什么、头像里写哪两个字」——一份实现，三处渲染共用。
 *
 * 页头的账户菜单（SSR 与 site-enhance）和账户页的身份条画的是同一个人，名字的取法
 * 却各写一遍的话，会出现「菜单里显示邮箱、页面里显示昵称」这种同页不一致。
 */

export interface MemberIdentity {
  display_name?: string | null;
  email: string;
}

/** 昵称优先；没填过昵称的会员用邮箱顶上——总得有个称呼。 */
export function memberDisplayName(member: MemberIdentity): string {
  const name = member.display_name?.trim();
  if (name) return name;
  return member.email.trim();
}

/**
 * 头像里的字。
 *
 * 两个词取首字母（`Ada Lovelace` → `AL`），一个词取前两个字符（`李文` → `李文`）。
 * 按码点切而不是 `slice(0, 2)`：emoji 和多数汉字之外的字符会被截成半个。
 */
export function memberInitials(member: MemberIdentity): string {
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
  return [...(words[0] ?? "")].slice(0, 2).join("");
}
