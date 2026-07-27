import { useState } from "react";

import { formatBusinessDateOrTimeAgo } from "@be-water/shared";
import { Alert, AlertDescription } from "@be-water/ui/alert";
import { Button } from "@be-water/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@be-water/ui/sheet";
import { Spinner } from "@be-water/ui/spinner";
import { Plug } from "lucide-react";

import { type TenantSummary } from "../../shared/index.js";
import { usePlatformTenantIntegrationStatus } from "../hooks/usePlatformTenants.js";

interface TenantIntegrationSheetProps {
  tenant: TenantSummary;
  disabled?: boolean;
}

export function TenantIntegrationSheet({
  tenant,
  disabled = false,
}: TenantIntegrationSheetProps) {
  const [open, setOpen] = useState(false);
  const integrationStatusQuery = usePlatformTenantIntegrationStatus(
    open ? tenant.id : null,
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Plug className="size-3.5" />
          集成
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="shrink-0 border-b pb-4">
          <SheetTitle className="pr-8">集成配置 — {tenant.name}</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          {integrationStatusQuery.isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Spinner />
              <span className="ml-2">加载中…</span>
            </div>
          ) : integrationStatusQuery.data ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-medium">OpenAI API</p>
                <p className="text-muted-foreground">
                  {integrationStatusQuery.data.openai_api.configured
                    ? `已配置，更新于 ${integrationStatusQuery.data.openai_api.updated_at ? formatBusinessDateOrTimeAgo(integrationStatusQuery.data.openai_api.updated_at) : "—"}`
                    : "未配置"}
                </p>
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>加载失败</AlertDescription>
            </Alert>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
