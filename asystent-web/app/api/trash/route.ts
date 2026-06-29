import { NextResponse } from "next/server";
import { notion } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { id, restore } = (await req.json()) as { id: string; restore?: boolean };
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });
    // archived: true = do kosza Notion; restore = przywróć
    await notion.pages.update({ page_id: id, archived: !restore } as any);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd" }, { status: 500 });
  }
}
