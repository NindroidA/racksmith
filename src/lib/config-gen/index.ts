import { generateCiscoIos } from "./cisco-ios";
import { generateHpeAruba } from "./hpe-aruba";
import { generateUnifi } from "./unifi";
import type {
  ConfigGenInput,
  ConfigGenOutput,
  ConfigGenVendor,
} from "./types";

export * from "./types";
export { generateCiscoIos, generateUnifi, generateHpeAruba };

export const VENDOR_LABELS: Record<ConfigGenVendor, string> = {
  "cisco-ios": "Cisco IOS",
  unifi: "UniFi JSON",
  "hpe-aruba": "HPE Aruba ProVision",
};

export function generateConfig(input: ConfigGenInput): ConfigGenOutput {
  switch (input.vendor) {
    case "cisco-ios":
      return generateCiscoIos(input);
    case "unifi":
      return generateUnifi(input);
    case "hpe-aruba":
      return generateHpeAruba(input);
  }
}
