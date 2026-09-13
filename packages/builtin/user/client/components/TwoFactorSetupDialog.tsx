import { useState } from "react";

import { api } from "@rewindom/client-kit";
import { Button } from "@rewindom/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@rewindom/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Spinner } from "@rewindom/ui/spinner";
import { toast } from "@rewindom/ui/toast";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

interface TwoFactorStatus {
  enabled: boolean;
  pending: boolean;
}

interface TwoFactorSetupPayload {
  otpauth_url: string;
  qr_data_url: string;
  secret: string;
  recovery_codes: string[];
}

interface TwoFactorSetupDialogProps {
  className?: string;
}

export function TwoFactorSetupDialog({
  className,
}: TwoFactorSetupDialogProps): React.ReactElement {
  const { t } = useTranslation("shell");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<TwoFactorStatus | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetupPayload | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = async (): Promise<void> => {
    const data = await api.get<TwoFactorStatus>("/auth/2fa/status");
    setStatus(data);
  };

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (next) {
      setSetup(null);
      setCode("");
      void loadStatus().catch(() => {
        toast.error(t("auth.twoFactor.setupFailed"));
      });
    }
  };

  const handleStart = async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await api.post<TwoFactorSetupPayload>("/auth/2fa/setup", {});
      setSetup(data);
      setCode("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.twoFactor.setupFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (): Promise<void> => {
    if (!code.trim()) {
      toast.error(t("auth.twoFactor.codeRequired"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/2fa/confirm", { code: code.trim() });
      toast.success(t("auth.twoFactor.enableSuccess"));
      setSetup(null);
      await loadStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.twoFactor.confirmFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (): Promise<void> => {
    if (!code.trim()) {
      toast.error(t("auth.twoFactor.codeRequired"));
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/2fa/disable", { code: code.trim() });
      toast.success(t("auth.twoFactor.disableSuccess"));
      setCode("");
      await loadStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("auth.twoFactor.disableFailed"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button type="button" className={className}>
          <ShieldCheck className="size-4" />
          <span>{t("auth.twoFactor.menu")}</span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("auth.twoFactor.menu")}</DialogTitle>
          <DialogDescription>
            {status?.enabled
              ? t("auth.twoFactor.enabled")
              : t("auth.twoFactor.disabled")}
          </DialogDescription>
        </DialogHeader>

        {setup ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("auth.twoFactor.scanQr")}
            </p>
            <img
              src={setup.qr_data_url}
              alt=""
              className="mx-auto size-[220px] rounded-md border bg-white p-2"
            />
            <p className="break-all font-mono text-xs text-muted-foreground">
              {t("auth.twoFactor.manualSecret")}: {setup.secret}
            </p>
            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-2 text-sm font-medium">
                {t("auth.twoFactor.recoveryCodes")}
              </p>
              <ul className="grid grid-cols-2 gap-1 font-mono text-xs">
                {setup.recovery_codes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="2fa-confirm">
                  {t("auth.twoFactor.confirmCode")}
                </FieldLabel>
                <Input
                  id="2fa-confirm"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  autoComplete="one-time-code"
                />
              </Field>
            </FieldGroup>
          </div>
        ) : status?.enabled ? (
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="2fa-disable">
                {t("auth.twoFactor.codeLabel")}
              </FieldLabel>
              <Input
                id="2fa-disable"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
              />
            </Field>
          </FieldGroup>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          {setup ? (
            <Button disabled={loading} onClick={() => void handleConfirm()}>
              {loading ? <Spinner /> : null}
              {t("auth.twoFactor.enable")}
            </Button>
          ) : status?.enabled ? (
            <Button
              variant="destructive"
              disabled={loading}
              onClick={() => void handleDisable()}
            >
              {loading ? <Spinner /> : null}
              {t("auth.twoFactor.disable")}
            </Button>
          ) : (
            <Button disabled={loading} onClick={() => void handleStart()}>
              {loading ? <Spinner /> : null}
              {t("auth.twoFactor.enable")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
