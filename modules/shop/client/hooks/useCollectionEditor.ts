import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { ApiError } from "@rewindom/module-sdk/client";
import { DEFAULT_LOCALE, type AppLocale } from "@rewindom/module-sdk";
import { toast } from "@rewindom/ui/toast";
import { useTranslation } from "react-i18next";

import {
  useCollection,
  useCreateCollection,
  useUpdateCollection,
} from "./useShop.js";
import {
  buildCollectionPayload,
  collectionToForm,
  INITIAL_COLLECTION_FORM,
  validateCollectionForm,
  type CollectionFormValues,
} from "../lib/collection-form.js";

export function useCollectionEditor(collectionId: string | undefined) {
  const { t } = useTranslation("shop");
  const navigate = useNavigate();
  const isCreate = !collectionId;
  const { data, isLoading } = useCollection(collectionId, Boolean(collectionId));
  const createCollection = useCreateCollection();
  const updateCollection = useUpdateCollection();
  const [form, setForm] = useState<CollectionFormValues>(INITIAL_COLLECTION_FORM);
  const [contentLocale, setContentLocale] = useState<AppLocale>(DEFAULT_LOCALE);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!data) return;
    setForm(collectionToForm(data));
  }, [data]);

  const patch = (partial: Partial<CollectionFormValues>): void => {
    setForm((current) => ({ ...current, ...partial }));
  };

  const submit = async (): Promise<void> => {
    const validationError = validateCollectionForm(form, t);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    const payload = buildCollectionPayload(form);
    try {
      if (isCreate) {
        const created = await createCollection.mutateAsync(payload);
        toast.success(t("toastCollectionCreated"));
        navigate(`/app/shop/collections/${created.id}`, { replace: true });
        return;
      }
      await updateCollection.mutateAsync({ id: collectionId, ...payload });
      toast.success(t("toastCollectionUpdated"));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isCreate
            ? t("createFailed")
            : t("updateFailed"),
      );
    }
  };

  return {
    isCreate,
    isLoading: Boolean(collectionId) && isLoading,
    form,
    patch,
    contentLocale,
    setContentLocale,
    error,
    submit,
    pending: createCollection.isPending || updateCollection.isPending,
  };
}
