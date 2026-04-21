import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "RackSmith — Your Infrastructure, Beautifully Documented",
    template: "%s · RackSmith",
  },
  description:
    "Rack visualization, device inventory, network topology, and auto-discovery — in one modern tool. NetBox is overkill. draw.io is too manual. RackSmith is the middle ground.",
  applicationName: "RackSmith",
  authors: [{ name: "Nindroid Systems", url: "https://nindroid.systems" }],
  creator: "Nindroid Systems",
  keywords: [
    "rack visualization",
    "infrastructure documentation",
    "network topology",
    "homelab",
    "device inventory",
    "auto-discovery",
    "nmap",
    "self-hosted",
    "DCIM",
  ],
  openGraph: {
    type: "website",
    title: "RackSmith — Your Infrastructure, Beautifully Documented",
    description:
      "Rack visualization, device inventory, network topology, and auto-discovery — in one modern tool.",
    siteName: "RackSmith",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "RackSmith — Your Infrastructure, Beautifully Documented",
    description:
      "Rack visualization, device inventory, network topology, and auto-discovery — in one modern tool.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 100%)",
              backdropFilter: "blur(40px) saturate(200%)",
              WebkitBackdropFilter: "blur(40px) saturate(200%)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              color: "rgba(255, 255, 255, 0.95)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#0a0e1a" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#0a0e1a" },
            },
          }}
        />
      </body>
    </html>
  );
}
