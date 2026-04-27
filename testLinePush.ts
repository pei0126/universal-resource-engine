import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const to = process.env.NEXT_PUBLIC_ADMIN_LINE_USER_ID;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://fragmental-horsily-loni.ngrok-free.dev";
const orderId = "TEST-ORDER-777";
const orderUrl = `${baseUrl}/admin/orders/${orderId}`;

console.log("-> 準備推播至 LINE ID:", to);
console.log("-> 綁定按鈕全域網址:", orderUrl);

const payload = {
  to,
  messages: [
    {
      type: "flex",
      altText: "這是一則來自 Antigravity 的獨立系統測試",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "ANTIGRAVITY", weight: "bold", color: "#1DB446", size: "sm" },
            { type: "text", text: "路由驗證成功 🎉", weight: "bold", size: "xl", margin: "md" },
            { type: "text", text: "已覆寫 localhost 並抓取正式動態網址", size: "xs", color: "#aaaaaa", wrap: true },
            { type: "separator", margin: "xxl" },
            {
              type: "box", layout: "vertical", margin: "xxl", spacing: "sm",
              contents: [
                {
                  type: "box", layout: "horizontal",
                  contents: [
                    { type: "text", text: "訂單編號", size: "sm", color: "#555555", flex: 0 },
                    { type: "text", text: orderId, size: "sm", color: "#111111", align: "end" }
                  ]
                }
              ]
            },
            { type: "separator", margin: "xl" },
            {
              type: "image",
              url: `https://quickchart.io/qr?text=${orderId}&size=200`,
              size: "sm", aspectMode: "cover", align: "center", margin: "xl"
            }
          ]
        },
        footer: {
          type: "box", layout: "vertical",
          contents: [
            {
              type: "button", style: "primary", color: "#1DB446",
              action: { type: "uri", label: "開啟最新測試畫面", uri: orderUrl }
            }
          ]
        }
      }
    }
  ]
};

fetch("https://api.line.me/v2/bot/message/push", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => {
    console.log("-> 官方 API 回應成功:", data);
  })
  .catch(err => {
    console.error("-> 失敗:", err);
  });
