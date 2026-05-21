"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, parseISO, isValid } from "date-fns";
import { zhTW } from "date-fns/locale";
import { updateRentalStatus } from "@/app/actions";
import { useRouter } from "next/navigation";

function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-gray-100 text-gray-800";
  let label = status;

  switch (status) {
    case "PENDING":
      colorClass = "bg-orange-100 text-orange-800 border-orange-200";
      label = "待確認";
      break;
    case "ACTIVE":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200";
      label = "租賃中";
      break;
    case "RETURNED":
      colorClass = "bg-green-100 text-green-800 border-green-200";
      label = "已歸還";
      break;
    case "CANCELLED":
      colorClass = "bg-red-100 text-red-800 border-red-200";
      label = "已取消";
      break;
  }

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded ${colorClass} border`}>
      {label}
    </span>
  );
}

// 強制轉換為台北時區的 Date 物件，避免 SSR (Server UTC) 與 CSR (Client Local) 造成的偏差
function getTaipeiDate(d: Date): Date {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
}

function safeFormat(dateVal: any, fmt: string) {
  if (!dateVal) return null;
  try {
    let d = dateVal;
    if (typeof dateVal === 'string') {
      const isoStr = dateVal.replace(' ', 'T');
      d = parseISO(isoStr);
      if (!isValid(d)) d = new Date(dateVal);
    } else {
      d = new Date(dateVal);
    }
    if (isValid(d)) {
      return format(getTaipeiDate(d), fmt);
    }
    return String(dateVal); // 失敗仍顯示字串
  } catch (e) {
    return "解析異常";
  }
}

function parseRange(rangeStr: string) {
  if (!rangeStr || rangeStr === "empty" || rangeStr === "null" || rangeStr === "undefined") return null;
  const match = rangeStr.match(/\[(.*?),\s*(.*?)\)/);
  if (match) {
    const startStr = match[1].replace(/['"]/g, '').trim();
    const endStr = match[2].replace(/['"]/g, '').trim();
    
    try {
      let startDate = parseISO(startStr.replace(' ', 'T'));
      if (!isValid(startDate)) startDate = new Date(startStr);
      
      let endDate = parseISO(endStr.replace(' ', 'T'));
      if (!isValid(endDate)) endDate = new Date(endStr);
      
      if (!isValid(startDate) || !isValid(endDate)) {
        return null;
      }
      // 確保 Range 在顯示前也轉換為台北時區
      return { start: getTaipeiDate(startDate), end: getTaipeiDate(endDate) };
    } catch(e) {
      return null;
    }
  }
  return null;
}

function formatRangeStr(rangeStr: string) {
  try {
    const parsed = parseRange(rangeStr);
    if (!parsed || !parsed.start || !isValid(parsed.start)) {
      return "尚未填寫 / 格式異常";
    }
    return `${format(parsed.start, 'yyyy-MM-dd HH:mm')} ~ ${format(parsed.end, 'yyyy-MM-dd HH:mm')}`;
  } catch (e) {
    return "日期格式錯誤";
  }
}

export default function AdminRentalsPageClient({
  tenantId,
  initialRentals,
}: {
  tenantId: string;
  initialRentals: any[];
}) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRental, setSelectedRental] = useState<any | null>(null);

  const handleAction = async (id: string, status: "PENDING" | "ACTIVE" | "RETURNED" | "CANCELLED") => {
    const res = await updateRentalStatus(id, tenantId, status);
    if (res.success) {
      router.refresh();
      if (selectedRental && selectedRental.id === id) {
        setSelectedRental({ ...selectedRental, status });
      }
    } else {
      alert(res.error || "更新失敗");
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const renderTable = () => (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">訂單編號 / 建立時間</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">客戶姓名 / LINE ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">預約資源 / 單品條碼</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">預約區間</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {initialRentals.map((rental) => (
            <tr key={rental.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm" suppressHydrationWarning={true}>
                <div className="font-medium text-gray-900">{rental.id.split('-')[0]}...</div>
                <div className="text-gray-500">
                  {safeFormat(rental.createdAt, 'yyyy-MM-dd HH:mm') || "時間未定"}
                </div>
                {rental.pickedUpAt && (
                  <div className="text-blue-600 font-semibold text-xs mt-1">
                    出庫: {safeFormat(rental.pickedUpAt, 'MM/dd HH:mm') || "已取貨"}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                <div>{rental.customerName || "未知客戶"}</div>
                {rental.lineUserId && <div className="text-xs text-green-600 truncate max-w-[120px]">{rental.lineUserId}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                <div>{rental.resourceName || "未知資源"}</div>
                {rental.itemId && <div className="text-xs text-purple-600 truncate max-w-[120px]">條碼: {rental.itemId.split('-')[0]}</div>}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500" suppressHydrationWarning={true}>{formatRangeStr(String(rental.reservationPeriod))}</td>
              <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={rental.status} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  {rental.status === "PENDING" && (
                    <button onClick={() => handleAction(rental.id, "ACTIVE")} className="bg-blue-600 text-white px-3 py-1 rounded-md">確認出借</button>
                  )}
                  {rental.status === "ACTIVE" && (
                    <button onClick={() => handleAction(rental.id, "RETURNED")} className="bg-green-600 text-white px-3 py-1 rounded-md">收回</button>
                  )}
                  {rental.status === "PENDING" && (
                    <button onClick={() => handleAction(rental.id, "CANCELLED")} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1 rounded-md">取消</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {initialRentals.length === 0 && (
            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">目前沒有訂單</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderCalendar = () => (
    <div className="bg-white p-6 shadow-md rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">{format(currentDate, 'yyyy 年 MM 月')}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">&lt; 上個月</button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">下個月 &gt;</button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
        {['日', '一', '二', '三', '四', '五', '六'].map(d => (
          <div key={d} className="bg-gray-50 py-2 text-center text-sm font-bold text-gray-600">{d}</div>
        ))}
        {calendarDays.map((date, i) => {
          const isCurrentMonth = isSameMonth(date, currentDate);
          // Find rentals happening on this day
          const daysRentals = initialRentals.filter(r => {
            if (r.status === "CANCELLED") return false;
            const range = parseRange(String(r.reservationPeriod));
            if (!range) return false;
            return isWithinInterval(date, { start: range.start, end: range.end });
          });

          return (
            <div key={i} className={`min-h-[120px] bg-white p-2 ${!isCurrentMonth ? 'opacity-40' : ''}`}>
              <div className={`font-medium text-sm mb-1 ${isSameDay(date, new Date()) ? 'text-blue-600 bg-blue-50 w-7 h-7 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>
                {format(date, 'd')}
              </div>
              <div className="flex flex-col gap-1">
                {daysRentals.map(r => (
                   <div 
                     key={r.id} 
                     onClick={() => setSelectedRental(r)}
                     className={`cursor-pointer text-[10px] p-1 rounded font-semibold truncate hover:opacity-80 transition ${
                       r.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                       r.status === 'PENDING' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                       'bg-green-100 text-green-800 border border-green-200'
                     }`}
                     title={`${r.resourceName} - ${r.customerName}`}
                   >
                     {r.customerName} ({r.resourceName})
                   </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 訂單詳情 Modal */}
      {selectedRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedRental(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-[400px] p-6">
            <h3 className="text-xl font-bold mb-4 border-b pb-2">訂單詳情</h3>
            <div className="space-y-3 mb-6 font-medium">
               <p><span className="text-gray-500 w-20 inline-block">客戶名稱：</span>{selectedRental.customerName}</p>
               {selectedRental.lineUserId && <p><span className="text-gray-500 w-20 inline-block">LINE ID：</span><span className="text-sm truncate block">{selectedRental.lineUserId}</span></p>}
               <p><span className="text-gray-500 w-20 inline-block">預約資源：</span>{selectedRental.resourceName}</p>
               {selectedRental.itemId && <p><span className="text-gray-500 w-20 inline-block">單品條碼：</span><span className="text-xs">{selectedRental.itemId}</span></p>}
               <p><span className="text-gray-500 w-20 inline-block">目前狀態：</span><StatusBadge status={selectedRental.status} /></p>
               <p><span className="text-gray-500 w-20 inline-block">預約期間：</span><span className="text-sm">{formatRangeStr(String(selectedRental.reservationPeriod))}</span></p>
               <p><span className="text-gray-500 w-20 inline-block">應付總額：</span>${selectedRental.totalPrice}</p>
            </div>
            
            <div className="flex justify-end gap-2 border-t pt-4">
               {selectedRental.status === "PENDING" && (
                  <>
                    <button onClick={() => handleAction(selectedRental.id, "CANCELLED")} className="px-4 py-2 bg-red-50 text-red-600 rounded font-bold hover:bg-red-100">取消預約</button>
                    <button onClick={() => handleAction(selectedRental.id, "ACTIVE")} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">確認出借</button>
                  </>
               )}
               {selectedRental.status === "ACTIVE" && (
                 <button onClick={() => handleAction(selectedRental.id, "RETURNED")} className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700">收回歸還</button>
               )}
               <button onClick={() => setSelectedRental(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded font-bold ml-2">關閉</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">商家後台 - 租賃訂單管理</h1>
          <div className="flex gap-4 items-center">
            <a
              href={`/products?tenantId=${tenantId}`}
              target="_blank"
              className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              查看我的商店
            </a>
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("table")}
                className={`px-4 py-2 text-sm font-bold rounded-md transition ${viewMode === "table" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"}`}
              >
                表格檢視
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-4 py-2 text-sm font-bold rounded-md transition ${viewMode === "calendar" ? "bg-white text-gray-900 shadow" : "text-gray-500 hover:text-gray-700"}`}
              >
                日曆檢視
              </button>
            </div>
          </div>
        </div>

        {viewMode === "table" ? renderTable() : renderCalendar()}
      </div>
    </div>
  );
}
