import type { ColorTag } from "@/types";

export type RackTemplate = {
  id: string;
  name: string;
  blurb: string;
  sizeU: number;
  colorTag: ColorTag;
  location: string;
  description: string;
  audience: "homelab" | "small_it" | "msp" | "any";
};

export const RACK_TEMPLATES: RackTemplate[] = [
  {
    id: "homelab-12u",
    name: "Homelab Rack",
    blurb: "12U — typical half-height cabinet for homelab gear.",
    sizeU: 12,
    colorTag: "blue",
    location: "Home",
    description: "Homelab rack with switch, router, NAS, and hypervisor.",
    audience: "homelab",
  },
  {
    id: "office-closet-22u",
    name: "Office Network Closet",
    blurb: "22U — half-cabinet sized for small offices.",
    sizeU: 22,
    colorTag: "cyan",
    location: "Network Closet",
    description: "Switch stack, firewall, patch panel, UPS, server(s).",
    audience: "small_it",
  },
  {
    id: "mdf-42u",
    name: "MDF — 42U",
    blurb: "Full-height main distribution frame.",
    sizeU: 42,
    colorTag: "purple",
    location: "MDF",
    description: "Core switches, router, firewalls, patch panels, and servers.",
    audience: "small_it",
  },
  {
    id: "client-site-24u",
    name: "Client Site Cabinet",
    blurb: "24U — typical client deployment.",
    sizeU: 24,
    colorTag: "green",
    location: "Client Site",
    description: "Customer-site infrastructure — firewall, switch, UPS, server.",
    audience: "msp",
  },
  {
    id: "colo-42u",
    name: "Colocation — 42U",
    blurb: "Full-depth colo cabinet for production workloads.",
    sizeU: 42,
    colorTag: "orange",
    location: "Colocation",
    description: "Production servers, top-of-rack switches, PDUs.",
    audience: "any",
  },
];

export function getRackTemplate(id: string): RackTemplate | undefined {
  return RACK_TEMPLATES.find((t) => t.id === id);
}
