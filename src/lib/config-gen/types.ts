export type ConfigGenVendor = "cisco-ios" | "unifi" | "hpe-aruba";

export type VlanForConfig = {
  vlanId: number;
  name: string;
  description: string;
  purpose: string;
};

export type PortAssignment = {
  portNumber: number;
  mode: "access" | "trunk" | "native";
  tagged: boolean;
};

export type ConfigGenInput = {
  vendor: ConfigGenVendor;
  device: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    portCount: number;
  };
  vlans: VlanForConfig[];
  assignments: Array<{
    vlanId: number;
    vlanName: string;
    portNumber: number | null;
    mode: "access" | "trunk" | "native";
    tagged: boolean;
  }>;
};

export type ConfigGenOutput = {
  vendor: ConfigGenVendor;
  text: string;
  warnings: string[];
};
