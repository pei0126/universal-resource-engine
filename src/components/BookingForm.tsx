"use client";

import { useState, useEffect } from "react";
import { createRental, getBookedPeriods } from "@/app/actions";
import { useRouter, useSearchParams } from "next/navigation";
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
}: {
  productId: string;
  tenantId: string;
  basePrice: number;
  deposit: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lineUserId = searchParams.get("lineUserId") || "";
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!finalStart || !finalEnd) {
      setError("請完整選擇取件與歸還的日期和時間");
      setLoading(false);
      return;
    }

    if (finalEnd <= finalStart) {
      setError("歸還時間必須晚於取件時間");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const customerName = (formData.get("customerName") as string) || "";

    const hours = Math.max(0, differenceInHours(finalEnd, finalStart));
    const days = Math.max(1, Math.ceil(hours / 24));
    const finalTotalPrice = days * basePrice + deposit;

    const result = await createRental({
      tenantId,
      equipmentId: productId, 
      customerName,
      lineUserId,
      from: finalStart.toISOString(),
      to: finalEnd.toISOString(),
      totalPrice: finalTotalPrice,
    });

    if (result.success) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "未知錯誤");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-2xl text-center shadow-lg">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
        <h3 className="text-3xl font-black text-emerald-800 mb-4">預約大成功！</h3>
        <p className="text-emerald-700 font-medium text-lg leading-relaxed">
          設備已經為您預留。<br/>系統已透過 LINE 發送詳細憑證給您。
        </p>
      </div>
    );
  }

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-gray-100">
      <div className="border-b-2 border-gray-100 pb-4">
        <h3 className="text-3xl font-black text-gray-900 tracking-tight">精準檔期預約</h3>
        <p className="text-gray-500 mt-2 font-medium">請分開選擇日期與精準時間，不再受限傳統日曆</p>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg font-bold text-lg">
          {error}
        </div>
      )}

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
              className="w-full bg-white border-2 border-blue-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-blue-500 outline-none w-full"
              placeholderText="點選日期"
              withPortal
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
              className="w-full bg-white border-2 border-purple-200 rounded-xl px-5 py-4 font-bold text-gray-900 text-lg shadow-sm focus:border-purple-500 outline-none w-full"
              placeholderText="點選日期"
              withPortal
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

      <div className="flex flex-col gap-2 pt-2">
        <label className="font-bold text-gray-700 text-lg">聯絡人真實大名</label>
        <input
          name="customerName"
          type="text"
          required
          className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-blue-500 outline-none transition-all font-bold text-lg text-gray-900"
          placeholder="取件核對身分證使用"
        />
        <input type="hidden" name="lineUserId" value={lineUserId} />
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
        type="submit"
        disabled={loading || !finalStart || !finalEnd || finalEnd <= finalStart || hasOverlap}
        className={`w-full py-5 rounded-2xl text-xl font-black text-white shadow-xl transition-all ${
          loading || !finalStart || !finalEnd || finalEnd <= finalStart || hasOverlap
            ? "bg-gray-300 cursor-not-allowed shadow-none text-gray-500"
            : "bg-blue-600 hover:bg-blue-500 hover:scale-[1.02] hover:shadow-blue-500/50 active:scale-95"
        }`}
      >
        {loading ? "計算演算中..." : hasOverlap ? "此時段已被其他客人搶先" : (!finalStart || !finalEnd ? "請完成日期與時間選擇" : (finalEnd <= finalStart ? "時間不合理" : "立即鎖定預約"))}
      </button>

      {/* 覆蓋 react-datepicker 基本容器樣式，讓他變寬變大 */}
      <style>{`
        .react-datepicker-wrapper,
        .react-datepicker__input-container {
          display: block;
          width: 100%;
        }
        .react-datepicker {
          border: none !important;
          border-radius: 1rem !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
          font-family: inherit !important;
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
    </form>
  );
}
