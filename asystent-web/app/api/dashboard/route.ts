import { NextResponse } from "next/server";
import { buildDashboard } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const data = await buildDashboard();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd panelu" }, { status: 500 });
  }
}
