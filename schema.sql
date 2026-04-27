-- ⚠️ 執行此腳本前，請確認您已備份需要的資料！
-- 這將會刪除所有舊有的表格並建立全新的通用架構

-- 1. 刪除舊有表格與約束 (如果有)
DROP TABLE IF EXISTS "order_items" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "items" CASCADE;
DROP TABLE IF EXISTS "resources" CASCADE;
DROP TABLE IF EXISTS "rentals" CASCADE;
DROP TABLE IF EXISTS "equipment" CASCADE;
DROP TABLE IF EXISTS "products" CASCADE;
DROP TABLE IF EXISTS "tenants" CASCADE;

-- 2. 刪除並重建 Enums
DROP TYPE IF EXISTS business_mode CASCADE;
CREATE TYPE business_mode AS ENUM ('RENTAL', 'RESTAURANT', 'RETAIL', 'CLASSROOM');

DROP TYPE IF EXISTS resource_type CASCADE;
CREATE TYPE resource_type AS ENUM ('EQUIPMENT', 'TABLE', 'MENU_ITEM', 'CLASS_SEAT');

DROP TYPE IF EXISTS order_status CASCADE;
CREATE TYPE order_status AS ENUM ('PENDING', 'ACTIVE', 'PICKED_UP', 'RETURNED', 'CANCELLED');

DROP TYPE IF EXISTS item_status CASCADE;
CREATE TYPE item_status AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE');

-- 3. 建立 Tenants (租戶/商家)
CREATE TABLE "tenants" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "business_mode" business_mode NOT NULL DEFAULT 'RENTAL',
    "buffer_duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. 建立 Resources (通用資源管理)
CREATE TABLE "resources" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "resource_type" resource_type NOT NULL DEFAULT 'EQUIPMENT',
    "name" VARCHAR(255) NOT NULL,
    "total_stock" INTEGER NOT NULL DEFAULT 0,
    "price" NUMERIC(10, 2) NOT NULL,
    "deposit" NUMERIC(10, 2),
    "image_url" VARCHAR(1024),
    "metadata" JSONB,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. 建立 Items (實體單品)
CREATE TABLE "items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "resource_id" UUID NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
    "serial_number" VARCHAR(255),
    "status" item_status NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. 建立 Orders (主訂單)
CREATE TABLE "orders" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "customer_name" VARCHAR(255),
    "line_user_id" VARCHAR(255),
    "reservation_period" tstzrange,
    "total_price" NUMERIC(10, 2),
    "status" order_status NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "picked_up_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. 建立 Order Items (訂單明細：實現一單多資源)
CREATE TABLE "order_items" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "resource_id" UUID NOT NULL REFERENCES "resources"("id") ON DELETE CASCADE,
    "item_id" UUID REFERENCES "items"("id") ON DELETE SET NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price_at_time" NUMERIC(10, 2) NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. 初始化範例資料 (建立預設 Tenant 與 A7S3)
INSERT INTO "tenants" ("id", "name", "business_mode", "buffer_duration_minutes") 
VALUES ('11111111-1111-1111-1111-111111111111', '預設測試商家', 'RENTAL', 120);

INSERT INTO "resources" ("id", "tenant_id", "resource_type", "name", "total_stock", "price", "deposit")
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'EQUIPMENT', 'Sony A7SIII', 1, 1500, 30000);

-- 為該設備建立一台 AVAILABLE 的實體機
INSERT INTO "items" ("id", "resource_id", "serial_number", "status")
VALUES ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'A7S3-001', 'AVAILABLE');

-- 注意：由於新的架構將訂單與資源拆為一對多 (order_items)，若要嚴格防堵同一個 resource_id 在同時段被超賣，
-- 傳統的單表 EXCLUDE constraint 不適用跨表 (orders.reservation_period 與 order_items.resource_id)。
-- 我們將在應用程式層的 checkAvailability 實作加強防禦。
