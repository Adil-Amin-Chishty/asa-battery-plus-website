import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin | ASA Battery Plus",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-shell">{children}</div>;
}
