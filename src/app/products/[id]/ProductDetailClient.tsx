"use client";

import { useRouter } from "next/navigation";
import BookingForm from "@/components/BookingForm";

type Equipment = {
  id: string;
  name: string;
  dailyPrice: string;
  deposit: string | null;
  totalStock: number;
  imageUrl: string | null;
};

export default function ProductDetailClient({
  tenantId,
  product,
}: {
  tenantId: string;
  product: Equipment;
}) {
  const router = useRouter();

  const dailyPrice = Number(product.dailyPrice);
  const deposit = Number(product.deposit || 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col md:flex-row">
      {/* 左側：商品資訊 */}
      <div className="w-full md:w-[60%] p-6 md:p-12 overflow-y-auto">
        <button onClick={() => router.push('/products')} className="text-gray-500 font-bold hover:text-gray-800 transition mb-8 flex items-center gap-2">
          ← 返回列表
        </button>

        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-square bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 flex-shrink-0 relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400 text-sm font-medium">無圖</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
               <span className="px-3 py-1.5 text-xs font-black rounded-lg shadow-sm text-white bg-emerald-600">
                 預約設備
               </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-black text-gray-900 mb-4 leading-tight">{product.name}</h1>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                <span className="text-gray-500 font-semibold text-lg">單日租金</span>
                <span className="text-3xl font-black text-gray-900">${dailyPrice}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-gray-500 font-semibold text-lg">設備押金</span>
                <span className="text-xl font-bold text-gray-500">${deposit}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-gray-500 font-semibold text-lg">總部庫存數</span>
                <span className="text-lg font-bold text-emerald-600">
                  {product.totalStock} 件
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右側：使用全新的 BookingForm 結帳模組 */}
      <div className="w-full md:w-[40%] bg-gray-50 md:bg-white md:border-l md:border-gray-200 md:shadow-2xl z-20 sticky top-0 md:h-screen overflow-y-auto p-4 md:p-8">
        <BookingForm 
          tenantId={tenantId}
          productId={product.id}
          basePrice={dailyPrice}
          deposit={deposit}
        />
      </div>
    </div>
  );
}
