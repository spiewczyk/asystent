import { Client } from "@notionhq/client";
import { DATABASES, RELATION_SOURCES, FieldDef } from "./schema";

export const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Pobiera nazwy + id stron z bazy relacji (Obszary, Projekty).
export async function fetchRelationOptions(databaseId: string) {
  const out: { id: string; name: string }[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of res.results) {
      const titleProp: any = Object.values(page.properties).find(
        (p: any) => p.type === "title"
      );
      const name = titleProp?.title?.map((t: any) => t.plain_text).join("") || "(bez nazwy)";
      out.push({ id: page.id, name });
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

// Tytuły otwartych zadań i projektów — do wykrywania duplikatów.
export async function fetchOpenTitles(): Promise<string[]> {
  const titles: string[] = [];
  const grab = async (databaseId: string) => {
    try {
      const r: any = await notion.databases.query({ database_id: databaseId, page_size: 50 });
      for (const p of r.results) {
        const t: any = Object.values(p.properties).find((x: any) => x.type === "title");
        const n = t?.title?.map((x: any) => x.plain_text).join("");
        if (n) titles.push(n);
      }
    } catch {}
  };
  await Promise.all([
    grab(DATABASES.zadania.database_id),
    grab(DATABASES.projekty.database_id),
  ]);
  return titles;
}

// Krótki cache (listy Obszarów/Projektów rzadko się zmieniają) — przyspiesza ładowanie.
let _optCache: { t: number; data: { obszary: any[]; projekty: any[] } } | null = null;
const OPT_TTL = 60000;

export async function getAllOptions() {
  if (_optCache && Date.now() - _optCache.t < OPT_TTL) return _optCache.data;
  const [obszary, projekty] = await Promise.all([
    fetchRelationOptions(RELATION_SOURCES.obszary),
    fetchRelationOptions(RELATION_SOURCES.projekty),
  ]);
  const data = { obszary, projekty };
  _optCache = { t: Date.now(), data };
  return data;
}

function resolveRelationIds(
  value: string | string[],
  options: { id: string; name: string }[]
): string[] {
  const names = Array.isArray(value) ? value : [value];
  const ids: string[] = [];
  for (const n of names) {
    if (!n) continue;
    const match = options.find(
      (o) => o.name.toLowerCase().trim() === String(n).toLowerCase().trim()
    );
    if (match) ids.push(match.id);
  }
  return ids;
}

// Buduje obiekt properties dla Notion API na podstawie pól propozycji.
function buildProperties(
  fields: FieldDef[],
  values: Record<string, any>,
  relOptions: { obszary: any[]; projekty: any[] }
) {
  const props: Record<string, any> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (v === undefined || v === null || v === "") continue;
    switch (f.type) {
      case "title":
        props[f.name] = { title: [{ text: { content: String(v) } }] };
        break;
      case "text":
        props[f.name] = { rich_text: [{ text: { content: String(v) } }] };
        break;
      case "select":
        props[f.name] = { select: { name: String(v) } };
        break;
      case "date": {
        if (v && typeof v === "object") {
          if (!v.start && !v.end) break; // pusty zakres — pomiń
          const start = v.start || v.end;
          const end = v.end && v.end !== v.start ? v.end : undefined;
          props[f.name] = { date: end ? { start, end } : { start } };
        } else {
          props[f.name] = { date: { start: String(v) } };
        }
        break;
      }
      case "checkbox":
        props[f.name] = { checkbox: Boolean(v) };
        break;
      case "number":
        props[f.name] = { number: Number(v) };
        break;
      case "relation": {
        const pool = f.relationTo === "projekty" ? relOptions.projekty : relOptions.obszary;
        const ids = resolveRelationIds(v, pool);
        if (ids.length) props[f.name] = { relation: ids.map((id) => ({ id })) };
        break;
      }
    }
  }
  return props;
}

export async function createEntry(
  targetKey: string,
  values: Record<string, any>,
  relOptions: { obszary: any[]; projekty: any[] }
) {
  const db = DATABASES[targetKey];
  if (!db) throw new Error("Nieznana baza: " + targetKey);
  const properties = buildProperties(db.fields, values, relOptions);
  // Upewnij się, że tytuł istnieje.
  const titleField = db.fields.find((f) => f.type === "title");
  if (titleField && !properties[titleField.name]) {
    properties[titleField.name] = {
      title: [{ text: { content: values.Nazwa || "Bez nazwy" } }],
    };
  }
  const page: any = await notion.pages.create({
    parent: { database_id: db.database_id },
    properties,
  });
  return { id: page.id, url: page.url, label: db.label };
}
