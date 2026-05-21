"use client";

import { useCart } from "@/store/useCart";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CartWidget() {
  const router = useRouter();
  const getTotalItems = useCart((state) => state.getTotalItems);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // 避免 Hydration Mismatch

  const totalItems = getTotalItems();

  if (totalItems === 0) return null;

  return (
    <button
      onClick={() => router.push('/checkout')}
      className="fixed bottom-8 right-8 z-50 bg-emerald-600 text-white p-4 rounded-full shadow-2xl hover:bg-emerald-500 hover:-translate-y-1 hover:shadow-emerald-500/50 transition-all group flex items-center justify-center"
    >
      <div className="relative">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-slate-900 group-hover:border-emerald-500 transition-colors">
          {totalItems}
        </span>
      </div>
    </button>
  );
}
