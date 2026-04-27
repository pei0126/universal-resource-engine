# 🛸 整合平台專案憲法：多租戶、租賃與購物系統

## 🛑 核心禁令 (GCP-Free Policy)
- **嚴禁使用任何 Google Cloud Platform (GCP) 服務**：禁止導入 `google-cloud-*` 或 Firebase SDK。
- **替代方案**：資料庫與認證限用 **Supabase (PostgreSQL)**，金流限用 **Stripe**。

## 🏗️ 多租戶架構 (Multi-Tenant)
- **資料隔離**：所有資料表必須包含 `tenant_id` (UUID) 欄位。
- **查詢約束**：所有資料庫查詢 (SELECT/UPDATE/DELETE) 必須強制帶入 `tenant_id` 進行過濾。
- **資料庫安全**：必須在 Supabase 中實作 **Row Level Security (RLS)**。

## 📦 產品與業務邏輯 (Hybrid Logic)
- **產品類型**：區分為 `SALE` (買斷) 與 `RENTAL` (租賃)。
- **租賃防重疊**：
    - 使用 PostgreSQL 的 `tstzrange` 記錄租期。
    - 必須實作資料庫層級的 `EXCLUDE` 約束，防止同一實體在重疊時間被預約。
- **計費邏輯**：
    - `SALE`：單次扣款。
    - `RENTAL`：支援押金 (Deposit) 預授權與日租/時租計費。

## 🛠️ 技術棧規範 (Tech Stack)
- **前端/後端**：Next.js 15 (App Router)。
- **ORM**：Drizzle ORM。
- **UI**：動態組件架構（根據產品類型切換日期選擇器或數量加減器）。