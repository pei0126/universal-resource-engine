import { getProduct, getBookedPeriods, getTenants } from "@/app/actions";
import ProductDetailClient from "./ProductDetailClient";
import { notFound } from "next/navigation";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { id } = await params;
  const sParams = await searchParams;
  let tenantId = sParams?.tenantId;

  if (!tenantId) {
    const tenants = await getTenants();
    tenantId = tenants.length > 0 
      ? tenants[0].id 
      : (process.env.NEXT_PUBLIC_TEST_TENANT_ID || "11111111-1111-1111-1111-111111111111");
  }
  
  // 嚴格隔離: 確保這項產品屬於當前 Tenant
  const product = await getProduct(id, tenantId);

  if (!product) {
    notFound();
  }

  // 若為租賃產品，預先抓出已預約時段
  const bookedPeriods = product.resourceType === "EQUIPMENT" ? await getBookedPeriods(id) : [];

  return (
    <ProductDetailClient 
      tenantId={tenantId} 
      product={product} 
    />
  );
}
