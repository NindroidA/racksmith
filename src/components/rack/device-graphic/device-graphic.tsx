import type { ComponentType } from "react";
import { BRAND_PALETTES, getBrandPalette } from "./brand-palette";
import { MODEL_SPECIFIC } from "./models";
import { SwitchFaceplate } from "./types/switch";
import { ServerFaceplate } from "./types/server";
import { UpsFaceplate } from "./types/ups";
import { RouterFaceplate } from "./types/router";
import { FirewallFaceplate } from "./types/firewall";
import { PatchPanelFaceplate } from "./types/patch-panel";
import { PduFaceplate } from "./types/pdu";
import { StorageFaceplate } from "./types/storage";
import { OtherFaceplate } from "./types/other";

export type DeviceGraphicProps = {
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  portCount: number;
  powerWatts?: number | null;
  /** UPS-specific: show VA rating */
  vaRating?: string;
  /** UPS-specific: battery level 0-100 */
  batteryLevel?: number;
  /** PDU-specific: outlet count */
  outletCount?: number;
  /** PDU-specific: show amperage LCD */
  metered?: boolean;
};

/**
 * Phase A v2 dispatch: prefer per-model components from `models/MODEL_SPECIFIC`
 * (keyed `manufacturer:model`); fall back to the type-based template, and
 * finally to the catch-all `OtherFaceplate`. Returning `null` means "use the
 * type template" — the caller (`DeviceGraphic`) does the type switch in that
 * case so the per-type templates' own prop derivations stay in one place.
 *
 * Pure function — no React state, no closures over runtime values. The
 * catalog provides `manufacturer` + `model` strings exactly as the user
 * (or seed) entered them; lookup case-folds the manufacturer side only,
 * matching how `BRAND_PALETTES` is keyed. Manufacturers that aren't in
 * `BRAND_PALETTES` are rejected up-front, even if a `MODEL_SPECIFIC` entry
 * exists — per-model components depend on a real palette, so an unknown
 * vendor must fall through to the type-template path.
 */
export function pickModelComponent(
  manufacturer: string,
  model: string,
): ComponentType<DeviceGraphicProps> | null {
  if (!manufacturer || !model) return null;
  const mfr = manufacturer.toLowerCase();
  if (!(mfr in BRAND_PALETTES)) return null;
  const key = `${mfr}:${model}`;
  return MODEL_SPECIFIC[key] ?? null;
}

/**
 * DeviceGraphic — single entry point. Routes (manufacturer + model) to a
 * per-model component when available, otherwise routes deviceType to the
 * matching faceplate template. Apply CSS `aspect-ratio: 10.86 / sizeU` on
 * the container.
 */
export function DeviceGraphic(props: DeviceGraphicProps) {
  const ModelComponent = pickModelComponent(props.manufacturer, props.model);
  if (ModelComponent) return <ModelComponent {...props} />;

  const palette = getBrandPalette(props.manufacturer);
  const { deviceType, manufacturer, model, sizeU, portCount } = props;
  const type = deviceType.toLowerCase();

  switch (type) {
    case "switch":
      return (
        <SwitchFaceplate
          palette={palette}
          manufacturer={manufacturer}
          portCount={portCount || 24}
          sizeU={sizeU}
          sfpCount={portCount >= 24 ? 4 : 2}
          hasPoE={/poe/i.test(model) || /poe/i.test(manufacturer)}
          model={model}
        />
      );

    case "router":
      return (
        <RouterFaceplate
          palette={palette}
          manufacturer={manufacturer}
          portCount={portCount || 8}
          sizeU={sizeU}
          model={model}
        />
      );

    case "firewall":
      return (
        <FirewallFaceplate
          palette={palette}
          manufacturer={manufacturer}
          portCount={portCount || 8}
          sizeU={sizeU}
          model={model}
        />
      );

    case "server":
      return (
        <ServerFaceplate
          palette={palette}
          manufacturer={manufacturer}
          sizeU={sizeU}
          model={model}
        />
      );

    case "storage":
      return (
        <StorageFaceplate
          palette={palette}
          manufacturer={manufacturer}
          sizeU={sizeU}
          model={model}
        />
      );

    case "ups":
      return (
        <UpsFaceplate
          palette={palette}
          sizeU={sizeU}
          batteryLevel={props.batteryLevel ?? 100}
          vaRating={
            props.vaRating ??
            (model && /\d+VA/i.test(model)
              ? model.match(/\d+VA/i)?.[0]
              : undefined)
          }
          model={model}
        />
      );

    case "patch_panel":
      return (
        <PatchPanelFaceplate
          palette={palette}
          portCount={portCount || 24}
          sizeU={sizeU}
          model={model}
        />
      );

    case "pdu":
      return (
        <PduFaceplate
          palette={palette}
          sizeU={sizeU || 1}
          outletCount={props.outletCount ?? portCount ?? 8}
          metered={props.metered ?? false}
          model={model}
        />
      );

    default:
      return (
        <OtherFaceplate
          palette={palette}
          sizeU={sizeU}
          deviceType={deviceType}
          model={model}
        />
      );
  }
}
