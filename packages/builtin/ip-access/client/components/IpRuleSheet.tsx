/**
 * 新增 / 编辑规则的内聚弹层：trigger + 表单 + mutation + toast 都在这里，
 * 页面只负责放置它。打开时挂载表单，避免用 effect 去重置。
 */
import { useState, type ReactNode, type SubmitEvent } from "react";

import {
  ApiError,
  DateTimePicker,
  FieldInfoTip,
  parseOptionalDate,
} from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@rewindom/ui/field";
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
import { Pencil, Plus } from "lucide-react";
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
  children?: ReactNode;
}

function IpRuleForm({
  scope,
  rule,
  prefill,
  onClose,
}: {
  scope: IpRuleScope;
  rule?: IpAccessRuleDto;
  prefill?: { cidr?: string; reason?: string };
  onClose: () => void;
}) {
  const { t } = useTranslation("ip-access");
  const isEdit = rule !== undefined;
  const [form, setForm] = useState<IpRuleFormValues>(() =>
    rule ? toIpRuleForm(rule) : { ...INITIAL_IP_RULE_FORM, ...prefill },
  );
  const [error, setError] = useState("");

  const createMutation = useCreateIpRule(scope);
  const updateMutation = useUpdateIpRule(scope);
  const isPending = createMutation.isPending || updateMutation.isPending;

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
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(isEdit ? "updateFailed" : "createFailed"),
      );
    }
  };

  return (
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
            <FieldInfoTip text={t("info.cidr")} side="left" />
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
            <FieldDescription>{t("warn.ipv6TooSpecific")}</FieldDescription>
          ) : null}
        </Field>

        <Field>
          <FieldLabel
            htmlFor="ip-rule-action"
            className="flex items-center gap-1"
          >
            {t("field.action")}
            <FieldInfoTip text={t("info.action")} side="left" />
          </FieldLabel>
          <Select
            value={form.action}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({
                ...prev,
                action: value as IpRuleAction,
              }));
            }}
          >
            <SelectTrigger id="ip-rule-action" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
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
            <FieldInfoTip text={t("info.mode")} side="left" />
          </FieldLabel>
          <Select
            value={form.mode}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, mode: value as IpRuleMode }));
            }}
          >
            <SelectTrigger id="ip-rule-mode" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" align="start">
              {IP_RULE_MODES.map((value) => (
                <SelectItem key={value} value={value}>
                  {t(`mode.${value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="ip-rule-reason">{t("field.reason")}</FieldLabel>
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
            <FieldInfoTip text={t("info.expiresAt")} side="left" />
          </FieldLabel>
          <DateTimePicker
            id="ip-rule-expires"
            value={parseOptionalDate(form.expires_at)}
            onChange={(date) =>
              setForm((prev) => ({
                ...prev,
                expires_at: date ? date.toISOString() : "",
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
  );
}

export function IpRuleSheet({
  scope,
  rule,
  prefill,
  children,
}: IpRuleSheetProps) {
  const { t } = useTranslation("ip-access");
  const isEdit = rule !== undefined;
  const [open, setOpen] = useState(false);

  const trigger =
    children ??
    (isEdit ? (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("editTitle")}
      >
        <Pencil className="size-3.5" />
      </Button>
    ) : (
      <Button type="button" variant="outline" size="sm">
        <Plus className="size-4" />
        {t("create")}
      </Button>
    ));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        {open ? (
          <IpRuleForm
            key={rule?.id ?? prefill?.cidr ?? "new"}
            scope={scope}
            rule={rule}
            prefill={prefill}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
