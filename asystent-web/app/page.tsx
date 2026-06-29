"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ProposalCard, { Proposal, DbDef } from "../components/ProposalCard";
import Dashboard from "../components/Dashboard";

interface ChatItem {
  role: "user" | "assistant";
  content: string;
  proposals?: Proposal[];
}

const EXAMPLES = [
  "Jutro o 15 dokończyć mix Doriana, to pilne",
  "Co tydzień w niedzielę zrobić pranie",
  "Pomysł: cykl reelsów ze studia",
  "Kupić kabel jack 6,3mm",
];

export default function Home() {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<{
    databases: DbDef[];
    obszary: { name: string }[];
    projekty: { name: string }[];
  }>({ databases: [], obszary: [], projekty: [] });
  const chatRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);
  const [attach, setAttach] = useState<{ name: string; mime: string; data: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/options")
      .then((r) => r.json())
      .then((d) => {
        if (d.databases) setMeta({ databases: d.databases, obszary: d.obszary, projekty: d.projekty });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Przewijaj na dół tylko gdy trwa rozmowa — na starcie zostaw panel u góry.
    if (items.length > 0) {
      chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [items, loading]);

  async function send(text?: string) {
    let message = (text ?? input).trim();
    if ((!message && !attach) || loading) return;
    const img = attach;
    if (!message && img) message = "Przeanalizuj załącznik i wyłuskaj z niego zadania/terminy.";
    setInput("");
    setAttach(null);
    // Anthropic odrzuca puste wiadomości — pomijamy je, a propozycje bez tekstu
    // streszczamy, żeby zachować kontekst rozmowy.
    const raw = items
      .map((i) => {
        let content = i.content;
        if (!content && i.proposals && i.proposals.length) {
          content =
            "[Zaproponowano: " +
            i.proposals.map((p) => `${p.title} → ${p.target}`).join("; ") +
            "]";
        }
        return { role: i.role, content };
      })
      .filter((m) => m.content && m.content.trim() !== "");

    // Wymuś naprzemienność ról (Gemini tego wymaga): scal sąsiednie tej samej roli
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of raw) {
      const last = history[history.length - 1];
      if (last && last.role === m.role) last.content += "\n" + m.content;
      else history.push({ ...m });
    }
    // Rozmowa wysyłana do AI musi zaczynać się od użytkownika
    while (history.length && history[0].role === "assistant") history.shift();
    const shown = img ? message + `  📎 ${img.name}` : message;
    const newItems: ChatItem[] = [...items, { role: "user", content: shown }];
    setItems(newItems);
    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: message }],
          image: img ? { mime: img.mime, data: img.data } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setItems((it) => [...it, { role: "assistant", content: "⚠️ " + (data.error || "Błąd") }]);
      } else {
        setItems((it) => [
          ...it,
          { role: "assistant", content: data.reply || "", proposals: data.proposals || [] },
        ]);
      }
    } catch (e: any) {
      setItems((it) => [...it, { role: "assistant", content: "⚠️ Błąd połączenia" }]);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  async function runAudit() {
    if (loading) return;
    setItems((it) => [...it, { role: "assistant", content: "🔍 Analizuję strukturę systemu…" }]);
    setLoading(true);
    try {
      const res = await fetch("/api/audit", { method: "POST" });
      const data = await res.json();
      const text =
        res.ok && data.suggestions?.length
          ? "🔍 Audyt systemu — propozycje:\n\n" +
            data.suggestions.map((s: string) => "• " + s).join("\n")
          : "⚠️ " + (data.error || "Brak sugestii.");
      setItems((it) => [...it, { role: "assistant", content: text }]);
    } catch {
      setItems((it) => [...it, { role: "assistant", content: "⚠️ Błąd audytu" }]);
    } finally {
      setLoading(false);
    }
  }

  function beep(freq: number) {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 130);
    } catch {}
  }

  function toggleVoice() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      alert("Twoja przeglądarka nie obsługuje dyktowania. Użyj Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "pl-PL";
    rec.interimResults = true;
    rec.continuous = true;
    let finalText = "";
    rec.onstart = () => {
      setListening(true);
      beep(660);
    };
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + " ";
        else interim += t;
      }
      setInput((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      beep(440);
    };
    recRef.current = rec;
    rec.start();
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const data = res.includes(",") ? res.split(",")[1] : res;
      setAttach({ name: f.name, mime: f.type || "image/png", data });
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="shell">
      <aside className="side">
        <Dashboard />
      </aside>

      <section className="main">
      <div className="topbar">
        <div>
          <h1>🧠 Asystent</h1>
          <div className="sub">Pisz, co masz do zrobienia — przypiszę to do Notion</div>
        </div>
        <div className="nav">
          <button className="navlink" onClick={runAudit} title="Audyt struktury systemu">
            🔍 Audyt
          </button>
          <button className="logout" onClick={logout}>
            Wyloguj
          </button>
        </div>
      </div>

      <div className="chat" ref={chatRef}>
        {items.length === 0 && (
          <div className="empty">
            Napisz w skrócie, co masz na głowie.
            <div className="examples">
              {EXAMPLES.map((ex) => (
                <button key={ex} className="chip" onClick={() => send(ex)}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {items.map((it, idx) => (
          <div key={idx}>
            {it.content && (
              <div className={"msg " + it.role}>
                {it.role === "assistant" && <div className="who">Asystent</div>}
                {it.content}
              </div>
            )}
            {it.proposals && it.proposals.length > 0 && (
              <div className="proposals">
                {it.proposals.map((p, i) => (
                  <ProposalCard
                    key={idx + "-" + i}
                    proposal={p}
                    databases={meta.databases}
                    obszary={meta.obszary}
                    projekty={meta.projekty}
                    onFollowup={(t) => send(t)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <div className="thinking">Asystent myśli…</div>}
      </div>

      <div className="composer">
        {attach && (
          <div className="attach-chip">
            📎 {attach.name}
            <button onClick={() => setAttach(null)} title="Usuń załącznik">✕</button>
          </div>
        )}
        <div className="composer-inner">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf,.txt"
            style={{ display: "none" }}
            onChange={onPickFile}
          />
          <button className="mic" onClick={() => fileRef.current?.click()} title="Dodaj plik / zrzut ekranu">
            📎
          </button>
          <button
            className={"mic" + (listening ? " listening" : "")}
            onClick={toggleVoice}
            title={listening ? "Słucham — kliknij, aby zatrzymać" : "Dyktuj głosem"}
          >
            🎤
          </button>
          <textarea
            rows={1}
            placeholder="Np. „Jutro o 15 gadam z Leną o koncercie…”"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button className="send" onClick={() => send()} disabled={loading || (!input.trim() && !attach)}>
            ↑
          </button>
        </div>
      </div>
      </section>
    </div>
  );
}
