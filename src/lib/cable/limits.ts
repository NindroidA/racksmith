// Distance limits for common copper + fiber cables. See
// research-recommendations-engine.md §3.1. CableMediaType (Cat6, OM4, OS2, …)
// is distinct from the wire-style enum used by connectionSchema (ethernet,
// fiber, sfp, …) in src/lib/validators.ts.

export type CableMediaType =
  | "cat5e"
  | "cat6"
  | "cat6a"
  | "cat7"
  | "cat8"
  | "om3"
  | "om4"
  | "om5"
  | "os2"
  | "dac-passive"
  | "dac-active";

export type LinkSpeed =
  | "1G"
  | "2.5G"
  | "5G"
  | "10G"
  | "25G"
  | "40G"
  | "100G"
  | "400G";

type LimitEntry = {
  speed: LinkSpeed;
  maxMeters: number;
  /** Soft warning at 0.85× max — flags long runs that work but are close to spec. */
  softMeters: number;
};

export type CableSpec = {
  type: CableMediaType;
  label: string;
  isFiber: boolean;
  limits: ReadonlyArray<LimitEntry>;
};

const lim = (speed: LinkSpeed, maxMeters: number): LimitEntry => ({
  speed,
  maxMeters,
  softMeters: Math.round(maxMeters * 0.85 * 10) / 10,
});

export const CABLE_SPECS: Readonly<Record<CableMediaType, CableSpec>> = {
  cat5e: {
    type: "cat5e",
    label: "Cat5e",
    isFiber: false,
    limits: [lim("1G", 100), lim("2.5G", 100)],
  },
  cat6: {
    type: "cat6",
    label: "Cat6",
    isFiber: false,
    // 10G on Cat6 is conservatively rated at 33 m
    limits: [lim("1G", 100), lim("2.5G", 100), lim("5G", 100), lim("10G", 33)],
  },
  cat6a: {
    type: "cat6a",
    label: "Cat6a",
    isFiber: false,
    limits: [lim("1G", 100), lim("2.5G", 100), lim("5G", 100), lim("10G", 100)],
  },
  cat7: {
    type: "cat7",
    label: "Cat7",
    isFiber: false,
    limits: [lim("1G", 100), lim("10G", 100)],
  },
  cat8: {
    type: "cat8",
    label: "Cat8",
    isFiber: false,
    limits: [lim("25G", 30), lim("40G", 30)],
  },
  om3: {
    type: "om3",
    label: "OM3 multimode",
    isFiber: true,
    limits: [
      lim("1G", 1000),
      lim("10G", 300),
      lim("40G", 100),
      lim("100G", 70),
    ],
  },
  om4: {
    type: "om4",
    label: "OM4 multimode",
    isFiber: true,
    limits: [
      lim("1G", 1100),
      lim("10G", 400),
      lim("40G", 150),
      lim("100G", 100),
      lim("400G", 100),
    ],
  },
  om5: {
    type: "om5",
    label: "OM5 multimode",
    isFiber: true,
    limits: [lim("100G", 100), lim("400G", 100)],
  },
  os2: {
    type: "os2",
    label: "OS2 singlemode",
    isFiber: true,
    limits: [lim("10G", 10000), lim("100G", 10000), lim("400G", 2000)],
  },
  "dac-passive": {
    type: "dac-passive",
    label: "DAC (passive)",
    isFiber: false,
    limits: [lim("10G", 7), lim("25G", 5), lim("100G", 3)],
  },
  "dac-active": {
    type: "dac-active",
    label: "DAC (active)",
    isFiber: false,
    limits: [lim("10G", 15), lim("25G", 10), lim("100G", 7)],
  },
};

// Standard purchase lengths for "snap up to next" suggestions (meters).
export const STANDARD_PURCHASE_LENGTHS_M: ReadonlyArray<number> = [
  0.5, 1, 2, 3, 5, 7, 10, 15, 25, 50, 100,
];

export function findLimit(
  type: CableMediaType,
  speed: LinkSpeed,
): LimitEntry | undefined {
  return CABLE_SPECS[type]?.limits.find((l) => l.speed === speed);
}
