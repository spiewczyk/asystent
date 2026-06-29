import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });
    const p: any = await notion.pages.retrieve({ page_id: id });
    const props = p.properties || {};
    const sel = (n: string) => props[n]?.select?.name || "";
    const txt = (n: string) => props[n]?.rich_text?.map((r: any) => r.plain_text).join("") || "";
    const dat = (n: string) => props[n]?.date?.start || "";
    const rel = (n: string) => props[n]?.relation?.[0]?.id || "";
    return NextResponse.json({
      status: sel("Status"),
      priorytet: sel("Priorytet"),
      date: dat("Termin"),
      notatki: txt("Notatki"),
      obszarId: rel("Obszar"),
      projektId: rel("Projekt"),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd" }, { status: 500 });
  }
}
