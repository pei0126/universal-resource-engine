-- 啟用 btree_gist extension（EXCLUDE constraint 混用 = 和 && 運算子需要）
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 防止同一產品在同一時段被重複預約
ALTER TABLE rentals
  ADD CONSTRAINT no_overlapping_rentals
  EXCLUDE USING gist (
    product_id WITH =,
    rental_period WITH &&
  );
