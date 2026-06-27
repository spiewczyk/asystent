"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Błędne hasło");
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-box" onSubmit={submit}>
        <div className="brain">🧠</div>
        <h1>Asystent — Drugi Mózg</h1>
        <p>Wpisz hasło, żeby wejść</p>
        {error && <div className="login-error">{error}</div>}
        <input
          type="password"
          value={password}
          autoFocus
          placeholder="Hasło"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "..." : "Wejdź"}
        </button>
      </form>
    </div>
  );
}
