"use server";

import { db } from "@/db";
import { tenants, resources, items, orders, orderItems } from "@/db/schema";
import { eq, and, ne, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import { sendLineReceipt, type LineReceiptData } from "@/lib/line";

export async function getTenants() {
  return db.select().from(tenants);
}

export async function getProducts(tenantId: string) {
  return db.select().from(resources).where(eq(resources.tenantId, tenantId));
}

export async function getProduct(id: string, tenantId: string) {
  const result = await db
    .select()
    .from(resources)
    .where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)))
    .limit(1);
  return result[0] || null;
}

export async function checkAvailability(targetId: string, fromISO: string, toISO: string, tenantId: string) {
  // 動態讀取商家的 buffer 參數
  const [tenant] = await db.select({ buffer: tenants.bufferDurationMinutes })
    .from(tenants).where(eq(tenants.id, tenantId));
  const bufferMinutes = tenant?.buffer ?? 120; // 預設 120 分鐘

  const endDate = new Date(toISO);
  endDate.setMinutes(endDate.getMinutes() + bufferMinutes);
  const bufferedRange = `[${fromISO}, ${endDate.toISOString()})`;

  // 1. 查詢有多少筆有效訂單（非取消、非歸還）與該緩衝區間重疊 (透過 order_items JOIN orders)
  const overlapped = await db.select({ quantity: orderItems.quantity })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(
      eq(orderItems.resourceId, targetId),
      ne(orders.status, "CANCELLED"),
      ne(orders.status, "RETURNED"),
      sql`${orders.reservationPeriod} && ${bufferedRange}::tstzrange`
    ));

  const occupiedCount = overlapped.reduce((acc, curr) => acc + curr.quantity, 0);

  // 2. 查詢該資源的最高實體庫存數
  const [resData] = await db.select({ totalStock: resources.totalStock })
    .from(resources)
    .where(eq(resources.id, targetId));
      
  const totalAllowed = resData?.totalStock && resData.totalStock > 0 ? resData.totalStock : 1;

  console.log('Total Stock:', totalAllowed);
  console.log('Current Conflicts:', occupiedCount);

  return { 
    available: occupiedCount < totalAllowed, 
    remaining: totalAllowed - occupiedCount,
    bufferedRange 
  };
}

export async function createRental(data: {
  tenantId: string;
  equipmentId?: string; // 兼容舊代碼，改指 resource_id
  productId?: string;   // 同上
  customerName: string;
  lineUserId?: string;
  from: string;
  to: string;
  totalPrice: number;
  metadata?: any; // 加入 JSONB 支援
}) {
  try {
    const targetId = data.equipmentId || data.productId;
    if (!targetId) return { success: false, error: "未指定任何資源" };

    const resourceInfo = await getProduct(targetId, data.tenantId);
    if (!resourceInfo) return { success: false, error: "找不到該資源" };
    const itemName = resourceInfo.name;

    // ★ 執行強力的庫存重疊防禦與 Buffer 計算
    const check = await checkAvailability(targetId, data.from, data.to, data.tenantId);
    if (!check.available) {
      return { success: false, error: "該時段已預約額滿，請選擇其他時段" };
    }

    // 自動分配實體 (Item) - 修正近視眼演算法
    let assignedItemId: string | null = null;
    
    // 1. 撈出該 resourceId 下所有的實體 (排除無限期維修中的機台)
    const allItems = await db.select()
      .from(items)
      .where(
        and(
          eq(items.resourceId, targetId),
          ne(items.status, "MAINTENANCE")
        )
      );
      
    if (allItems.length > 0) {
      // 2. 撈出『該預約時段』內，所有已經被佔用的實體 ID
      const occupiedItems = await db.select({ itemId: orderItems.itemId })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orderItems.resourceId, targetId),
            ne(orders.status, "CANCELLED"),
            ne(orders.status, "RETURNED"),
            sql`${orders.reservationPeriod} && ${check.bufferedRange}::tstzrange`
          )
        );

      const occupiedItemIds = occupiedItems.map(r => r.itemId).filter(Boolean) as string[];

      // 3. 排除被佔用的實體，剩下的隨便抓一台分配
      const freeItems = allItems.filter(item => !occupiedItemIds.includes(item.id));

      if (freeItems.length > 0) {
        assignedItemId = freeItems[0].id;
      }
    }

    // 寫入主訂單 Orders
    const [order] = await db.insert(orders).values({
      tenantId: data.tenantId,
      customerName: data.customerName,
      lineUserId: data.lineUserId || null,
      reservationPeriod: sql`${check.bufferedRange}::tstzrange`,
      totalPrice: data.totalPrice.toString(),
      metadata: data.metadata || null,
      status: "PENDING",
    }).returning({ id: orders.id });

    // 寫入訂單明細 Order Items
    await db.insert(orderItems).values({
      orderId: order.id,
      resourceId: targetId,
      itemId: assignedItemId,
      quantity: 1,
      priceAtTime: data.totalPrice.toString(),
    });

    try {
      const receiptData: LineReceiptData = {
        orderId: order.id,
        customerName: data.customerName,
        source: "線上顧客預約",
        totalPrice: data.totalPrice,
        items: [{
          name: itemName,
          qty: 1,
          price: data.totalPrice,
          type: "RENTAL",
          period: `${new Date(data.from).toLocaleDateString()} ~ ${new Date(data.to).toLocaleDateString()}`
        }]
      };
      await sendLineReceipt(receiptData, data.lineUserId);
    } catch(e) { console.warn("LINE 發送失敗", e) }

    // 重新整理對應的前端畫面
    if (targetId) revalidatePath(`/products/${targetId}`);
    return { success: true };
  } catch (err: any) {
    const errorCode = err.code || err.cause?.code;
    if (errorCode === '23P01' || err.message?.includes('no_overlapping_rentals')) {
      return { success: false, error: '此時段已被占用，請選擇其他日期。' };
    }
    console.error("真正的錯誤細節:", err);
    return { success: false, error: '系統忙碌中，請檢查輸入內容或稍後再試。' };
  }
}

