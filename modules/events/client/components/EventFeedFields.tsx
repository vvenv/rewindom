import { Field, FieldLabel } from "@rewindom/ui/field";
import { Input } from "@rewindom/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rewindom/ui/select";
import { useTranslation } from "react-i18next";

import { EVENT_TOPIC_ORDER } from "../lib/events.js";

import type { EventFeedFormValues } from "../lib/event-feeds.js";
import type { EventSourceKind } from "../../shared/index.js";

const SOURCE_KINDS: readonly EventSourceKind[] = [
  "official",
  "news",
  "community",
];

interface EventFeedFieldsProps {
  form: EventFeedFormValues;
  onChange: (next: EventFeedFormValues) => void;
  showUrl: boolean;
  idPrefix?: string;
}

export function EventFeedFields({
  form,
  onChange,
  showUrl,
  idPrefix = "feed",
}: EventFeedFieldsProps) {
  const { t } = useTranslation("events");

  return (
    <>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>
          {t("sources.fieldName")}
        </FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(event) =>
            onChange({ ...form, name: event.target.value })
          }
        />
      </Field>
      {showUrl ? (
        <Field>
          <FieldLabel htmlFor={`${idPrefix}-url`}>
            {t("sources.fieldUrl")}
          </FieldLabel>
          <Input
            id={`${idPrefix}-url`}
            value={form.url}
            onChange={(event) =>
              onChange({ ...form, url: event.target.value })
            }
            placeholder="https://"
          />
        </Field>
      ) : null}
      <Field>
        <FieldLabel>{t("sources.fieldSourceKind")}</FieldLabel>
        <Select
          value={form.source_kind}
          onValueChange={(value) =>
            onChange({ ...form, source_kind: value as EventSourceKind })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {t(`sourceKind.${kind}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel>{t("sources.fieldTopic")}</FieldLabel>
        <Select
          value={form.topic}
          onValueChange={(value) =>
            onChange({
              ...form,
              topic: value as EventFeedFormValues["topic"],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TOPIC_ORDER.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {t(`topic.${topic}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}
