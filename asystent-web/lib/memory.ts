import { notion } from "./notion";

// Strona "⚙️ Pamięć asystenta" w Notion (pod "Drugi Mózg").
export const MEMORY_PAGE_ID = "38e85045-9b05-8181-8a3a-e9024cc6e474";

function blockText(b: any): string {
  const rt = b?.[b.type]?.rich_text;
  return rt?.map((r: any) => r.plain_text).join("") || "";
}

// Czyta reguły (punkty listy) z pamięci.
export async function readRules(): Promise<string[]> {
  const out: string[] = [];
  let cursor: string | undefined = undefined;
  try {
    do {
      const r: any = await notion.blocks.children.list({
        block_id: MEMORY_PAGE_ID,
        start_cursor: cursor,
        page_size: 100,
      });
      for (const b of r.results) {
        if (b.type === "bulleted_list_item" || b.type === "numbered_list_item") {
          const t = blockText(b).trim();
          if (t) out.push(t);
        }
      }
      cursor = r.has_more ? r.next_cursor : undefined;
    } while (cursor);
  } catch {
    // brak dostępu / strona nie istnieje — działaj bez pamięci
  }
  return out;
}

// Dopisuje nowe reguły jako punkty listy.
export async function appendRules(rules: string[]): Promise<void> {
  const children = (rules || [])
    .filter((t) => t && t.trim())
    .map((t) => ({
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: { rich_text: [{ type: "text", text: { content: t.trim() } }] },
    }));
  if (!children.length) return;
  try {
    await notion.blocks.children.append({ block_id: MEMORY_PAGE_ID, children: children as any });
  } catch {
    // ignoruj błędy zapisu pamięci — nie blokuj głównego przepływu
  }
}
