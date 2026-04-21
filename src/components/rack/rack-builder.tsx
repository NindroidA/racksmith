"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { RackVisualizer } from "./rack-visualizer";
import type { VisualizerDevice, DropPayload } from "./types";
import {
  DevicePalette,
  type PaletteCatalogItem,
  type PaletteUnrackedDevice,
} from "./device-palette";
import {
  placeCatalogDevice,
  placeExistingDevice,
  removeDeviceFromRack,
} from "@/app/(dashboard)/racks/actions";
import { deleteDevice } from "@/app/(dashboard)/devices/actions";

type Props = {
  rackId: string;
  rackSizeU: number;
  devices: VisualizerDevice[];
  catalog: PaletteCatalogItem[];
  unracked: PaletteUnrackedDevice[];
};

export function RackBuilder({
  rackId,
  rackSizeU,
  devices,
  catalog,
  unracked,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDrop(positionU: number, payload: DropPayload) {
    if (pending) return;

    startTransition(async () => {
      try {
        if (payload.kind === "catalog") {
          const result = await placeCatalogDevice({
            rackId,
            catalogId: payload.catalogId,
            positionU,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Device added to rack");
        } else {
          const result = await placeExistingDevice({
            rackId,
            deviceId: payload.deviceId,
            positionU,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Device placed");
        }
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to place device",
        );
      }
    });
  }

  function handleRemove(deviceId: string) {
    startTransition(async () => {
      try {
        const result = await removeDeviceFromRack(deviceId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Device removed from rack");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to remove");
      }
    });
  }

  function handleDelete(deviceId: string) {
    startTransition(async () => {
      try {
        const result = await deleteDevice(deviceId);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Device deleted");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <RackVisualizer
          rackSizeU={rackSizeU}
          devices={devices}
          onDrop={handleDrop}
          onRemove={handleRemove}
          onDelete={handleDelete}
        />
      </div>
      <div className="h-[calc(100vh-12rem)] lg:sticky lg:top-6">
        <DevicePalette catalog={catalog} unracked={unracked} />
      </div>
    </div>
  );
}
