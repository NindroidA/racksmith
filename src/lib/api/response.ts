export const API_ERROR_CODES = [
  "unauthorized",
  "forbidden",
  "tier_limit_reached",
  "rate_limit_exceeded",
  "validation_failed",
  "not_found",
  "conflict",
  "unsupported_media_type",
  "internal_error",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export type FieldError = { path: string; message: string };

export type ApiError = {
  status: number;
  body: {
    error: {
      code: ApiErrorCode;
      message: string;
      fields: FieldError[];
      requestId: string; // filled by the factory before send
    };
  };
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  fields: FieldError[] = [],
): ApiError {
  return {
    status,
    body: { error: { code, message, fields, requestId: "" } },
  };
}

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
};

export function rateLimitHeaders(info: RateLimitInfo): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(info.limit),
    "X-RateLimit-Remaining": String(Math.max(0, info.remaining)),
    "X-RateLimit-Reset": String(info.resetAt),
  };
  if (info.remaining <= 0) {
    const retryAfter = Math.max(1, info.resetAt - Math.floor(Date.now() / 1000));
    headers["Retry-After"] = String(retryAfter);
  }
  return headers;
}

export function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  rateLimit?: RateLimitInfo,
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
  };
  if (rateLimit) Object.assign(headers, rateLimitHeaders(rateLimit));
  return new Response(JSON.stringify(body), { status, headers });
}
