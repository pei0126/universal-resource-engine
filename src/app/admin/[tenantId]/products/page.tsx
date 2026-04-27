import { getAdminProducts } from "@/app/actions";
import AdminProductsPageClient from "./AdminProductsPageClient";

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  
  // Server-side 資料獲取，確保嚴格的 tenantId 隔離
  const products = await getAdminProducts(tenantId);
  
  return <AdminProductsPageClient tenantId={tenantId} products={products} />;
}
