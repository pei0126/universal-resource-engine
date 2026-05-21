import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, resources } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendRentalReminder } from "@/lib/line";

// 允許此標頭用於 Vercel Cron 等排程器
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    return NextResponse.json({ error: "Server Configuration Error: CRON_SECRET is missing." }, { status: 500 });
  }

  // 支援 Bearer Token (Vercel Cron 預設) 與 Query String 兩種驗證方式
  const authHeader = req.headers.get("Authorization");
  const secretQuery = req.nextUrl.searchParams.get("secret");
  
  if (
    authHeader !== `Bearer ${cronSecret}` &&
    secretQuery !== cronSecret
  ) {
    return NextResponse.json({ error: "Unauthorized. Invalid CRON_SECRET." }, { status: 401 });
  }

  try {
    // 透過 Drizzle 找出所有：
    // 1. 狀態為 ACTIVE (租借中)
    // 2. 租期(tstzrange)的結束日 (upper bound) 落在今天或明天內
    const activeRentals = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        rentalPeriod: orders.reservationPeriod,
        productName: resources.name,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .innerJoin(resources, eq(orderItems.resourceId, resources.id))
      .where(
        and(
          eq(orders.status, "PICKED_UP"),
          sql`upper(${orders.reservationPeriod}) >= current_date AND upper(${orders.reservationPeriod}) < current_date + interval '2 days'`
        )
      );

    let sentCount = 0;
    
    for (const rental of activeRentals) {
      // 解析租期字串例如: [2026-03-25..., 2026-03-28...)
      const periodStr = String(rental.rentalPeriod);
      const match = periodStr.match(/\[(.*?),\s*(.*?)\)/);
      let endDateStr = "近期";
      
      if (match && match[2]) {
        // match[2] 是結束日期(upper bound)
        const endDate = new Date(match[2]);
        // 轉為易讀的格式: 2026-03-28
        endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
      }

      // 觸發 LINE 發送
      // 若您的資料庫有存顧客自己的 LINE_USER_ID，這裡就可以改帶 rental.lineUserId
      // 由於示範階段並無該欄位，這裡會 fallback 回管理員頻道接收提醒測試
      const success = await sendRentalReminder({
        orderId: rental.id,
        customerName: rental.customerName || "親愛的顧客",
        productName: rental.productName,
        endDateStr,
      });

      if (success) sentCount++;
    }

    return NextResponse.json({ 
      success: true, 
      message: "Automated Return Reminders executed.",
      targetsFound: activeRentals.length, 
      pushSent: sentCount
    });

  } catch (error: any) {
    console.error("Cron Reminder Extraction Error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
