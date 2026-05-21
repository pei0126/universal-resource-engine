import Link from 'next/link';
import { db } from "@/db";
import { orders, orderItems, resources } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // 檢查是否為測試推播訂單
  const isTestOrder = id === "TEST-ORDER-777";
  
  let orderData = null;
  if (!isTestOrder) {
    try {
      const [dbOrder] = await db
        .select({
          id: orders.id,
          customerName: orders.customerName,
          status: orders.status,
          tenantId: orders.tenantId,
          productName: resources.name,
          pickedUpAt: orders.pickedUpAt
        })
        .from(orders)
        .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
        .innerJoin(resources, eq(orderItems.resourceId, resources.id))
        .where(eq(orders.id, id))
        .limit(1);
      orderData = dbOrder;
    } catch(e) {}
  }

  const isPickedUp = orderData?.status === "PICKED_UP";

  return (
    <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center font-sans tracking-wide">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <div className="flex justify-between items-center mb-6">
           <h1 className="text-2xl font-bold text-slate-800">
             {isTestOrder ? "🧪 平台系統連通測試" : "📋 訂單詳細資料"}
           </h1>
           <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${isTestOrder ? "bg-emerald-100 text-emerald-600" : isPickedUp ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-600"}`}>
             {isTestOrder ? "通道驗證成功" : isPickedUp ? "已完成取貨" : orderData?.status || "未知"}
           </span>
        </div>

        <div className="space-y-4 text-slate-600 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <div className="flex justify-between border-b border-slate-200 pb-3">
            <span className="font-medium">訂單編號</span>
            <span className="font-mono text-slate-900 bg-slate-200 px-2 py-0.5 rounded text-sm">{id}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-3 mt-3">
            <span className="font-medium">客戶名稱</span>
            <span className="text-slate-900 font-semibold">{isTestOrder ? "Antigravity 系統查驗" : orderData?.customerName || "未知"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-3 mt-3">
            <span className="font-medium">承租設備</span>
            <span className="text-slate-900">{isTestOrder ? "Sony A7SIII" : orderData?.productName || "未知"}</span>
          </div>
          <div className="flex justify-between pb-1 mt-3">
            <span className="font-medium">核銷出庫時間</span>
            <span className="text-slate-900">
              {isTestOrder ? "剛剛" : isPickedUp && orderData?.pickedUpAt ? new Date(orderData.pickedUpAt).toLocaleString("zh-TW") : "尚未取貨"}
            </span>
          </div>
        </div>

        <div className="flex justify-center mt-10">
          <Link 
            href={isTestOrder ? "/" : `/admin/${orderData?.tenantId}/rentals`}
            className="bg-slate-900 text-white px-8 py-3.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            ← 返回列表
          </Link>
        </div>
      </div>
    </div>
  );
}
