import { useState } from "react";

import AuthForm from "./components/AuthForm.jsx";
import TaskBoard from "./components/TaskBoard.jsx";

export default function App() {
  // The token is kept in memory only (not localStorage), so injected scripts
  // can't read it from storage. Refreshing the page signs the user out.
  const [session, setSession] = useState(null);
  const [notice, setNotice] = useState("");

  function handleLogin(email, token) {
    setNotice("");
    setSession({ email, token });
  }

  function handleLogout(message = "") {
    setSession(null);
    setNotice(message);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Task Manager</h1>
        {session && (
          <div className="topbar-user">
            <span>{session.email}</span>
            <button className="btn btn-ghost" onClick={() => handleLogout()}>
              Sign out
            </button>
          </div>
        )}
      </header>

      <main className="content">
        {session ? (
          <TaskBoard token={session.token} onUnauthorized={handleLogout} />
        ) : (
          <AuthForm onLogin={handleLogin} notice={notice} />
        )}
      </main>
    </div>
  );
}
