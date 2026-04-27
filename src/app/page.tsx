import Link from "next/link";
import { ArrowRight, Package, CalendarCheck, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-8 shadow-sm">
          <Package className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          次世代設備租賃平台
        </h1>
        
        <p className="text-xl text-slate-600 max-w-2xl mb-12">
          一站式提供頂級攝影器材、活動道具與戶外裝備的專業租賃服務。檔期透明、極速預約，打造全新的數位化共享體驗。
        </p>
        
        <div className="flex gap-4 mb-16">
          <Link href="/products" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-2">
            前往商品大廳 <ArrowRight className="w-5 h-5" />
          </Link>
          <Link href={`/admin/${process.env.NEXT_PUBLIC_TEST_TENANT_ID}/pos`} className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm flex items-center gap-2">
            商家控制台
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <CalendarCheck className="w-10 h-10 text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">即時檔期同步</h3>
            <p className="text-slate-500">不再忍受私訊詢問是否還有庫存。我們提供毫秒級更新的檔期日曆，所見即所得，零疊單風險。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <Package className="w-10 h-10 text-purple-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">多元設備選擇</h3>
            <p className="text-slate-500">從高階單眼相機到露營帳篷，我們嚴格把關每一項設備的品質，保證器材出庫狀態完美。</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <ShieldCheck className="w-10 h-10 text-blue-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 mb-2">安心交易保障</h3>
            <p className="text-slate-500">結合 LINE 官方推播與數位 POS 機，從借出到歸還，每一步都受到最高規格的安全保護與記錄。</p>
          </div>
        </div>

      </div>
    </main>
  );
}
