export const runtime = "nodejs";
import { supabaseAdmin, BUCKET } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const body = await req.json();
  const { scanId, files } = body as { scanId: string; files: { name: string; type: string; index: number }[] };
  if (!scanId) return new Response("scanId required", { status: 400 });

  const results: { index: number; path: string; token: string }[] = [];
  for (const f of files) {
    const safeName = f.name.replace(/[^\w.\- ]+/g, "_");
    const path = `scans/${scanId}/${String(f.index).padStart(3,"0")}_${safeName}`;
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) return new Response(error?.message || "sign error", { status: 500 });
    results.push({ index: f.index, path: data.path, token: data.token });
  }
  return Response.json(results);
}
