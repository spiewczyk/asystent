"use client";
import { useEffect, useState } from "react";

interface Item {
  name: string;
  priorytet?: string;
  status?: string;
  termin?: string;
  czestotliwosc?: string;
  url?: string;
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

function fmtDate(s?: string) {
  if (!s) return "";
  const d = s.slice(0, 10);
  return d;
}

function ItemRow({ it }: { it: Item }) {
  const body = (
    <>
      {prioDot(it.priorytet)}
      <span className="it-name">{it.name}</span>
      {it.termin && <span className="it-date">{fmtDate(it.termin)}</span>}
      {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}
      {it.status && <span className="it-tag">{it.status}</span>}
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

export default function Panel() {
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
    } catch (e: any) {
      setErr("Błąd połączenia");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>🌅 Panel</h1>
          <div className="sub">Najważniejsze na dziś i najbliższe dni</div>
        </div>
        <div className="nav">
          <a className="navlink" href="/">
            💬 Czat
          </a>
          <button className="navlink" onClick={load}>
            ↻ Odśwież
          </button>
        </div>
      </div>

      <div className="chat" style={{ paddingBottom: 60 }}>
        {loading && <div className="thinking">Ładuję panel…</div>}
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
                <span>ten tydzień</span>
              </div>
              <div className="count">
                <b>{data.counts.projekty}</b>
                <span>projekty</span>
              </div>
              <div className="count">
                <b>{data.counts.rutyny}</b>
                <span>rutyny</span>
              </div>
            </div>

            <Section title="🔴 Zaległe" items={data.zadania.overdue} accent="#eb5757" />
            <Section title="📌 Na dziś" items={data.zadania.today} accent="#2383e2" />
            <Section title="🗓️ Ten tydzień" items={data.zadania.week} />
            <Section title="🔁 Rutyny do zrobienia" items={data.rutynyDue} />
            <Section title="🚀 Projekty — najbliższe terminy" items={data.projekty.overdue.concat(data.projekty.today, data.projekty.week)} accent="#9256d9" />
            <Section title="📋 Aktywne projekty" items={data.projektyActive} />
            <Section title="⏳ Później" items={data.zadania.later} />

            {data.counts.zalegle + data.counts.dzis + data.counts.tydzien === 0 && (
              <div className="empty" style={{ marginTop: 30 }}>
                Czysto na najbliższe dni. 🎉
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
