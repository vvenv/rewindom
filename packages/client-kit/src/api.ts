import { type ApiDataResponse, type ApiErrorResponse, type AuthTokens  } from "@be-water/shared";

import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
  type AuthTokenStore,
} from "./auth-store.js";


const API_BASE = "/api";

/** 当前 UI 语言，写入每个 API 请求的 Accept-Language。 */
let apiAcceptLanguage = "zh-CN";

export function setApiAcceptLanguage(locale: string): void {
  apiAcceptLanguage = locale || "zh-CN";
}

export function getApiAcceptLanguage(): string {
  return apiAcceptLanguage;
}

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

export interface ApiClientOptions {
  /** 本实例读写哪套 token。默认实例走 `configureAuthTokenStore` 注入的全局 store。 */
  tokenStore: AuthTokenStore;
  /** 刷新端点（相对 `/api`）。 */
  refreshPath: string;
  /** 刷新请求体的字段名——内核用 `refreshToken`，会员端 API 用 snake_case。 */
  refreshBodyKey: string;
  /** 刷新成功后派发的 window 事件名。 */
  tokenRefreshedEvent: string;
  /** 会话彻底失效时派发的 window 事件名。 */
  authLogoutEvent: string;
  /**
   * `bearer`（默认）：Authorization + localStorage tokenStore。
   * `cookie`：HttpOnly cookie + credentials；不写 Authorization。
   */
  authMode?: "bearer" | "cookie";
  /** fetch credentials；cookie 模式默认 `include`。 */
  credentials?: RequestCredentials;
}

export interface ApiClient {
  request<T>(
    path: string,
    options?: RequestInit,
    returnResponse?: boolean,
    skipAuth?: boolean,
  ): Promise<T>;
  get<T>(
    path: string,
    params?: Record<string, string | number | undefined>,
    skipAuth?: boolean,
  ): Promise<T>;
  post<T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth?: boolean,
  ): Promise<T>;
  put<T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth?: boolean,
  ): Promise<T>;
  patch<T>(
    path: string,
    body: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth?: boolean,
  ): Promise<T>;
  delete<T>(
    path: string,
    body?: unknown,
    params?: Record<string, string | number | undefined>,
    skipAuth?: boolean,
  ): Promise<T>;
  getBlob(path: string): Promise<Blob>;
  download(
    path: string,
    filename: string,
    params?: Record<string, string | number | undefined>,
    options?: { timeoutMs?: number },
  ): Promise<void>;
  upload<T>(
    path: string,
    formData: FormData,
    params?: Record<string, string | number | undefined>,
  ): Promise<T>;
  /** 暂停本实例的自动刷新（换号 / 模拟登录期间）。 */
  pauseTokenRefresh(): () => void;
}

