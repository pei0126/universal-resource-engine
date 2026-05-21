import {
  pgTable,
  uuid,
  varchar,
  decimal,
  timestamp,
  pgEnum,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────

export const businessModeEnum = pgEnum("business_mode", ["RENTAL", "RESTAURANT", "RETAIL", "CLASSROOM"]);

export const resourceTypeEnum = pgEnum("resource_type", ["EQUIPMENT", "TABLE", "MENU_ITEM", "CLASS_SEAT", "SALES", "RENTAL"]);

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "ACTIVE",
  "PICKED_UP",
  "RETURNED",
  "CANCELLED",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "AVAILABLE",
  "RENTED",
  "MAINTENANCE",
]);

// ─── Tenants (租戶/商家) ───────────────────────────────────

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  businessMode: businessModeEnum("business_mode").notNull().default("RENTAL"),
  bufferDurationMinutes: integer("buffer_duration_minutes").notNull().default(120),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Resources (通用資源管理：設備、桌位、餐點等) ────────────

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  resourceType: resourceTypeEnum("resource_type").notNull().default("EQUIPMENT"),
  name: varchar("name", { length: 255 }).notNull(),
  totalStock: integer("total_stock").notNull().default(0), // 容量或總數
  price: decimal("price", { precision: 10, scale: 2 }).notNull(), // 單價 (時租、日租、或固定金額)
  deposit: decimal("deposit", { precision: 10, scale: 2 }),
  imageUrl: varchar("image_url", { length: 1024 }),
  metadata: jsonb("metadata"), // 用於儲存特定模式屬性 (例如餐點過敏原、桌位屬性)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Items (實體單品管理，例如相機機身條碼) ──────────────────

export const items = pgTable("items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  serialNumber: varchar("serial_number", { length: 255 }), // 機身號碼、座位號碼等
  status: itemStatusEnum("status").notNull().default("AVAILABLE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Custom Types ────────────────────────────────────────

import { customType } from "drizzle-orm/pg-core";
const tstzrange = customType<{ data: string; driverValue: string }>({
  dataType() {
    return "tstzrange";
  },
});

// ─── Orders (主訂單管理) ───────────────────────────────────

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerName: varchar("customer_name", { length: 255 }),
  lineUserId: varchar("line_user_id", { length: 255 }),
  reservationPeriod: tstzrange("reservation_period"), // 允許為 null (純零售不綁時段)
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  metadata: jsonb("metadata"), // 用於儲存加點餐點、學員名單等特殊資料
  pickedUpAt: timestamp("picked_up_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Order Items (單筆訂單的實體明細，實現一對多) ────────────

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  resourceId: uuid("resource_id").notNull().references(() => resources.id, { onDelete: "cascade" }),
  itemId: uuid("item_id").references(() => items.id, { onDelete: "set null" }), // 實際核銷發配的單品實體 (可為空，例如純餐點)
  quantity: integer("quantity").notNull().default(1),
  priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
