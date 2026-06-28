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
    const message = (text ?? input).trim();
    if (!message || loading) return;
    setInput("");
    // Anthropic odrzuca puste wiadomości — pomijamy je, a propozycje bez tekstu
    // streszczamy, żeby zachować kontekst rozmowy.
    const history = items
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
    const newItems: ChatItem[] = [...items, { role: "user", content: message }];
    setItems(newItems);
    setLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: message }] }),
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

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="app">
      <div className="topbar">
        <div>
          <h1>🧠 Asystent</h1>
          <div className="sub">Pisz, co masz do zrobienia — przypiszę to do Notion</div>
        </div>
        <button className="logout" onClick={logout}>
          Wyloguj
        </button>
      </div>

      <div className="chat" ref={chatRef}>
        <Dashboard />

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
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && <div className="thinking">Asystent myśli…</div>}
      </div>

      <div className="composer">
        <div className="composer-inner">
          <textarea
            rows={1}
            placeholder="Np. „Jutro zadzwonić do studia, w piątek deadline na mix…”"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
          />
          <button className="send" onClick={() => send()} disabled={loading || !input.trim()}>
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
