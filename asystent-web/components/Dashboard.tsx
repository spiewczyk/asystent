"use client";
import { useEffect, useMemo, useRef, useState } from "react";

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
interface Buckets { overdue: Item[]; today: Item[]; week: Item[]; later: Item[]; noDate: Item[] }
interface WD { date: string; label: string; count: number }
interface Opt { id: string; name: string }
interface Options { obszary: Opt[]; projekty: Opt[] }
interface Data {
  today: string;
  zadania: Buckets;
  projekty: Buckets;
  projektyActive: Item[];
  rutynyDue: Item[];
  counts: { zalegle: number; dzis: number; tydzien: number; projekty: number; rutyny: number };
  workload: WD[];
  todayStats: { done: number; total: number };
  options: Options;
}

type Kind = "zadanie" | "rutyna" | "projekt";
const STATUSY: Record<string, string[]> = {
  zadanie: ["Do zrobienia", "W toku", "Oczekuje", "Zrobione"],
  projekt: ["Pomysł", "Planowany", "W toku", "Wstrzymany", "Ukończony", "Archiwum"],
};
const PRIO = ["Wysoki", "Średni", "Niski"];

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

/* ---------- pełny edytor (dla brakujących/pozostałych pól) ---------- */
function ItemEditor({ item, kind, options, onClose, onSaved }: any) {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/item?id=" + item.id).then((r) => r.json()).then(setForm).catch(() => setForm({}));
  }, [item.id]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
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
  return (
    <div className="editor">
      <div className="ed-row"><label>Status</label>
        <select value={form.status || ""} onChange={(e) => set("status", e.target.value)}>
          <option value="">—</option>
          {(STATUSY[kind] || []).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="ed-row"><label>Priorytet</label>
        <select value={form.priorytet || ""} onChange={(e) => set("priorytet", e.target.value)}>
          <option value="">—</option>{PRIO.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="ed-row"><label>Termin</label>
        <input type="date" value={(form.date || "").slice(0, 10)} onChange={(e) => set("date", e.target.value)} />
      </div>
      <div className="ed-row"><label>Obszar</label>
        <select value={form.obszarId || ""} onChange={(e) => set("obszarId", e.target.value)}>
          <option value="">—</option>{options.obszary.map((o: Opt) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
      </div>
      {kind === "zadanie" && (
        <div className="ed-row"><label>Projekt</label>
          <select value={form.projektId || ""} onChange={(e) => set("projektId", e.target.value)}>
            <option value="">—</option>{options.projekty.map((o: Opt) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <div className="ed-row"><label>Notatki</label>
        <textarea value={form.notatki || ""} onChange={(e) => set("notatki", e.target.value)} />
      </div>
      <div className="ed-actions">
        <button className="btn primary" onClick={save} disabled={saving}>{saving ? "Zapisuję…" : "Zapisz"}</button>
        <button className="btn" onClick={onClose}>Anuluj</button>
      </div>
    </div>
  );
}

/* ---------- wiersz pozycji ---------- */
function ItemRow({ it, kind, today, options, onDone, onUpdate, onTrash, busy }: any) {
  const [edit, setEdit] = useState<"" | "date" | "prio" | "obszar">("");
  const [open, setOpen] = useState(false);
  const canCheck = kind === "zadanie" || kind === "rutyna";
  const canEdit = kind === "zadanie" || kind === "projekt";
  const obszarId = options.obszary.find((o: Opt) => o.name === it.obszar)?.id || "";

  return (
    <div className="it2-wrap">
      <div className="it2">
        {canCheck ? (
          <button className={"check" + (busy ? " on" : "")} onClick={() => onDone(it, kind)} disabled={busy} title="Odhacz">
            {busy ? "✓" : ""}
          </button>
        ) : (
          <span className="check-spacer">{prioDot(it.priorytet)}</span>
        )}
        <div className="it2-body">
          <a className="it2-name" href={it.url} target="_blank" rel="noreferrer">{it.name}</a>
          <div className="it2-meta">
            {/* priorytet — klik edytuje */}
            {edit === "prio" ? (
              <select autoFocus className="inline-sel" defaultValue={it.priorytet || ""}
                onChange={(e) => { onUpdate(it, { priorytet: e.target.value }); setEdit(""); }} onBlur={() => setEdit("")}>
                <option value="">— priorytet</option>{PRIO.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : it.priorytet && canEdit ? (
              <button className="prio-chip" onClick={() => setEdit("prio")} title="Zmień priorytet">
                {prioDot(it.priorytet)}{it.priorytet}
              </button>
            ) : it.priorytet ? (
              <span className="prio-chip">{prioDot(it.priorytet)}{it.priorytet}</span>
            ) : null}

            {/* obszar — klik edytuje */}
            {edit === "obszar" ? (
              <select autoFocus className="inline-sel" defaultValue={obszarId}
                onChange={(e) => { onUpdate(it, { obszarId: e.target.value }); setEdit(""); }} onBlur={() => setEdit("")}>
                <option value="">— obszar</option>{options.obszary.map((o: Opt) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            ) : it.obszar ? (
              <button className="it-tag obszar as-btn" onClick={() => canEdit && setEdit("obszar")}>{it.obszar}</button>
            ) : null}

            {it.czestotliwosc && <span className="it-tag">{it.czestotliwosc}</span>}

            {/* termin — klik edytuje */}
            {edit === "date" ? (
              <input autoFocus className="date-input" type="date" defaultValue={it.termin ? it.termin.slice(0, 10) : today}
                onChange={(e) => { if (e.target.value) onUpdate(it, { date: e.target.value }); setEdit(""); }} onBlur={() => setEdit("")} />
            ) : it.termin ? (
              <button className="date-pill" onClick={() => canEdit && setEdit("date")}>{fmtTermin(it)}</button>
            ) : null}

            {canEdit && <button className="mini ed-btn" onClick={() => setOpen((o) => !o)}>✎ edytuj</button>}
            <button className="mini trash" onClick={() => onTrash(it, kind)} title="Do kosza">🗑</button>
          </div>
        </div>
      </div>
      {open && canEdit && (
        <ItemEditor item={it} kind={kind} options={options}
          onClose={() => setOpen(false)} onSaved={() => { setOpen(false); onUpdate(it, {}); }} />
      )}
    </div>
  );
}

function Section(props: any) {
  const { title, items, accent, kind, today, options, onDone, onUpdate, onTrash, busyId } = props;
  if (!items || items.length === 0) return null;
  return (
    <div className="sec">
      <div className="sec-h" style={accent ? { color: accent } : {}}>{title} <span className="sec-count">{items.length}</span></div>
      <div className="sec-list">
        {items.map((it: Item, i: number) => (
          <ItemRow key={it.id || i} it={it} kind={kind} today={today} options={options}
            onDone={onDone} onUpdate={onUpdate} onTrash={onTrash} busy={busyId === it.id} />
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

/* ---------- Plan na dziś ---------- */
function PlanToday({ data, onBack }: { data: Data; onBack: () => void }) {
  const h = new Date().getHours();
  const greet = h < 12 ? "Dzień dobry" : h < 18 ? "Miłego popołudnia" : "Dobry wieczór";
  const overdue = sortItems(data.zadania.overdue);
  const todayTasks = sortItems(data.zadania.today);
  const todayRoutines = data.rutynyDue.filter((r) => r.termin && r.termin.slice(0, 10) === data.today);
  const all = todayTasks.concat(todayRoutines);
  const mit = overdue.concat(todayTasks).slice(0, 3);
  const timed = all.filter((e) => timeOf(e)).sort((a, b) => timeOf(a).localeCompare(timeOf(b)));
  const untimed = all.filter((e) => !timeOf(e));

  return (
    <div className="plan">
      <div className="plan-head">
        <div>
          <div className="plan-title">{greet} 👋</div>
          <div className="plan-sub">
            {data.todayStats.total > 0 ? `Dziś zrobione ${data.todayStats.done}/${data.todayStats.total}. ` : ""}
            {all.length} rzeczy na dziś{overdue.length ? `, ${overdue.length} zaległych` : ""}.
          </div>
        </div>
        <button className="navlink" onClick={onBack}>← wróć</button>
      </div>

      {mit.length > 0 && (
        <div className="mit">
          <div className="mit-h">⭐ 3 najważniejsze dziś</div>
          {mit.map((it, i) => (
            <a className="mit-card" key={i} href={it.url} target="_blank" rel="noreferrer" style={{ borderLeftColor: prioColor(it.priorytet) }}>
              <span className="mit-num">{i + 1}</span>
              <span className="mit-name">{it.name}</span>
              {it.termin && <span className="it-date">{fmtTermin(it)}</span>}
            </a>
          ))}
          {mit[0] && <div className="focus">▶ Zacznij od: <b>{mit[0].name}</b></div>}
        </div>
      )}

      {overdue.length > 0 && (
        <div className="plan-overdue">⚠️ {overdue.length} zaległych — najpilniejsze: <b>{overdue[0].name}</b></div>
      )}

      {timed.length > 0 && (
        <div className="plan-block">
          <div className="plan-block-h">🕒 Oś czasu</div>
          <div className="timeline">
            {timed.map((e, i) => (
              <a className="tl-ev" key={i} href={e.url} target="_blank" rel="noreferrer">
                <div className="tl-time">{timeOf(e)}</div>
                <div className="tl-dot" style={{ background: prioColor(e.priorytet) }} />
                <div className="tl-name">{e.name}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {untimed.length > 0 && (
        <div className="plan-block">
          <div className="plan-block-h">📋 W ciągu dnia</div>
          {sortItems(untimed).map((e, i) => (
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
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [cat, setCat] = useState("");
  const [plan, setPlan] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [undo, setUndo] = useState<{ id: string; name: string } | null>(null);
  const undoTimer = useRef<any>(null);

  const options: Options = data?.options || { obszary: [], projekty: [] };

  async function load() {
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

  useEffect(() => { load(); }, []);

  async function onDone(it: Item, kind: Kind) {
    if (!it.id) return;
    setBusyId(it.id);
    setRemoved((s) => new Set(s).add(it.id!));
    try {
      await fetch("/api/done", {
        method: "POST", headers: { "content-type": "application/json" },
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
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: it.id, ...patch }),
        });
      } catch {}
      setBusyId("");
    }
    await load();
  }

  async function onTrash(it: Item) {
    if (!it.id) return;
    setRemoved((s) => new Set(s).add(it.id!));
    try {
      await fetch("/api/trash", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: it.id }),
      });
    } catch {}
    setUndo({ id: it.id, name: it.name });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 7000);
    load();
  }

  async function doUndo() {
    if (!undo) return;
    const id = undo.id;
    setUndo(null);
    try {
      await fetch("/api/trash", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, restore: true }),
      });
    } catch {}
    load();
  }

  async function getSuggestions() {
    setSugLoading(true);
    try {
      const r = await fetch("/api/suggest", { method: "POST" });
      const d = await r.json();
      setSuggestions(Array.isArray(d.suggestions) ? d.suggestions : []);
    } catch { setSuggestions([]); }
    setSugLoading(false);
  }

  const allCats = useMemo(() => {
    if (!data) return [];
    const s = new Set<string>();
    const add = (arr: Item[]) => arr.forEach((i) => i.obszar && s.add(i.obszar));
    add(data.zadania.overdue); add(data.zadania.today); add(data.zadania.week);
    add(data.zadania.noDate); add(data.rutynyDue); add(data.projektyActive);
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
    const reasons = [overdue.includes(it) ? "po terminie" : "na dziś"];
    if (it.priorytet) reasons.push("priorytet: " + it.priorytet.toLowerCase());
    return { it, reason: reasons.join(" · ") };
  }, [data, cat, removed]);

  const prog = data?.todayStats;
  const progPct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
  const sec = (t: string, items: Item[], kind: Kind, accent?: string) =>
    data ? (
      <Section title={t} items={items} accent={accent} kind={kind} today={data.today} options={options}
        onDone={onDone} onUpdate={onUpdate} onTrash={onTrash} busyId={busyId} />
    ) : null;

  return (
    <div className="dash">
      <div className="dash-h">
        <span>🌅 Najważniejsze</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="dash-refresh" onClick={() => setPlan((p) => !p)} title="Plan na dziś">📅</button>
          <button className="dash-refresh" onClick={load} title="Odśwież">↻</button>
        </div>
      </div>

      {loading && !data && <div className="dash-loading">Ładuję…</div>}
      {err && <div className="login-error">⚠️ {err}</div>}

      {data && plan && <PlanToday data={data} onBack={() => setPlan(false)} />}

      {data && !plan && (
        <>
          {prog && prog.total > 0 && (
            <div className="prog">
              <div className="prog-h"><span>Dziś zrobione</span><span>{prog.done}/{prog.total}</span></div>
              <div className="prog-bar"><div className="prog-fill" style={{ width: progPct + "%" }} /></div>
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
            <div className="sug-box">{suggestions.map((s, i) => <div className="sug" key={i}>• {s}</div>)}</div>
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

          {sec("🔴 Zaległe", fil(data.zadania.overdue), "zadanie", "#eb5757")}
          {sec("📌 Na dziś", fil(data.zadania.today), "zadanie", "#2383e2")}
          {sec("🔁 Rutyny", fil(data.rutynyDue), "rutyna")}
          {sec("🗓️ Ten tydzień", fil(data.zadania.week), "zadanie")}
          {sec("🗒️ Bez terminu", fil(data.zadania.noDate), "zadanie")}
          {sec("🚀 Projekty — najbliższe", projektyUpcoming, "projekt", "#9256d9")}

          {data.counts.zalegle + data.counts.dzis + data.counts.tydzien + data.counts.rutyny === 0 && (
            <div className="dash-clear">Czysto na najbliższe dni 🎉</div>
          )}
        </>
      )}

      {undo && (
        <div className="undo-bar">
          Wyrzucono „{undo.name}"
          <button onClick={doUndo}>Cofnij</button>
        </div>
      )}
    </div>
  );
}
