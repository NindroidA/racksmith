import "server-only";
import { z } from "zod";
import { withTenant } from "@/lib/prisma-tenant";
import { TIER_LIMITS } from "@/lib/tiers";
import { requireApiKey, type ApiKeyAuthContext } from "./api-key-auth";
import { requireSessionMember, type SessionAuthContext } from "./session-auth";
import { checkAndRecord } from "./rate-limit";
import {
  apiError,
  jsonResponse,
  rateLimitHeaders,
  type ApiError,
  type RateLimitInfo,
} from "./response";
import { prisma } from "@/lib/prisma";

/**
 * Auth modes supported by `createApiRoute`. Each mode controls which
 * principal the request is authenticated as and which side-channels (rate
 * limit, ApiRequestLog accounting) the factory engages.
 *
 *   - "public"          — no auth; rate limit / accounting skipped. Used
 *                          only by `/api/health`.
 *   - "member" | "admin" — Bearer API key (paid surface). Rate-limited
 *                          per-key; logs to `ApiRequestLog`.
 *   - "session-member" | "session-admin" — BetterAuth session cookie
 *                          (internal/dashboard surface). No rate limit;
 *                          no ApiRequestLog write.
 */
export type ApiAuthMode =
  | "public"
  | "member"
  | "admin"
  | "session-member"
  | "session-admin";

/**
 * Context shape passed to handlers, narrowed by auth mode at the type
 * level so handlers see exactly the fields available for their mode
 * without runtime tags.
 */
export type AuthContextFor<A extends ApiAuthMode> = A extends "public"
  ? Record<string, never>
  : A extends "member" | "admin"
    ? ApiKeyAuthContext
    : A extends "session-member" | "session-admin"
      ? SessionAuthContext
      : never;

type HandlerArgs<TBody, A extends ApiAuthMode> = {
  body: TBody;
  params: Record<string, string>;
  ctx: AuthContextFor<A>;
  searchParams: URLSearchParams;
  request: Request;
};

type CommonConfig<A extends ApiAuthMode, TBody> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  auth: A;
  rateLimitWeight?: number;
  bodySchema?: z.ZodType<TBody>;
  summary: string;
  description?: string;
};

type JsonConfig<A extends ApiAuthMode, TBody, TResp> = CommonConfig<A, TBody> & {
  responseShape?: "json";
  responseSchema: z.ZodType<TResp>;
  handler: (args: HandlerArgs<TBody, A>) => Promise<TResp | ApiError>;
};

type PassthroughConfig<A extends ApiAuthMode, TBody> = CommonConfig<A, TBody> & {
  responseShape: "passthrough";
  handler: (args: HandlerArgs<TBody, A>) => Promise<Response | ApiError>;
};

export type ApiRouteConfig<A extends ApiAuthMode, TBody, TResp> =
  | JsonConfig<A, TBody, TResp>
  | PassthroughConfig<A, TBody>;

function genRequestId(): string {
  // cuid shape would require @paralleldrive/cuid2; crypto.randomUUID is
  // always available in Next.js + Bun and is a valid ApiRequestLog.id.
  return crypto.randomUUID();
}

// Discriminate ApiError (plain object literal) from a passthrough
// `Response` instance. Both have `status` and `body`, so the in-keys
// check alone isn't enough.
function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  if (value instanceof Response) return false;
  return (
    "status" in value &&
    "body" in value &&
    typeof (value as { status: unknown }).status === "number"
  );
}

export function createApiRoute<
  A extends ApiAuthMode,
  TBody = unknown,
  TResp = unknown,
