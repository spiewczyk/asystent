import {
  notion, DB, PROP, STATUS_DONE, STATUS_TODO, warsawToday, warsawOffset,
} from '../lib/notion.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') return await list(res);
    if (req.method === 'POST') return await create(req, res);
    if (req.method === 'PATCH') return await toggle(req, res);
    res.setHeader('Allow', 'GET, POST, PATCH');
    return res.status(405).json({ error: 'Metoda niedozwolona' });
  } catch (e) {
    return res.status(e.status || 500).json({ error: e.message, detail: e.notion || null });
  }
}

async function list(res) {
  if (!DB.zadania) return res.status(500).json({ error: 'Brak DB_ZADANIA w zmiennych środowiskowych.' });
  const today = warsawToday();

  const data = await notion(`/databases/${DB.zadania}/query`, {
    method: 'POST',
    body: {
      filter: {
        and: [
          { property: PROP.status, select: { does_not_equal: STATUS_DONE } },
          { property: PROP.date, date: { on_or_before: today } },
        ],
      },
      sorts: [{ property: PROP.date, direction: 'ascending' }],
      page_size: 100,
    },
  });

  const tasks = data.results.map((pg) => mapTask(pg, today));
  const counts = {
    today: tasks.filter((t) => t.bucket === 'today').length,
    overdue: tasks.filter((t) => t.bucket === 'overdue').length,
    high: tasks.filter((t) => t.priorytet === 'Wysoki').length,
    routines: await routineCount(today),
  };

  return res.status(200).json({ today, tasks, counts });
}

function mapTask(pg, today) {
  const props = pg.properties || {};
  const name = (props[PROP.title]?.title || []).map((t) => t.plain_text).join('') || '(bez nazwy)';
  const prio = props[PROP.prio]?.select?.name || null;
  const start = props[PROP.date]?.date?.start || null;
  const datePart = start ? start.slice(0, 10) : null;
  const hasTime = start ? start.length > 10 : false;
  const godzina = hasTime
    ? new Date(start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' })
    : null;
  const areaIds = (props[PROP.area]?.relation || []).map((r) => r.id);
  const bucket = datePart && datePart < today ? 'overdue' : 'today';
  return { id: pg.id, name, priorytet: prio, godzina, date: datePart, bucket, areaIds };
}

async function routineCount(today) {
  if (!DB.rutyny) return 0;
  try {
    const data = await notion(`/databases/${DB.rutyny}/query`, {
      method: 'POST',
      body: {
        filter: {
          and: [
            { property: 'Aktywna', checkbox: { equals: true } },
            { property: 'Następny termin', date: { on_or_before: today } },
          ],
        },
        page_size: 100,
      },
    });
    return data.results.length;
  } catch {
    return 0;
  }
}

async function create(req, res) {
  if (!DB.zadania) return res.status(500).json({ error: 'Brak DB_ZADANIA w zmiennych środowiskowych.' });
  const b = req.body || {};
  const date = b.date || warsawToday();
  const start = b.godzina ? `${date}T${b.godzina}:00${warsawOffset(date)}` : date;

  const properties = {
    [PROP.title]: { title: [{ text: { content: b.nazwa || 'Nowe zadanie' } }] },
    [PROP.status]: { select: { name: STATUS_TODO } },
    [PROP.date]: { date: { start } },
  };
  if (b.priorytet) properties[PROP.prio] = { select: { name: b.priorytet } };
  if (b.obszarId) properties[PROP.area] = { relation: [{ id: b.obszarId }] };
  if (b.notatki) properties[PROP.notes] = { rich_text: [{ text: { content: b.notatki } }] };

  const pg = await notion('/pages', {
    method: 'POST',
    body: { parent: { database_id: DB.zadania }, properties },
  });
  return res.status(200).json({ id: pg.id });
}

async function toggle(req, res) {
  const b = req.body || {};
  if (!b.id) return res.status(400).json({ error: 'Brak id zadania.' });
  const status = b.done ? STATUS_DONE : STATUS_TODO;
  await notion(`/pages/${b.id}`, {
    method: 'PATCH',
    body: { properties: { [PROP.status]: { select: { name: status } } } },
  });
  return res.status(200).json({ ok: true });
}
