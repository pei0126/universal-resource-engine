import { getRentalsForAdmin } from "@/app/actions";
import AdminRentalsPageClient from "./AdminRentalsPageClient";

export default async function AdminRentalsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  // 安全檢查：取得當前租戶的所有預約訂單
  const rentals = await getRentalsForAdmin(tenantId);

  return (
    <AdminRentalsPageClient tenantId={tenantId} initialRentals={rentals} />
  );
}