export async function createPurchase(data: {
  tenantId: string;
  productId: string;
  customerName: string;
  totalPrice: number;
}) {
  try {
    const product = await getProduct(data.productId, data.tenantId);
    if (!product) {
      return { success: false, error: "找不到該產品或權限不足" };
    }

    // 購物 (SALE) 暫時也寫入 rentals 表作為訂單記錄，不帶租期，
    // 但因為 tstzrange 是 NOT NULL，我們塞一個 dummy range 代表交易當下的時間戳。
    // （更好的做法應該是拆分 orders 表，此處為求快速跑通核心邏輯先沿用）
    const now = new Date().toISOString();
    const dummyRange = `[${now}, ${now}]`;

    const insertResult = await db.insert(rentals).values({
      tenantId: data.tenantId,
      productId: data.productId,
      customerName: data.customerName,
      rentalPeriod: sql`${dummyRange}::tstzrange`,
      totalPrice: data.totalPrice.toString(),
      status: "ACTIVE", // 買斷視為已啟動/完成
    }).returning({ id: rentals.id });

    try {
      const receiptData: LineReceiptData = {
        orderId: insertResult[0].id,
        customerName: data.customerName,
        source: "線上顧客購買",
        totalPrice: data.totalPrice,
        items: [{
          name: product.name,
          qty: 1,
          price: data.totalPrice,
          type: "SALE"
        }]
      };
      await sendLineReceipt(receiptData);
    } catch(e) { console.warn("LINE 發送失敗", e) }

    revalidatePath(`/products/${data.productId}`);
    return { success: true };
  } catch (err) {
    console.error("createPurchase Error:", err);
    return { success: false, error: "系統發生未知錯誤，請稍後再試" };
  }
}

export async function getBookedPeriods(productId: string) {
  const result = await db
    .select({ rentalPeriod: rentals.rentalPeriod })
    .from(rentals)
    .where(
      and(
        eq(rentals.productId, productId),
        ne(rentals.status, "CANCELLED")
      )
    );

  const periods: { start: Date; end: Date }[] = [];

  for (const row of result) {
    // rentalPeriod 來自 postgres 是字串，如 "[2024-03-20 10:00:00+08, 2024-03-25 10:00:00+08)"
    const periodStr = String(row.rentalPeriod);
    const match = periodStr.match(/\[(.*?),\s*(.*?)\)/);
    
    if (match) {
      periods.push({
        start: new Date(match[1]),
        end: new Date(match[2]),
      });
    }
  }

  return periods;
}

export async function getRentalsForAdmin(tenantId: string) {
  // 透過 orders 取得總表，再 join orderItems 與 resources
  const result = await db
    .select({
      id: orders.id,
      customerName: orders.customerName,
      lineUserId: orders.lineUserId,
      reservationPeriod: orders.reservationPeriod,
      totalPrice: orders.totalPrice,
      status: orders.status,
      createdAt: orders.createdAt,
      resourceName: resources.name,
      itemId: orderItems.itemId, // 分配到的實體 ID
    })
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .leftJoin(resources, eq(orderItems.resourceId, resources.id))
    .where(eq(orders.tenantId, tenantId))
    .orderBy(desc(orders.createdAt));

  return result;
}

