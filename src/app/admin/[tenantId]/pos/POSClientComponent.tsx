"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { processPosCheckout } from "@/app/actions";

type Product = {
  id: string;
  name: string;
  type: "SALE" | "RENTAL";
  basePrice: string;
  deposit: string | null;
  stockQuantity: number | null;
  imageUrl: string | null;
};

type CartItem = {
  product: Product;
  qty: number;
};

export default function POSClientComponent({
  tenantId,
  initialProducts,
}: {
  tenantId: string;
  initialProducts: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [products] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // 結帳 Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ changeDue: number | null, amount: number | null }>({ changeDue: null, amount: null });
  const [cashTenderedStr, setCashTenderedStr] = useState("");

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(lowerQ));
  }, [products, searchQuery]);

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.product.id === product.id);
    const currentQty = existingItem ? existingItem.qty : 0;

    if (product.type === "SALE" && product.stockQuantity !== null) {
      if (currentQty >= product.stockQuantity) {
        toast.error("庫存不足");
        return;
      }
    }

    setCart((prev) => {
      if (existingItem) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === id) {
            const nextQty = item.qty + delta;
            if (delta > 0 && item.product.type === "SALE" && item.product.stockQuantity !== null) {
               if (nextQty > item.product.stockQuantity) {
                 toast.error("庫存不足");
                 return item;
               }
            }
            return { ...item, qty: nextQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0)
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setCashTenderedStr("");
  };

  const cartTotals = useMemo(() => {
    return cart.reduce(
      (acc, item) => {
        const { product, qty } = item;
        const pPrice = Number(product.basePrice);
        const pDeposit = Number(product.deposit || 0);

        if (product.type === "SALE") {
          const subtotal = pPrice * qty;
          acc.salesTotal += subtotal;
          acc.grandTotal += subtotal;
        } else if (product.type === "RENTAL") {
          const rentSubtotal = pPrice * qty;
          const depositSubtotal = pDeposit * qty;
          acc.rentalsTotal += rentSubtotal;
          acc.depositsTotal += depositSubtotal;
          acc.grandTotal += rentSubtotal + depositSubtotal;
        }
        return acc;
      },
      { salesTotal: 0, rentalsTotal: 0, depositsTotal: 0, grandTotal: 0 }
    );
  }, [cart]);

  const cashTendered = Number(cashTenderedStr) || 0;
  const changeDue = Math.max(0, cashTendered - cartTotals.grandTotal);
  const isValidCheckout = cart.length > 0 && cashTendered >= cartTotals.grandTotal;

  const handleCheckout = () => {
    if (!isValidCheckout || isPending) return;

    const cartPayload = cart.map(item => ({
      id: item.product.id,
      type: item.product.type,
      qty: item.qty,
      deposit: Number(item.product.deposit || 0),
      basePrice: Number(item.product.basePrice),
    }));

    startTransition(async () => {
      const result = await processPosCheckout(
        tenantId,
        cartPayload,
        cartTotals.grandTotal,
        cashTendered,
        changeDue
      );

      if (result.success) {
        setModalData({ changeDue, amount: cartTotals.grandTotal });
        setShowModal(true);
        clearCart();
        router.refresh();
      } else {
        toast.error(result.error || "結帳失敗");
      }
    });
  };

  return (
    <div className="h-screen overflow-hidden w-full flex bg-gray-100 font-sans">
      <Toaster position="top-center" />
      
      {/* 🔴 左側：商品選擇牆 */}
      <div className="w-[70%] h-full flex flex-col bg-slate-50 border-r border-gray-200">
        <div className="p-4 bg-white shadow-sm z-10 sticky top-0">
          <input
            type="text"
            placeholder="輸入商品名稱快速搜尋..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg transition-all outline-none"
          />
        </div>

        {/* 依照要求：將商品牆容器設為 grid grid-cols-4 gap-4 p-4 overflow-y-auto */}
        <div className="flex-1 grid grid-cols-4 gap-4 p-4 overflow-y-auto pb-20">
          {filteredProducts.map((product) => {
            const currentCartQty = cart.find(c => c.product.id === product.id)?.qty || 0;
            const outOfStock = product.type === "SALE" && (product.stockQuantity === null || product.stockQuantity === 0);
            
            return (
              <div
                key={product.id}
                onClick={() => !outOfStock && addToCart(product)}
                // 依照要求：每個 div 容器必須設為 aspect-square overflow-hidden bg-white rounded-lg shadow
                className={`aspect-square overflow-hidden bg-white rounded-lg shadow flex flex-col relative transition-all ${
                  outOfStock ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer hover:shadow-md hover:border-blue-300 active:scale-95 group"
                }`}
              >
                <div className="w-full h-32 flex-shrink-0 overflow-hidden relative flex items-center justify-center bg-white border-b border-gray-100">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full max-h-32 object-cover relative z-10" />
                  ) : (
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-slate-100 flex items-center justify-center">
                      <span className="text-gray-400 text-[10px] font-medium">無圖</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-2 left-2">
                  <span className={`px-2 py-1 text-[11px] font-bold rounded-md shadow-sm text-white ${
                    product.type === "SALE" ? "bg-indigo-500" : "bg-emerald-500"
                  }`}>
                    {product.type}
                  </span>
                </div>

                {outOfStock && <div className="absolute top-0 left-0 w-full h-32 flex items-center justify-center bg-black/40"><span className="bg-red-600 text-white font-bold py-1 px-3 rounded shadow">已售完</span></div>}

                <div className="p-3 flex flex-col flex-1 truncate">
                  <h3 className="text-gray-900 font-bold mb-1 truncate text-sm" title={product.name}>{product.name}</h3>
                  <div className="mt-auto flex justify-between items-end border-t border-gray-50 pt-2">
                    {product.type === "SALE" ? (
                      <>
                        <div className="text-indigo-600 font-black text-base">${product.basePrice}</div>
                        <div className="text-[10px] font-semibold text-gray-400">剩 {product.stockQuantity}</div>
                      </>
                    ) : (
                      <div className="flex flex-col w-full">
                        <div className="text-emerald-700 font-black text-base">${product.basePrice}<span className="text-[10px] font-normal">/次</span></div>
                        <div className="text-[10px] text-gray-500 font-medium">押 {product.deposit}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🔵 右側：購物車與結帳區 */}
      <div className="w-[30%] h-full sticky top-0 bg-white flex flex-col shadow-2xl z-20">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">結帳清單</h2>
          {cart.length > 0 && <button onClick={clearCart} className="text-red-500 text-sm font-medium">清空</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
          {cart.map((item) => {
             const pPrice = Number(item.product.basePrice);
             const pDep = Number(item.product.deposit || 0);

             return (
              <div key={item.product.id} className="bg-white px-3 py-3 rounded-xl border border-gray-100 shadow-sm relative group">
                <button onClick={() => removeItem(item.product.id)} className="absolute -top-1.5 -right-1.5 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   ✕
                </button>
                
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3 flex-1 pr-3">
                    <div className="w-10 h-10 flex-shrink-0 overflow-hidden rounded bg-gray-100 border border-gray-100 flex items-center justify-center">
                      {item.product.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full max-h-32 object-cover" />
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">無圖</span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm leading-tight mb-1">{item.product.name}</h4>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-gray-100 text-gray-600">{item.product.type}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5 border border-gray-200">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-6 h-6 rounded bg-white shadow-sm font-medium">-</button>
                    <span className="w-8 text-center font-bold text-gray-800 text-sm">{item.qty}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-6 h-6 rounded bg-white shadow-sm font-medium">+</button>
                  </div>
                </div>

                <div className="text-right pt-2 border-t border-dashed border-gray-200">
                  {item.product.type === "SALE" ? (
                     <div className="font-black text-gray-900">${pPrice * item.qty}</div>
                  ) : (
                     <div className="flex justify-between items-center text-sm">
                       <div className="text-xs text-gray-500 text-left">
                         <div>租：${pPrice}</div>
                         <div className="text-gray-400">押：${pDep}</div>
                       </div>
                       <div className="font-black text-emerald-700">${(pPrice + pDep) * item.qty}</div>
                     </div>
                  )}
                </div>
              </div>
             );
          })}
        </div>

        {/* 底部總計與結帳按鈕 */}
        <div className="bg-white border-t border-gray-200 z-30 p-4">
          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-gray-600 text-sm">
              <span>買斷商品</span>
              <span className="font-medium">${cartTotals.salesTotal}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-sm">
              <span>租賃費用</span>
              <span className="font-medium">${cartTotals.rentalsTotal}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm pb-2 border-b border-dashed border-gray-200">
              <span className="font-semibold text-gray-600">代收押金</span>
              <span className="font-bold text-gray-800">${cartTotals.depositsTotal}</span>
            </div>
            <div className="flex justify-between items-end pt-1">
              <span className="text-gray-900 font-bold text-lg">總計</span>
              <span className="text-3xl font-black text-blue-600">${cartTotals.grandTotal}</span>
            </div>

            {cart.length > 0 && (
              <div className="pt-2 flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">收現</label>
                  <input 
                    type="number" 
                    min={cartTotals.grandTotal} 
                    value={cashTenderedStr}
                    onChange={(e) => setCashTenderedStr(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder={cartTotals.grandTotal.toString()}
                  />
                </div>
                <div className="flex-1 flex flex-col justify-end text-right">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">找零</label>
                  <div className={`text-xl font-bold ${changeDue > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                    ${changeDue}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            disabled={!isValidCheckout || isPending}
            onClick={handleCheckout}
            className={`w-full py-4 rounded-xl text-xl font-bold flex items-center justify-center transition-all ${
              !isValidCheckout || isPending
                ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg"
            }`}
          >
            {isPending ? "處理交易中..." : cart.length === 0 ? "請選擇商品" : !isValidCheckout ? "金額不足" : "確認結帳"}
          </button>
        </div>
      </div>

      {/* 交易成功 Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-auto flex flex-col items-center">
            <h2 className="text-3xl font-black text-gray-900 mb-4">交易成功！</h2>
            <div className="w-full bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 flex justify-between items-center">
              <span className="font-semibold text-gray-900">應找零</span>
              <span className="text-2xl font-black text-green-600">${modalData.changeDue}</span>
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="w-full bg-blue-600 text-white font-bold text-lg py-3 rounded-xl hover:bg-blue-700"
            >
              完成並關閉
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
