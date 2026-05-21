import { getProducts } from "@/app/actions";
import Link from "next/link";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const params = await searchParams;
  let tenantId = params?.tenantId;

  if (!tenantId) {
    tenantId = process.env.NEXT_PUBLIC_TEST_TENANT_ID || "11111111-1111-1111-1111-111111111111";
  }

  // 1. 強制帶入 tenant_id 讀取商店專屬產品
  const products = await getProducts(tenantId);

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>🛍️ 商店產品列表</h1>
      <p style={styles.subtitle}>Tenant ID: {tenantId}</p>

      {products.length === 0 ? (
        <p style={{ color: "#666" }}>
          這個商店目前沒有任何產品。請先在資料庫手動插入測試資料。
        </p>
      ) : (
        <div style={styles.grid}>
          {products.map((product) => (
            <Link
              href={`/products/${product.id}?tenantId=${tenantId}`}
              key={product.id}
              style={styles.card}
            >
              <div style={styles.cardHeader}>
                <span style={{ ...styles.badge, backgroundColor: "#16a34a" }}>
                  預約租賃
                </span>
              </div>
              <h2 style={styles.productName}>{product.name}</h2>
              <div style={styles.priceContainer}>
                <span style={styles.price}>${product.price}</span>
                {product.deposit && (
                  <span style={styles.deposit}>
                    (押金: ${product.deposit})
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

// 簡單 inline styles，不需要 tailwind 也能有基本美觀
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "system-ui, sans-serif",
  },
  error: { color: "red" },
  title: { fontSize: "2rem", marginBottom: "0.5rem" },
  subtitle: { color: "#666", marginBottom: "2rem", fontSize: "0.9rem" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    color: "inherit",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "1rem",
  },
  badge: {
    color: "white",
    padding: "4px 12px",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },
  productName: {
    fontSize: "1.25rem",
    margin: "0 0 1rem 0",
  },
  priceContainer: {
    marginTop: "auto",
    display: "flex",
    alignItems: "baseline",
    gap: "0.5rem",
  },
  price: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#111827",
  },
  deposit: {
    fontSize: "0.9rem",
    color: "#6b7280",
  },
};
