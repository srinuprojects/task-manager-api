import { useState } from "react";

import { api } from "../api.js";

export default function AuthForm({ onLogin, notice }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isRegister) await api.register(email, password);
      const { access_token } = await api.login(email, password);
      onLogin(email, access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? "login" : "register");
    setError("");
  }

  return (
    <section className="card auth">
      <h2>{isRegister ? "Create an account" : "Sign in"}</h2>
      {notice && <p className="notice">{notice}</p>}

      <form onSubmit={handleSubmit} className="stack">
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
            minLength={isRegister ? 8 : undefined}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isRegister && <small>At least 8 characters</small>}
        </label>

        {error && <p className="error">{error}</p>}

        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="muted">
        {isRegister ? "Already have an account?" : "New here?"}{" "}
        <button className="link" onClick={switchMode}>
          {isRegister ? "Sign in" : "Create an account"}
        </button>
      </p>
    </section>
  );
}