export async function updateRentalStatus(
  orderId: string,
  tenantId: string,
  newStatus: "PENDING" | "ACTIVE" | "PICKED_UP" | "RETURNED" | "CANCELLED"
) {
  try {
    let updateData: any = { status: newStatus as any };
    if (newStatus === "CANCELLED") {
      updateData.reservationPeriod = sql`'empty'::tstzrange`;
    }

    await db
      .update(orders)
      .set(updateData)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)));

    if (newStatus === "RETURNED") {
      const relatedItems = await db.select({ itemId: orderItems.itemId })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
        
      for (const item of relatedItems) {
        if (item.itemId) {
          await db.update(items).set({ status: "AVAILABLE" }).where(eq(items.id, item.itemId));
        }
      }
    }

    revalidatePath(`/admin/${tenantId}/rentals`);
    return { success: true };
  } catch (err: any) {
    console.error("更新訂單狀態失敗:", err);
    return { success: false, error: err.message || "更新失敗" };
  }
}

export async function getAdminProducts(tenantId: string) {
  return await db.select()
    .from(resources)
    .where(eq(resources.tenantId, tenantId))
    .orderBy(desc(resources.createdAt));
}

export async function upsertProduct(tenantId: string, formData: FormData) {
  try {
    console.log('Action Triggered with formData keys:', Array.from(formData.keys()));
    
    const id = formData.get("id") as string | null;
    const name = formData.get("name") as string;
    const dailyPrice = Number(formData.get("dailyPrice"));
    
    const depositStr = formData.get("deposit") as string | null;
    const deposit = depositStr ? depositStr : null;

    const totalStockStr = formData.get("totalStock") as string | null;
    const totalStock = totalStockStr ? Number(totalStockStr) : 0;
    
    // 處理圖片
    const imageFile = formData.get("image") as File | null;
    let imageUrl = formData.get("existingImageUrl") as string | null;

    if (imageFile && imageFile.size > 0) {
      if (!imageFile.type.startsWith('image/')) {
         return { success: false, error: "檔案格式錯誤：只能上傳圖片" };
      }

      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(fileName, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error("圖片上傳失敗: " + error.message);
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);
        
      imageUrl = publicUrl;
    }

    const payload = {
      tenantId: tenantId,
      resourceType: "EQUIPMENT" as any,
      name: name,
      price: dailyPrice.toString(),
      deposit: deposit ? Number(deposit).toString() : null,
      totalStock: totalStock,
      imageUrl: imageUrl ?? "", // 確保不會是 undefined，傳入空字串或網址
    };

    if (id) {
      await db.update(resources).set(payload).where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));
    } else {
      await db.insert(resources).values(payload);
    }
    
    revalidatePath(`/admin/${tenantId}/products`);
    return { success: true };
  } catch(e: any) {
    console.dir(e, { depth: null });
    // 強制轉換純文字，防止回傳無法被 Serialize 的物件導致 Next.js Unexpected response
    return { success: false, error: "發生未預期錯誤：" + String(e?.message || e) };
  }
}

export async function processPosCheckout(
  tenantId: string,
  cart: { id: string; type: "SALE" | "RENTAL"; qty: number; deposit: number; basePrice: number }[],
  grandTotal: number,
  cashTendered: number,
  changeDue: number
) {
  try {
    await db.transaction(async (tx) => {
      // 1. 建立總帳 orders
      const orderRes = await tx.execute(
        sql`INSERT INTO orders (tenant_id, total_amount, cash_tendered, change_due) VALUES (${tenantId}, ${grandTotal}, ${cashTendered}, ${changeDue}) RETURNING id`
      );
      
      const resAny = orderRes as any;
      const orderId = ((resAny.rows ? resAny.rows[0]?.id : resAny[0]?.id) || `POS-${Date.now()}`) as string;

      const receiptItems: any[] = [];

      // 2. 處理商品扣庫存與建立訂單
      for (const item of cart) {
        let prodName = "未知商品";
        try {
          const [p] = await tx.select({ name: resources.name }).from(resources).where(eq(resources.id, item.id));
          if (p) prodName = p.name;
        } catch(e) {}

        if (item.type === "SALE") {
          // 嚴格寫入庫存扣除
          await tx.update(resources)
            .set({ totalStock: sql`${resources.totalStock} - ${item.qty}` })
            .where(and(eq(resources.id, item.id), eq(resources.tenantId, tenantId)));
            
          receiptItems.push({
            name: prodName,
            qty: item.qty,
            price: item.basePrice * item.qty,
            type: "SALE"
          });
        } else if (item.type === "RENTAL") {
          // 檢查該 resource_id 在 now() 時段是否已經有 ACTIVE 的租賃紀錄
          const existing = await tx.select().from(orders)
            .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
            .where(and(
              eq(orderItems.resourceId, item.id),
              ne(orders.status, "CANCELLED"),
              sql`${orders.reservationPeriod} && tstzrange(now(), now() + interval '1 day')`
            )).limit(1);

          if (existing.length > 0) {
            throw new Error('此設備目前已被租走，請檢查庫存或時間！');
          }

          const itemTotal = ((item.deposit + item.basePrice) * item.qty).toString();
          
          const [newOrder] = await tx.insert(orders).values({
            tenantId,
            customerName: "門市現場客",
            reservationPeriod: sql`tstzrange(now(), now() + interval '1 day')`,
            totalPrice: itemTotal,
            status: "ACTIVE"
          }).returning({ id: orders.id });

          await tx.insert(orderItems).values({
            orderId: newOrder.id,
            resourceId: item.id,
            quantity: item.qty,
            priceAtTime: itemTotal,
          });
          
          receiptItems.push({
            name: prodName,
            qty: item.qty,
            price: Number(itemTotal),
            type: "RENTAL",
            period: "即日起 1 天"
          });
        }
      }
      
      try {
        const receiptData: LineReceiptData = {
          orderId: String(orderId),
          customerName: "門市現場客",
          source: "門市 POS 結帳",
          totalPrice: grandTotal,
          items: receiptItems
        };
        await sendLineReceipt(receiptData);
      } catch(e) { console.warn("LINE 發送失敗", e) }
    });

    revalidatePath(`/admin/${tenantId}/pos`);
    revalidatePath(`/admin/${tenantId}/products`);
    return { success: true };
  } catch (err: any) {
    console.dir(err, { depth: null });
    return { success: false, error: err.message || "結帳失敗，可能是庫存不足或資料庫衝突。" };
  }
}

