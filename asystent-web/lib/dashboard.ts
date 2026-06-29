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

  // Wszystkie zapytania równolegle (szybsze ładowanie)
  const [opts, zadaniaPages, projektyPages, rutynyPages] = await Promise.all([
    getAllOptions().catch(() => ({ obszary: [], projekty: [] })),
    queryAll(DATABASES.zadania.database_id),
    queryAll(DATABASES.projekty.database_id),
    queryAll(DATABASES.rutyny.database_id),
  ]);
  const obszarMap: Record<string, string> = Object.fromEntries(
    (opts.obszary || []).map((o: any) => [o.id, o.name])
  );

  // dni najbliższego tygodnia (obciążenie)
  const workloadMap: Record<string, number> = {};
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    weekDays.push(ds);
    workloadMap[ds] = 0;
  }
  let dzisDone = 0;
  let dzisTotal = 0;

  // --- ZADANIA ---
  const zadania = emptyBuckets();
  for (const p of zadaniaPages) {
    const status = selectVal(p, "Status");
    const termin = dateVal(p, "Termin");
    const dayKey = termin ? termin.slice(0, 10) : "";

    // statystyki dnia (łącznie ze zrobionymi)
    if (dayKey === todayStr) {
      dzisTotal++;
      if (status === "Zrobione") dzisDone++;
    }
    if (status === "Zrobione") continue;

    // obciążenie tygodnia (niezrobione, ze startem w danym dniu)
    if (dayKey && dayKey in workloadMap) workloadMap[dayKey]++;

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

  const wdShort = ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sob"];
  const workload = weekDays.map((ds) => ({
    date: ds,
    label: wdShort[new Date(ds + "T00:00:00").getDay()],
    count: workloadMap[ds] || 0,
  }));
  const todayStats = { done: dzisDone, total: dzisTotal };

  // --- PROJEKTY ---
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

  return {
    today: todayStr,
    zadania,
    projekty,
    projektyActive,
    rutynyDue,
    counts,
    workload,
    todayStats,
    options: { obszary: opts.obszary || [], projekty: opts.projekty || [] },
  };
}
