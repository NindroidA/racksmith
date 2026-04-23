import "server-only";
import { z } from "zod";
import { withTenant } from "@/lib/prisma-tenant";
import { TIER_LIMITS } from "@/lib/tiers";
import { requireApiKey, type ApiKeyAuthContext } from "./api-key-auth";
import { checkAndRecord } from "./rate-limit";
import {
  apiError,
  jsonResponse,
  rateLimitHeaders,
  type ApiError,
} from "./response";
import { prisma } from "@/lib/prisma";

type HandlerArgs<TBody> = {
  body: TBody;
  params: Record<string, string>;
  ctx: ApiKeyAuthContext;
  searchParams: URLSearchParams;
};

export type ApiRouteConfig<TBody, TResp> = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  auth: "member" | "admin";
  rateLimitWeight?: number;
  bodySchema?: z.ZodType<TBody>;
  responseSchema: z.ZodType<TResp>;
  summary: string;
  description?: string;
  handler: (args: HandlerArgs<TBody>) => Promise<TResp | ApiError>;
};

function genRequestId(): string {
  // cuid shape would require @paralleldrive/cuid2; crypto.randomUUID is
  // always available in Next.js + Bun and is a valid ApiRequestLog.id.
  return crypto.randomUUID();
}

export function createApiRoute<TBody = unknown, TResp = unknown>(
  config: ApiRouteConfig<TBody, TResp>,
) {
  return async function routeHandler(
    req: Request,
    { params }: { params: Promise<Record<string, string>> },
  ): Promise<Response> {
    const requestId = genRequestId();
    const resolvedParams = await params;

    const finalize = (
      err: ApiError,
      rateInfo?: {
        limit: number;
        remaining: number;
        resetAt: number;
      },
    ) => {
      err.body.error.requestId = requestId;
      return jsonResponse(err.body, err.status, requestId, rateInfo);
    };

    // 1-5. Auth + tier + role
    const auth = await requireApiKey(req, config.auth);
    if (!auth.ok) return finalize(auth.error);
    const ctx = auth.ctx;

    // 6-8. Rate limit (inside withTenant since ApiRequestLog is tenant-scoped)
    const weight = config.rateLimitWeight ?? 1;
    const quota = TIER_LIMITS[ctx.plan].apiRateLimitPerMinute;
    const rateResult = await withTenant(ctx.organizationId, (tx) =>
      checkAndRecord(tx, {
        apiKeyId: ctx.apiKeyId,
        organizationId: ctx.organizationId,
        quotaPerMinute: quota,
        weight,
        requestId,
        method: req.method,
        path: new URL(req.url).pathname,
        responseStatus: 200, // pre-handler snapshot; see rate-limit.ts docstring
      }),
    );
    const rateInfo = {
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

    // 9. Content-Type check (writes only)
    if (["POST", "PATCH"].includes(req.method)) {
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

    // 10. Body parse
    let body: TBody = undefined as any;
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

    // 11. Handler
    const searchParams = new URL(req.url).searchParams;
    let handlerResult: TResp | ApiError;
    try {
      handlerResult = await config.handler({
        body,
        params: resolvedParams,
        ctx,
        searchParams,
      });
    } catch (err) {
      console.error("[api-v1] handler threw", { requestId, err });
      return finalize(
        apiError("internal_error", "An unexpected error occurred", 500),
        rateInfo,
      );
    }

    // Handlers can return an ApiError to signal not-found / conflict / etc.
    if (
      handlerResult &&
      typeof handlerResult === "object" &&
      "status" in handlerResult &&
      "body" in handlerResult
    ) {
      return finalize(handlerResult as ApiError, rateInfo);
    }

    // 12. Response-schema strip (whitelist)
    const stripped = config.responseSchema.parse(handlerResult);

    // 13. Best-effort lastUsedAt update (non-blocking — fire and forget).
    void prisma.apiKey
      .update({
        where: { id: ctx.apiKeyId },
        data: { lastUsedAt: new Date() },
      })
      .catch((e) => console.warn("[api-v1] lastUsedAt update failed", e));

    // 14. Return
    const status =
      req.method === "DELETE" ? 204 : req.method === "POST" ? 201 : 200;
    if (status === 204) {
      return new Response(null, {
        status: 204,
        headers: {
          "X-Request-Id": requestId,
          ...rateLimitHeaders(rateInfo),
        },
      });
    }
    return jsonResponse(stripped, status, requestId, rateInfo);
  };
}
