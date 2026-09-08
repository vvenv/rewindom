/**
 * 新增 / 编辑规则的内聚弹层：trigger + 表单 + mutation + toast 都在这里，
 * 页面只负责放置它。
 */
import { useEffect, useState, type ReactNode, type SubmitEvent } from "react";

import { ApiError, FieldInfoTip } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@rewindom/ui/sheet";
import { Spinner } from "@rewindom/ui/spinner";
import { Textarea } from "@rewindom/ui/textarea";
import { toast } from "@rewindom/ui/toast";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  IP_RULE_ACTIONS,
  IP_RULE_MODES,
  type IpAccessRuleDto,
  type IpRuleAction,
  type IpRuleMode,
} from "../../shared/index.js";
import {
  useCreateIpRule,
  useUpdateIpRule,
  type IpRuleScope,
} from "../hooks/useIpRules.js";
import {
  buildIpRulePayload,
  INITIAL_IP_RULE_FORM,
  ipv6TooSpecific,
  toIpRuleForm,
  validateIpRuleForm,
  type IpRuleFormValues,
} from "../lib/ip-rule-form.js";

interface IpRuleSheetProps {
  scope: IpRuleScope;
  /** 传入即为编辑模式 */
  rule?: IpAccessRuleDto;
  /**
   * 新建时的预填值（从「访问来源」一键封禁进来时用）。
   * 刻意只填 cidr 与 reason，**不填 mode**——从那里点进来的判断多半只看了
   * 一眼数字，仍然应该先 log_only 观察。
   */
  prefill?: { cidr?: string; reason?: string };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export function IpRuleSheet({
  scope,
  rule,
  prefill,
  open: controlledOpen,
  onOpenChange,
  children,
}: IpRuleSheetProps) {
  const { t } = useTranslation("ip-access");
  const isEdit = rule !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const [form, setForm] = useState<IpRuleFormValues>(
    rule ? toIpRuleForm(rule) : { ...INITIAL_IP_RULE_FORM, ...prefill },
  );
  const [error, setError] = useState("");

  const createMutation = useCreateIpRule(scope);
  const updateMutation = useUpdateIpRule(scope);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (open) {
      setForm(
        rule ? toIpRuleForm(rule) : { ...INITIAL_IP_RULE_FORM, ...prefill },
      );
      setError("");
    }
  }, [open, rule, prefill]);

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const validationError = validateIpRuleForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const payload = buildIpRulePayload(form);
      if (isEdit) {
        // cidr 不可改：改网段等于换了一条规则，命中计数跟着走会失去意义
        const { cidr: _cidr, ...rest } = payload;
        await updateMutation.mutateAsync({ ruleId: rule.id, body: rest });
        toast.success(t("toastUpdated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("toastCreated"));
      }
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(isEdit ? "updateFailed" : "createFailed"),
      );
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {children ? <SheetTrigger asChild>{children}</SheetTrigger> : null}
      {!children && !isEdit ? (
        <SheetTrigger asChild>
          <Button>
            <Plus className="size-4" />
            {t("create")}
          </Button>
        </SheetTrigger>
      ) : null}

      <SheetContent>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{t(isEdit ? "editTitle" : "createTitle")}</SheetTitle>
            <SheetDescription>
              {t(isEdit ? "editDescription" : "createDescription")}
            </SheetDescription>
          </SheetHeader>

          <FieldGroup className="min-h-0 flex-1 overflow-y-auto px-4">
            <Field>
              <FieldLabel
                htmlFor="ip-rule-cidr"
                className="flex items-center gap-1"
              >
                {t("field.cidr")}
                <FieldInfoTip text={t("info.cidr")} />
              </FieldLabel>
              <Input
                id="ip-rule-cidr"
                className="font-mono"
                placeholder={t("field.cidrPlaceholder")}
                value={form.cidr}
                disabled={isEdit}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cidr: event.target.value }))
                }
              />
              {ipv6TooSpecific(form.cidr) ? (
                <FieldError>{t("info.cidr")}</FieldError>
              ) : null}
            </Field>

            <Field>
              <FieldLabel
                htmlFor="ip-rule-action"
                className="flex items-center gap-1"
              >
                {t("field.action")}
                <FieldInfoTip text={t("info.action")} />
              </FieldLabel>
              <Select
                value={form.action}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    action: value as IpRuleAction,
                  }))
                }
              >
                <SelectTrigger id="ip-rule-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_RULE_ACTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`action.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel
                htmlFor="ip-rule-mode"
                className="flex items-center gap-1"
              >
                {t("field.mode")}
                <FieldInfoTip text={t("info.mode")} />
              </FieldLabel>
              <Select
                value={form.mode}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, mode: value as IpRuleMode }))
                }
              >
                <SelectTrigger id="ip-rule-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IP_RULE_MODES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`mode.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="ip-rule-reason">
                {t("field.reason")}
              </FieldLabel>
              <Textarea
                id="ip-rule-reason"
                className="min-h-24"
                placeholder={t("field.reasonPlaceholder")}
                value={form.reason}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, reason: event.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel
                htmlFor="ip-rule-expires"
                className="flex items-center gap-1"
              >
                {t("field.expiresAt")}
                <FieldInfoTip text={t("info.expiresAt")} />
              </FieldLabel>
              <Input
                id="ip-rule-expires"
                type="datetime-local"
                value={form.expires_at}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expires_at: event.target.value,
                  }))
                }
              />
            </Field>

            {error ? <FieldError>{error}</FieldError> : null}
          </FieldGroup>

          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                {t("cancel")}
              </Button>
            </SheetClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner className="size-4" /> : null}
              {t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
