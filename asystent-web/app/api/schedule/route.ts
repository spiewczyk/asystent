import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, date } = (await req.json()) as { id: string; date: string };
    if (!id || !date) return NextResponse.json({ error: "Brak id/date" }, { status: 400 });
    await notion.pages.update({
      page_id: id,
      properties: { Termin: { date: { start: date } } },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd" }, { status: 500 });
  }
}
