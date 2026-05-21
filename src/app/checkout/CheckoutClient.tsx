"use client";

import { useCart } from "@/store/useCart";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { checkoutCart } from "@/app/actions";
import { toast } from "sonner";

export default function CheckoutClient() {
  const router = useRouter();
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingMethod, setShippingMethod] = useState("STORE"); // STORE, DELIVERY, PICKUP
  const [shippingAddress, setShippingAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("COD"); // COD, CREDIT_CARD, TRANSFER

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">購物車是空的</h1>
        <p className="text-slate-500 mb-8">您的購物車內目前沒有任何商品</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
        >
          返回商店
        </button>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!customerName || !phone) {
      toast.error("請填寫聯絡人姓名與電話");
      return;
    }
    if (shippingMethod !== "PICKUP" && !shippingAddress) {
      toast.error(shippingMethod === "STORE" ? "請填寫取貨門市" : "請填寫收件地址");
      return;
    }

    setLoading(true);

    const tenantId = cart.items[0].tenantId; // Assume all items from same store for now

    const res = await checkoutCart({
      tenantId,
      customerName,
      phone,
      shippingMethod,
      paymentMethod,
      shippingAddress: shippingMethod === "PICKUP" ? undefined : shippingAddress,
      cart: cart.items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        startDate: item.startDate,
        endDate: item.endDate,
        resourceType: item.resourceType
      }))
    });

    setLoading(false);

    if (res.success) {
      toast.success("訂單建立成功！", {
        description: "感謝您的購買，我們將盡快為您處理訂單。"
      });
      cart.clearCart();
      router.push(`/products?tenantId=${tenantId}`);
    } else {
      toast.error(res.error || "結帳發生錯誤");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900 font-bold transition-colors">
            ← 返回購物
          </button>
          <h1 className="text-3xl font-black text-slate-900">結帳</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左側：購物車明細 */}
          <div className="w-full lg:w-5/12 order-2 lg:order-1">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 sticky top-8">
              <h2 className="text-xl font-bold text-slate-900 mb-6">訂單明細</h2>
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2">
                {cart.items.map((item) => (
                  <div key={item.cartItemId} className="flex gap-4 items-center border-b border-slate-100 pb-4">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">無圖</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                      <p className="text-slate-500 text-sm">${item.price}</p>
                      {(item.startDate || item.endDate) && (
                        <p className="text-blue-600 text-[10px] mt-1 font-medium">
                          {item.startDate?.split('T')[0]} ~ {item.endDate?.split('T')[0]}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-black text-slate-900">${item.price * item.quantity}</span>
                      <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => cart.updateQuantity(item.cartItemId, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-slate-900">-</button>
                        <span className="text-xs font-bold px-2">{item.quantity}</span>
                        <button onClick={() => cart.updateQuantity(item.cartItemId, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-white shadow-sm text-slate-600 font-bold hover:text-slate-900">+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex justify-between text-slate-500">
                  <span>小計 ({cart.getTotalItems()} 件)</span>
                  <span>${cart.getTotalPrice()}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>運費</span>
                  <span>$0</span>
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                  <span className="text-lg font-bold text-slate-900">總計</span>
                  <span className="text-3xl font-black text-slate-900">${cart.getTotalPrice()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：結帳表單 */}
          <div className="w-full lg:w-7/12 order-1 lg:order-2 space-y-6">
            
            {/* 1. 聯絡資訊 */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">1</span>
                聯絡資訊
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">真實姓名</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="王小明" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">手機號碼</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912345678" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* 2. 物流方式 */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">2</span>
                配送方式
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[
                  { id: "STORE", label: "超商取貨", icon: "🏪" },
                  { id: "DELIVERY", label: "宅配到府", icon: "🚚" },
                  { id: "PICKUP", label: "現場自取", icon: "📍" },
                ].map((method) => (
                  <label key={method.id} className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${shippingMethod === method.id ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"}`}>
                    <input type="radio" name="shipping" value={method.id} checked={shippingMethod === method.id} onChange={() => setShippingMethod(method.id)} className="hidden" />
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-bold text-slate-900">{method.label}</span>
                  </label>
                ))}
              </div>

              {shippingMethod === "STORE" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold text-slate-700">超商門市名稱/代號</label>
                  <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="例如：7-11 復興門市" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
                </div>
              )}

              {shippingMethod === "DELIVERY" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <label className="text-sm font-bold text-slate-700">完整收件地址</label>
                  <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="請輸入縣市、區、路名與樓層" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all" />
                </div>
              )}
            </div>

            {/* 3. 金流方式 */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs">3</span>
                付款方式
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "COD", label: "貨到付款", icon: "💵" },
                  { id: "CREDIT_CARD", label: "線上刷卡", icon: "💳" },
                  { id: "TRANSFER", label: "銀行轉帳", icon: "🏦" },
                ].map((method) => (
                  <label key={method.id} className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all ${paymentMethod === method.id ? "border-slate-900 bg-slate-50" : "border-slate-100 hover:border-slate-300"}`}>
                    <input type="radio" name="payment" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="hidden" />
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-bold text-slate-900">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-5 rounded-2xl text-xl font-black text-white shadow-xl transition-all bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:bg-slate-300 disabled:text-slate-500 disabled:transform-none disabled:shadow-none"
            >
              {loading ? "處理中..." : "確認結帳"}
            </button>
            <p className="text-center text-slate-400 text-sm mt-4">點擊結帳代表您同意我們的購物條款與隱私權政策</p>

          </div>
        </div>
      </div>
    </div>
  );
}
