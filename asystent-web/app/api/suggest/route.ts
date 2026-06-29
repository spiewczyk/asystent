import { NextResponse } from "next/server";
import { buildDashboard } from "../../../lib/dashboard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Brak GEMINI_API_KEY" }, { status: 500 });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const d = await buildDashboard();
    const list = (arr: any[]) => arr.map((i) => i.name).join(", ") || "brak";
    const summary = `Zaległe: ${list(d.zadania.overdue)}.
Na dziś: ${list(d.zadania.today)}.
Ten tydzień: ${list(d.zadania.week)}.
Rutyny do zrobienia: ${list(d.rutynyDue)}.
Projekty w toku: ${list(d.projektyActive)}.`;

    const system =
      'Jesteś asystentem produktywności (system PARA). Na podstawie stanu zadań użytkownika podaj 3-4 krótkie, praktyczne sugestie po polsku: co zrobić teraz, co zaplanować, co połączyć, jaki jest logiczny następny krok (np. po miksie utworu — zaplanuj poprawki, potem wysyłkę do klienta). Każda sugestia max 12 słów, konkretna i wykonalna. Zwróć WYŁĄCZNIE JSON: {"suggestions":["...","..."]}';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: summary }] }],
        generationConfig: {
          temperature: 0.5,
          responseMimeType: "application/json",
          maxOutputTokens: 1024,
        },
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: "Gemini: " + t.slice(0, 200) }, { status: 500 });
    }
    const data = await resp.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const s = raw.indexOf("{");
      const e = raw.lastIndexOf("}");
      try {
        parsed = JSON.parse(raw.slice(s, e + 1));
      } catch {
        parsed = { suggestions: [] };
      }
    }
    return NextResponse.json({
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd" }, { status: 500 });
  }
}
