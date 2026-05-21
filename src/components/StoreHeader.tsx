"use client";

import { useCart } from "@/store/useCart";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";

export default function StoreHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get("tenantId") || process.env.NEXT_PUBLIC_TEST_TENANT_ID;
  const cart = useCart();
  const [mounted, setMounted] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    // 點擊外面關閉購物車
    const handleClickOutside = (event: MouseEvent) => {
      if (cartRef.current && !cartRef.current.contains(event.target as Node)) {
        setIsCartOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) return null;

  const totalItems = cart.getTotalItems();

  return (
    <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center cursor-pointer" onClick={() => router.push(`/products?tenantId=${tenantId}`)}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-black text-xl leading-none">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-wide">Resource Engine</span>
          </div>

          <div className="relative" ref={cartRef}>
            <button
              onClick={() => setIsCartOpen(!isCartOpen)}
              className="relative p-2 text-slate-300 hover:text-white transition-colors"
            >
              <ShoppingCart className="w-6 h-6" />
              {totalItems > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Dropdown Cart */}
            {isCartOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-900">購物車清單</h3>
                  <span className="text-xs text-slate-500">{totalItems} 件商品</span>
                </div>

                <div className="max-h-80 overflow-y-auto p-4 space-y-4">
                  {cart.items.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      購物車是空的
                    </div>
                  ) : (
                    cart.items.map((item) => (
                      <div key={item.cartItemId} className="flex gap-3 group">
                        <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">無圖</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                          <div className="text-xs text-slate-500 mt-0.5">
                            ${item.price} x {item.quantity}
                          </div>
                          {(item.startDate || item.endDate) && (
                            <div className="text-[10px] text-blue-600 font-medium mt-1">
                              {item.startDate?.split('T')[0]} ~ {item.endDate?.split('T')[0]}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => cart.removeItem(item.cartItemId)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {cart.items.length > 0 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-700">總計</span>
                      <span className="text-xl font-black text-emerald-600">${cart.getTotalPrice()}</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        router.push('/checkout');
                      }}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors shadow-lg"
                    >
                      前往結帳
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
