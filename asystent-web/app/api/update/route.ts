import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, date, priorytet } = (await req.json()) as {
      id: string;
      date?: string;
      priorytet?: string;
    };
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

    const props: Record<string, any> = {};
    if (date !== undefined) {
      props["Termin"] = date ? { date: { start: date } } : { date: null };
    }
    if (priorytet !== undefined) {
      props["Priorytet"] = priorytet ? { select: { name: priorytet } } : { select: null };
    }
    if (Object.keys(props).length === 0) {
      return NextResponse.json({ error: "Nic do zmiany" }, { status: 400 });
    }
    await notion.pages.update({ page_id: id, properties: props });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd zapisu" }, { status: 500 });
  }
}
