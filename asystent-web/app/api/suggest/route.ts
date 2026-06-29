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
        ? arr
            .map((i) => {
              const t = i.termin ? ` (${i.termin.slice(0, 10)}${i.priorytet ? ", " + i.priorytet : ""})` : "";
              return `${i.name}${t}`;
            })
            .join("; ")
        : "brak";

    const peak = [...(d.workload || [])].sort((a, b) => b.count - a.count)[0];
    const context = `Dzisiaj: ${d.today}.
ZALEGŁE (${d.zadania.overdue.length}): ${fmt(d.zadania.overdue)}.
NA DZIŚ (${d.zadania.today.length}): ${fmt(d.zadania.today)}.
TEN TYDZIEŃ (${d.zadania.week.length}): ${fmt(d.zadania.week)}.
BEZ TERMINU (${d.zadania.noDate.length}): ${fmt(d.zadania.noDate)}.
RUTYNY DZIŚ/WKRÓTCE: ${fmt(d.rutynyDue)}.
PROJEKTY W TOKU: ${fmt(d.projektyActive)}.
Najbardziej obciążony dzień: ${peak ? peak.label + " (" + peak.count + ")" : "—"}.
Zrobione dziś: ${d.todayStats.done}/${d.todayStats.total}.`;

    const system =
      'Jesteś osobistym asystentem produktywności. Na podstawie KONKRETNEGO, aktualnego stanu planu podaj 3-4 sugestie po polsku. ' +
      "KAŻDA sugestia MUSI odnosić się do realnych pozycji z danych (po nazwie) lub konkretnych liczb/dat — żadnych ogólników typu 'ustal priorytety' czy 'zrób przerwę'. " +
      "Przykłady dobrego stylu: 'Zacznij od X — jest 3 dni po terminie', 'Przenieś Y na czwartek, bo wtorek masz przeładowany', 'Po miksie Z zaplanuj poprawki'. " +
      "Bądź konkretny i praktyczny. Zwróć WYŁĄCZNIE JSON: {\"suggestions\":[\"...\",\"...\"]}";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: context }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: 1200,
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
