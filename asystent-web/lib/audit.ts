import { notion } from "./notion";
import { DATABASES } from "./schema";

async function countRows(databaseId: string): Promise<number> {
  try {
    let c = 0;
    let cur: string | undefined = undefined;
    do {
      const r: any = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
        start_cursor: cur,
      });
      c += r.results.length;
      cur = r.has_more ? r.next_cursor : undefined;
    } while (cur);
    return c;
  } catch {
    return -1;
  }
}

export async function gatherStats() {
  const entries = Object.values(DATABASES);
  const stats = await Promise.all(
    entries.map(async (db) => ({
      label: db.label,
      pola: db.fields.map((f) => f.name),
      liczba: await countRows(db.database_id),
    }))
  );
  return stats;
}
