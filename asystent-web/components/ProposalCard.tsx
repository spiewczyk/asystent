"use client";
import { useState } from "react";

export interface FieldDef {
  name: string;
  type: string;
  options?: string[];
  relationTo?: string;
}
export interface DbDef {
  key: string;
  label: string;
  fields: FieldDef[];
}
export interface Proposal {
  target: string;
  title: string;
  fields: Record<string, any>;
  missing?: string[];
  questions?: string[];
  followups?: string[];
  warning?: string;
  confidence?: number;
}

interface Props {
  proposal: Proposal;
  databases: DbDef[];
  obszary: { name: string }[];
  projekty: { name: string }[];
  onFollowup?: (text: string) => void;
}

export default function ProposalCard({ proposal, databases, obszary, projekty, onFollowup }: Props) {
  const [target, setTarget] = useState(proposal.target);
  const [fields, setFields] = useState<Record<string, any>>({
    Nazwa: proposal.title,
    ...proposal.fields,
  });
  const [state, setState] = useState<"draft" | "saving" | "done" | "error">("draft");
  const [savedUrl, setSavedUrl] = useState("");
  const [err, setErr] = useState("");

  const db = databases.find((d) => d.key === target) || databases[0];
  const missing = new Set(proposal.missing || []);

  const [dismissed, setDismissed] = useState(false);

  function setField(name: string, value: any) {
    setFields((f) => ({ ...f, [name]: value }));
  }

  async function commit() {
    setState("saving");
    setErr("");
    const res = await fetch("/api/commit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target, fields }),
    });
    const data = await res.json();
    if (res.ok) {
      setSavedUrl(data.url || "");
      setState("done");
    } else {
      setErr(data.error || "Błąd");
      setState("error");
    }
  }

  function relOptionsFor(f: FieldDef) {
    return f.relationTo === "projekty" ? projekty : obszary;
  }

  if (dismissed) return null;

  if (state === "done") {
    return (
      <div className="card committed">
        <div className="saved-link">
          ✅ Zapisano w {db.label}
          {savedUrl && (
            <>
              {" · "}
              <a href={savedUrl} target="_blank" rel="noreferrer">
                otwórz w Notion
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-head">
        <select
          className="target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {databases.map((d) => (
            <option key={d.key} value={d.key}>
              {d.label}
            </option>
          ))}
        </select>
        {typeof proposal.confidence === "number" && (
          <span className="conf">pewność {Math.round(proposal.confidence * 100)}%</span>
        )}
      </div>

      {proposal.warning && <div className="warn">⚠️ {proposal.warning}</div>}

      {db.fields.map((f) => {
        const isMissing = missing.has(f.name);
        const val = fields[f.name] ?? "";
        return (
          <div className={"field" + (isMissing ? " missing" : "")} key={f.name}>
            <label>{f.name}</label>
            {f.type === "select" ? (
              <select value={val} onChange={(e) => setField(f.name, e.target.value)}>
                <option value="">—</option>
                {(f.options || []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "relation" ? (
              <select value={val} onChange={(e) => setField(f.name, e.target.value)}>
                <option value="">—</option>
                {relOptionsFor(f).map((o) => (
                  <option key={o.name} value={o.name}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : f.type === "date" ? (
              (() => {
                const dv =
                  val && typeof val === "object"
                    ? { start: val.start || "", end: val.end || "" }
                    : { start: val || "", end: "" };
                return (
                  <div className="daterange">
                    <input
                      type="text"
                      placeholder="od RRRR-MM-DD"
                      value={dv.start}
                      onChange={(e) => setField(f.name, { start: e.target.value, end: dv.end })}
                    />
                    <input
                      type="text"
                      placeholder="do (opcjonalnie)"
                      value={dv.end}
                      onChange={(e) => setField(f.name, { start: dv.start, end: e.target.value })}
                    />
                  </div>
                );
              })()
            ) : f.type === "checkbox" ? (
              <input
                type="checkbox"
                style={{ flex: "none", width: 18, height: 18 }}
                checked={!!val}
                onChange={(e) => setField(f.name, e.target.checked)}
              />
            ) : f.type === "text" ? (
              <textarea value={val} onChange={(e) => setField(f.name, e.target.value)} />
            ) : (
              <input value={val} onChange={(e) => setField(f.name, e.target.value)} />
            )}
          </div>
        );
      })}

      {proposal.questions && proposal.questions.length > 0 && (
        <div className="questions">
          AI dopytuje:
          <ul>
            {proposal.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {proposal.followups && proposal.followups.length > 0 && (
        <div className="followups">
          <span className="followups-l">Następny krok:</span>
          {proposal.followups.map((f, i) => (
            <button
              key={i}
              className="followup"
              onClick={() => onFollowup && onFollowup(f)}
              title="Dodaj jako kolejny wpis"
            >
              + {f}
            </button>
          ))}
        </div>
      )}

      {state === "error" && <div className="login-error">{err}</div>}

      <div className="card-actions">
        <button className="btn primary" onClick={commit} disabled={state === "saving"}>
          {state === "saving" ? "Zapisuję..." : "Zatwierdź → Notion"}
        </button>
        <button className="btn" onClick={() => setDismissed(true)} disabled={state === "saving"}>
          Anuluj
        </button>
      </div>
    </div>
  );
}
