import { ref } from "vue";
import type { APIError, LoadingState } from "../types";

const BASE_URL = "/api";

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
}

export function useAPI() {
  const loading = ref<LoadingState>("idle");
  const error = ref<APIError | null>(null);

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { method = "GET", body, headers: extraHeaders, ...rest } = options;

    loading.value = "loading";
    error.value = null;

    const headers: Record<string, string> = {
      ...(extraHeaders as Record<string, string>),
    };

    if (body && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body
              ? JSON.stringify(body)
              : undefined,
        ...rest,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({
          detail: res.statusText,
          code: "UNKNOWN",
        }));
        const apiErr: APIError = {
          detail: errBody.detail || res.statusText,
          code: errBody.code || `HTTP_${res.status}`,
        };
        error.value = apiErr;
        throw apiErr;
      }

      if (res.status === 204) return undefined as T;

      const data: T = await res.json();
      loading.value = "success";
      return data;
    } catch (err) {
      loading.value = "error";
      if (!error.value && err instanceof Error) {
        error.value = { detail: err.message, code: "FETCH_ERROR" };
      }
      throw err;
    }
  }

  function get<T>(path: string, opts?: RequestOptions) {
    return request<T>(path, { method: "GET", ...opts });
  }

  function post<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(path, { method: "POST", body, ...opts });
  }

  function put<T>(path: string, body?: unknown, opts?: RequestOptions) {
    return request<T>(path, { method: "PUT", body, ...opts });
  }

  function del<T>(path: string, opts?: RequestOptions) {
    return request<T>(path, { method: "DELETE", ...opts });
  }

  return { loading, error, request, get, post, put, del };
}
