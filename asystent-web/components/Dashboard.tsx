"use client";
import { useEffect, useState } from "react";

interface Item {
  name: string;
  priorytet?: string;
  status?: string;
  termin?: string;
  terminEnd?: string;
  czestotliwosc?: string;
  url?: string;
}

function fmtTermin(it: Item) {
  if (!it.termin) return "";
  const s = it.termin.slice(0, 10);
  const e = it.terminEnd ? it.terminEnd.slice(0, 10) : "";
  return e && e !== s ? `${s}–${e}` : s;
}
interface Buckets {
  overdue: Item[];
  today: Item[];
  week: Item[];
  later: Item[];
  noDate: Item[];
}
interface Data {
  today: string;
  zadania: Buckets;
  projekty: Buckets;
  projektyActive: Item[];
  rutynyDue: Item[];
  counts: { zalegle: number; dzis: number; tydzien: number; projekty: number; rutyny: number };
}

function prioDot(p?: string) {
  const color = p === "Wysoki" ? "#eb5757" : p === "Średni" ? "#e9a23b" : "#9b9a97";
  return <span className="dot" style={{ background: color }} />;
}

function ItemRow({ it }: { it: Item }) {
  const body = (
    <>
      {prioDot(it.priorytet)}
      <span className="it-name">{it.name}</span>
      {it.termin && <span className="it-date">{fmtTermin(it)}</span>}
      {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}
    </>
  );
  return it.url ? (
    <a className="it" href={it.url} target="_blank" rel="noreferrer">
      {body}
    </a>
  ) : (
    <div className="it">{body}</div>
  );
}

function Section({ title, items, accent }: { title: string; items: Item[]; accent?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>
        {title} <span className="sec-count">{items.length}</span>
      </div>
      <div className="sec-list">
        {items.map((it, i) => (
          <ItemRow key={i} it={it} />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/dashboard");
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Błąd");
      else setData(d);
    } catch {
      setErr("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const projektyUpcoming = data
    ? data.projekty.overdue.concat(data.projekty.today, data.projekty.week)
    : [];
  const nicCzeka =
    data && data.counts.zalegle + data.counts.dzis + data.counts.tydzien + data.counts.rutyny === 0;

  return (
    <div className="dash">
      <div className="dash-h">
        <span>🌅 Najważniejsze</span>
        <button className="dash-refresh" onClick={load} title="Odśwież">
          ↻
        </button>
      </div>

      {loading && !data && <div className="dash-loading">Ładuję…</div>}
      {err && <div className="login-error">⚠️ {err}</div>}

      {data && (
        <>
          <div className="counts">
            <div className="count">
              <b>{data.counts.zalegle}</b>
              <span>zaległe</span>
            </div>
            <div className="count">
              <b>{data.counts.dzis}</b>
              <span>na dziś</span>
            </div>
            <div className="count">
              <b>{data.counts.tydzien}</b>
              <span>tydzień</span>
            </div>
            <div className="count">
              <b>{data.counts.rutyny}</b>
              <span>rutyny</span>
            </div>
          </div>

          <Section title="🔴 Zaległe" items={data.zadania.overdue} accent="#eb5757" />
          <Section title="📌 Na dziś" items={data.zadania.today} accent="#2383e2" />
          <Section title="🔁 Rutyny" items={data.rutynyDue} />
          <Section title="🗓️ Ten tydzień" items={data.zadania.week} />
          <Section title="🚀 Projekty — najbliższe" items={projektyUpcoming} accent="#9256d9" />

          {nicCzeka && <div className="dash-clear">Czysto na najbliższe dni 🎉</div>}
        </>
      )}
    </div>
  );
}
