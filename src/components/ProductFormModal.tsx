"use client";

import { useState } from "react";
import { upsertProduct } from "@/app/actions";

type Product = {
  id?: string;
  name: string;
  type: "SALES" | "RENTAL" | "EQUIPMENT";
  dailyPrice: string;
  deposit: string | null;
  totalStock: number;
  imageUrl?: string;
};

export default function ProductFormModal({
  tenantId,
  initialData,
  onClose,
}: {
  tenantId: string;
  initialData?: Product;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [productType, setProductType] = useState<"SALES" | "RENTAL">((initialData?.type === "SALES" || initialData?.type === "RENTAL") ? initialData.type : "RENTAL");
  
  // 圖片預覽
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.imageUrl || null
  );

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError("請選擇有效的圖片檔案");
        return;
      }
      setImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    if (initialData?.id) {
      formData.append("id", initialData.id);
    }
    
    if (initialData?.imageUrl && !formData.get("image")) {
      formData.append("existingImageUrl", initialData.imageUrl);
    }

    const { success, error: submitError } = await upsertProduct(tenantId, formData);

    if (success) {
      onClose();
    } else {
      setError(submitError || "儲存失敗");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 遮罩背景 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* 彈出視窗本體 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
          <h3 className="text-xl font-bold text-gray-900">
            {initialData ? "編輯商品" : "新增商品"}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-md text-sm font-medium">
              {error}
            </div>
          )}

          <form id="productForm" onSubmit={handleSubmit} className="space-y-6">
            
            {/* 圖片上傳區 */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">商品圖片</label>
              <div className="flex items-start gap-6">
                <div 
                  className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group"
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-400 text-sm">無圖片</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">更換圖片</span>
                  </div>
                  {/* 疊加隱藏的 file input */}
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <div className="flex-1 text-sm text-gray-500 space-y-1 mt-2">
                  <p>支援 JPG, PNG 格式</p>
                  <p>建議比例 1:1，大小不超過 5MB</p>
                  {imagePreview && (
                    <button 
                      type="button" 
                      className="text-red-500 hover:text-red-700 font-medium text-xs mt-2"
                      onClick={() => {
                         setImagePreview(null);
                      }}
                    >
                      移除圖片
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              {/* 商品類型 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">商品類型 <span className="text-red-500">*</span></label>
                <select
                  name="type"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as "SALES" | "RENTAL")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                >
                  <option value="RENTAL">租賃 (Rental)</option>
                  <option value="SALES">買斷 (Sale)</option>
                </select>
              </div>

              {/* 基本資訊 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">商品名稱 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="name"
                  defaultValue={initialData?.name}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="輸入商品名稱"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{productType === "SALES" ? "售價" : "單日租金"} <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <input
                      type="number"
                      name="dailyPrice"
                      defaultValue={initialData?.dailyPrice}
                      required
                      min="0"
                      step="0.01"
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {productType !== "SALES" && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">設備押金 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        name="deposit"
                        defaultValue={initialData?.deposit || ""}
                        required
                        min="0"
                        step="0.01"
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">總部庫存數</label>
                <input
                  type="number"
                  name="totalStock"
                  defaultValue={initialData?.totalStock ?? 0}
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
            </div>
          </form>
        </div>

        {/* 底部按鈕區 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            取消
          </button>
          <button
            type="submit"
            form="productForm"
            disabled={loading}
            className={`px-6 py-2 text-sm font-medium text-white rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading 
                ? "bg-blue-400 cursor-not-allowed" 
                : "bg-blue-600 hover:bg-blue-700 shadow-sm"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                儲存中...
              </span>
            ) : (
              "儲存商品"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
