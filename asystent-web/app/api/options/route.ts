import { NextResponse } from "next/server";
import { getAllOptions } from "@/lib/notion";
import { databaseList } from "@/lib/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const options = await getAllOptions();
    const databases = databaseList().map((d) => ({
      key: d.key,
      label: d.label,
      fields: d.fields,
    }));
    return NextResponse.json({ ...options, databases });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd Notion" }, { status: 500 });
  }
}
