import { useCallback, useEffect, useState } from "react";

import { api } from "../api.js";
import TaskItem from "./TaskItem.jsx";

export default function TaskBoard({ token, onUnauthorized }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Runs an API call; an expired/invalid token sends the user back to sign in.
  const run = useCallback(
    async (fn) => {
      setError("");
      try {
        return await fn();
      } catch (err) {
        if (err.status === 401) onUnauthorized("Your session expired. Please sign in again.");
        else setError(err.message);
        return undefined;
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    run(() => api.listTasks(token)).then((list) => {
      if (list) setTasks(list);
      setLoading(false);
    });
  }, [token, run]);

  async function handleCreate(event) {
    event.preventDefault();
    const task = await run(() =>
      api.createTask(token, { title: title.trim(), description: description.trim() || null })
    );
    if (task) {
      setTasks((prev) => [...prev, task]);
      setTitle("");
      setDescription("");
    }
  }

  function replaceTask(updated) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <section className="board">
      <form className="card stack" onSubmit={handleCreate}>
        <h2>New task</h2>
        <input
          placeholder="What needs doing?"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          placeholder="Details (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
          Add task
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <div className="list-header">
        <h2>Your tasks</h2>
        {!loading && <span className="muted">{remaining} open · {tasks.length} total</span>}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : tasks.length === 0 ? (
        <p className="muted empty">No tasks yet. Add your first one above.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              token={token}
              run={run}
              onChange={replaceTask}
              onDelete={removeTask}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
