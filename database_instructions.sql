-- 1. 建立單品狀態 Enum
CREATE TYPE "item_status" AS ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE');

-- 2. 建立 Equipment 設備總量表
CREATE TABLE IF NOT EXISTS "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE cascade ON UPDATE no action,
	"name" varchar(255) NOT NULL,
	"total_stock" integer DEFAULT 0 NOT NULL,
	"daily_price" numeric(10, 2) NOT NULL,
	"deposit" numeric(10, 2),
	"image_url" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. 建立 Items 實體單品表
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"equipment_id" uuid NOT NULL REFERENCES "equipment"("id") ON DELETE cascade ON UPDATE no action,
	"serial_number" varchar(255),
	"status" "item_status" DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. 調整 rentals 結構相容
ALTER TABLE "rentals" ALTER COLUMN "product_id" DROP NOT NULL;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "equipment_id" uuid REFERENCES "equipment"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "rentals" ADD COLUMN IF NOT EXISTS "item_id" uuid REFERENCES "items"("id") ON DELETE set null ON UPDATE no action;

-- 5. ★ 插入第一台 SONY A7SIII 示範資料！
-- 這段邏輯會先找出現有的 tenantId 作為房客，並塞入設備與它的實體相機條碼！
DO $$
DECLARE
    found_tenant_id uuid;
    new_equip_id uuid;
BEGIN
    SELECT id INTO found_tenant_id FROM tenants LIMIT 1;
    
    IF found_tenant_id IS NOT NULL THEN
        -- 建立設備模型
        INSERT INTO equipment (tenant_id, name, total_stock, daily_price, deposit, image_url)
        VALUES (found_tenant_id, 'Sony A7SIII (單機身)', 1, 1500.00, 10000.00, 'https://cdn.dummyjson.com/product-images/1/thumbnail.jpg')
        RETURNING id INTO new_equip_id;

        -- 建立對應的 1 號實體條碼
        INSERT INTO items (equipment_id, serial_number, status)
        VALUES (
            new_equip_id, 
            'A7S3-001',   -- ★★ 未來您可以直接列印包含這個字串的條碼貼在相機底部 ★★
            'AVAILABLE'
        );
    END IF;
END $$;
