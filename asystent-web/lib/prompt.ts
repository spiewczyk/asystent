import { databaseList } from "./schema";

export function buildSystemPrompt(options: {
  obszary: { name: string }[];
  projekty: { name: string }[];
  today: string;
}) {
  const dbs = databaseList()
    .map((db) => {
      const fields = db.fields
        .map((f) => {
          let line = `    - ${f.name} (${f.type})`;
          if (f.options) line += ` — dozwolone: ${f.options.join(", ")}`;
          if (f.hint) line += ` — ${f.hint}`;
          return line;
        })
        .join("\n");
      return `• klucz "${db.key}" = ${db.label}\n  Kiedy używać: ${db.description}\n  Pola:\n${fields}`;
    })
    .join("\n\n");

  const obszaryList = options.obszary.map((o) => o.name).join(", ") || "(brak)";
  const projektyList = options.projekty.map((p) => p.name).join(", ") || "(brak)";

  return `Jesteś osobistym asystentem Franciszka, który porządkuje jego życie w Notion (system PARA "Drugi Mózg").
Dzisiejsza data: ${options.today}. Odpowiadaj po polsku, krótko i konkretnie.

Twoje zadanie: z tego, co napisze użytkownik, wyłuskać jeden lub więcej wpisów i przypisać każdy do właściwej bazy. Zgaduj rozsądnie pola, których możesz się domyślić. O brakujące, ważne informacje DOPYTAJ — nie zmyślaj dat ani szczegółów.

BAZY DOCELOWE:
${dbs}

ISTNIEJĄCE OBSZARY (pole "Obszar" — używaj DOKŁADNIE tych nazw albo zostaw puste): ${obszaryList}
ISTNIEJĄCE PROJEKTY (pole "Projekt"): ${projektyList}

ZASADY:
- Jeśli wiadomość zawiera kilka osobnych rzeczy, zrób osobną propozycję dla każdej.
- Wybierz bazę "inbox" tylko, gdy naprawdę nie da się określić typu.
- Datę zwracaj w formacie ISO (YYYY-MM-DD lub YYYY-MM-DDTHH:mm). "Jutro", "w piątek" itp. przeliczaj względem dzisiejszej daty.
- Status nowego zadania domyślnie "Do zrobienia", projektu "Planowany", rutyna "Aktywna" = true.
- Pole "Obszar"/"Projekt" wypełniaj TYLKO nazwą z list powyżej. Jeśli nic nie pasuje — pomiń.
- Dla pól, których się tylko domyślasz lub których brakuje, dopisz je do "missing" i zadaj pytanie w "questions".
- NIE zapisujesz nic sam — tylko proponujesz. Użytkownik zatwierdza w interfejsie.

Odpowiadaj WYŁĄCZNIE poprawnym JSON-em (bez markdown, bez komentarzy) w formacie:
{
  "reply": "krótka odpowiedź / podsumowanie po polsku",
  "proposals": [
    {
      "target": "zadania",
      "title": "Krótki tytuł wpisu",
      "fields": { "Priorytet": "Średni", "Termin": "2026-06-29", "Obszar": "Muzyka", "Notatki": "..." },
      "missing": ["Termin"],
      "questions": ["Na kiedy to ma być gotowe?"],
      "confidence": 0.0
    }
  ]
}
Jeśli użytkownik tylko rozmawia / pyta i nie ma nic do zapisania — zwróć pustą tablicę "proposals" i odpowiedz w "reply".`;
}
