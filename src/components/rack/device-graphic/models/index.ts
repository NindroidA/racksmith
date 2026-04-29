/**
 * Per-model faceplate components live in this directory. Each Tier 1
 * SKU from `.plans/2026-04-24/02-device-graphic-v2-plan.md` gets its
 * own file here (e.g. `udm-pro.tsx`, `c9300-48p.tsx`). Phase A ships
 * the dispatch infrastructure with this map empty; subsequent phases
 * (B, C) populate it model-by-model.
 *
 * The dispatch key is `${manufacturer.toLowerCase()}:${model}` exactly
 * — no normalization, no case-folding on the model side. The catalog's
 * model strings (e.g. "UDM-Pro", "C9300-48P", "R750") are the source
 * of truth.
 */
import type { ComponentType } from "react";
import type { DeviceGraphicProps } from "../device-graphic";
import { UdmPro } from "./udm-pro";
import { UswPro48Poe } from "./usw-pro-48-poe";
import { UswEnterprise24Poe } from "./usw-enterprise-24-poe";
import { UswAggregation } from "./usw-aggregation";

export const MODEL_SPECIFIC: Record<
  string,
  ComponentType<DeviceGraphicProps>
> = {
  "ubiquiti:UDM-Pro": UdmPro,
  "ubiquiti:USW-Pro-48-PoE": UswPro48Poe,
  "ubiquiti:USW-Enterprise-24-PoE": UswEnterprise24Poe,
  "ubiquiti:USW-Aggregation": UswAggregation,
};
