import { useState } from "react";

import { api } from "../api.js";

const MAX_UPLOAD_MB = 10;

export default function TaskItem({ task, token, run, onChange, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");

  async function toggleCompleted() {
    const updated = await run(() =>
      api.updateTask(token, task.id, { completed: !task.completed })
    );
    if (updated) onChange(updated);
  }

  async function saveEdit(event) {
    event.preventDefault();
    const updated = await run(() =>
      api.updateTask(token, task.id, {
        title: title.trim(),
        description: description.trim() || null,
      })
    );
    if (updated) {
      onChange(updated);
      setEditing(false);
    }
  }

  function startEdit() {
    setTitle(task.title);
    setDescription(task.description || "");
    setEditing(true);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const result = await run(() => api.deleteTask(token, task.id));
    if (result !== undefined) onDelete(task.id);
  }

  async function handleFile(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;

    setFileError("");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setFileError(`File is larger than ${MAX_UPLOAD_MB} MB`);
      return;
    }

    setUploading(true);
    const updated = await run(() => api.uploadFile(token, task.id, file));
    setUploading(false);
    if (updated) onChange(updated);
  }

  if (editing) {
    return (
      <li className="card task">
        <form className="stack" onSubmit={saveEdit}>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={!title.trim()}>
              Save
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`card task${task.completed ? " done" : ""}`}>
      <label className="task-main">
        <input type="checkbox" checked={task.completed} onChange={toggleCompleted} />
        <span>
          <span className="task-title">{task.title}</span>
          {task.description && <span className="task-desc">{task.description}</span>}
        </span>
      </label>

      <div className="task-actions">
        {task.file_url && (
          // Signed S3 link, valid for about an hour after the list loads
          <a href={task.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            Open file
          </a>
        )}
        <label className="btn btn-ghost file-btn">
          {uploading ? "Uploading…" : task.file_url ? "Replace file" : "Attach file"}
          <input type="file" onChange={handleFile} disabled={uploading} hidden />
        </label>
        <button className="btn btn-ghost" onClick={startEdit}>
          Edit
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          Delete
        </button>
      </div>

      {fileError && <p className="error">{fileError}</p>}
    </li>
  );
}