function buildApiFetchInit(
  options: RequestInit,
  headers: Record<string, string>,
  credentials?: RequestCredentials,
): RequestInit {
  return {
    cache: "no-store",
    credentials,
    ...options,
    headers,
  };
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

/**
 * 造一个独立的 API 客户端。
 *
 * 刷新状态（`isRefreshing` / 订阅队列 / 暂停标记）必须收在闭包里：这些原本是模块级
 * 变量，一旦同一页面存在两种会话（工作台用户 + 站点会员），共享状态会让一方的 401
 * 刷新流程去动另一方的 token。
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const {
    tokenStore,
    refreshPath,
    refreshBodyKey,
    tokenRefreshedEvent,
    authLogoutEvent,
    authMode = "bearer",
  } = options;
  const credentials: RequestCredentials | undefined =
    options.credentials ?? (authMode === "cookie" ? "include" : undefined);
  const cookieAuth = authMode === "cookie";

  let isRefreshing = false;
  let tokenRefreshPaused = false;
  let refreshSubscribers: Array<(tokens: AuthTokens) => void> = [];

  function subscribeTokenRefresh(callback: (tokens: AuthTokens) => void): void {
    refreshSubscribers.push(callback);
  }

  function onTokenRefreshed(tokens: AuthTokens): void {
    refreshSubscribers.forEach((callback) => callback(tokens));
    refreshSubscribers = [];
  }

  async function refreshAccessToken(): Promise<AuthTokens> {
    if (tokenRefreshPaused) {
      throw new ApiError("令牌刷新已暂停", 401);
    }

    if (!cookieAuth) {
      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        throw new Error("没有可用的刷新令牌");
      }

      const response = await fetch(`${API_BASE}${refreshPath}`, {
        method: "POST",
        cache: "no-store",
        credentials,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [refreshBodyKey]: refreshToken }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 401 || status === 403) {
          tokenStore.clearTokens();
        }
        throw new ApiError("令牌刷新失败", status);
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefreshToken } = data.data;
      const tokens: AuthTokens = { accessToken, refreshToken: newRefreshToken };
      tokenStore.setTokens(tokens);

      window.dispatchEvent(
        new CustomEvent(tokenRefreshedEvent, { detail: tokens }),
      );

      return tokens;
    }

    // cookie 模式：refresh JWT 在 HttpOnly cookie 里，由浏览器自动带上。
    const response = await fetch(`${API_BASE}${refreshPath}`, {
      method: "POST",
      cache: "no-store",
      credentials: credentials ?? "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        tokenStore.clearTokens();
      }
      throw new ApiError("令牌刷新失败", status);
    }

    // Set-Cookie 已由浏览器写入；占位 token 仅满足订阅者签名。
    const tokens: AuthTokens = { accessToken: "", refreshToken: "" };
    tokenStore.setTokens(tokens);
    window.dispatchEvent(
      new CustomEvent(tokenRefreshedEvent, { detail: tokens }),
    );
    return tokens;
  }

  async function fetchWithAuth(
    path: string,
    fetchOptions: RequestInit = {},
    skipAuth = false,
  ): Promise<Response> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      "Accept-Language": apiAcceptLanguage,
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Don't set Content-Type for FormData (browser sets it with boundary) or when body is undefined
    if (
      fetchOptions.body !== undefined &&
      !(fetchOptions.body instanceof FormData) &&
      fetchOptions.method !== "DELETE" &&
      fetchOptions.method !== "GET"
    ) {
      headers["Content-Type"] = "application/json";
    }

    if (!skipAuth && !cookieAuth) {
      const token = tokenStore.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(
      url,
      buildApiFetchInit(fetchOptions, headers, credentials),
    );

    if (response.status === 401 && !skipAuth) {
      if (tokenRefreshPaused) {
        throw new ApiError("未授权", 401);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((tokens) => {
            if (!cookieAuth) {
              headers["Authorization"] = `Bearer ${tokens.accessToken}`;
            }
            resolve(
              fetch(url, buildApiFetchInit(fetchOptions, headers, credentials)),
            );
          });
        });
      }

      isRefreshing = true;
      try {
        const tokens = await refreshAccessToken();
        onTokenRefreshed(tokens);
        if (!cookieAuth) {
          headers["Authorization"] = `Bearer ${tokens.accessToken}`;
        }
        return fetch(
          url,
          buildApiFetchInit(fetchOptions, headers, credentials),
        );
      } catch (error) {
        if (shouldClearAuthOnError(error)) {
          tokenStore.clearTokens();
          window.dispatchEvent(new CustomEvent(authLogoutEvent));
        }
        throw error instanceof ApiError ? error : new ApiError("未授权", 401);
      } finally {
        isRefreshing = false;
      }
    }

    return response;
  }

  async function request<T>(
    path: string,
    fetchOptions: RequestInit = {},
    returnResponse = false,
    skipAuth = false,
  ): Promise<T> {
    const response = await fetchWithAuth(path, fetchOptions, skipAuth);

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

  function requestWithParams<T>(
    method: string,
    path: string,
    params?: Record<string, string | number | undefined>,
    body?: unknown,
    skipAuth = false,
  ): Promise<T> {
    const query = buildQueryString(params);
    const fetchOptions: RequestInit = { method };
    if (body !== undefined) {
      fetchOptions.body =
        body instanceof FormData || body instanceof Blob
          ? body
          : JSON.stringify(body);
    }
    return request<T>(`${path}${query}`, fetchOptions, false, skipAuth);
  }

  return {
    request,
    pauseTokenRefresh: () => {
      tokenRefreshPaused = true;
      return () => {
        tokenRefreshPaused = false;
      };
    },
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
      const response = await request<Response>(path, { method: "GET" }, true);
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
      downloadOptions?: { timeoutMs?: number },
    ) => {
      const query = buildQueryString(params);
      const timeoutMs = downloadOptions?.timeoutMs;
      const controller =
        timeoutMs != null && timeoutMs > 0 ? new AbortController() : undefined;
      const timeoutId =
        controller != null
          ? window.setTimeout(() => controller.abort(), timeoutMs)
          : undefined;

      try {
        const response = await request<Response>(
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
      return request<T>(
        `${path}${query}`,
        { method: "POST", body: formData },
        false,
        false,
      );
    },
  };
}

/**
 * 工作台默认实例。token 走 `configureAuthTokenStore` 注入的全局 store，
 * 所以壳层无需知道这里已经工厂化。
 */
export const api: ApiClient = createApiClient({
  tokenStore: {
    getAccessToken,
    getRefreshToken,
    setTokens: setAuthTokens,
    clearTokens: clearAuthTokens,
  },
  refreshPath: "/auth/refresh",
  refreshBodyKey: "refreshToken",
  tokenRefreshedEvent: "tokenRefreshed",
  authLogoutEvent: "authLogout",
});

export const apiRequest: ApiClient["request"] = (
  path,
  options,
  returnResponse,
  skipAuth,
) => api.request(path, options, returnResponse, skipAuth);

/** Pause access-token refresh while swapping auth (e.g. platform impersonation). */
export function pauseTokenRefresh(): () => void {
  return api.pauseTokenRefresh();
}
