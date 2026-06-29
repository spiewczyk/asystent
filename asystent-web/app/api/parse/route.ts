import { NextResponse } from "next/server";
import { getAllOptions, fetchOpenTitles } from "../../../lib/notion";
import { buildSystemPrompt } from "../../../lib/prompt";
import { readRules, appendRules } from "../../../lib/memory";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };

function todayStr() {
  const d = new Date();
  const days = ["niedziela", "poniedziałek", "wtorek", "środa", "czwartek", "piątek", "sobota"];
  return `${days[d.getDay()]}, ${d.toISOString().slice(0, 10)}`;
}

function extractJson(text: string): any {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  return JSON.parse(t);
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: Msg[] };
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Brak GEMINI_API_KEY" }, { status: 500 });
    }
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    const [options, rules, existingTitles] = await Promise.all([
      getAllOptions(),
      readRules(),
      fetchOpenTitles(),
    ]);
    const system = buildSystemPrompt({
      obszary: options.obszary,
      projekty: options.projekty,
      today: todayStr(),
      rules,
      existingTitles,
    });

    // Gemini używa ról "user" / "model".
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return NextResponse.json(
        { error: "Błąd Gemini: " + errText.slice(0, 300) },
        { status: 500 }
      );
    }

    const data = await resp.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") || "";

    let parsed: any;
    try {
      parsed = extractJson(raw);
    } catch {
      // Nie pokazujemy użytkownikowi surowego JSON-a — dajemy czytelny komunikat.
      parsed = {
        reply:
          "Nie udało mi się poprawnie sformułować propozycji (odpowiedź mogła zostać ucięta). Spróbuj jeszcze raz, najlepiej krótszą wiadomością.",
        proposals: [],
      };
    }
    if (!parsed || typeof parsed !== "object") parsed = { reply: "", proposals: [] };
    if (typeof parsed.reply !== "string") parsed.reply = "";
    if (!Array.isArray(parsed.proposals)) parsed.proposals = [];

    // Nauka: dopisz nowe reguły do "Pamięci asystenta"
    if (Array.isArray(parsed.memory) && parsed.memory.length) {
      await appendRules(parsed.memory);
      const note = "📝 Zapamiętałem: " + parsed.memory.join("; ");
      parsed.reply = parsed.reply ? parsed.reply + "\n" + note : note;
    }

    return NextResponse.json(parsed);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Błąd AI" }, { status: 500 });
  }
}
