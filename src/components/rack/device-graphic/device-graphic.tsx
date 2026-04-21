import { getBrandPalette } from "./brand-palette";
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
 * DeviceGraphic — single entry point. Routes deviceType → correct faceplate.
 * Apply CSS `aspect-ratio: 10.86 / sizeU` on the container.
 */
export function DeviceGraphic({
  deviceType,
  manufacturer,
  model,
  sizeU,
  portCount,
  vaRating,
  batteryLevel,
  outletCount,
  metered,
}: DeviceGraphicProps) {
  const palette = getBrandPalette(manufacturer);
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
          batteryLevel={batteryLevel ?? 100}
          vaRating={vaRating ?? (model && /\d+VA/i.test(model) ? model.match(/\d+VA/i)?.[0] : undefined)}
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
          outletCount={outletCount ?? portCount ?? 8}
          metered={metered ?? false}
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
