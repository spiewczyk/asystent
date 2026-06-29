"use client";
import { useEffect, useMemo, useState } from "react";

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
interface WD {
  date: string;
  label: string;
  count: number;
}
interface Data {
  today: string;
  zadania: Buckets;
  projekty: Buckets;
  projektyActive: Item[];
  rutynyDue: Item[];
  counts: { zalegle: number; dzis: number; tydzien: number; projekty: number; rutyny: number };
  workload: WD[];
  todayStats: { done: number; total: number };
}

type Kind = "zadanie" | "rutyna" | "projekt";

function addDays(iso: string, n: number) {
  const d = new Date((iso || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
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
  today,
  onDone,
  onResched,
  busy,
}: {
  it: Item;
  kind: Kind;
  today: string;
  onDone: (it: Item, kind: Kind) => void;
  onResched: (it: Item, date: string) => void;
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
      {kind === "zadanie" && it.id && (
        <span className="resched">
          <button onClick={() => onResched(it, addDays(today, 1))} title="Przełóż na jutro">
            jutro
          </button>
          <button onClick={() => onResched(it, addDays(it.termin || today, 7))} title="+7 dni">
            +7
          </button>
        </span>
      )}
    </div>
  );
}

function Section(props: {
  title: string;
  items: Item[];
  accent?: string;
  kind: Kind;
  today: string;
  onDone: (it: Item, kind: Kind) => void;
  onResched: (it: Item, date: string) => void;
  busyId: string;
}) {
  const { title, items, accent, kind, today, onDone, onResched, busyId } = props;
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>
        {title} <span className="sec-count">{items.length}</span>
      </div>
      <div className="sec-list">
        {items.map((it, i) => (
          <ItemRow
            key={i}
            it={it}
            kind={kind}
            today={today}
            onDone={onDone}
            onResched={onResched}
            busy={busyId === it.id}
          />
        ))}
      </div>
    </div>
  );
}

function Workload({ wd }: { wd: WD[] }) {
  const max = Math.max(1, ...wd.map((d) => d.count));
  return (
    <div className="wl">
      <div className="wl-title">Obciążenie — 7 dni</div>
      <div className="wl-bars">
        {wd.map((d, i) => (
          <div className="wl-col" key={d.date} title={`${d.label}: ${d.count}`}>
            <div className="wl-n">{d.count || ""}</div>
            <div
              className={"wl-bar" + (i === 0 ? " is-today" : "")}
              style={{ height: 6 + (d.count / max) * 44 }}
            />
            <div className="wl-l">{d.label}</div>
          </div>
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
  const [cat, setCat] = useState("");
  const [quick, setQuick] = useState("");
  const [adding, setAdding] = useState(false);
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
    } catch {}
    setBusyId("");
  }

  async function onResched(it: Item, date: string) {
    if (!it.id) return;
    setBusyId(it.id);
    try {
      await fetch("/api/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: it.id, date }),
      });
      await load();
    } catch {}
    setBusyId("");
  }

  async function quickAdd() {
    const name = quick.trim();
    if (!name) return;
    setAdding(true);
    try {
      await fetch("/api/commit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target: "zadania",
          fields: { Nazwa: name, Status: "Do zrobienia" },
        }),
      });
      setQuick("");
      await load();
    } catch {}
    setAdding(false);
  }

  async function getSuggestions() {
    setSugLoading(true);
    try {
      const r = await fetch("/api/suggest", { method: "POST" });
      const d = await r.json();
      setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []);
    } catch {
      setSuggestions([]);
    }
    setSugLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const allCats = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    const add = (arr: Item[]) => arr.forEach((i) => i.obszar && s.add(i.obszar));
    add(data.zadania.overdue);
    add(data.zadania.today);
    add(data.zadania.week);
    add(data.zadania.later);
    add(data.zadania.noDate);
    add(data.rutynyDue);
    add(data.projektyActive);
    return Array.from(s).sort();
  }, [data]);

  const fil = (arr: Item[]) => (cat ? arr.filter((i) => i.obszar === cat) : arr);

  const projektyUpcoming = data
    ? fil(data.projekty.overdue.concat(data.projekty.today, data.projekty.week))
    : [];

  // "Teraz najważniejsze" — najwyższy priorytet wśród zaległych/dziś, potem najwcześniejszy termin
  const topItem = useMemo(() => {
    if (!data) return null;
    const pool = fil(data.zadania.overdue.concat(data.zadania.today));
    if (pool.length === 0) return null;
    const rank = (p?: string) => (p === "Wysoki" ? 0 : p === "Średni" ? 1 : 2);
    return [...pool].sort(
      (a, b) => rank(a.priorytet) - rank(b.priorytet) || (a.termin || "9999").localeCompare(b.termin || "9999")
    )[0];
  }, [data, cat]);

  const prog = data?.todayStats;
  const progPct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;

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
          {/* szybkie dodawanie */}
          <div className="quick">
            <input
              value={quick}
              placeholder="+ szybkie zadanie"
              onChange={(e) => setQuick(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") quickAdd();
              }}
            />
            <button onClick={quickAdd} disabled={adding || !quick.trim()}>
              {adding ? "…" : "Dodaj"}
            </button>
          </div>

          {/* postęp dnia */}
          {prog && prog.total > 0 && (
            <div className="prog">
              <div className="prog-h">
                <span>Dziś zrobione</span>
                <span>
                  {prog.done}/{prog.total}
                </span>
              </div>
              <div className="prog-bar">
                <div className="prog-fill" style={{ width: progPct + "%" }} />
              </div>
            </div>
          )}

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

          {/* wykres obciążenia */}
          {data.workload && <Workload wd={data.workload} />}

          {/* sugestie */}
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

          {/* filtr kategorii */}
          {allCats.length > 0 && (
            <div className="cats">
              <button className={"cat" + (cat === "" ? " on" : "")} onClick={() => setCat("")}>
                Wszystko
              </button>
              {allCats.map((c) => (
                <button
                  key={c}
                  className={"cat" + (cat === c ? " on" : "")}
                  onClick={() => setCat(cat === c ? "" : c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* teraz najważniejsze */}
          {topItem && (
            <div className="topnow">
              <div className="topnow-l">⭐ Teraz najważniejsze</div>
              <div className="topnow-name">
                {prioDot(topItem.priorytet)}
                <a href={topItem.url} target="_blank" rel="noreferrer">
                  {topItem.name}
                </a>
                {topItem.termin && <span className="it-date">{fmtTermin(topItem)}</span>}
              </div>
            </div>
          )}

          <Section title="🔴 Zaległe" items={fil(data.zadania.overdue)} accent="#eb5757" kind="zadanie" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />
          <Section title="📌 Na dziś" items={fil(data.zadania.today)} accent="#2383e2" kind="zadanie" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />
          <Section title="🔁 Rutyny" items={fil(data.rutynyDue)} kind="rutyna" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />
          <Section title="🗓️ Ten tydzień" items={fil(data.zadania.week)} kind="zadanie" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />
          <Section title="🗒️ Bez terminu" items={fil(data.zadania.noDate)} kind="zadanie" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />
          <Section title="🚀 Projekty — najbliższe" items={projektyUpcoming} accent="#9256d9" kind="projekt" today={data.today} onDone={onDone} onResched={onResched} busyId={busyId} />

          {data.counts.zalegle + data.counts.dzis + data.counts.tydzien + data.counts.rutyny === 0 && (
            <div className="dash-clear">Czysto na najbliższe dni 🎉</div>
          )}
        </>
      )}
    </div>
  );
}
