import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import { DEFAULT_LOCALE, type AppLocale } from "@rewindom/shared";

import { type MarketingDoc, type MarketingDocListItem  } from "../../shared/marketing-doc.js";

export interface DocFormState {
  slug: string;
  title: string;
  description: string;
  category: string;
  body_md: string;
  sort_order: number;
  locale: AppLocale;
}

export function emptyForm(locale: AppLocale = DEFAULT_LOCALE): DocFormState {
  return {
    slug: "",
    title: "",
    description: "",
    category: "",
    body_md: "",
    sort_order: 0,
    locale,
  };
}

export function formFromFullDoc(fullDoc: MarketingDoc): DocFormState {
  return {
    slug: fullDoc.slug,
    title: fullDoc.title_draft,
    description: fullDoc.description_draft,
    category: fullDoc.category_draft,
    body_md: fullDoc.body_md_draft,
    sort_order: fullDoc.sort_order_draft,
    locale: fullDoc.locale,
  };
}

export function isSameForm(a: DocFormState, b: DocFormState): boolean {
  return (
    a.slug === b.slug &&
    a.title === b.title &&
    a.description === b.description &&
    a.category === b.category &&
    a.body_md === b.body_md &&
    a.sort_order === b.sort_order &&
    a.locale === b.locale
  );
}

export function diffFormFields(
  form: DocFormState,
  baseline: DocFormState,
): Array<keyof DocFormState> {
  return (Object.keys(form) as Array<keyof DocFormState>).filter(
    (key) => form[key] !== baseline[key],
  );
}

/**
 * 文档编辑表单会话：打开 → 灌数据 → 编辑 → 关闭时整段清掉。
 *
 * 脏检查 = 用户动过表单 **且** 当前值与 baseline 不同。只靠 form/baseline 对比会被
 * Radix Select（选项晚于 value 到达时误触发 onValueChange）等第三方控件搞成误报；
 * `userEdited` 把「用户意图」和「控件副作用」拆开。
 */
export function useSiteDocEditorForm({
  open,
  doc,
  fullDoc,
  defaultLocale,
}: {
  open: boolean;
  doc: MarketingDocListItem | null;
  fullDoc: MarketingDoc | undefined;
  defaultLocale: AppLocale;
}): {
  form: DocFormState;
  setForm: Dispatch<SetStateAction<DocFormState>>;
  slugTouched: boolean;
  setSlugTouched: Dispatch<SetStateAction<boolean>>;
  sessionReady: boolean;
  editorKey: number;
  isDirty: boolean;
  isLoading: boolean;
  commitBaseline: () => void;
  patchForm: (
    patch: Partial<DocFormState> | ((prev: DocFormState) => DocFormState),
    options?: { user?: boolean },
  ) => void;
} {
  const [form, setForm] = useState<DocFormState>(() => emptyForm());
  const [baseline, setBaseline] = useState<DocFormState>(() => emptyForm());
  const [slugTouched, setSlugTouched] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [userEdited, setUserEdited] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const hydratedTargetRef = useRef<string | null>(null);

  const resetSession = useCallback((): void => {
    hydratedTargetRef.current = null;
    const blank = emptyForm();
    setForm(blank);
    setBaseline(blank);
    setSlugTouched(false);
    setUserEdited(false);
    setSessionReady(false);
    setEditorKey((key) => key + 1);
  }, []);

  const hydrate = useCallback((next: DocFormState, slugTouchedNext: boolean): void => {
    setForm(next);
    setBaseline(next);
    setSlugTouched(slugTouchedNext);
    setUserEdited(false);
    setSessionReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      resetSession();
      return;
    }

    if (doc) {
      if (!fullDoc) {
        setSessionReady(false);
        return;
      }
      if (hydratedTargetRef.current === doc.id) return;
      hydratedTargetRef.current = doc.id;
      hydrate(formFromFullDoc(fullDoc), true);
      return;
    }

    if (hydratedTargetRef.current === "new") return;
    hydratedTargetRef.current = "new";
    hydrate(emptyForm(defaultLocale), false);
  }, [open, doc, fullDoc, defaultLocale, hydrate, resetSession]);

  useLayoutEffect(() => {
    if (!open || doc || !sessionReady) return;
    const next = emptyForm(defaultLocale);
    setForm((current) => {
      if (current.locale === defaultLocale) return current;
      if (!isSameForm(current, emptyForm(current.locale))) return current;
      return next;
    });
    setBaseline((current) => {
      if (current.locale === defaultLocale) return current;
      if (!isSameForm(current, emptyForm(current.locale))) return current;
      return next;
    });
  }, [open, doc, sessionReady, defaultLocale]);

  const patchForm = useCallback(
    (
      patch: Partial<DocFormState> | ((prev: DocFormState) => DocFormState),
      options?: { user?: boolean },
    ): void => {
      setForm((prev) => {
        const next =
          typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
        if (isSameForm(prev, next)) return prev;
        if (options?.user !== false) {
          setUserEdited(true);
        }
        return next;
      });
    },
    [],
  );

  const isDirty =
    sessionReady && userEdited && !isSameForm(form, baseline);
  const isLoading = Boolean(doc) && open && !fullDoc;

  const commitBaseline = useCallback((): void => {
    setBaseline(form);
    setUserEdited(false);
  }, [form]);

  return {
    form,
    setForm,
    slugTouched,
    setSlugTouched,
    sessionReady,
    editorKey,
    isDirty,
    isLoading,
    commitBaseline,
    patchForm,
  };
}
