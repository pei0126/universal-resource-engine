import { getTenants } from "@/app/actions";

export default async function TestDbPage() {
  const allTenants = await getTenants();

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>🔌 資料庫連線測試</h1>
      <h2>商店列表 (Tenants)</h2>
      {allTenants.length === 0 ? (
        <p style={{ color: "#888" }}>
          目前沒有任何商店。請在 Supabase Dashboard 中新增一筆 tenant。
        </p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>商店名稱</th>
              <th style={thStyle}>建立時間</th>
            </tr>
          </thead>
          <tbody>
            {allTenants.map((t) => (
              <tr key={t.id}>
                <td style={tdStyle}>
                  <code>{t.id.slice(0, 8)}...</code>
                </td>
                <td style={tdStyle}>{t.name}</td>
                <td style={tdStyle}>
                  {new Date(t.createdAt).toLocaleString("zh-TW")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 12px",
  borderBottom: "2px solid #333",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #ddd",
};
