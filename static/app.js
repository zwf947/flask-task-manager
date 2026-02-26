const listEl = document.querySelector("#list");
const msgEl = document.querySelector("#msg");
const createForm = document.querySelector("#createForm");
const titleEl = document.querySelector("#title");
const notesEl = document.querySelector("#notes");
const searchEl = document.querySelector("#search");
const refreshBtn = document.querySelector("#refresh");

function setMsg(text, isError = false) {
  msgEl.textContent = text || "";
  msgEl.classList.toggle("error", !!isError);
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

function formatCreatedAt(created_at) {
  const d = new Date(created_at);
  if (Number.isNaN(d.getTime())) return created_at;

  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function taskItem(task, index) {
  const li = document.createElement("li");
  li.className = "item" + (task.done ? " done" : "");
  li.dataset.id = task.id;

  li.classList.add("animate-in");
  li.addEventListener(
    "animationend",
    () => li.classList.remove("animate-in"),
    { once: true }
  );

  li.innerHTML = `
    <div class="task-top">
      <input type="checkbox" ${task.done ? "checked" : ""} />

      <div class="task-content">
        <div class="title"></div>
        <div class="notes"></div>
        <div class="meta"></div>
      </div>
    </div>

    <div class="task-bottom">
      <div class="actions">
        <button class="btn ghost" data-action="edit" type="button">Edit</button>
        <button class="btn ghost" data-action="delete" type="button">Delete</button>
      </div>
    </div>
  `;

  li.querySelector(".title").textContent = task.title;
  li.querySelector(".notes").textContent = task.notes || "";
  li.querySelector(".meta").textContent =
    `Task #${index + 1} • ${formatCreatedAt(task.created_at)}`;

  // Toggle done
  li.querySelector('input[type="checkbox"]').addEventListener("change", async () => {
    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ done: !task.done }),
      });
      await load();
    } catch (e) {
      setMsg(e.message, true);
    }
  });

  // Delete
  li.querySelector('[data-action="delete"]').addEventListener("click", async () => {
    if (!confirm("Delete this task?")) return;
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setMsg(e.message, true);
    }
  });

  // Edit
  li.querySelector('[data-action="edit"]').addEventListener("click", async () => {
    const nextTitle = prompt("Edit title:", task.title);
    if (nextTitle === null) return;

    const nextNotes = prompt("Edit notes:", task.notes || "");
    if (nextNotes === null) return;

    const t = nextTitle.trim();
    const n = nextNotes.trim();
    if (!t) return setMsg("Title cannot be empty.", true);

    try {
      await api(`/api/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: t, notes: n }),
      });
      await load();
    } catch (e) {
      setMsg(e.message, true);
    }
  });

  return li;
}

async function load() {
  setMsg("");
  const q = searchEl.value.trim();
  const url = q ? `/api/tasks?q=${encodeURIComponent(q)}` : "/api/tasks";

  try {
    const tasks = await api(url);
    listEl.innerHTML = "";

    // 🔥 THIS is the important fix
    tasks.forEach((t, index) => {
      listEl.appendChild(taskItem(t, index));
    });

  } catch (e) {
    setMsg(e.message, true);
  }
}

createForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setMsg("");

  const title = titleEl.value.trim();
  const notes = notesEl.value.trim();

  if (!title) return setMsg("Title is required.", true);

  try {
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title, notes }),
    });

    titleEl.value = "";
    notesEl.value = "";

    await load();
    setMsg("Task created.");
  } catch (e) {
    setMsg(e.message, true);
  }
});

refreshBtn.addEventListener("click", load);

searchEl.addEventListener("input", () => {
  clearTimeout(searchEl._t);
  searchEl._t = setTimeout(load, 250);
});

// initial load
load();