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
interface WD { date: string; label: string; count: number }
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
interface Opt { id: string; name: string }
interface Options { obszary: Opt[]; projekty: Opt[] }

type Kind = "zadanie" | "rutyna" | "projekt";
const PRIO_ORDER = ["Wysoki", "Średni", "Niski", ""];
const STATUSY: Record<string, string[]> = {
  zadanie: ["Do zrobienia", "W toku", "Oczekuje", "Zrobione"],
  projekt: ["Pomysł", "Planowany", "W toku", "Wstrzymany", "Ukończony", "Archiwum"],
};

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
function timeOf(it: Item) {
  const m = (it.termin || "").match(/T(\d{2}:\d{2})/);
  return m ? m[1] : "";
}
function fmtTermin(it: Item) {
  if (!it.termin) return "";
  const s = d2(it.termin);
  const e = it.terminEnd && it.terminEnd.slice(0, 10) !== it.termin.slice(0, 10) ? d2(it.terminEnd) : "";
  const t = timeOf(it);
  return (e ? `${s}–${e}` : s) + (t ? ` ${t}` : "");
}
function prioRank(p?: string) {
  return p === "Wysoki" ? 0 : p === "Średni" ? 1 : p === "Niski" ? 2 : 3;
}
function prioColor(p?: string) {
  return p === "Wysoki" ? "#eb5757" : p === "Średni" ? "#e9a23b" : "#9b9a97";
}
function prioDot(p?: string) {
  return <span className="dot" style={{ background: prioColor(p) }} />;
}
function sortItems(arr: Item[]) {
  return [...arr].sort(
    (a, b) => prioRank(a.priorytet) - prioRank(b.priorytet) || (a.termin || "9999").localeCompare(b.termin || "9999")
  );
}

