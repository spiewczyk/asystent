import { NextResponse } from "next/server";
import { gatherStats } from "../../../lib/audit";
import { readRules } from "../../../lib/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Brak GEMINI_API_KEY" }, { status: 500 });
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const [stats, rules] = await Promise.all([gatherStats(), readRules()]);
    const statsText = stats
      .map((s) => `${s.label}: ${s.liczba} wpisów, pola: ${s.pola.join(", ")}`)
      .join("\n");

    const system =
      'Jesteś doradcą porządkującym system PARA w Notion. Na podstawie statystyk baz zaproponuj 3-6 konkretnych usprawnień STRUKTURY: które bazy są nieużywane (0/mało wpisów) i można je usunąć lub zarchiwizować, które można połączyć, jakie właściwości (pola) warto dodać dla porządku, gdzie jest bałagan. Każda sugestia krótka, praktyczna, po polsku, z uzasadnieniem w pół zdania. To są PROPOZYCJE do akceptacji człowieka — nie zmieniaj nic sam. Zwróć WYŁĄCZNIE JSON: {"suggestions":["...","..."]}';

    const userMsg = `Statystyki baz:\n${statsText}\n\nZapisane reguły użytkownika:\n${
      rules.join("\n") || "(brak)"
    }`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: userMsg }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
          maxOutputTokens: 1500,
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
      stats,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd audytu" }, { status: 500 });
  }
}
