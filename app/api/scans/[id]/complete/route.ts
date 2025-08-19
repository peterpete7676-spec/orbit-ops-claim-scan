export const runtime = "nodejs";
import { supabaseAdmin, BUCKET } from "@/lib/supabaseAdmin";
import { evaluate } from "@/lib/evaluator";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const body = await req.json();
  const { contact, utm } = body;

  // List uploaded files from storage
  const prefix = `scans/${id}`;
  const { data: list, error: listErr } = await supabaseAdmin.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (listErr) return new Response(listErr.message, { status: 500 });
  const files = (list || []).map(o => ({ path: `${prefix}/${o.name}`, name: o.name, mime: o.metadata?.mimetype || "", size: o.metadata?.size || 0 }));

  // Save file metadata
  if (files.length) {
    const toInsert = files.map(f => ({ scan_id: id, path: f.path, name: f.name, mime: f.mime, size: f.size }));
    await supabaseAdmin.from("scan_files").upsert(toInsert, { onConflict: "scan_id,path" });
  }

  // Evaluate
  const result = await evaluate(files);

  // Update scan
  await supabaseAdmin.from("scans").update({
    contact, utm,
    score: result.score,
    status: result.status,
    sections: result.sections,
    fixes: result.fixes
  }).eq("id", id);

  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const { data: scanRow } = await supabaseAdmin.from("scans").select("public_token, token_expires_at").eq("id", id).single();
  const publicUrl = `${base}/result/${id}?token=${encodeURIComponent(scanRow?.public_token)}`;

  return Response.json({ publicUrl, score: result.score, status: result.status });
}
