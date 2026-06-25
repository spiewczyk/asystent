// Współdzielony pomocnik do oficjalnego API Notion.
// Token i ID baz pochodzą ze zmiennych środowiskowych (Vercel) — nigdy z frontendu.

const TOKEN = process.env.NOTION_TOKEN;
const VERSION = '2022-06-28';
const BASE = 'https://api.notion.com/v1';

export const DB = {
  zadania: process.env.DB_ZADANIA,
  rutyny: process.env.DB_RUTYNY,   // opcjonalne — do licznika rutyn
  obszary: process.env.DB_OBSZARY, // opcjonalne — do listy obszarów
};

// Nazwy właściwości w bazie Zadania (zgodne z Twoim Notion "Drugi Mózg").
export const PROP = {
  title: process.env.PROP_TITLE || 'Nazwa',
  status: process.env.PROP_STATUS || 'Status',
  prio: process.env.PROP_PRIO || 'Priorytet',
  date: process.env.PROP_DATE || 'Termin',
  area: process.env.PROP_AREA || 'Obszar',
  notes: process.env.PROP_NOTES || 'Notatki',
};

export const STATUS_DONE = process.env.STATUS_DONE || 'Zrobione';
export const STATUS_TODO = process.env.STATUS_TODO || 'Do zrobienia';

export async function notion(path, { method = 'GET', body } = {}) {
  if (!TOKEN) throw Object.assign(new Error('Brak NOTION_TOKEN w zmiennych środowiskowych.'), { status: 500 });
  const res = await fetch(BASE + path, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.message || 'Błąd API Notion'), {
      status: res.status,
      notion: data,
    });
  }
  return data;
}

// Dzisiejsza data (YYYY-MM-DD) w strefie Europe/Warsaw.
export function warsawToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
}

// Przesunięcie strefy Europe/Warsaw dla danego dnia, np. "+02:00" (lato) / "+01:00" (zima).
export function warsawOffset(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const local = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Warsaw' }));
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const diffMin = Math.round((local - utc) / 60000);
  const sign = diffMin >= 0 ? '+' : '-';
  const abs = Math.abs(diffMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}
