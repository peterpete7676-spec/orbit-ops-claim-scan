import { supabaseAdmin, BUCKET } from "./supabaseAdmin";
import { PDFDocument } from "pdf-lib";

export type FileMeta = { path: string; name: string; mime: string; size: number };

function hasAny(name: string, arr: string[]) {
  const n = name.toLowerCase();
  return arr.some(k => n.includes(k));
}

async function pdfPageCount(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error || !data) return 0;
  const ab = await data.arrayBuffer();
  try {
    const pdf = await PDFDocument.load(ab, { ignoreEncryption: true });
    return pdf.getPageCount();
  } catch {
    return 0;
  }
}

export async function evaluate(files: FileMeta[]) {
  const images = files.filter(f => ["image/jpeg", "image/png"].includes(f.mime.toLowerCase()));
  const pdfs = files.filter(f => f.name.toLowerCase().endsWith(".pdf"));

  // Count pages (simple heuristic)
  let maxPdfPages = 0;
  for (const p of pdfs) {
    const c = await pdfPageCount(p.path);
    if (c > maxPdfPages) maxPdfPages = c;
  }

  // Heuristics (water restoration)
  const photosPass = images.length >= 10 || maxPdfPages >= 4;
  const moisturePass = files.some(f => hasAny(f.name, ["moisture","log"]));
  const rhTempPass = files.some(f => hasAny(f.name, ["rh","temp","temperature"])) && ["day 1","day 2","day 3"].every(d => files.some(f => f.name.toLowerCase().includes(d)));
  const psychroPass = files.some(f => hasAny(f.name, ["psychrometric","gpp","grains per pound"]));
  const signaturesPass = files.some(f => hasAny(f.name, ["work authorization","authorization","certificate of completion","signature","signed"]));
  const equipmentPass = files.some(f => hasAny(f.name, ["dehumidifier","air mover","serial"]));
  const invoicePass = files.filter(f => hasAny(f.name, ["invoice","inv"])).length === 1;

  const sections = [
    { name: "Photos", pass: photosPass, details: photosPass ? "" : "Provide ≥10 photos or ≥4 photo pages." },
    { name: "Moisture Logs", pass: moisturePass, details: moisturePass ? "" : "Include daily material moisture logs." },
    { name: "RH/Temp", pass: rhTempPass, details: rhTempPass ? "" : "Add daily ambient RH & temperature for 3 consecutive days." },
    { name: "Psychrometrics", pass: psychroPass, details: psychroPass ? "" : "Attach a psychrometrics (GPP/dew point) sheet." },
    { name: "Signatures", pass: signaturesPass, details: signaturesPass ? "" : "Add signed work authorization & completion certificate." },
    { name: "Equipment", pass: equipmentPass, details: equipmentPass ? "" : "List dehumidifiers/air movers with serials." },
    { name: "Invoice", pass: invoicePass, details: invoicePass ? "" : "Provide exactly one invoice PDF with totals/date." }
  ];

  const weights: Record<string, number> = {
    Photos: 20, "Moisture Logs": 20, "RH/Temp": 20, Psychrometrics: 15, Signatures: 10, Equipment: 10, Invoice: 5
  };
  let score = 0;
  for (const s of sections) if (s.pass) score += weights[s.name];

  const status = sections.some(s => !s.pass && ["Photos","Moisture Logs","RH/Temp","Signatures","Invoice"].includes(s.name)) ? "red"
               : sections.some(s => !s.pass) ? "amber"
               : "green";

  const fixes = sections.filter(s => !s.pass).map(s => s.details).filter(Boolean);

  return { score, status, sections, fixes };
}

