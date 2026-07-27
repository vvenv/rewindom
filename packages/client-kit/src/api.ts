import { type ApiDataResponse, type ApiErrorResponse, type AuthTokens  } from "@be-water/shared";

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "./auth-store.js";


const API_BASE = "/api";

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const TRANSIENT_HTTP_STATUSES = new Set([408, 502, 503, 504]);

/** Gateway / network errors — session may still be valid. */
export function isTransientApiError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return TRANSIENT_HTTP_STATUSES.has(error.status);
  }
  return error instanceof TypeError;
}

/** Definitive auth failure — clear stored tokens. */
export function shouldClearAuthOnError(error: unknown): boolean {
  if (error instanceof Error && error.message === "没有可用的刷新令牌") {
    return true;
  }
  if (error instanceof ApiError) {
    return error.status === 401 || error.status === 403;
  }
  return false;
}

let isRefreshing = false;
let tokenRefreshPaused = false;
let refreshSubscribers: Array<(tokens: AuthTokens) => void> = [];

/** Pause access-token refresh while swapping auth (e.g. platform impersonation). */
export function pauseTokenRefresh(): () => void {
  tokenRefreshPaused = true;
  return () => {
    tokenRefreshPaused = false;
  };
}

function subscribeTokenRefresh(callback: (tokens: AuthTokens) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(tokens: AuthTokens) {
  refreshSubscribers.forEach((callback) => callback(tokens));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<AuthTokens> {
  if (tokenRefreshPaused) {
    throw new ApiError("令牌刷新已暂停", 401);
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("没有可用的刷新令牌");
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      clearAuthTokens();
    }
    throw new ApiError("令牌刷新失败", status);
  }

  const data = await response.json();
  const { accessToken, refreshToken: newRefreshToken } = data.data;
  const tokens: AuthTokens = { accessToken, refreshToken: newRefreshToken };
  setAuthTokens(tokens);

  // Dispatch custom event to notify AuthContext of token refresh
  window.dispatchEvent(new CustomEvent("tokenRefreshed", { detail: tokens }));

  return tokens;
}

function buildApiFetchInit(
  options: RequestInit,
  headers: Record<string, string>,
): RequestInit {
  return {
    cache: "no-store",
    ...options,
    headers,
  };
}

async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  skipAuth = false,
): Promise<Response> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  // Don't set Content-Type for FormData (browser sets it with boundary) or when body is undefined
  if (
    options.body !== undefined &&
    !(options.body instanceof FormData) &&
    options.method !== "DELETE" &&
    options.method !== "GET"
  ) {
    headers["Content-Type"] = "application/json";
  }

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, buildApiFetchInit(options, headers));

  if (response.status === 401 && !skipAuth) {
    if (tokenRefreshPaused) {
      throw new ApiError("未授权", 401);
    }

    if (isRefreshing) {
      return new Promise((resolve) => {
        subscribeTokenRefresh((tokens) => {
          headers["Authorization"] = `Bearer ${tokens.accessToken}`;
          resolve(fetch(url, buildApiFetchInit(options, headers)));
        });
      });
    }

    isRefreshing = true;
    try {
      const tokens = await refreshAccessToken();
      onTokenRefreshed(tokens);
      headers["Authorization"] = `Bearer ${tokens.accessToken}`;
      return fetch(url, buildApiFetchInit(options, headers));
    } catch (error) {
      if (shouldClearAuthOnError(error)) {
        clearAuthTokens();
        window.dispatchEvent(new CustomEvent("authLogout"));
      }
      throw error instanceof ApiError ? error : new ApiError("未授权", 401);
    } finally {
      isRefreshing = false;
    }
  }

  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  returnResponse = false,
  skipAuth = false,
): Promise<T> {
  const response = await fetchWithAuth(path, options, skipAuth);

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const data = (await response
      .json()
      .catch(() => ({}))) as Partial<ApiErrorResponse>;
    throw new ApiError(data.error || "请求失败", response.status, data.code);
  }

  if (returnResponse) {
    return response as T;
  }

  const data = (await response.json()) as ApiDataResponse<T>;
  return data.data;
}

