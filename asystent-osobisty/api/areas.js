import { notion, DB } from '../lib/notion.js';

// Zwraca listę obszarów (id + nazwa) do rozwijanej listy przy dodawaniu zadania.
export default async function handler(req, res) {
  try {
    if (!DB.obszary) return res.status(200).json({ areas: [] });
    const data = await notion(`/databases/${DB.obszary}/query`, {
      method: 'POST',
      body: { page_size: 100 },
    });
    const areas = data.results
      .map((pg) => {
        const titleProp = Object.values(pg.properties || {}).find((p) => p.type === 'title');
        const name = (titleProp?.title || []).map((t) => t.plain_text).join('');
        return { id: pg.id, name };
      })
      .filter((a) => a.name);
    return res.status(200).json({ areas });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message, areas: [] });
  }
}
