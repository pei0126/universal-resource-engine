"use client";

import { useState } from "react";
import { createPurchase } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function PurchaseForm({
  productId,
  tenantId,
  price,
}: {
  productId: string;
  tenantId: string;
  price: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const customerName = (formData.get("customerName") as string) || "";

    const result = await createPurchase({
      tenantId,
      productId,
      customerName,
      totalPrice: price,
    });

    if (result.success) {
      setSuccess(true);
      router.refresh();
    } else {
      setError(result.error || "未知錯誤");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={styles.successBox}>
        <h3 style={{ margin: 0, color: "#166534" }}>✅ 購買成功！</h3>
        <p style={{ margin: "0.5rem 0 0 0", color: "#15803d" }}>
          感謝您的訂購，商品將盡快安排出貨。
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.formTitle}>直接購買</h3>
      
      {error && (
        <div style={styles.errorBox}>
          <strong>⚠️ 購買失敗</strong>: {error}
        </div>
      )}

      <div style={styles.inputGroup}>
        <label style={styles.label}>訂購人姓名</label>
        <input
          name="customerName"
          type="text"
          required
          style={styles.input}
          placeholder="輸入您的姓名"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          ...styles.button,
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "處理中..." : "確認購買 NT$ " + price}
      </button>
    </form>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  formTitle: {
    margin: 0,
    fontSize: "1.25rem",
    color: "#111827",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontWeight: "500",
    color: "#374151",
    fontSize: "0.9rem",
  },
  input: {
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    backgroundColor: "#2563eb",
    color: "white",
    border: "none",
    padding: "1rem",
    borderRadius: "6px",
    fontSize: "1.1rem",
    fontWeight: "bold",
    marginTop: "1rem",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    border: "1px solid #f87171",
    color: "#b91c1c",
    padding: "1rem",
    borderRadius: "6px",
  },
  successBox: {
    backgroundColor: "#eff6ff",
    border: "1px solid #bfdbfe",
    padding: "1.5rem",
    borderRadius: "6px",
    textAlign: "center",
  },
};
