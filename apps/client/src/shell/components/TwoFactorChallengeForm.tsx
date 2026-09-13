import { Button } from "@rewindom/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import { Spinner } from "@rewindom/ui/spinner";
import { useTranslation } from "react-i18next";

interface TwoFactorChallengeFormProps {
  code: string;
  isLoading: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function TwoFactorChallengeForm({
  code,
  isLoading,
  onCodeChange,
  onSubmit,
  onBack,
}: TwoFactorChallengeFormProps): React.ReactElement {
  const { t } = useTranslation("shell");

  return (
    <form
      className="auth-glass-card space-y-6 rounded-2xl p-8 sm:p-10"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="space-y-2 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          {t("auth.twoFactor.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("auth.twoFactor.description")}
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="totp-code">
            {t("auth.twoFactor.codeLabel")}
          </FieldLabel>
          <Input
            id="totp-code"
            autoComplete="one-time-code"
            inputMode="numeric"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder={t("auth.twoFactor.codePlaceholder")}
            disabled={isLoading}
          />
          <FieldDescription>{t("auth.twoFactor.codeHint")}</FieldDescription>
        </Field>
      </FieldGroup>
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={isLoading || !code.trim()}>
          {isLoading ? <Spinner /> : null}
          {t("auth.twoFactor.verify")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={isLoading}
          onClick={onBack}
        >
          {t("auth.twoFactor.back")}
        </Button>
      </div>
    </form>
  );
}
