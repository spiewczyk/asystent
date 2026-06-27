// Mapa baz w Twoim Notion ("Drugi Mózg" / PARA).
// database_id = ID strony bazy w Notion (z URL-a, bez myślników też działa).
// Jeśli kiedyś zmienisz strukturę w Notion, zaktualizuj ten plik.

export type FieldType = "title" | "text" | "select" | "date" | "relation" | "checkbox" | "number";

export interface FieldDef {
  name: string;            // dokładna nazwa property w Notion
  type: FieldType;
  options?: string[];      // dla select
  relationTo?: string;     // klucz bazy w DATABASES (dla relacji)
  hint?: string;           // podpowiedź dla AI
}

export interface DatabaseDef {
  key: string;             // wewnętrzny identyfikator
  label: string;           // ładna nazwa
  database_id: string;
  description: string;     // kiedy używać tej bazy (dla AI)
  fields: FieldDef[];
}

export const DATABASES: Record<string, DatabaseDef> = {
  zadania: {
    key: "zadania",
    label: "✅ Zadania",
    database_id: "4c0f02b2a221476c8f4a014a440e3e46",
    description:
      "Pojedyncze rzeczy do zrobienia (taski). Wszystko, co ma czynność: 'zadzwonić', 'wysłać', 'dokończyć', 'kupić bilet', 'odebrać'. Domyślny wybór dla codziennych spraw.",
    fields: [
      { name: "Nazwa", type: "title", hint: "Krótka treść zadania w trybie rozkazującym." },
      { name: "Notatki", type: "text", hint: "Dodatkowy kontekst, jeśli jest." },
      { name: "Priorytet", type: "select", options: ["Wysoki", "Średni", "Niski"] },
      { name: "Status", type: "select", options: ["Do zrobienia", "W toku", "Oczekuje", "Zrobione"] },
      { name: "Termin", type: "date", hint: "Data (lub data+godzina) wykonania." },
      { name: "Obszar", type: "relation", relationTo: "obszary", hint: "Dziedzina życia." },
      { name: "Projekt", type: "relation", relationTo: "projekty", hint: "Jeśli należy do projektu." },
    ],
  },
  projekty: {
    key: "projekty",
    label: "🚀 Projekty",
    database_id: "d33fb35b170e47c4a1ea88451cf8a644",
    description:
      "Większe przedsięwzięcia z celem i wieloma krokami, które mają koniec (np. 'Wydać EP', 'Remont', 'Wyjazd Opener'). Jeśli coś brzmi jak projekt, a nie pojedyncze zadanie.",
    fields: [
      { name: "Nazwa", type: "title" },
      { name: "Cel", type: "text", hint: "Po co ten projekt / definicja ukończenia." },
      { name: "Priorytet", type: "select", options: ["Wysoki", "Średni", "Niski"] },
      { name: "Status", type: "select", options: ["Pomysł", "Planowany", "W toku", "Wstrzymany", "Ukończony", "Archiwum"] },
      { name: "Termin", type: "date" },
      { name: "Obszar", type: "relation", relationTo: "obszary" },
    ],
  },
  rutyny: {
    key: "rutyny",
    label: "🔁 Rutyny",
    database_id: "07edf9a616c844b7945e95532bc565e1",
    description:
      "Rzeczy powtarzalne, cykliczne (nawyki, regularne czynności): 'codziennie medytacja', 'co tydzień pranie', 'co miesiąc opłaty'. Jeśli pada częstotliwość/cykliczność.",
    fields: [
      { name: "Nazwa", type: "title" },
      { name: "Notatki", type: "text" },
      { name: "Częstotliwość", type: "select", options: ["Codziennie", "Co kilka dni", "Co tydzień", "Co 2 tygodnie", "Co miesiąc", "Co kwartał", "Co pół roku", "Co rok"] },
      { name: "Priorytet", type: "select", options: ["Wysoki", "Średni", "Niski"] },
      { name: "Następny termin", type: "date", hint: "Kiedy następny raz." },
      { name: "Aktywna", type: "checkbox", hint: "Domyślnie zaznaczona (true)." },
      { name: "Obszar", type: "relation", relationTo: "obszary" },
    ],
  },
  pomysly: {
    key: "pomysly",
    label: "💡 Pomysły",
    database_id: "24592e207751460db2d4a12097a375a3",
    description: "Luźne pomysły, koncepcje, 'a może by...'. Coś, czego nie trzeba teraz robić, ale warto zapisać.",
    fields: [
      { name: "Nazwa", type: "title" },
    ],
  },
  zasoby: {
    key: "zasoby",
    label: "📚 Zasoby / Wiedza",
    database_id: "751e8e7677494314bb1eecfcaae08c92",
    description: "Notatki, wiedza, materiały do zapamiętania, linki, inspiracje, na które będziesz wracać.",
    fields: [
      { name: "Nazwa", type: "title" },
    ],
  },
  zyczenia: {
    key: "zyczenia",
    label: "🛍️ Lista życzeń",
    database_id: "2b0c5e8615a444e39f9a261606155ba5",
    description: "Rzeczy, które chcesz kupić / mieć w przyszłości. Zakupy 'kiedyś', nie pilne.",
    fields: [
      { name: "Nazwa", type: "title" },
    ],
  },
  inbox: {
    key: "inbox",
    label: "📥 Inbox",
    database_id: "d074271340124a8cb310ec7e6fd25d4c",
    description:
      "Skrzynka przechwytywania. Używaj, gdy NIE wiadomo jednoznacznie, gdzie coś pasuje — wpada tu, a Ty posortujesz później w Notion.",
    fields: [
      { name: "Nazwa", type: "title" },
      { name: "Notatki", type: "text" },
      { name: "Typ", type: "select", options: ["Pomysł", "Zadanie", "Notatka", "Link", "Zakup", "Inne"] },
    ],
  },
};

// Bazy, z których pobieramy listy do relacji (i do podpowiedzi dla AI).
export const RELATION_SOURCES = {
  obszary: "21acf93c93d64c5a860a2e88a7f952ac",
  projekty: "d33fb35b170e47c4a1ea88451cf8a644",
};

export function databaseList(): DatabaseDef[] {
  return Object.values(DATABASES);
}
