import type { Metadata, Viewport } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin | ASA Battery Plus",
  robots: { index: false, follow: false },
  manifest: "/admin/app.webmanifest",
  applicationName: "ASA Admin",
  appleWebApp: {
    capable: true,
    title: "ASA Admin",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/admin/icon-192.png",
    apple: "/admin/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#18212b",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-shell">{children}</div>;
}
