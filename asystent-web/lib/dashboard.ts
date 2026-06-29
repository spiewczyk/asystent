import { notion, getAllOptions } from "./notion";
import { DATABASES } from "./schema";

// --- pomocnicze odczyty właściwości ---
function plainTitle(page: any): string {
  const t: any = Object.values(page.properties).find((p: any) => p.type === "title");
  return t?.title?.map((r: any) => r.plain_text).join("") || "(bez nazwy)";
}
function selectVal(page: any, name: string): string {
  return page.properties?.[name]?.select?.name || "";
}
function dateVal(page: any, name: string): string {
  return page.properties?.[name]?.date?.start || "";
}
function dateEndVal(page: any, name: string): string {
  return page.properties?.[name]?.date?.end || "";
}
function checkboxVal(page: any, name: string): boolean {
  return !!page.properties?.[name]?.checkbox;
}

async function queryAll(databaseId: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined = undefined;
  do {
    const r: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

export interface Item {
  id?: string;
  name: string;
  priorytet?: string;
  status?: string;
  termin?: string;
  terminEnd?: string;
  czestotliwosc?: string;
  obszar?: string;
  url?: string;
}

function relationName(page: any, name: string, map: Record<string, string>): string {
  const id = page.properties?.[name]?.relation?.[0]?.id;
  return id ? map[id] || "" : "";
}

type Buckets = {
  overdue: Item[];
  today: Item[];
  week: Item[];
  later: Item[];
  noDate: Item[];
};

function emptyBuckets(): Buckets {
  return { overdue: [], today: [], week: [], later: [], noDate: [] };
}

export async function buildDashboard() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr + "T00:00:00");
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  function bucketOf(dateStr: string): keyof Buckets {
    if (!dateStr) return "noDate";
    const d = new Date(dateStr.slice(0, 10) + "T00:00:00");
    if (isNaN(d.getTime())) return "noDate";
    if (d < today) return "overdue";
    if (d.getTime() === today.getTime()) return "today";
    if (d <= weekEnd) return "week";
    return "later";
  }

  // Mapa Obszarów (id → nazwa) do pokazania kategorii
  let obszarMap: Record<string, string> = {};
  try {
    const opts = await getAllOptions();
    obszarMap = Object.fromEntries((opts.obszary || []).map((o: any) => [o.id, o.name]));
  } catch {
    obszarMap = {};
  }

  // --- ZADANIA ---
  const zadaniaPages = await queryAll(DATABASES.zadania.database_id);
  const zadania = emptyBuckets();
  for (const p of zadaniaPages) {
    const status = selectVal(p, "Status");
    if (status === "Zrobione") continue;
    const termin = dateVal(p, "Termin");
    const item: Item = {
      id: p.id,
      name: plainTitle(p),
      priorytet: selectVal(p, "Priorytet"),
      status,
      termin,
      terminEnd: dateEndVal(p, "Termin"),
      obszar: relationName(p, "Obszar", obszarMap),
      url: p.url,
    };
    zadania[bucketOf(termin)].push(item);
  }

  // --- PROJEKTY ---
  const projektyPages = await queryAll(DATABASES.projekty.database_id);
  const projekty = emptyBuckets();
  const projektyActive: Item[] = [];
  for (const p of projektyPages) {
    const status = selectVal(p, "Status");
    if (status === "Ukończony" || status === "Archiwum") continue;
    const termin = dateVal(p, "Termin");
    const item: Item = {
      id: p.id,
      name: plainTitle(p),
      priorytet: selectVal(p, "Priorytet"),
      status,
      termin,
      terminEnd: dateEndVal(p, "Termin"),
      obszar: relationName(p, "Obszar", obszarMap),
      url: p.url,
    };
    projektyActive.push(item);
    projekty[bucketOf(termin)].push(item);
  }

  // --- RUTYNY (aktywne, nadchodzące/zaległe w tym tygodniu) ---
  const rutynyPages = await queryAll(DATABASES.rutyny.database_id);
  const rutynyDue: Item[] = [];
  for (const p of rutynyPages) {
    if (!checkboxVal(p, "Aktywna")) continue;
    const termin = dateVal(p, "Następny termin");
    const b = bucketOf(termin);
    if (b === "overdue" || b === "today" || b === "week" || b === "noDate") {
      rutynyDue.push({
        id: p.id,
        name: plainTitle(p),
        czestotliwosc: selectVal(p, "Częstotliwość"),
        termin,
        terminEnd: dateEndVal(p, "Następny termin"),
        obszar: relationName(p, "Obszar", obszarMap),
        url: p.url,
      });
    }
  }
  rutynyDue.sort((a, b) => (a.termin || "9999").localeCompare(b.termin || "9999"));

  const counts = {
    zalegle: zadania.overdue.length,
    dzis: zadania.today.length,
    tydzien: zadania.week.length,
    projekty: projektyActive.length,
    rutyny: rutynyDue.length,
  };

  return { today: todayStr, zadania, projekty, projektyActive, rutynyDue, counts };
}
