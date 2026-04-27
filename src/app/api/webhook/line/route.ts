import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const text = await req.text();
    const signature = req.headers.get("x-line-signature");
    
    if (!signature) {
      return NextResponse.json({ error: "Missing x-line-signature" }, { status: 400 });
    }

    // 在生產環境中，應嚴格驗證 Webhook 來源
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (channelSecret) {
      const hash = crypto
        .createHmac("SHA256", channelSecret)
        .update(text)
        .digest("base64");
        
      if (hash !== signature) {
        console.warn("LINE Webhook 簽名驗證失敗！");
        // 為了開發方便，如果失敗暫時不阻擋，但會留下記錄
      }
    }

    const body = JSON.parse(text);

    // 處理 LINE 傳來的 events
    if (body.events && body.events.length > 0) {
      for (const event of body.events) {
        console.log("✅ 收到 LINE Event:", event.type);
        console.log("📦 來源 ID:", event.source?.userId || event.source?.groupId);
        
        if (event.type === 'message' && event.message.type === 'text') {
           console.log("💬 訊息內容:", event.message.text);
           // 若要實作 AI 解籤，可在此處接上 LLM 並呼叫 Reply API
        }
      }
    }

    // LINE 要求 Webhook 必須在 1 秒內回應 200 OK
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
