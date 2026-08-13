import { api } from "@rewindom/client-kit";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type { FormEntry } from "../../shared/sections/form/fields.js";

export const FORM_SUBMISSIONS_QUERY_KEY = ["site", "form-submissions"] as const;

export interface FormSubmissionListItem {
  id: string;
  page_slug: string;
  page_locale: string;
  section_id: string;
  form_title: string;
  data: FormEntry[];
  created_at: string;
}

interface FormSubmissionPage {
  items: FormSubmissionListItem[];
  page: number;
  page_size: number;
  total: number;
  page_count: number;
}

export function useFormSubmissions(page: number, pageSize: number) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryKey: [...FORM_SUBMISSIONS_QUERY_KEY, page, pageSize],
    queryFn: () =>
      api.get<FormSubmissionPage>("/site/form-submissions", {
        page,
        page_size: pageSize,
      }),
  });
}

export function useDeleteFormSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ deleted: boolean }>(`/site/form-submissions/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: FORM_SUBMISSIONS_QUERY_KEY }),
  });
}
