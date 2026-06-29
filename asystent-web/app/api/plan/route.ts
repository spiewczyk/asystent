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
    const fmt = (arr: any[]) =>
      arr.length
        ? arr.map((i) => `${i.name}${i.termin ? " (" + i.termin.slice(0, 16).replace("T", " ") + (i.priorytet ? ", " + i.priorytet : "") + ")" : i.priorytet ? " (" + i.priorytet + ")" : ""}`).join("; ")
        : "brak";

    const now = new Date();
    const ctx = `Teraz: ${d.today} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}.
ZALEGŁE: ${fmt(d.zadania.overdue)}.
NA DZIŚ: ${fmt(d.zadania.today)}.
RUTYNY DZIŚ/WKRÓTCE: ${fmt(d.rutynyDue)}.`;

    const system =
      "Jesteś asystentem, który układa konkretny PLAN DZIAŁANIA na dziś. Ułóż zadania w sensownej KOLEJNOŚCI wykonania (najpilniejsze/po terminie i wysokie priorytety najpierw, uwzględnij godziny stałych spotkań). " +
      "Dla każdego kroku podaj: proponowaną porę lub kolejność, krótką nazwę i jednozdaniowy powód/wskazówkę. Bądź realistyczny (nie upychaj wszystkiego), zaproponuj przerwę jeśli dużo zadań. Po polsku. " +
      'Zwróć WYŁĄCZNIE JSON: {"plan":[{"kiedy":"ok. 10:00","co":"...","dlaczego":"..."}]}';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: ctx }] }],
        generationConfig: { temperature: 0.6, responseMimeType: "application/json", maxOutputTokens: 1500 },
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
      try { parsed = JSON.parse(raw.slice(s, e + 1)); } catch { parsed = { plan: [] }; }
    }
    return NextResponse.json({ plan: Array.isArray(parsed.plan) ? parsed.plan : [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd" }, { status: 500 });
  }
}
