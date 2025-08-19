export const runtime = "nodejs";
import { randomToken } from "@/lib/random";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const token = randomToken(24);
  const expires = new Date(Date.now() + (Number(process.env.RESULT_TOKEN_TTL_DAYS || 7) * 86400000));
  const { data, error } = await supabaseAdmin
    .from("scans")
    .insert({ public_token: token, token_expires_at: expires })
    .select("id, public_token")
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ scanId: data.id, publicToken: data.public_token });
}
