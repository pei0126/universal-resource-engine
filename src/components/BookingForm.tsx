"use client";

import { useState, useEffect } from "react";
import { getBookedPeriods } from "@/app/actions";
import { useRouter } from "next/navigation";
import { useCart } from "@/store/useCart";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { differenceInHours, addDays, isSameDay, format, addHours, eachDayOfInterval } from "date-fns";

// 產生營業時間選項 (08:00 - 22:30)
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 22; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, '0')}:30`);
}

export default function BookingForm({
  productId,
  tenantId,
  basePrice,
  deposit,
  productName,
  imageUrl,
}: {
  productId: string;
  tenantId: string;
  basePrice: number;
  deposit: number;
  productName: string;
  imageUrl?: string | null;
}) {
  const router = useRouter();
  const addItem = useCart(state => state.addItem);

  // 拆分日期與時間狀態，徹底解決手機端 TimePicker 跑版問題
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<string>("10:00");
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<string>("10:00");

  const [bookedDates, setBookedDates] = useState<Date[]>([]);

  useEffect(() => {
    async function fetchBooked() {
      try {
        const periods = await getBookedPeriods(productId);
        let blocked: Date[] = [];
        periods.forEach((p: any) => {
          const start = new Date(p.start);
          const end = new Date(p.end);
          const days = Math.max(1, Math.ceil(differenceInHours(end, start) / 24));
          for (let i = 0; i <= days; i++) {
            blocked.push(addDays(start, i));
          }
        });
        setBookedDates(blocked);
      } catch (err) {}
    }
    fetchBooked();
  }, [productId]);

  // 合併日期與時間為完整 Date 物件
  const getCombinedDate = (d: Date | null, timeStr: string) => {
    if (!d) return null;
    const [hh, mm] = timeStr.split(":");
    const combined = new Date(d);
    combined.setHours(parseInt(hh, 10), parseInt(mm, 10), 0, 0);
    return combined;
  };

  const finalStart = getCombinedDate(startDate, startTime);
  const finalEnd = getCombinedDate(endDate, endTime);

  const handleAddToCart = () => {
    if (!finalStart || !finalEnd) return;
    
    const hours = Math.max(0, differenceInHours(finalEnd, finalStart));
    const days = Math.max(1, Math.ceil(hours / 24));
    
    addItem({
      id: productId,
      name: productName,
      price: basePrice * days, // 租賃價格直接依據天數計算單價
      quantity: 1,
      imageUrl: imageUrl,
      tenantId: tenantId,
      resourceType: "RENTAL",
      startDate: finalStart.toISOString(),
      endDate: finalEnd.toISOString(),
    });

    toast.success("已加入購物車", {
      description: `${productName} 已成功加入您的購物車！`,
    });
  };

  let uiDays = 0;
  let uiRentTotal = 0;
  let uiTotalPrice = 0;
  let hasOverlap = false;

  if (finalStart && finalEnd && finalEnd > finalStart) {
    const hours = Math.max(0, differenceInHours(finalEnd, finalStart));
    uiDays = Math.max(1, Math.ceil(hours / 24));
    uiRentTotal = uiDays * basePrice;
    uiTotalPrice = uiRentTotal + deposit;
    
    try {
      const selectedInterval = eachDayOfInterval({ start: finalStart, end: finalEnd });
      hasOverlap = selectedInterval.some(d => bookedDates.some(bd => isSameDay(d, bd)));
    } catch(err) {}
  }

  return (
    <div className="flex flex-col gap-8 bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-100">
      <div className="border-b-2 border-gray-100 pb-4">
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">精準檔期預約</h3>
        <p className="text-gray-500 mt-2 font-medium">請分開選擇日期與精準時間，不再受限傳統日曆</p>
      </div>

      {/* 取貨時間選擇區（Mobile-First 設計：日期按鈕 + 下拉選單） */}
      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex justify-center items-center font-bold">1</span>
          <h4 className="text-xl font-black text-blue-900">取件時間段</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-blue-800 text-sm">🗓️ 日期</label>
            <DatePicker
              selected={startDate}
              onChange={(d: Date | null) => {
                setStartDate(d);
                if (endDate && d && d > endDate) setEndDate(d);
              }}
              dateFormat="yyyy-MM-dd"
              minDate={new Date()}
              excludeDates={bookedDates}
              className="w-full bg-white border-2 border-blue-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-blue-500 outline-none"
              placeholderText="點選日期"
              popperPlacement="bottom-start"
              calendarClassName="w-[280px] shadow-2xl border-none rounded-2xl bg-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-blue-800 text-sm">⏱️ 時間 (時:分)</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-white border-2 border-blue-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-blue-500 outline-none cursor-pointer appearance-none"
            >
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 歸還時間選擇區 */}
      <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex justify-center items-center font-bold">2</span>
          <h4 className="text-xl font-black text-purple-900">歸還時間段</h4>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="font-bold text-purple-800 text-sm">🗓️ 日期</label>
            <DatePicker
              selected={endDate}
              onChange={(d: Date | null) => setEndDate(d)}
              dateFormat="yyyy-MM-dd"
              minDate={startDate || new Date()}
              excludeDates={bookedDates}
              className="w-full bg-white border-2 border-purple-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-purple-500 outline-none"
              placeholderText="點選日期"
              popperPlacement="bottom-start"
              calendarClassName="w-[280px] shadow-2xl border-none rounded-2xl bg-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="font-bold text-purple-800 text-sm">⏱️ 時間 (時:分)</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-white border-2 border-purple-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-purple-500 outline-none cursor-pointer appearance-none"
            >
              {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {finalEnd && (
          <div className="mt-4 bg-white/60 border border-purple-200 text-purple-900 text-sm font-bold p-4 rounded-xl flex items-center gap-3 shadow-inner">
             <span className="text-2xl">⏳</span>
             <div>
                <div className="text-purple-600 mb-1">系統緩衝保護演算 (延期 2 小時)</div>
                裝備最遲將保留至：<span className="text-xl text-purple-700 ml-1">{format(addHours(finalEnd, 2), 'yyyy-MM-dd HH:mm')}</span>
             </div>
          </div>
        )}
      </div>



      {finalStart && finalEnd && (finalEnd > finalStart) && !hasOverlap && (
        <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl text-white my-2 transform transition-all">
          <h4 className="font-black text-gray-300 mb-4 border-b border-gray-700 pb-3 uppercase tracking-widest text-sm">Checkout Summary</h4>
          
          <div className="space-y-4 font-bold">
            <div className="flex justify-between items-center text-gray-400">
              <span>租賃跨度</span>
              <span className="text-white bg-gray-800 px-3 py-1 rounded-lg">共 {uiDays} 天</span>
            </div>
            
            <div className="flex justify-between items-center text-gray-400">
              <span>設備日租金 <span className="text-xs text-gray-500">(${basePrice}/日)</span></span>
              <span className="text-white text-xl">${uiRentTotal}</span>
            </div>
            
            <div className="flex justify-between items-center text-gray-400 pb-5 border-b border-dashed border-gray-700">
              <span>押金 <span className="text-xs text-gray-500">(還件退回)</span></span>
              <span className="text-white text-xl">${deposit}</span>
            </div>
            
            <div className="flex justify-between items-center pt-2">
              <span className="text-xl text-gray-300">總計需支付</span>
              <span className="text-4xl font-black text-blue-400">${uiTotalPrice}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleAddToCart}
        disabled={!finalStart || !finalEnd || finalEnd <= finalStart || hasOverlap}
        className={`w-full py-5 rounded-2xl text-xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-3 ${
          !finalStart || !finalEnd || finalEnd <= finalStart || hasOverlap
            ? "bg-gray-300 cursor-not-allowed shadow-none text-gray-500"
            : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-1 hover:shadow-blue-500/50"
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        {hasOverlap ? "此時段已被其他客人搶先" : (!finalStart || !finalEnd ? "請完成日期與時間選擇" : (finalEnd <= finalStart ? "時間不合理" : "加入購物車"))}
      </button>

      {/* 覆蓋 react-datepicker 基本容器樣式，讓他變寬變大 */}
      <style>{`
        .react-datepicker-wrapper,
        .react-datepicker__input-container {
          display: block;
          width: 100%;
          max-width: 100%;
        }
        .react-datepicker-popper {
          z-index: 50 !important;
          padding-top: 4px !important;
        }
        .react-datepicker {
          border: none !important;
          border-radius: 1rem !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          font-family: inherit !important;
          background-color: white !important;
          display: inline-block !important;
        }
        .react-datepicker__header {
          background-color: white !important;
          border-bottom: none !important;
          padding-top: 1.5rem !important;
        }
        .react-datepicker__day--selected, 
        .react-datepicker__day--keyboard-selected {
          background-color: #2563eb !important;
          font-weight: 900 !important;
          color: white !important;
          transform: scale(1.1);
        }
        .react-datepicker__day {
          border-radius: 9999px !important;
          font-weight: 700 !important;
          margin: 0.3rem !important;
          width: 2.2rem !important;
          line-height: 2.2rem !important;
          color: #1e3a8a !important;
          transition: all 0.2s;
        }
        .react-datepicker__current-month {
          font-weight: 900 !important;
          margin-bottom: 1rem !important;
          font-size: 1.25rem !important;
          color: #0f172a !important;
        }
        select {
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E");
          background-position: right .5rem center;
          background-repeat: no-repeat;
          background-size: 1.5em 1.5em;
        }
      `}</style>
    </div>
  );
}
