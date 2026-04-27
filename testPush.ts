import { sendLineReceipt, LineReceiptData } from './src/lib/line';
import { config } from 'dotenv';
config({ path: '.env.local' });

const testData: LineReceiptData = {
  orderId: "TEST-ORDER-777",
  customerName: "測試開發者",
  totalPrice: 12800,
  source: "線上顧客預約",
  items: [
    { name: "Sony A7SIII 全片幅相機", qty: 1, price: 12000, type: "RENTAL", period: "2026-03-29 ~ 2026-03-31" },
    { name: "燈架沙袋", qty: 2, price: 800, type: "SALE" }
  ]
};

sendLineReceipt(testData).then(res => {
  console.log("Push Result:", res);
  process.exit(res.success ? 0 : 1);
});
