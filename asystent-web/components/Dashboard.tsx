"use client";
import { useEffect, useState } from "react";

interface Item {
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

type Kind = "zadanie" | "rutyna" | "projekt";

function fmtTermin(it: Item) {
  if (!it.termin) return "";
  const s = it.termin.slice(0, 10);
  const e = it.terminEnd ? it.terminEnd.slice(0, 10) : "";
  return e && e !== s ? `${s}–${e}` : s;
}

function prioDot(p?: string) {
  const color = p === "Wysoki" ? "#eb5757" : p === "Średni" ? "#e9a23b" : "#9b9a97";
  return <span className="dot" style={{ background: color }} />;
}

function ItemRow({
  it,
  kind,
  onDone,
  busy,
}: {
  it: Item;
  kind: Kind;
  onDone: (it: Item, kind: Kind) => void;
  busy: boolean;
}) {
  const canCheck = kind === "zadanie" || kind === "rutyna";
  return (
    <div className="it">
      {canCheck ? (
        <button
          className="check"
          onClick={() => onDone(it, kind)}
          disabled={busy}
          title={kind === "rutyna" ? "Zrobione — przesuń termin" : "Odhacz"}
        >
          {busy ? "…" : "○"}
        </button>
      ) : (
        prioDot(it.priorytet)
      )}
      <a className="it-name" href={it.url} target="_blank" rel="noreferrer">
        {it.name}
      </a>
      {it.obszar && <span className="it-tag obszar">{it.obszar}</span>}
      {it.termin && <span className="it-date">{fmtTermin(it)}</span>}
      {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}
    </div>
  );
}

function Section({
  title,
  items,
  accent,
  kind,
  onDone,
  busyId,
}: {
  title: string;
  items: Item[];
  accent?: string;
  kind: Kind;
  onDone: (it: Item, kind: Kind) => void;
  busyId: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>
        {title} <span className="sec-count">{items.length}</span>
      </div>
      <div className="sec-list">
        {items.map((it, i) => (
          <ItemRow key={i} it={it} kind={kind} onDone={onDone} busy={busyId === it.id} />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sugLoading, setSugLoading] = useState(false);

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

  async function onDone(it: Item, kind: Kind) {
    if (!it.id) return;
    setBusyId(it.id);
    try {
      await fetch("/api/done", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: it.id, type: kind === "rutyna" ? "rutyna" : "zadanie" }),
      });
      await load();
    } catch {
      // ignoruj — użytkownik może odświeżyć
    } finally {
      setBusyId("");
    }
  }

  async function getSuggestions() {
    setSugLoading(true);
    try {
      const r = await fetch("/api/suggest", { method: "POST" });
      const d = await r.json();
      setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSugLoading(false);
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

          <button className="sug-btn" onClick={getSuggestions} disabled={sugLoading}>
            {sugLoading ? "Myślę…" : "💡 Sugestie"}
          </button>
          {suggestions.length > 0 && (
            <div className="sug-box">
              {suggestions.map((s, i) => (
                <div className="sug" key={i}>
                  • {s}
                </div>
              ))}
            </div>
          )}

          <Section title="🔴 Zaległe" items={data.zadania.overdue} accent="#eb5757" kind="zadanie" onDone={onDone} busyId={busyId} />
          <Section title="📌 Na dziś" items={data.zadania.today} accent="#2383e2" kind="zadanie" onDone={onDone} busyId={busyId} />
          <Section title="🔁 Rutyny" items={data.rutynyDue} kind="rutyna" onDone={onDone} busyId={busyId} />
          <Section title="🗓️ Ten tydzień" items={data.zadania.week} kind="zadanie" onDone={onDone} busyId={busyId} />
          <Section title="🚀 Projekty — najbliższe" items={projektyUpcoming} accent="#9256d9" kind="projekt" onDone={onDone} busyId={busyId} />

          {nicCzeka && <div className="dash-clear">Czysto na najbliższe dni 🎉</div>}
        </>
      )}
    </div>
  );
}