export async function deleteProduct(id: string, tenantId: string) {
  try {
    const [prod] = await db.select().from(resources).where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));
    if(!prod) return { success: false, error: "找不到該資源" };

    if (prod.imageUrl) {
      // 嘗試刪除 Supabase Storage 圖片
      const fileName = prod.imageUrl.split('/').pop();
      if(fileName) {
        await supabase.storage.from("product-images").remove([fileName]);
      }
    }

    await db.delete(resources).where(and(eq(resources.id, id), eq(resources.tenantId, tenantId)));
    revalidatePath(`/admin/${tenantId}/products`);
    return { success: true };
  } catch(e) {
    return { success: false, error: "刪除失敗" };
  }
}

export async function verifyOrderAction(adminToken: string, orderId: string) {
  const cleanAdminStr = adminToken.trim();
  const cleanEnvStr = (process.env.NEXT_PUBLIC_ADMIN_LINE_USER_ID || "").trim();

  if (cleanAdminStr !== cleanEnvStr) {
    return { success: false, error: "身分驗證失敗，權限不足" };
  }

  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return { success: false, error: "無效的 QR Code，找不到對應的訂單" };

    if (order.status === "PICKED_UP") {
      const timeStr = order.pickedUpAt ? new Date(order.pickedUpAt).toLocaleString('zh-TW') : "未知時間";
      return { success: false, error: `此訂單已於 ${timeStr} 完成核銷，請勿重複操作` };
    }

    if (order.status !== "PENDING" && order.status !== "ACTIVE") {
      return { success: false, error: `訂單狀態為 ${order.status}，無法進行取貨核銷` };
    }

    const now = new Date();
    await db.update(orders)
      .set({ status: "PICKED_UP" as any, pickedUpAt: now } as any)
      .where(eq(orders.id, orderId));
      
    // 狀態連動：將對應的實體狀態改為 RENTED
    const relatedItems = await db.select({ itemId: orderItems.itemId })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
      
    for (const item of relatedItems) {
      if (item.itemId) {
        await db.update(items).set({ status: "RENTED" }).where(eq(items.id, item.itemId));
      }
    }
    
    revalidatePath(`/admin/${order.tenantId}/rentals`);
    return { success: true, tenantId: order.tenantId };
  } catch(e: any) {
    console.error("verifyOrderAction error:", e);
    return { success: false, error: "資料庫核銷失敗: " + e.message };
  }
}

export async function authenticateScannerAction(adminToken: string) {
  const cleanAdminStr = adminToken.trim();
  const cleanEnvStr = (process.env.NEXT_PUBLIC_ADMIN_LINE_USER_ID || process.env.LINE_ADMIN_USER_ID || "").trim();

  console.log('-> [Scanner Auth] 手機傳入的 ID: [' + cleanAdminStr + ']');
  console.log('-> [Scanner Auth] 伺服器預期的 ID: [' + cleanEnvStr + ']');

  if (cleanAdminStr === cleanEnvStr && cleanEnvStr !== "") {
    return { success: true };
  }
  
  return { success: false, error: "查無授權：不符合系統環境的 LINE User ID" };
}
