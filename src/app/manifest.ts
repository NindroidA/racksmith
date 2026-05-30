import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RackSmith",
    short_name: "RackSmith",
    description:
      "Rack visualization, device inventory, network topology, and auto-discovery in one modern tool.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0e0b1c",
    theme_color: "#5765f4",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
