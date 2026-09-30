import type { API } from "stoat-api";

/**
 * Bot slash command registered on a server
 */
export type Command = {
  /**
   * Command Id
   */
  id: string;
  /**
   * The name of the command (without leading slash)
   */
  name: string;
  /**
   * Short description of what the command does
   */
  description?: string | null;
  /**
   * The server this command is registered on (None = global)
   */
  server_id?: string | null;
  /**
   * Bot user that owns this command
   */
  owner_id: string;
};

/**
 * Data to create or update a command
 */
export type DataCreateCommand = {
  /**
   * Short description of what the command does
   */
  description?: string | null;
};

/**
 * Request options for routes stoat-api does not know about
 */
type UntypedRequestConfig = { headers?: Record<string, string> };

/**
 * API client for routes stoat-api does not know about
 */
export type UntypedAPI = {
  get(path: string, query?: object): Promise<unknown>;
  post(
    path: string,
    body?: unknown,
    config?: UntypedRequestConfig,
  ): Promise<unknown>;
  put(path: string, body?: unknown): Promise<unknown>;
  patch(path: string, body?: unknown): Promise<unknown>;
  delete(path: string, query?: object): Promise<unknown>;
};

/**
 * Create an API client for routes stoat-api does not know about
 * @param api Typed API client (provides base URL and authentication)
 * @returns Untyped API client
 */
export function createUntypedAPI(api: API): UntypedAPI {
  async function req(
    method: string,
    path: string,
    query?: object,
    body?: unknown,
    config?: UntypedRequestConfig,
  ) {
    const { baseURL, headers } = api.config;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (typeof value === "undefined") continue;
      for (const entry of Array.isArray(value) ? value : [value]) {
        params.append(key, String(entry));
      }
    }

    const search = params.toString();
    const response = await fetch(
      baseURL + path + (search ? `?${search}` : ""),
      {
        method,
        headers: {
          ...(typeof body === "undefined"
            ? {}
            : { "Content-Type": "application/json" }),
          ...config?.headers,
          ...headers,
        },
        body: typeof body === "undefined" ? undefined : JSON.stringify(body),
      },
    );

    const data = response.status === 204 ? null : await response.text();
    if (!response.ok) throw data;
    return data ? JSON.parse(data) : null;
  }

  return {
    get: (path, query) => req("GET", path, query),
    post: (path, body, config) => req("POST", path, undefined, body, config),
    put: (path, body) => req("PUT", path, undefined, body),
    patch: (path, body) => req("PATCH", path, undefined, body),
    delete: (path, query) => req("DELETE", path, query),
  };
}
