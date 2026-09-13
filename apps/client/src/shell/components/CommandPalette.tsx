import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  translateAppNavSections,
  usePermissions,
  useTenantEntitlements,
} from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@rewindom/ui/command";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { useAppShellConfig } from "../contexts/app-shell-context.js";
import { useFilteredNavSections } from "../hooks/useFilteredNavSections.js";
import {
  buildCommandEntries,
  commandActionsAsNavSection,
  groupCommandEntries,
  matchCommandEntries,
  sortCommandActions,
} from "../lib/command-actions.js";

const CommandPaletteContext = createContext<(() => void) | null>(null);

/** 侧栏等处的入口按钮用它打开面板；未挂 Provider 时返回 null（平台外壳没有面板）。 */
export function useOpenCommandPalette(): (() => void) | null {
  return useContext(CommandPaletteContext);
}

function isPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
}

/**
 * 命令面板（⌘K / Ctrl-K）。挂在 `AppLayout` 内，只服务租户工作台。
 *
 * 候选 = 侧栏导航项 + 各模块 `client.commandActions`。两者共用同一套
 * 权限/entitlement 过滤（见 `commandActionsAsNavSection`），面板搜得到的
 * 就是侧栏点得到的。
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("shell");
  const navigate = useNavigate();
  const { sections } = useFilteredNavSections();
  const { getCommandActions, filterNavSections } = useAppShellConfig();
  const { data: entitlements } = useTenantEntitlements();
  const { hasPermission } = usePermissions();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (!isPaletteShortcut(event)) {
        return;
      }
      event.preventDefault();
      setOpen((previous) => !previous);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const actionsGroupLabel = t("commandPalette.actions");

  const actionItems = useMemo(() => {
    const actions = sortCommandActions(getCommandActions());
    if (actions.length === 0) {
      return [];
    }
    const translated = translateAppNavSections(
      [commandActionsAsNavSection(actions, actionsGroupLabel)],
      t,
    );
    // 无可见动作时 `filterNavSections` 会把整个分组丢掉，故取首个分组可能为空。
    return filterNavSections(translated, entitlements, hasPermission)[0]?.items ?? [];
  }, [
    actionsGroupLabel,
    entitlements,
    filterNavSections,
    getCommandActions,
    hasPermission,
    t,
  ]);

  const groups = useMemo(() => {
    const entries = buildCommandEntries(sections, actionItems, actionsGroupLabel);
    return groupCommandEntries(matchCommandEntries(entries, query));
  }, [actionItems, actionsGroupLabel, query, sections]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
    }
  }, []);

  const openPalette = useCallback(() => handleOpenChange(true), [handleOpenChange]);

  const handleSelect = useCallback(
    (path: string) => {
      handleOpenChange(false);
      void navigate(path);
    },
    [handleOpenChange, navigate],
  );

  return (
    <CommandPaletteContext.Provider value={openPalette}>
      {children}
      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={t("commandPalette.title")}
        description={t("commandPalette.description")}
      >
        {/* 过滤在 `matchCommandEntries` 里做，cmdk 自带的模糊打分会把危险入口排到前面 */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={t("commandPalette.placeholder")}
          />
          <CommandList>
            <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
            {groups.map((group, index) => (
              <CommandGroup key={group.label} heading={group.label}>
                {index > 0 ? <CommandSeparator /> : null}
                {group.entries.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <CommandItem
                      key={entry.id}
                      value={entry.id}
                      onSelect={() => handleSelect(entry.path)}
                    >
                      <Icon />
                      <span>{entry.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </CommandPaletteContext.Provider>
  );
}

/** 侧栏里的可见入口：没有它，⌘K 只有知道的人才找得到，移动端更是无从触发。 */
export function CommandPaletteTrigger({ className }: { className?: string }) {
  const { t } = useTranslation("shell");
  const openPalette = useOpenCommandPalette();

  if (!openPalette) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      title={t("commandPalette.open")}
      onClick={openPalette}
    >
      <Search />
      <span className="sr-only">{t("commandPalette.open")}</span>
    </Button>
  );
}
