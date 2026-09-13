import type {
  AppNavItem,
  AppNavSection,
  CommandAction,
} from "@rewindom/client-kit";

export const DEFAULT_COMMAND_ACTION_ORDER = 100;

/** 面板里的一行。`group` 是已翻译的分组标题，由调用方给出。 */
export interface CommandEntry {
  id: string;
  label: string;
  path: string;
  icon: AppNavItem["icon"];
  group: string;
  /** 参与匹配但不展示的补充文本（分组名、路径）。 */
  haystack: string;
}

/**
 * 把动作伪装成导航项，好让它走 `filterAppNavSections` 那一套可见性判定。
 *
 * 面板与侧栏的显隐必须同源：一旦两边各写一份，某个模块被平台关掉后，侧栏消失、
 * ⌘K 里却还搜得到，点进去撞 404 或 403。
 */
export function commandActionsAsNavSection(
  actions: readonly CommandAction[],
  label: string,
): AppNavSection {
  return {
    label,
    items: actions.map((action) => ({
      icon: action.icon,
      label: action.label,
      path: action.path,
      ...(action.tenantModule ? { tenantModule: action.tenantModule } : {}),
      ...(action.tenantFeature ? { tenantFeature: action.tenantFeature } : {}),
      ...(action.anyPermission ? { anyPermission: action.anyPermission } : {}),
    })),
  };
}

export function sortCommandActions(
  actions: readonly CommandAction[],
): CommandAction[] {
  return actions
    .slice()
    .sort(
      (left, right) =>
        (left.order ?? DEFAULT_COMMAND_ACTION_ORDER) -
        (right.order ?? DEFAULT_COMMAND_ACTION_ORDER),
    );
}

function toEntry(item: AppNavItem, group: string): CommandEntry {
  return {
    id: item.path,
    label: item.label,
    path: item.path,
    icon: item.icon,
    group,
    haystack: `${item.label} ${group} ${item.path}`.toLowerCase(),
  };
}

/**
 * 合并「导航项」与「动作」为面板候选。两者都必须是**已过滤、已翻译**的结果。
 *
 * 同一 path 只留先出现的那条：动作贡献方若误写了一条已在侧栏的路径，面板里
 * 不该出现两行一模一样的入口。
 */
export function buildCommandEntries(
  navSections: readonly AppNavSection[],
  actionItems: readonly AppNavItem[],
  actionGroupLabel: string,
): CommandEntry[] {
  const entries: CommandEntry[] = [];
  const seenPaths = new Set<string>();

  for (const section of navSections) {
    for (const item of section.items) {
      if (seenPaths.has(item.path)) {
        continue;
      }
      seenPaths.add(item.path);
      entries.push(toEntry(item, section.label));
    }
  }

  for (const item of actionItems) {
    if (seenPaths.has(item.path)) {
      continue;
    }
    seenPaths.add(item.path);
    entries.push(toEntry(item, actionGroupLabel));
  }

  return entries;
}

/**
 * 子串匹配，标签命中排在补充文本命中之前，其余保持传入顺序。
 *
 * 不做模糊/拼音：面板的候选量级是几十条，子串已经够用，而模糊匹配会把
 * 「删除」这类危险入口排到毫不相干的查询前面。
 */
export function matchCommandEntries(
  entries: readonly CommandEntry[],
  query: string,
): CommandEntry[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return entries.slice();
  }

  const labelHits: CommandEntry[] = [];
  const otherHits: CommandEntry[] = [];

  for (const entry of entries) {
    if (entry.label.toLowerCase().includes(needle)) {
      labelHits.push(entry);
    } else if (entry.haystack.includes(needle)) {
      otherHits.push(entry);
    }
  }

  return [...labelHits, ...otherHits];
}

/** 按分组聚合，保持 `entries` 里分组首次出现的次序。 */
export function groupCommandEntries(
  entries: readonly CommandEntry[],
): Array<{ label: string; entries: CommandEntry[] }> {
  const groups = new Map<string, CommandEntry[]>();
  for (const entry of entries) {
    const bucket = groups.get(entry.group);
    if (bucket) {
      bucket.push(entry);
    } else {
      groups.set(entry.group, [entry]);
    }
  }
  return [...groups].map(([label, grouped]) => ({ label, entries: grouped }));
}
