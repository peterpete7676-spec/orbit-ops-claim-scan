export const runtime = "nodejs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const COLORS = { primary:"#1D4ED8", accent:"#60A5FA", green:"#10B981", amber:"#F59E0B", red:"#EF4444" };

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";

  const { data, error } = await supabaseAdmin.from("scans").select("*").eq("id", id).single();
  if (error || !data) return new Response("Not found", { status: 404 });
  if (data.public_token !== token) return new Response("Unauthorized", { status: 401 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]); // Letter
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const font2 = await pdf.embedFont(StandardFonts.Helvetica);

  // Header band
  page.drawRectangle({ x:0, y:740, width:612, height:52, color: rgb(0.074, 0.306, 0.847) });
  page.drawText("Claim Rejection Risk Summary", { x:24, y:760, size:16, font, color: rgb(1,1,1) });

  const score = data.score || 0;
  const status = (data.status || "red") as "green"|"amber"|"red";
  const chip = status === "green" ? COLORS.green : status === "amber" ? COLORS.amber : COLORS.red;

  page.drawText(`${score}/100`, { x:480, y:758, size:22, font, color: rgb(1,1,1) });
  page.drawRectangle({ x:540, y:754, width:56, height:20, color: hexToRgb(chip) });
  page.drawText(status.toUpperCase(), { x:546, y:758, size:10, font, color: rgb(0,0,0) });

  // Sections
  const sections = (data.sections || []) as { name:string; pass:boolean; details?:string }[];
  let y = 710;
  page.drawText("Sections", { x:24, y, size:14, font });
  y -= 16;

  for (const s of sections) {
    const line = `${s.name}: ${s.pass ? "Pass" : "Fail"}${s.details ? " — " + s.details : ""}`;
    page.drawText(line, { x:24, y, size:11, font: font2, color: rgb(0.1,0.1,0.1) });
    y -= 14; if (y < 120) break;
  }

  // Fixes
  const fixes = (data.fixes || []) as string[];
  if (fixes.length && y > 160) {
    y -= 10;
    page.drawText("Top Fixes", { x:24, y, size:14, font });
    y -= 16;
    let i = 1;
    for (const f of fixes.slice(0,5)) {
      page.drawText(`${i}. ${f}`, { x:24, y, size:11, font: font2 }); y -= 14; i++;
      if (y < 120) break;
    }
  }

  // Footer
  page.drawText("RH = relative humidity • DSO = days sales outstanding", { x:24, y:96, size:9, font: font2, color: rgb(0.3,0.3,0.3) });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="scan-${id}-summary.pdf"`
    }
  });
}

function hexToRgb(hex:string) {
  const n = parseInt(hex.replace("#",""), 16);
  const r = ((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
  return rgb(r,g,b);
}
