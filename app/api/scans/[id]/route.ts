export const runtime = "nodejs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const { data, error } = await supabaseAdmin.from("scans").select("*").eq("id", id).single();
  if (error || !data) return new Response("Not found", { status: 404 });
  if (!data.public_token || data.public_token !== token) return new Response("Unauthorized", { status: 401 });
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) return new Response("Expired", { status: 410 });
  return Response.json({
    score: data.score || 0,
    status: data.status || "red",
    sections: data.sections || [],
    fixes: data.fixes || []
  });
}
