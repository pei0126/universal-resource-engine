import { upsertProduct } from "./src/app/actions";

async function run() {
  const fd = new FormData();
  fd.append("name", "測試新增設備");
  fd.append("dailyPrice", "500");
  fd.append("totalStock", "5");
  fd.append("deposit", "1000");

  const tenantId = "11111111-1111-1111-1111-111111111111"; // Default tenant
  console.log("Running upsertProduct...");
  const result = await upsertProduct(tenantId, fd);
  console.log("Result:", result);
}
run();
