import { Badge } from "@be-water/ui/badge";
import { Button } from "@be-water/ui/button";
import { Checkbox } from "@be-water/ui/checkbox";
import { Spinner } from "@be-water/ui/spinner";

import {
  getGroupSelectionState,
  groupPermissions,
  toggleGroup,
  togglePermission,
} from "../lib/role-form.js";

import type { PermissionCatalogEntry } from "@be-water/shared";

interface PermissionPickerProps {
  catalog: readonly PermissionCatalogEntry[];
  isLoading?: boolean;
  value: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

export function PermissionPicker({
  catalog,
  isLoading,
  value,
  onChange,
  disabled,
}: PermissionPickerProps) {
  const groups = groupPermissions(catalog);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <p className="text-muted-foreground py-4 text-sm">暂无可分配的权限</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => {
        const state = getGroupSelectionState(value, group);
        return (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{group.label}</span>
                {state === "partial" && (
                  <Badge variant="secondary">部分</Badge>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(toggleGroup(value, group))}
              >
                {state === "all" ? "取消全选" : "全选"}
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {group.entries.map((entry) => {
                const checked = value.includes(entry.key);
                return (
                  <label
                    key={entry.key}
                    className="hover:bg-accent/50 flex items-start gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() =>
                        onChange(togglePermission(value, entry.key))
                      }
                    />
                    <span className="flex flex-col gap-0.5">
                      <span>{entry.label}</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {entry.key}
                      </span>
                      {entry.description && (
                        <span className="text-muted-foreground text-xs">
                          {entry.description}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
