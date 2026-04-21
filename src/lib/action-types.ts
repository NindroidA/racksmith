export type TierLimitInfo = {
  resource: string;
  plan: string;
  current: number;
  max: number;
};

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; limit?: TierLimitInfo };
