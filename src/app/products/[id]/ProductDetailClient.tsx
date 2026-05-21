"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import BookingForm from "@/components/BookingForm";
import { useCart } from "@/store/useCart";
import { toast } from "sonner";

type Equipment = {
  id: string;
  name: string;
  price: string;
  deposit: string | null;
  totalStock: number;
  imageUrl: string | null;
  resourceType?: string;
};

export default function ProductDetailClient({
  tenantId,
  product,
}: {
  tenantId: string;
  product: Equipment;
}) {
  const router = useRouter();

  const dailyPrice = Number(product.price);
  const deposit = Number(product.deposit || 0);
  const isSale = product.resourceType === "SALES";

  const addItem = useCart(state => state.addItem);

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: dailyPrice,
      quantity: 1,
      imageUrl: product.imageUrl,
      tenantId: tenantId,
      resourceType: "SALES",
    });
    toast.success("已加入購物車", {
      description: `${product.name} 已成功加入您的購物車！`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans flex flex-col md:flex-row">
      {/* 左側：商品資訊 */}
      <div className="w-full md:w-[60%] p-6 md:p-12 overflow-y-auto">
        <button onClick={() => router.push(`/products?tenantId=${tenantId}`)} className="text-slate-400 font-bold hover:text-white transition mb-8 flex items-center gap-2">
          ← 返回列表
        </button>

        <div className="bg-slate-800/60 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-700/50 mb-8 flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 aspect-square bg-slate-900/50 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-700/50 flex-shrink-0 relative">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover mix-blend-overlay opacity-90" style={{ mixBlendMode: 'normal' }} />
            ) : (
              <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-slate-700/50 flex items-center justify-center">
                <span className="text-slate-500 text-sm font-medium">無圖</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
               <span className={`px-3 py-1.5 text-xs font-black rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.5)] text-blue-50 ${isSale ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                 {isSale ? '購買商品' : '預約設備'}
               </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-4xl font-black text-slate-50 mb-4 leading-tight">{product.name}</h1>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-slate-700/50 pb-4">
                <span className="text-slate-400 font-semibold text-lg">{isSale ? '商品售價' : '單日租金'}</span>
                <span className="text-3xl font-black text-slate-50">${dailyPrice}</span>
              </div>
              {!isSale && (
                <div className="flex justify-between items-end">
                  <span className="text-slate-400 font-semibold text-lg">設備押金</span>
                  <span className="text-xl font-bold text-slate-400">${deposit}</span>
                </div>
              )}
              <div className="flex justify-between items-end">
                <span className="text-slate-400 font-semibold text-lg">總部庫存數</span>
                <span className="text-lg font-bold text-blue-400">
                  {product.totalStock} 件
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右側：使用全新的 BookingForm 結帳模組或購買模組 */}
      <div className="w-full md:w-[40%] bg-slate-900 md:bg-slate-800/30 md:border-l md:border-slate-800 md:shadow-2xl z-20 sticky top-0 md:h-screen overflow-y-auto p-4 md:p-8 backdrop-blur-3xl">
        {isSale ? (
          <div className="flex flex-col gap-6 h-full justify-center">
            <h3 className="text-3xl font-black text-white tracking-tight">直接購買</h3>
            <p className="text-slate-400 font-medium">您可以將商品加入購物車，與其他商品一併結帳。</p>
            
            <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center text-center space-y-6">
              <div className="w-full pb-6 border-b border-slate-700">
                <span className="block text-slate-400 mb-2">單品售價</span>
                <span className="text-5xl text-white font-black">${dailyPrice}</span>
              </div>
              <button
                onClick={handleAddToCart}
                className="w-full py-5 rounded-2xl text-xl font-black text-white shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
                加入購物車
              </button>
              
              <button 
                onClick={() => router.push(`/checkout`)}
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors mt-2 underline underline-offset-4"
              >
                立即前往結帳 →
              </button>
            </div>
          </div>
        ) : (
          <BookingForm 
            tenantId={tenantId}
            productId={product.id}
            basePrice={dailyPrice}
            deposit={deposit}
            productName={product.name}
            imageUrl={product.imageUrl}
          />
        )}
      </div>
    </div>
  );
}
