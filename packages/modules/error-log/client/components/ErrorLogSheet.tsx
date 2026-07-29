import { useAuth, useConfirm, usePermissions  } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate, type JsonValue } from "@be-water/shared";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@be-water/ui/sheet";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  ERROR_LEVEL_LABELS,
  type ErrorLog,
} from "../../shared/index.js";
import { useDeleteErrorLog } from "../hooks/useDeleteErrorLog.js";


interface ErrorLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: ErrorLog | null;
  /**
   * 删除走租户接口 `/api/error-logs/:id`，平台管理员令牌打不进租户业务面
   * （auth 中间件直接 403），所以平台控制台必须关掉这个入口。
   */
  allowDelete?: boolean;
}

/** 渲染一个 jsonb 列：值为 null（列空）时整块不显示 */
function JsonField({ label, value }: { label: string; value: JsonValue | null }) {
  if (value == null) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground">{label}</p>
      <pre className="bg-muted p-3 rounded overflow-x-auto">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

export function ErrorLogSheet({
  open,
  onOpenChange,
  log,
  allowDelete = false,
}: ErrorLogSheetProps) {
  const { user } = useAuth();
  const deleteMutation = useDeleteErrorLog();
  const { confirm } = useConfirm();
  const { hasPermission } = usePermissions();
  // 与服务端同一套判定：有 error_logs.manage 可删本租户任意一条，否则只能删自己的
  const canDelete =
    allowDelete &&
    (hasPermission("error_logs.manage") ||
      (log !== null && log.user_id === user?.id));

  const handleDelete = async () => {
    if (!log) return;
    const confirmed = await confirm({
      title: "确认删除",
      description: "确定要删除这条错误日志吗？此操作无法撤销。",
      destructive: true,
    });
    if (!confirmed) return;

    deleteMutation.mutate(log.id, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              错误详情
            </SheetTitle>
          </SheetHeader>
          {log && (
            <div className="flex flex-col gap-4 px-4 flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">级别</p>
                  <p>
                    {ERROR_LEVEL_LABELS[
                      log.level as keyof typeof ERROR_LEVEL_LABELS
                    ] || log.level}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">时间</p>
                  <p>{formatBusinessDate(log.created_at)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">用户</p>
                  <p>{displayOrEmpty(log.username)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">IP 地址</p>
                  <p className="font-mono">{displayOrEmpty(log.ip_address)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">路由</p>
                  <p className="font-mono">{displayOrEmpty(log.route)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">方法</p>
                  <p className="font-mono">{displayOrEmpty(log.method)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">错误代码</p>
                <p className="font-mono">{displayOrEmpty(log.error_code)}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">用户代理</p>
                <p className="text-mono break-all">
                  {displayOrEmpty(log.user_agent)}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">错误信息</p>
                <p className="bg-muted p-3 rounded font-mono overflow-x-auto">
                  {log.message}
                </p>
              </div>

              {log.stack_trace && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">堆栈跟踪</p>
                  <pre className="bg-muted p-3 rounded font-mono overflow-x-auto">
                    {log.stack_trace}
                  </pre>
                </div>
              )}

              <JsonField label="请求体" value={log.request_body} />
              <JsonField label="请求参数" value={log.request_params} />
              <JsonField label="查询参数" value={log.request_query} />
              <JsonField label="上下文" value={log.context} />
            </div>
          )}
          {log && canDelete && (
            <SheetFooter>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="hover:text-destructive"
              >
                <Trash2 className="size-4" />
                删除
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
