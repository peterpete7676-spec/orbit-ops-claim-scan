import Link from "next/link";

async function getData(id: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/scans/${id}?token=${token}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Not found");
  return res.json();
}

export default async function ResultPage({ searchParams, params }: any) {
  const token = searchParams?.token;
  const { id } = params;
  if (!token) return <main style={{ padding: 24 }}>Missing token.</main>;
  const data = await getData(id, token);

  const brand = { green:"#10B981", amber:"#F59E0B", red:"#EF4444", accent:"#60A5FA" };
  const glow = data.status === "green" ? brand.green : data.status === "amber" ? brand.amber : brand.red;

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Scan Results</h1>
      <div style={{ marginBottom: 12, display:"flex", gap:12, alignItems:"center" }}>
        <div style={{ fontSize: 28, fontWeight: 800 }}>{data.score}/100</div>
        <span style={{ background: glow, color: "black", padding: "6px 10px", borderRadius: 999 }}>{data.status.toUpperCase()}</span>
        <Link href={`/api/scans/${id}/summary.pdf?token=${token}`} style={{ color: brand.accent, marginLeft: "auto" }}>Download Summary PDF</Link>
      </div>

      <div style={{ borderRadius: 16, padding: 16, boxShadow: `0 0 0 2px ${glow}, 0 0 32px ${glow}66` }}>
        <p style={{ opacity: .8, marginTop:0 }}>This is your document reviewer shell. (Viewer can be added later.)</p>
      </div>

      <h3 style={{ marginTop: 24 }}>Sections</h3>
      <ul>
        {data.sections.map((s: any) => (
          <li key={s.name}>
            <strong>{s.name}:</strong> {s.pass ? "Pass" : "Fail"} {s.details ? `— ${s.details}` : ""}
          </li>
        ))}
      </ul>

      {data.fixes?.length ? (
        <>
          <h3>Top Fixes</h3>
          <ol>{data.fixes.map((f: string, i: number) => <li key={i}>{f}</li>)}</ol>
        </>
      ) : null}
    </main>
  );
}
