import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id: string;
      date?: string;
      priorytet?: string;
      status?: string;
      notatki?: string;
      obszarId?: string;
      projektId?: string;
    };
    const { id } = body;
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

    const props: Record<string, any> = {};
    if (body.date !== undefined) {
      props["Termin"] = body.date ? { date: { start: body.date } } : { date: null };
    }
    if (body.priorytet !== undefined) {
      props["Priorytet"] = body.priorytet ? { select: { name: body.priorytet } } : { select: null };
    }
    if (body.status !== undefined && body.status) {
      props["Status"] = { select: { name: body.status } };
    }
    if (body.notatki !== undefined) {
      props["Notatki"] = { rich_text: body.notatki ? [{ text: { content: body.notatki } }] : [] };
    }
    if (body.obszarId !== undefined) {
      props["Obszar"] = { relation: body.obszarId ? [{ id: body.obszarId }] : [] };
    }
    if (body.projektId !== undefined) {
      props["Projekt"] = { relation: body.projektId ? [{ id: body.projektId }] : [] };
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
