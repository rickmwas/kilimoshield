export interface HttpApiError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export class ApiRequestError extends Error implements HttpApiError {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor(error: HttpApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
    this.requestId = error.requestId;
  }
}

export interface JsonRequestOptions
  extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
  retries?: number;
  idempotencyKey?: string;
  validate?: (value: unknown) => boolean;
}

export interface JsonHttpClient {
  request<T>(path: string, options?: JsonRequestOptions): Promise<T>;
}

export interface JsonHttpClientConfig {
  baseUrl?: string;
  getAccessToken?: () => Promise<string | undefined>;
  timeoutMs?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readErrorField = (
  value: unknown,
  key: "code" | "message" | "requestId",
): string | undefined => {
  if (!isRecord(value)) return undefined;
  const item = value[key];
  return typeof item === "string" ? item : undefined;
};

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function createJsonHttpClient(
  config: JsonHttpClientConfig = {},
): JsonHttpClient {
  const viteEnv = import.meta.env as ImportMetaEnv & {
    VITE_KILIMO_API_BASE_URL?: string;
  };
  const baseUrl = (
    config.baseUrl ?? viteEnv.VITE_KILIMO_API_BASE_URL ?? ""
  ).replace(/\/+$/, "");
  const defaultTimeout = config.timeoutMs ?? 15_000;

  return {
    async request<T>(
      path: string,
      options: JsonRequestOptions = {},
    ): Promise<T> {
      if (!baseUrl) {
        throw new ApiRequestError({
          status: 0,
          code: "API_NOT_CONFIGURED",
          message:
            "The KilimoShield API is not configured. The demo uses local sample data.",
        });
      }
      if (!path.startsWith("/")) {
        throw new ApiRequestError({
          status: 0,
          code: "INVALID_API_PATH",
          message: "API paths must begin with a slash.",
        });
      }

      const {
        body,
        headers: inputHeaders,
        timeoutMs = defaultTimeout,
        retries = 0,
        idempotencyKey,
        validate,
        signal: callerSignal,
        ...requestInit
      } = options;
      const method = (requestInit.method ?? "GET").toUpperCase();
      const mayRetry = method === "GET" || Boolean(idempotencyKey);
      const maxRetries = mayRetry ? Math.min(Math.max(retries, 0), 2) : 0;
      const url = `${baseUrl}${path}`;

      for (let attempt = 0; ; attempt += 1) {
        const controller = new AbortController();
        const timeout = window.setTimeout(
          () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
          timeoutMs,
        );
        const abortFromCaller = () => controller.abort(callerSignal?.reason);
        if (callerSignal?.aborted) abortFromCaller();
        callerSignal?.addEventListener("abort", abortFromCaller, { once: true });

        const headers = new Headers(inputHeaders);
        headers.set("Accept", "application/json");
        if (body !== undefined && !(body instanceof FormData)) {
          headers.set("Content-Type", "application/json");
        }
        if (idempotencyKey) headers.set("Idempotency-Key", idempotencyKey);
        const accessToken = await config.getAccessToken?.();
        if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

        try {
          const response = await fetch(url, {
            ...requestInit,
            method,
            headers,
            body:
              body === undefined
                ? undefined
                : body instanceof FormData
                  ? body
                  : JSON.stringify(body),
            signal: controller.signal,
          });
          const contentType = response.headers.get("content-type") ?? "";
          const payload: unknown =
            response.status === 204
              ? undefined
              : contentType.includes("application/json")
                ? await response.json()
                : await response.text();

          if (!response.ok) {
            const error = new ApiRequestError({
              status: response.status,
              code: readErrorField(payload, "code") ?? "HTTP_ERROR",
              message:
                readErrorField(payload, "message") ??
                readErrorField(payload, "error") ??
                `The request failed with status ${response.status}.`,
              details: isRecord(payload) ? payload.details : payload,
              requestId:
                readErrorField(payload, "requestId") ??
                response.headers.get("x-request-id") ??
                undefined,
            });
            if (
              attempt < maxRetries &&
              [502, 503, 504].includes(response.status)
            ) {
              await wait(250 * 2 ** attempt);
              continue;
            }
            throw error;
          }

          if (validate && !validate(payload)) {
            throw new ApiRequestError({
              status: response.status,
              code: "INVALID_API_RESPONSE",
              message: "The API response did not match the expected data shape.",
              details: payload,
              requestId: response.headers.get("x-request-id") ?? undefined,
            });
          }
          return payload as T;
        } catch (error) {
          if (
            error instanceof ApiRequestError &&
            ![502, 503, 504].includes(error.status)
          ) {
            throw error;
          }
          if (attempt < maxRetries) {
            await wait(250 * 2 ** attempt);
            continue;
          }
          if (error instanceof ApiRequestError) throw error;
          if (controller.signal.aborted) {
            throw new ApiRequestError({
              status: 0,
              code:
                controller.signal.reason instanceof DOMException &&
                controller.signal.reason.name === "TimeoutError"
                  ? "REQUEST_TIMEOUT"
                  : "REQUEST_ABORTED",
              message:
                controller.signal.reason instanceof DOMException &&
                controller.signal.reason.name === "TimeoutError"
                  ? "The API request timed out. Try again."
                  : "The API request was cancelled.",
            });
          }
          throw new ApiRequestError({
            status: 0,
            code: "NETWORK_ERROR",
            message: "The API could not be reached. Check the connection and try again.",
            details: error,
          });
        } finally {
          window.clearTimeout(timeout);
          callerSignal?.removeEventListener("abort", abortFromCaller);
        }
      }
    },
  };
}