/* ---------- Edytor właściwości ---------- */
function ItemEditor({
  item,
  kind,
  options,
  onClose,
  onSaved,
}: {
  item: Item;
  kind: Kind;
  options: Options;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/item?id=" + item.id)
      .then((r) => r.json())
      .then((d) => setForm(d))
      .catch(() => setForm({}));
  }, [item.id]);

  function set(k: string, v: any) {
    setForm((f: any) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: form.status,
          priorytet: form.priorytet ?? "",
          date: form.date ?? "",
          notatki: form.notatki ?? "",
          obszarId: form.obszarId ?? "",
          projektId: kind === "zadanie" ? form.projektId ?? "" : undefined,
        }),
      });
      onSaved();
    } catch {}
    setSaving(false);
  }

  if (!form) return <div className="editor">Ładuję…</div>;
  const statusy = STATUSY[kind] || [];

  return (
    <div className="editor">
      <div className="ed-row">
        <label>Status</label>
        <select value={form.status || ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">—</option>
          {statusy.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="ed-row">
        <label>Priorytet</label>
        <select value={form.priorytet || ""} onChange={(e) => set("priorytet", e.target.value)}>
          <option value="">—</option>
          {["Wysoki", "Średni", "Niski"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="ed-row">
        <label>Termin</label>
        <input type="date" value={(form.date || "").slice(0, 10)} onChange={(e) => set("date", e.target.value)} />
      </div>
      <div className="ed-row">
        <label>Obszar</label>
        <select value={form.obszarId || ""} onChange={(e) => set("obszarId", e.target.value)}>
          <option value="">—</option>
          {options.obszary.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </div>
      {kind === "zadanie" && (
        <div className="ed-row">
          <label>Projekt</label>
          <select value={form.projektId || ""} onChange={(e) => set("projektId", e.target.value)}>
            <option value="">—</option>
            {options.projekty.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="ed-row">
        <label>Notatki</label>
        <textarea value={form.notatki || ""} onChange={(e) => set("notatki", e.target.value)} />
      </div>
      <div className="ed-actions">
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? "Zapisuję…" : "Zapisz"}
        </button>
        <button className="btn" onClick={onClose}>Anuluj</button>
      </div>
    </div>
  );
}

/* ---------- Wiersz pozycji ---------- */
function ItemRow({
  it,
  kind,
  today,
  options,
  onDone,
  onUpdate,
  busy,
}: {
  it: Item;
  kind: Kind;
  today: string;
  options: Options;
  onDone: (it: Item, kind: Kind) => void;
  onUpdate: (it: Item, patch: any) => void;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false);
  const canCheck = kind === "zadanie" || kind === "rutyna";
  const canEdit = kind === "zadanie" || kind === "projekt";

  return (
    <div className="it2-wrap">
      <div className="it2">
        {canCheck ? (
          <button
            className={"check" + (busy ? " on" : "")}
            onClick={() => onDone(it, kind)}
            disabled={busy}
            title={kind === "rutyna" ? "Zrobione — przesuń termin" : "Odhacz"}
          >
            {busy ? "✓" : ""}
          </button>
        ) : (
          <span className="check-spacer">{prioDot(it.priorytet)}</span>
        )}

        <div className="it2-body">
          <a className="it2-name" href={it.url} target="_blank" rel="noreferrer">
            {it.name}
          </a>
          <div className="it2-meta">
            {it.priorytet && (
              <span className="prio-chip">
                {prioDot(it.priorytet)}
                {it.priorytet}
              </span>
            )}
            {it.obszar && <span className="it-tag obszar">{it.obszar}</span>}
            {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}
            {it.termin && <span className="date-pill">{fmtTermin(it)}</span>}
            {canEdit && (
              <button className="mini" onClick={() => onUpdate(it, { date: addDays(today, 1) })} disabled={busy}>
                jutro
              </button>
            )}
            {canEdit && (
              <button className="mini ed-btn" onClick={() => setOpen((o) => !o)}>
                ✎ edytuj
              </button>
            )}
          </div>
        </div>
      </div>
      {open && canEdit && (
        <ItemEditor
          item={it}
          kind={kind}
          options={options}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onUpdate(it, {});
          }}
        />
      )}
    </div>
  );
}

function Section(props: any) {
  const { title, items, accent, kind, today, options, onDone, onUpdate, busyId } = props;
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>
        {title} <span className="sec-count">{items.length}</span>
      </div>
      <div className="sec-list">
        {items.map((it: Item, i: number) => (
          <ItemRow
            key={it.id || i}
            it={it}
            kind={kind}
            today={today}
            options={options}
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

/* ---------- Plan na dziś (oś czasu) ---------- */
function PlanToday({ data, onBack }: { data: Data; onBack: () => void }) {
  const todayTasks = data.zadania.today;
  const todayRoutines = data.rutynyDue.filter((r) => r.termin && r.termin.slice(0, 10) === data.today);
  const all = todayTasks.concat(todayRoutines);
  const timed = all.filter((e) => timeOf(e)).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
  const untimed = sortItems(all.filter((e) => !timeOf(e)));
  const overdue = sortItems(data.zadania.overdue);

  return (
    <div className="plan">
      <div className="plan-head">
        <div>
          <div className="plan-title">📅 Plan na dziś</div>
          <div className="plan-sub">{data.today} · {all.length} rzeczy</div>
        </div>
        <button className="navlink" onClick={onBack}>← wróć</button>
      </div>

      {overdue.length > 0 && (
        <div className="plan-overdue">
          ⚠️ {overdue.length} zaległych — najpilniejsze: <b>{overdue[0].name}</b>
        </div>
      )}

      {timed.length > 0 && (
        <div className="timeline">
          {timed.map((e, i) => (
            <a className="tl-ev" key={i} href={e.url} target="_blank" rel="noreferrer">
              <div className="tl-time">{timeOf(e)}</div>
              <div className="tl-dot" style={{ background: prioColor(e.priorytet) }} />
              <div className="tl-name">{e.name}</div>
            </a>
          ))}
        </div>
      )}

      {untimed.length > 0 && (
        <div className="plan-block">
          <div className="plan-block-h">O dowolnej porze</div>
          {untimed.map((e, i) => (
            <a className="tl-ev flat" key={i} href={e.url} target="_blank" rel="noreferrer">
              <div className="tl-dot" style={{ background: prioColor(e.priorytet) }} />
              <div className="tl-name">{e.name}</div>
            </a>
          ))}
        </div>
      )}

      {all.length === 0 && <div className="dash-clear">Na dziś nic nie zaplanowane 🎉</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [options, setOptions] = useState<Options>({ obszary: [], projekty: [] });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState("");
  const [plan, setPlan] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sugLoading, setSugLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    setRemoved(new Set());
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
    fetch("/api/options")
      .then((r) => r.json())
      .then((d) => {
        if (d.obszary) setOptions({ obszary: d.obszary, projekty: d.projekty });
      })
      .catch(() => {});
  }, []);

  async function onDone(it: Item, kind: Kind) {
    if (!it.id) return;
    setBusyId(it.id);
    setRemoved((s) => new Set(s).add(it.id!)); // od razu znika
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

  async function onUpdate(it: Item, patch: any) {
    if (!it.id) return;
    if (patch && Object.keys(patch).length) {
      setBusyId(it.id);
      try {
        await fetch("/api/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: it.id, ...patch }),
        });
      } catch {}
      setBusyId("");
    }
    await load();
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

  const allCats = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    const add = (arr: Item[]) => arr.forEach((i) => i.obszar && s.add(i.obszar));
    add(data.zadania.overdue);
    add(data.zadania.today);
    add(data.zadania.week);
    add(data.zadania.noDate);
    add(data.rutynyDue);
    add(data.projektyActive);
    return Array.from(s).sort();
  }, [data]);

  const fil = (arr: Item[]) =>
    sortItems((cat ? arr.filter((i) => i.obszar === cat) : arr).filter((i) => !i.id || !removed.has(i.id)));

  const projektyUpcoming = data ? fil(data.projekty.overdue.concat(data.projekty.today, data.projekty.week)) : [];

  const top = useMemo(() => {
    if (!data) return null;
    const overdue = fil(data.zadania.overdue);
    const pool = overdue.concat(fil(data.zadania.today));
    if (pool.length === 0) return null;
    const it = pool[0];
    const reasons: string[] = [overdue.includes(it) ? "po terminie" : "na dziś"];
    if (it.priorytet) reasons.push("priorytet: " + it.priorytet.toLowerCase());
    return { it, reason: reasons.join(" · ") };
  }, [data, cat, removed]);

  const prog = data?.todayStats;
  const progPct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;

  return (
    <div className="dash">
      <div className="dash-h">
        <span>🌅 Najważniejsze</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dash-refresh" onClick={() => setPlan((p) => !p)} title="Plan na dziś">
            📅
          </button>
          <button className="dash-refresh" onClick={load} title="Odśwież">
            ↻
          </button>
        </div>
      </div>

      {loading && !data && <div className="dash-loading">Ładuję…</div>}
      {err && <div className="login-error">⚠️ {err}</div>}

      {data && plan && <PlanToday data={data} onBack={() => setPlan(false)} />}

      {data && !plan && (
        <>
          {prog && prog.total > 0 && (
            <div className="prog">
              <div className="prog-h">
                <span>Dziś zrobione</span>
                <span>{prog.done}/{prog.total}</span>
              </div>
              <div className="prog-bar">
                <div className="prog-fill" style={{ width: progPct + "%" }} />
              </div>
            </div>
          )}

          <div className="counts">
            <div className="count"><b>{data.counts.zalegle}</b><span>zaległe</span></div>
            <div className="count"><b>{data.counts.dzis}</b><span>na dziś</span></div>
            <div className="count"><b>{data.counts.tydzien}</b><span>tydzień</span></div>
            <div className="count"><b>{data.counts.rutyny}</b><span>rutyny</span></div>
          </div>

          {data.workload && <Workload wd={data.workload} />}

          <button className="sug-btn" onClick={getSuggestions} disabled={sugLoading}>
            {sugLoading ? "Myślę…" : "💡 Sugestie"}
          </button>
          {suggestions.length > 0 && (
            <div className="sug-box">
              {suggestions.map((s, i) => (
                <div className="sug" key={i}>• {s}</div>
              ))}
            </div>
          )}

          {allCats.length > 0 && (
            <div className="cats">
              <button className={"cat" + (cat === "" ? " on" : "")} onClick={() => setCat("")}>Wszystko</button>
              {allCats.map((c) => (
                <button key={c} className={"cat" + (cat === c ? " on" : "")} onClick={() => setCat(cat === c ? "" : c)}>{c}</button>
              ))}
            </div>
          )}

          {top && (
            <div className="topnow">
              <div className="topnow-l">⭐ Teraz najważniejsze · {top.reason}</div>
              <div className="topnow-name">
                {prioDot(top.it.priorytet)}
                <a href={top.it.url} target="_blank" rel="noreferrer">{top.it.name}</a>
                {top.it.termin && <span className="it-date">{fmtTermin(top.it)}</span>}
              </div>
            </div>
          )}

          <Section title="🔴 Zaległe" items={fil(data.zadania.overdue)} accent="#eb5757" kind="zadanie" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="📌 Na dziś" items={fil(data.zadania.today)} accent="#2383e2" kind="zadanie" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🔁 Rutyny" items={fil(data.rutynyDue)} kind="rutyna" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🗓️ Ten tydzień" items={fil(data.zadania.week)} kind="zadanie" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🗒️ Bez terminu" items={fil(data.zadania.noDate)} kind="zadanie" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />
          <Section title="🚀 Projekty — najbliższe" items={projektyUpcoming} accent="#9256d9" kind="projekt" today={data.today} options={options} onDone={onDone} onUpdate={onUpdate} busyId={busyId} />

          {data.counts.zalegle + data.counts.dzis + data.counts.tydzien + data.counts.rutyny === 0 && (
            <div className="dash-clear">Czysto na najbliższe dni 🎉</div>
          )}
        </>
      )}
    </div>
  );
}
