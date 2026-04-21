export type VisualizerDevice = {
  id: string;
  name: string;
  deviceType: string;
  manufacturer: string;
  model: string;
  sizeU: number;
  positionU: number;
  portCount: number;
};

export type DropPayload =
  | { kind: "catalog"; catalogId: string; sizeU: number }
  | { kind: "existing"; deviceId: string; sizeU: number };
