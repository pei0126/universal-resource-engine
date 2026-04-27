import { getAdminProducts } from "@/app/actions";
import POSClientComponent from "./POSClientComponent";

export default async function AdminPOSPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  
  // 嚴格隔離: 抓取專屬於該 Tenant 的商品清單給 POS 使用
  const products = await getAdminProducts(tenantId);
  
  return <POSClientComponent tenantId={tenantId} initialProducts={products} />;
}
