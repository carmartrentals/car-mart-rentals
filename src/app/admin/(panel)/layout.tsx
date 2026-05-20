import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AdminShell user={user}>{children}</AdminShell>;
}
