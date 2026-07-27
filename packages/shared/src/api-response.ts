/** HTTP 200 success body: `{ data: T }` */
export interface ApiDataResponse<T> { data: T }

/** HTTP 200 paginated list body */
export interface ApiListMeta {
  total: number;
  page: number;
  page_size: number;
}

export type ApiPaginatedResponse<T> = ApiDataResponse<T[]> & {
  meta: ApiListMeta;
};

/** HTTP 4xx/5xx error body: `{ error: string, code?: string }` */
export interface ApiErrorResponse { error: string; code?: string }

/**
 * Standard API response format for successful operations.
 */
export function success<T>(data: T): ApiDataResponse<T> {
  return { data };
}

/**
 * Standard API response format for errors.
 */
export function error(message: string, code?: string): ApiErrorResponse {
  return { error: message, ...(code && { code }) };
}
