import { Field, FieldDescription, FieldLabel } from "@rewindom/ui/field";
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

import {
  EVENT_ENTITY_KINDS,
  isFirstPartySource,
  SOURCE_KIND_ORDER,
} from "../../shared/index.js";

import type { EventSourceKind } from "../../shared/index.js";

import type { EventFeedFormValues } from "../lib/event-feeds.js";

/** 顺序与详情页分组同一份（SOURCE_KIND_ORDER），不在这里手抄第二份 */
const SOURCE_KINDS = SOURCE_KIND_ORDER;

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
          onChange={(event) => onChange({ ...form, name: event.target.value })}
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
            onChange={(event) => onChange({ ...form, url: event.target.value })}
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
      {/*
        出版方实体只对一手来源画：一篇 TechCrunch 报道不是「关于 TechCrunch」的，
        给 news / community 源标出版方会把每个媒体变成一个实体聚合面。
      */}
      {isFirstPartySource(form.source_kind) ? (
        <>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-publisher`}>
              {t("sources.fieldPublisherEntity")}
            </FieldLabel>
            <Input
              id={`${idPrefix}-publisher`}
              value={form.publisher_entity_name}
              onChange={(event) =>
                onChange({ ...form, publisher_entity_name: event.target.value })
              }
              placeholder={t("sources.publisherPlaceholder")}
            />
            <FieldDescription>{t("sources.publisherHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{t("sources.fieldPublisherKind")}</FieldLabel>
            <Select
              value={form.publisher_entity_kind}
              onValueChange={(value) =>
                onChange({ ...form, publisher_entity_kind: value })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_ENTITY_KINDS.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`entityKind.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      ) : null}
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