function buildQueryString(
  params?: Record<string, string | number | undefined>,
): string {
  if (!params) return "";
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.append(k, String(v));
  }
  const query = qs.toString();
  return query ? `?${query}` : "";
}

function requestWithParams<T>(
  method: string,
  path: string,
  params?: Record<string, string | number | undefined>,
  body?: unknown,
  skipAuth = false,
): Promise<T> {
  const query = buildQueryString(params);
  const options: RequestInit = { method };
  if (body !== undefined) {
    options.body =
      body instanceof FormData || body instanceof Blob
        ? body
        : JSON.stringify(body);
  }
  return apiRequest<T>(`${path}${query}`, options, false, skipAuth);
}

export const api = {
  get: <T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    skipAuth = false,
  ) => requestWithParams<T>("GET", path, params, undefined, skipAuth),
  post: <T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth = false,
  ) => requestWithParams<T>("POST", path, params, body, skipAuth),
  put: <T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth = false,
  ) => requestWithParams<T>("PUT", path, params, body, skipAuth),
  patch: <T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth = false,
  ) => requestWithParams<T>("PATCH", path, params, body, skipAuth),
  delete: <T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth = false,
  ) => requestWithParams<T>("DELETE", path, params, body, skipAuth),
  getBlob: async (path: string): Promise<Blob> => {
    const response = await apiRequest<Response>(path, { method: "GET" }, true);
    if (!response.ok) {
      const data = (await response
        .json()
        .catch(() => ({}))) as Partial<ApiErrorResponse>;
      throw new ApiError(data.error || "请求失败", response.status, data.code);
    }
    // response.blob() 在部分 Chromium 版本下会丢弃 Content-Type 里的 charset 参数，
    // 导致文本类文件被浏览器按默认编码渲染出现中文乱码，这里显式用响应头重建 Blob 类型。
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type");
    return new Blob([buffer], contentType ? { type: contentType } : undefined);
  },
  download: async (
    path: string,
    filename: string,
    params?: Record<string, string | number | undefined>,
    options?: { timeoutMs?: number },
  ) => {
    const query = buildQueryString(params);
    const timeoutMs = options?.timeoutMs;
    const controller =
      timeoutMs != null && timeoutMs > 0 ? new AbortController() : undefined;
    const timeoutId =
      controller != null
        ? window.setTimeout(() => controller.abort(), timeoutMs)
        : undefined;

    try {
      const response = await apiRequest<Response>(
        `${path}${query}`,
        { method: "GET", signal: controller?.signal },
        true,
      );
      const contentType = response.headers.get("Content-Type") ?? "";
      if (contentType.includes("application/json")) {
        const data = (await response.json()) as Partial<ApiErrorResponse>;
        throw new ApiError(
          data.error || "请求失败",
          response.status,
          data.code,
        );
      }
      if (contentType.includes("text/html")) {
        throw new ApiError(
          "下载失败，未收到有效的文件响应，请稍后重试",
          response.status,
          "INVALID_DOWNLOAD_RESPONSE",
        );
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new ApiError("下载文件为空", response.status, "EMPTY_DOWNLOAD");
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      // 立即 revoke 会导致部分浏览器取消下载
      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
      }, 60_000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError("下载超时，请稍后重试", 408, "DOWNLOAD_TIMEOUT");
      }
      throw err;
    } finally {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    }
  },
  upload: async <T>(
    path: string,
    formData: FormData,
    params?: Record<string, string | number | undefined>,
  ) => {
    const query = buildQueryString(params);
    return apiRequest<T>(
      `${path}${query}`,
      { method: "POST", body: formData },
      false,
      false,
    );
  },
};
