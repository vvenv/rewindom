import { useAuth, useConfirm  } from "@be-water/client-kit";
import { displayOrEmpty, formatBusinessDate } from "@be-water/shared";
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
}

export function ErrorLogSheet({ open, onOpenChange, log }: ErrorLogSheetProps) {
  const { user } = useAuth();
  const deleteMutation = useDeleteErrorLog();
  const { confirm } = useConfirm();
  const isSystemAdmin = user?.is_system_admin === true;
  const canDelete = isSystemAdmin || (log && log.user_id === user?.id);

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

              {log.request_body && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">请求体</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto">
                    {log.request_body}
                  </pre>
                </div>
              )}

              {log.request_params && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">请求参数</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto">
                    {log.request_params}
                  </pre>
                </div>
              )}

              {log.request_query && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">查询参数</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto">
                    {log.request_query}
                  </pre>
                </div>
              )}

              {log.context && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground">上下文</p>
                  <pre className="bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(JSON.parse(log.context), null, 2)}
                  </pre>
                </div>
              )}
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
