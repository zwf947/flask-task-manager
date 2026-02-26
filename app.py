from flask import Flask, request, jsonify, render_template

import sqlite3
from datetime import datetime

app = Flask(__name__)


DB = "tasks.db"

def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            notes TEXT,
            done INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

@app.get("/")
def home():
    return render_template("index.html")

@app.get("/api/tasks")
def get_tasks():
    q = (request.args.get("q") or "").strip()
    conn = db()
    if q:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE title LIKE ? OR notes LIKE ? ORDER BY id DESC",
            (f"%{q}%", f"%{q}%")
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM tasks ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@app.post("/api/tasks")
def create_task():
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    notes = (data.get("notes") or "").strip()
    if not title:
        return jsonify({"error": "Title is required"}), 400

    conn = db()
    created_at = datetime.now().strftime("%Y-%m-%d %H:%M")
    cur = conn.execute(
        "INSERT INTO tasks (title, notes, done, created_at) VALUES (?, ?, 0, ?)",
        (title, notes, created_at)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"id": new_id}), 201

@app.put("/api/tasks/<int:task_id>")
def update_task(task_id):
    data = request.get_json(force=True) or {}
    fields = []
    vals = []

    if "title" in data:
        t = (data.get("title") or "").strip()
        if not t:
            return jsonify({"error": "Title cannot be empty"}), 400
        fields.append("title = ?"); vals.append(t)

    if "notes" in data:
        fields.append("notes = ?"); vals.append((data.get("notes") or "").strip())

    if "done" in data:
        fields.append("done = ?"); vals.append(1 if data.get("done") else 0)

    if not fields:
        return jsonify({"error": "No fields to update"}), 400

    vals.append(task_id)
    conn = db()
    conn.execute(f"UPDATE tasks SET {', '.join(fields)} WHERE id = ?", vals)
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

@app.delete("/api/tasks/<int:task_id>")
def delete_task(task_id):
    conn = db()
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    app.run(debug=True)