>(config: ApiRouteConfig<A, TBody, TResp>) {
  return async function routeHandler(
    req: Request,
    { params }: { params: Promise<Record<string, string>> },
  ): Promise<Response> {
    const requestId = genRequestId();
    const resolvedParams = await params;

    const finalize = (err: ApiError, rateInfo?: RateLimitInfo) => {
      err.body.error.requestId = requestId;
      return jsonResponse(err.body, err.status, requestId, rateInfo);
    };

    // 1. Auth — branch by mode. `isApiKey` controls whether downstream
    //    sections (rate limit, ApiRequestLog, lastUsedAt update) run.
    let ctx: AuthContextFor<A>;
    let isApiKey = false;
    if (config.auth === "public") {
      ctx = {} as AuthContextFor<A>;
    } else if (config.auth === "member" || config.auth === "admin") {
      const auth = await requireApiKey(req, config.auth);
      if (!auth.ok) return finalize(auth.error);
      ctx = auth.ctx as AuthContextFor<A>;
      isApiKey = true;
    } else {
      // "session-member" | "session-admin"
      const minRole = config.auth === "session-admin" ? "admin" : "member";
      const auth = await requireSessionMember(minRole);
      if (!auth.ok) return finalize(auth.error);
      ctx = auth.ctx as AuthContextFor<A>;
    }

    // 2. Rate limit + ApiRequestLog accounting — API-key paths only.
    let rateInfo: RateLimitInfo | undefined;
    if (isApiKey) {
      const apiKeyCtx = ctx as ApiKeyAuthContext;
      const weight = config.rateLimitWeight ?? 1;
      const quota = TIER_LIMITS[apiKeyCtx.plan].apiRateLimitPerMinute;
      const rateResult = await withTenant(apiKeyCtx.organizationId, (tx) =>
        checkAndRecord(tx, {
          apiKeyId: apiKeyCtx.apiKeyId,
          organizationId: apiKeyCtx.organizationId,
          quotaPerMinute: quota,
          weight,
          requestId,
          method: req.method,
          path: new URL(req.url).pathname,
          responseStatus: 200, // pre-handler snapshot; see rate-limit.ts docstring
        }),
      );
      rateInfo = {
        limit: quota,
        remaining: rateResult.remaining,
        resetAt: rateResult.resetAt,
      };
      if (!rateResult.allowed) {
        return finalize(
          apiError("rate_limit_exceeded", "Rate limit exceeded", 429),
          rateInfo,
        );
      }
    }

    // 3. Content-Type check (writes only)
    if (req.method === "POST" || req.method === "PATCH") {
      const ct = req.headers.get("content-type") ?? "";
      if (!ct.toLowerCase().startsWith("application/json")) {
        return finalize(
          apiError(
            "unsupported_media_type",
            "Content-Type must be application/json",
            415,
          ),
          rateInfo,
        );
      }
    }

    // 4. Body parse
    let body: TBody = undefined as unknown as TBody;
    if (config.bodySchema) {
      let raw: unknown;
      try {
        raw = await req.json();
      } catch {
        return finalize(
          apiError("validation_failed", "Invalid JSON body", 400),
          rateInfo,
        );
      }
      const parsed = config.bodySchema.safeParse(raw);
      if (!parsed.success) {
        const fields = parsed.error.issues.map((iss) => ({
          path: iss.path.join("."),
          message: iss.message,
        }));
        return finalize(
          apiError("validation_failed", "Input failed validation", 400, fields),
          rateInfo,
        );
      }
      body = parsed.data;
    }

    // 5. Handler
    const searchParams = new URL(req.url).searchParams;
    const handlerArgs: HandlerArgs<TBody, A> = {
      body,
      params: resolvedParams,
      ctx,
      searchParams,
      request: req,
    };

    let handlerResult: TResp | ApiError | Response;
    try {
      handlerResult = (await config.handler(handlerArgs)) as
        | TResp
        | ApiError
        | Response;
    } catch (err) {
      console.error("[api] handler threw", { requestId, err });
      return finalize(
        apiError("internal_error", "An unexpected error occurred", 500),
        rateInfo,
      );
    }

    // 6. ApiError short-circuit (works for both json and passthrough)
    if (isApiError(handlerResult)) {
      return finalize(handlerResult, rateInfo);
    }

    // 7. Best-effort lastUsedAt update — fire-and-forget. Only API-key
    //    flows track this column.
    if (isApiKey) {
      const apiKeyCtx = ctx as ApiKeyAuthContext;
      void prisma.apiKey
        .update({
          where: { id: apiKeyCtx.apiKeyId },
          data: { lastUsedAt: new Date() },
        })
        .catch((e) => console.warn("[api] lastUsedAt update failed", e));
    }

    // 8a. Passthrough mode — handler owns body + status; we only attach
    //     X-Request-Id (and rate headers when API-key auth is in play).
    if (config.responseShape === "passthrough") {
      const resp = handlerResult as Response;
      const headers = new Headers(resp.headers);
      headers.set("X-Request-Id", requestId);
      if (rateInfo) {
        for (const [k, v] of Object.entries(rateLimitHeaders(rateInfo))) {
          headers.set(k, v);
        }
      }
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    }

    // 8b. JSON mode — schema-strip the body, choose status by method.
    const stripped = config.responseSchema.parse(handlerResult);
    const status =
      req.method === "DELETE" ? 204 : req.method === "POST" ? 201 : 200;
    if (status === 204) {
      return new Response(null, {
        status: 204,
        headers: {
          "X-Request-Id": requestId,
          ...(rateInfo ? rateLimitHeaders(rateInfo) : {}),
        },
      });
    }
    return jsonResponse(stripped, status, requestId, rateInfo);
  };
}
