"use client";

import { useState } from "react";
import ProductFormModal from "@/components/ProductFormModal";
import { deleteProduct } from "@/app/actions";

export default function AdminProductsPageClient({
  tenantId,
  products,
}: {
  tenantId: string;
  products: any[];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const handleCreate = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`確定要刪除商品「${name}」嗎？此操作無法還原。`)) {
      await deleteProduct(id, tenantId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">商家後台 - 商品管理</h1>
          <div className="flex gap-3">
            <a
              href={`/products?tenantId=${tenantId}`}
              target="_blank"
              className="bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-700 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              查看我的商店
            </a>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
              新增商品
            </button>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  商品資訊
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  售價 / 租金基數
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  庫存 / 押金
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                        {product.imageUrl ? (
                          <img className="h-full w-full object-cover" src={product.imageUrl} alt={product.name} />
                        ) : (
                          <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">ID: {product.id.split('-')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      product.resourceType === "RETAIL" 
                        ? "bg-indigo-100 text-indigo-800 border border-indigo-200" 
                        : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    }`}>
                      {product.resourceType === "EQUIPMENT" ? "租賃設備 (EQUIPMENT)" : product.resourceType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      ${product.price}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {product.resourceType === "RETAIL" || product.resourceType === "MENU_ITEM" ? (
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${product.totalStock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {product.totalStock} 件
                        </span>
                      ) : (
                        <span className="text-gray-600">總數 {product.totalStock} / 押金 ${product.deposit || 0}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition-colors"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                      <p className="text-gray-500 text-lg font-medium">您的商店目前沒有任何商品</p>
                      <p className="text-gray-400 text-sm mt-1">點擊上方「新增商品」立刻開始上架！</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <ProductFormModal
          tenantId={tenantId}
          initialData={editingProduct ? {
            ...editingProduct,
            type: editingProduct.resourceType,
            dailyPrice: editingProduct.price
          } : undefined}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
