export interface LineReceiptItem {
  name: string;
  qty: number;
  price: number;
  type: "SALE" | "RENTAL";
  period?: string;
}

export interface LineReceiptData {
  orderId: string;
  customerName: string;
  totalPrice: number;
  source: "門市 POS 結帳" | "線上顧客預約" | "線上顧客購買";
  items: LineReceiptItem[];
}

/**
 * 透過 LINE Messaging API 發送 Flex Message 數位收據
 */
export async function sendLineReceipt(data: LineReceiptData, targetUserId?: string) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = targetUserId || process.env.NEXT_PUBLIC_ADMIN_LINE_USER_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fragmental-horsily-loni.ngrok-free.dev';
  const orderUrl = `${baseUrl}/admin/orders/${data.orderId}`;

  if (!accessToken || !to) {
    console.warn("未設定 LINE_CHANNEL_ACCESS_TOKEN 或 目標 USER_ID，跳過發送 LINE 通知");
    return { success: false, error: "Missing config" };
  }

  // 構造 Flex Message 的商品明細清單
  const itemContents = data.items.flatMap((item, index) => {
    const contents: any[] = [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          {
            type: "text",
            text: `${item.name} x${item.qty}`,
            size: "sm",
            color: "#555555",
            flex: 0,
            weight: "bold"
          },
          {
            type: "text",
            text: `$${item.price}`,
            size: "sm",
            color: "#111111",
            align: "end"
          }
        ]
      }
    ];

    if (item.type === "RENTAL" && item.period) {
      contents.push({
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "檔期",
            color: "#aaaaaa",
            size: "xs",
            flex: 1
          },
          {
            type: "text",
            text: item.period,
            wrap: true,
            color: "#666666",
            size: "xs",
            flex: 4
          }
        ]
      });
    }

    if (index < data.items.length - 1) {
      contents.push({
        type: "separator",
        margin: "sm"
      });
    }

    return contents;
  });

  const flexMessage = {
    type: "flex",
    altText: `新訂單通知：${data.customerName} - $${data.totalPrice}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "RECEIPT",
            weight: "bold",
            color: "#1DB446",
            size: "sm"
          },
          {
            type: "text",
            text: "交易完成通知",
            weight: "bold",
            size: "xxl",
            margin: "md"
          },
          {
            type: "text",
            text: data.source,
            size: "xs",
            color: "#aaaaaa",
            wrap: true
          },
          {
            type: "separator",
            margin: "xxl"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xxl",
            spacing: "sm",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "訂單編號",
                    size: "sm",
                    color: "#555555",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: data.orderId.split('-')[0], // 截斷 UUID 保持版面乾淨
                    size: "sm",
                    color: "#111111",
                    align: "end"
                  }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "text",
                    text: "客戶名稱",
                    size: "sm",
                    color: "#555555",
                    flex: 0
                  },
                  {
                    type: "text",
                    text: data.customerName,
                    size: "sm",
                    color: "#111111",
                    align: "end"
                  }
                ]
              }
            ]
          },
          {
            type: "separator",
            margin: "xxl"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xxl",
            spacing: "sm",
            contents: itemContents
          },
          {
            type: "separator",
            margin: "xxl"
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "共計總額",
                size: "sm",
                color: "#555555"
              },
              {
                type: "text",
                text: `$${data.totalPrice}`,
                size: "xl",
                color: "#ff334b",
                align: "end",
                weight: "bold"
              }
            ]
          },
          {
            type: "separator",
            margin: "xl"
          },
          {
            type: "image",
            url: `https://quickchart.io/qr?text=${data.orderId}&size=200&margin=1`,
            size: "sm",
            aspectMode: "cover",
            align: "center",
            margin: "xl"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#1DB446",
            action: {
              type: "uri",
              label: "查看後台訂單",
              uri: orderUrl
            }
          }
        ]
      },
      styles: {
        footer: {
          separator: true
        }
      }
    }
  };

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [flexMessage],
      }),
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error("LINE 發送失敗:", resData);
      return { success: false, error: resData.message };
    }

    return { success: true };
  } catch (error) {
    console.error("LINE 發送發生異常:", error);
    return { success: false, error };
  }
}

export interface RentalReminderData {
  orderId: string;
  customerName: string;
  productName: string;
  endDateStr: string;
}

/**
 * 透過 LINE 發送租賃到期歸還溫馨提醒
 */
export async function sendRentalReminder(data: RentalReminderData, targetUserId?: string) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = targetUserId || process.env.NEXT_PUBLIC_ADMIN_LINE_USER_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://fragmental-horsily-loni.ngrok-free.dev';
  const orderUrl = `${baseUrl}/admin/orders/${data.orderId}`;

  if (!accessToken || !to) return false;

  const flexMessage = {
    type: "flex",
    altText: `還物提醒：您租借的 ${data.productName} 即將到期`,
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover"
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "溫馨提醒 ⏰",
            weight: "bold",
            color: "#ff334b",
            size: "sm"
          },
          {
            type: "text",
            text: "設備歸還通知",
            weight: "bold",
            size: "xl",
            margin: "md"
          },
          {
            type: "text",
            text: `親愛的 ${data.customerName} 您好，您租借的設備即將到期，請記得於指定時間內歸還。若需續租請儘速與客服聯繫。`,
            size: "xs",
            color: "#666666",
            wrap: true,
            margin: "md"
          },
          {
            type: "separator",
            margin: "xl"
          },
          {
            type: "box",
            layout: "vertical",
            margin: "xl",
            spacing: "sm",
            contents: [
              {
                 type: "box",
                 layout: "horizontal",
                 contents: [
                   { type: "text", text: "訂單編號", size: "sm", color: "#aaaaaa", flex: 0 },
                   { type: "text", text: data.orderId.split('-')[0], size: "sm", color: "#111111", align: "end" }
                 ]
              },
              {
                 type: "box",
                 layout: "horizontal",
                 contents: [
                   { type: "text", text: "租借設備", size: "sm", color: "#aaaaaa", flex: 0 },
                   { type: "text", text: data.productName, size: "sm", color: "#111111", align: "end", wrap: true }
                 ]
              },
              {
                 type: "box",
                 layout: "horizontal",
                 contents: [
                   { type: "text", text: "預計歸還", size: "sm", color: "#aaaaaa", flex: 0 },
                   { type: "text", text: data.endDateStr, size: "sm", color: "#ff334b", align: "end", weight: "bold" }
                 ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#ff334b",
            action: {
              type: "uri",
              label: "查看租借詳情",
              uri: orderUrl
            }
          }
        ]
      }
    }
  };

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ to, messages: [flexMessage] }),
    });
    return response.ok;
  } catch (err) {
    console.error("發送歸還提醒失敗", err);
    return false;
  }
}

