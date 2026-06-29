import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

const FREQ_DAYS: Record<string, number> = {
  Codziennie: 1,
  "Co kilka dni": 3,
  "Co tydzień": 7,
  "Co 2 tygodnie": 14,
  "Co miesiąc": 30,
  "Co kwartał": 91,
  "Co pół roku": 182,
  "Co rok": 365,
};

export async function POST(req: Request) {
  try {
    const { id, type } = (await req.json()) as { id: string; type?: string };
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

    if (type === "rutyna") {
      // Rutyna: przesuń "Następny termin" o interwał (z pola lub z częstotliwości)
      const page: any = await notion.pages.retrieve({ page_id: id });
      const interval = page.properties?.["Interwał (dni)"]?.number;
      const freq = page.properties?.["Częstotliwość"]?.select?.name;
      const days = interval || FREQ_DAYS[freq] || 1;
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      base.setDate(base.getDate() + days);
      const next = base.toISOString().slice(0, 10);
      await notion.pages.update({
        page_id: id,
        properties: { "Następny termin": { date: { start: next } } },
      });
      return NextResponse.json({ ok: true, next });
    }

    // Zadanie: oznacz jako Zrobione
    await notion.pages.update({
      page_id: id,
      properties: { Status: { select: { name: "Zrobione" } } },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd zapisu" }, { status: 500 });
  }
}
