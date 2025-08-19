"use client";

import { useEffect, useMemo, useState } from "react";

type UTM = { source?: string; medium?: string; campaign?: string };
type FileItem = { file: File; status: "ready" | "uploaded" | "error"; serverPath?: string };

const BRAND = {
  primary: "#1D4ED8", accent: "#60A5FA", green: "#10B981", amber: "#F59E0B", red: "#EF4444", dark: "#0B1226", surface: "#0F172A"
};

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [scanId, setScanId] = useState<string | null>(null);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [contact, setContact] = useState({ company: "", name: "", mobile: "", email: "", city: "", state: "" });
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  const utm: UTM = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return { source: p.get("utm_source") || undefined, medium: p.get("utm_medium") || undefined, campaign: p.get("utm_campaign") || undefined };
  }, []);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const arr = Array.from(selected).map(f => ({ file: f, status: "ready" as const }));
    setFiles(prev => [...prev, ...arr]);
  }

  async function createScan() {
    const res = await fetch("/api/scans/new", { method: "POST" });
    if (!res.ok) throw new Error("Failed to create scan");
    const data = await res.json();
    setScanId(data.scanId);
    setPublicToken(data.publicToken);
    return data.scanId as string;
  }

  async function requestSignedUploadUrls(scanId: string) {
    const payload = {
      scanId,
      files: files.map((f, i) => ({ name: f.file.name, type: f.file.type || "application/octet-stream", index: i }))
    };
    const res = await fetch("/api/upload-urls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("Failed to get signed URLs");
    return (await res.json()) as { index: number; path: string; token: string }[];
  }

  async function uploadAll() {
    if (files.length === 0) { alert("Please add files"); return; }
    setUploading(true);
    try {
      const id = scanId || await createScan();
      const signed = await requestSignedUploadUrls(id!);
      // @ts-ignore: we rely on window.supabase from CDN (lazy load)
      const { createClient } = await import("@supabase/supabase-js");

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

      for (const s of signed) {
        const item = files[s.index];
        const { data, error } = await supabase.storage.from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET!).uploadToSignedUrl(s.path, s.token, item.file);
        if (error) {
          console.error(error);
          item.status = "error";
        } else {
          item.status = "uploaded";
          item.serverPath = s.path;
        }
        setFiles([...files]);
      }
      setStep(2);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function complete() {
    if (!scanId || !publicToken) return alert("No scan id");
    if (!contact.mobile || !contact.email) return alert("Mobile and Email are required");
    const res = await fetch(`/api/scans/${scanId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact, utm })
    });
    if (!res.ok) return alert("Failed to complete");
    const data = await res.json();
    setResultUrl(data.publicUrl);
    setStep(3);
  }

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontWeight: 700, marginBottom: 12 }}>Claim Rejection Risk Scan</h1>
      <p style={{ color: "#cbd5e1", marginTop: 0 }}>Upload your job packet. We’ll score risk and give fixes. (No login required.)</p>

      {step === 1 && (
        <section style={{ background: BRAND.surface, padding: 20, borderRadius: 12 }}>
          <input type="file" multiple onChange={(e) => addFiles(e.target.files)} />
          <ul style={{ marginTop: 12 }}>
            {files.map((f, i) => (
              <li key={i}>{f.file.name} — <em>{f.status}</em></li>
            ))}
          </ul>
          <button onClick={uploadAll} disabled={uploading} style={{ marginTop: 16, background: BRAND.primary, color: "white", padding: "10px 16px", borderRadius: 8, border: "none" }}>
            {uploading ? "Uploading…" : "Continue"}
          </button>
        </section>
      )}

      {step === 2 && (
        <section style={{ background: BRAND.surface, padding: 20, borderRadius: 12 }}>
          <h3>Contact details</h3>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
            <input placeholder="Company" value={contact.company} onChange={e => setContact({ ...contact, company: e.target.value })} />
            <input placeholder="Full name" value={contact.name} onChange={e => setContact({ ...contact, name: e.target.value })} />
            <input placeholder="Mobile *" value={contact.mobile} onChange={e => setContact({ ...contact, mobile: e.target.value })} />
            <input placeholder="Email *" value={contact.email} onChange={e => setContact({ ...contact, email: e.target.value })} />
            <input placeholder="City" value={contact.city} onChange={e => setContact({ ...contact, city: e.target.value })} />
            <input placeholder="State" value={contact.state} onChange={e => setContact({ ...contact, state: e.target.value })} />
          </div>
          <button onClick={complete} style={{ marginTop: 16, background: BRAND.primary, color: "white", padding: "10px 16px", borderRadius: 8, border: "none" }}>
            Get Results
          </button>
        </section>
      )}

      {step === 3 && (
        <section style={{ background: BRAND.surface, padding: 20, borderRadius: 12 }}>
          <h3>Results</h3>
          <p>Your result link:</p>
          {resultUrl ? (
            <a href={resultUrl} style={{ color: BRAND.accent }}>{resultUrl}</a>
          ) : "Generating…"}
        </section>
      )}
    </main>
  );
}
