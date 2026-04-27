import { getProduct, getBookedPeriods } from "@/app/actions";
import ProductDetailClient from "./ProductDetailClient";
import { notFound } from "next/navigation";

const TENANT_ID = process.env.NEXT_PUBLIC_TEST_TENANT_ID!;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // 嚴格隔離: 確保這項產品屬於當前 Tenant
  const product = await getProduct(id, TENANT_ID);

  if (!product) {
    notFound();
  }

  // 若為租賃產品，預先抓出已預約時段
  const bookedPeriods = product.type === "RENTAL" ? await getBookedPeriods(id) : [];

  return (
    <ProductDetailClient 
      tenantId={TENANT_ID} 
      product={product} 
      bookedPeriods={bookedPeriods} 
    />
  );
}
