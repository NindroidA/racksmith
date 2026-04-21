import type { Metadata } from "next";
import { SubnetCalcClient } from "@/components/network-tools/subnet-calc-client";

export const metadata: Metadata = {
  title: "Subnet Calculator",
  description:
    "IPv4 + IPv6 subnet calculator. Compute network, broadcast, usable ranges, and split into VLSM subnets.",
};

export default function SubnetCalcPage() {
  return <SubnetCalcClient />;
}
