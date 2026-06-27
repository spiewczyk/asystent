import { NextResponse } from "next/server";
import { createEntry, getAllOptions } from "../../../lib/notion";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { target, fields } = (await req.json()) as {
      target: string;
      fields: Record<string, any>;
    };
    const relOptions = await getAllOptions();
    const result = await createEntry(target, fields, relOptions);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd zapisu do Notion" }, { status: 500 });
  }
}
