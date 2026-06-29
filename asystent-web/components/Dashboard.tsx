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
const PRIO_ORDER = ["Wysoki", "Średni", "Niski", ""];

function addDays(iso: string, n: number) {
  const d = new Date((iso || new Date().toISOString().slice(0, 10)) + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function d2(iso?: string) {
  if (!iso) return "";
  const p = iso.slice(0, 10).split("-");
  return p[2] + "." + p[1];
}
function fmtTermin(it: Item) {
  if (!it.termin) return "";
  const s = d2(it.termin);
  const e = it.terminEnd && it.terminEnd.slice(0, 10) !== it.termin.slice(0, 10) ? d2(it.terminEnd) : "";
  return e ? `${s}–${e}` : s;
}
function prioRank(p?: string) {
  return p === "Wysoki" ? 0 : p === "Średni" ? 1 : p === "Niski" ? 2 : 3;
}
function prioDot(p?: string) {
  const color = p === "Wysoki" ? "#eb5757" : p === "Średni" ? "#e9a23b" : "#9b9a97";
  return <span className="dot" style={{ background: color }} />;
}
function sortItems(arr: Item[]) {
  return [...arr].sort(
    (a, b) => prioRank(a.priorytet) - prioRank(b.priorytet) || (a.termin || "9999").localeCompare(b.termin || "9999")
  );
}

function ItemRow({
  it,
  kind,
  today,
  onDone,
  onUpdate,
  busy,
}: {
  it: Item;
  kind: Kind;
  today: string;
  onDone: (it: Item, kind: Kind) => void;
  onUpdate: (it: Item, patch: { date?: string; priorytet?: string }) => void;
  busy: boolean;
}) {
  const [editDate, setEditDate] = useState(false);
  const canCheck = kind === "zadanie" || kind === "rutyna";
  const canEdit = kind === "zadanie" || kind === "projekt";

  function cyclePrio() {
    const idx = PRIO_ORDER.indexOf(it.priorytet || "");
    const next = PRIO_ORDER[(idx + 1) % PRIO_ORDER.length];
    onUpdate(it, { priorytet: next });
  }

  return (
    <div className="it2">
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
        <span className="check-spacer">{prioDot(it.priorytet)}</span>
      )}

      <div className="it2-body">
        <a className="it2-name" href={it.url} target="_blank" rel="noreferrer">
          {it.name}
        </a>
        <div className="it2-meta">
          {canEdit && (
            <button className="prio-chip" onClick={() => cyclePrio()} title="Zmień priorytet" disabled={busy}>
              {prioDot(it.priorytet)}
              {it.priorytet || "priorytet"}
            </button>
          )}
          {it.obszar && <span className="it-tag obszar">{it.obszar}</span>}
          {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}

          {editDate ? (
            <input
              className="date-input"
              type="date"
              autoFocus
              defaultValue={it.termin ? it.termin.slice(0, 10) : today}
              onChange={(e) => {
                if (e.target.value) onUpdate(it, { date: e.target.value });
                setEditDate(false);
              }}
              onBlur={() => setEditDate(false)}
            />
          ) : (
            <button
              className={"date-btn" + (it.termin ? "" : " empty")}
              onClick={() => canEdit && setEditDate(true)}
              title={canEdit ? "Kliknij, aby zmienić datę" : ""}
            >
              {it.termin ? fmtTermin(it) : canEdit ? "+ termin" : ""}
            </button>
          )}

          {canEdit && (
            <>
              <button className="mini" onClick={() => onUpdate(it, { date: addDays(today, 1) })} disabled={busy}>
                jutro
              </button>
              <button className="mini" onClick={() => onUpdate(it, { date: addDays(it.termin || today, 7) })} disabled={busy}>
                +7
              </button>
            </>
          )}
        </div>
      </div>
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
  onUpdate: (it: Item, patch: { date?: string; priorytet?: string }) => void;
  busyId: string;
}) {
  const { title, items, accent, kind, today, onDone, onUpdate, busyId } = props;
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>
        {title} <span className="sec-count">{items.length}</span>
      </div>
      <div className="sec-list">
        {items.map((it, i) => (
          <ItemRow
            key={it.id || i}
            it={it}
            kind={kind}
            today={today}
            onDone={onDone}
            onUpdate={onUpdate}
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
            <div className={"wl-bar" + (i === 0 ? " is-today" : "")} style={{ height: 6 + (d.count / max) * 44 }} />
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

  async function onUpdate(it: Item, patch: { date?: string; priorytet?: string }) {
    if (!it.id) return;
    setBusyId(it.id);
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: it.id, ...patch }),
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
        body: JSON.stringify({ target: "zadania", fields: { Nazwa: name, Status: "Do zrobienia" } }),
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

  const fil = (arr: Item[]) => sortItems(cat ? arr.filter((i) => i.obszar === cat) : arr);

  const projektyUpcoming = data
    ? fil(data.projekty.overdue.concat(data.projekty.today, data.projekty.week))
    : [];

  // "Teraz najważniejsze" + powód
  const top = useMemo(() => {
    if (!data) return null;
    const overdue = fil(data.zadania.overdue);
    const todayArr = fil(data.zadania.today);
    const pool = overdue.concat(todayArr);
    if (pool.length === 0) return null;
    const it = pool[0]; // już posortowane wg priorytetu/daty
    const isOverdue = overdue.includes(it);
    const reasons: string[] = [];
    if (isOverdue) reasons.push("po terminie");
    else reasons.push("na dziś");
    if (it.priorytet) reasons.push("priorytet: " + it.priorytet.toLowerCase());
    return { it, reason: reasons.join(" · ") };
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

          {data.workload && <Workload wd={data.workload} />}

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

          {allCats.length > 0 && (
            <div className="cats">
              <button className={"cat" + (cat === "" ? " on" : "")} onClick={() => setCat("")}>
                Wszystko
              </button>
              {allCats.map((c) => (
                <button key={c} className={"cat" + (cat === c ? " on" : "")} onClick={() => setCat(cat === c ? "" : c)}>
                  {c}
                </button>
              ))}
            </div>
          )}

          {top && (
            <div className="topnow">
              <div className="topnow-l">⭐ Teraz najważniejsze · {top.reason}</div>
              <div className="topnow-name">
                {prioDot(top.it.priorytet)}
                <a href={top.it.url} target="_blank" rel="noreferrer">
                  {top.it.name}
                </a>
                {top.it.termin && <span className="it-date">{fmtTermin(top.it)}</span>}
              </div>
            </div>
          )}

          <Section title="🔴 Zaległe" items={fil(data.zadania.overdue)} accent="#eb5757" kind="zadanie" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="📌 Na dziś" items={fil(data.zadania.today)} accent="#2383e2" kind="zadanie" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🔁 Rutyny" items={fil(data.rutynyDue)} kind="rutyna" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🗓️ Ten tydzień" items={fil(data.zadania.week)} kind="zadanie" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🗒️ Bez terminu" items={fil(data.zadania.noDate)} kind="zadanie" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🚀 Projekty — najbliższe" items={projektyUpcoming} accent="#9256d9" kind="projekt" today={data.today} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />

          {data.counts.zalegle + data.counts.dzis + data.counts.tydzien + data.counts.rutyny === 0 && (
            <div className="dash-clear">Czysto na najbliższe dni 🎉</div>
          )}
        </>
      )}
    </div>
  );
}
