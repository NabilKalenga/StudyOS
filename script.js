
/* =================================
   STUDYOS — JAVASCRIPT
================================= */

const STORAGE_KEY = "studyos-data-v1";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function todayISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* =================================
   DATA STORAGE
================================= */

function defaultData() {
  return {
    tasks: [],
    notes: [],
    focusSessions: []
  };
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return defaultData();

    const parsed = JSON.parse(saved);

    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      focusSessions: Array.isArray(parsed.focusSessions)
        ? parsed.focusSessions
        : []
    };
  } catch (error) {
    console.error("Could not load StudyOS data:", error);
    return defaultData();
  }
}

let data = loadData();

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Could not save StudyOS data:", error);
    showToast("Could not save data. Check your browser storage.");
    return false;
  }
}

/* =================================
   NOTIFICATIONS
================================= */

let toastTimeout;

function showToast(message) {
  const toast = $("#toast");

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

/* =================================
   NAVIGATION
================================= */

let activeView = "dashboard";

function navigate(view) {
  const target = $("#view-" + view);

  if (!target) return;

  activeView = view;

  $$(".view").forEach(section => {
    section.classList.toggle(
      "active",
      section.id === "view-" + view
    );
  });

  $$(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === view
    );
  });

  const nav = $(`.nav-link[data-view="${view}"]`);

  if (nav) {
    $("#pageCrumb").textContent = nav.textContent.trim();
  }

  $("#sidebar").classList.remove("open");

  if (view === "progress") renderProgress();
  if (view === "notes") renderNotes();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$$(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.view);
  });
});

$$("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.go);
  });
});

$("#menuToggle").addEventListener("click", () => {
  $("#sidebar").classList.toggle("open");
});

/* =================================
   STATISTICS
================================= */

function getCompletedTasks() {
  return data.tasks.filter(task => task.completed).length;
}

function getFocusMinutes() {
  return data.focusSessions.reduce(
    (total, session) => total + (Number(session.minutes) || 0),
    0
  );
}

function getCompletionRate() {
  if (data.tasks.length === 0) return 0;

  return Math.round(
    (getCompletedTasks() / data.tasks.length) * 100
  );
}

function renderStats() {
  const completed = getCompletedTasks();
  const total = data.tasks.length;

  $("#statCompleted").textContent = completed;
  $("#statTaskTotal").textContent = `${total} total tasks`;
  $("#statFocus").textContent = getFocusMinutes();
  $("#statRate").textContent = getCompletionRate();
  $("#statNotes").textContent = data.notes.length;
  $("#timerTotalFocus").textContent = getFocusMinutes();

  $("#todayLabel").textContent = new Date().toLocaleDateString(
    undefined,
    { weekday: "short", month: "short", day: "numeric" }
  );
}

/* =================================
   STUDY PLANNER
================================= */

let taskFilter = "all";

function renderTask(task, context = "planner") {
  const overdue =
    !task.completed &&
    task.dueDate &&
    task.dueDate < todayISO();

  const priority = task.priority || "medium";

  return `
    <div class="task-row" data-task-id="${escapeHTML(task.id)}">

      <button
        class="task-check ${task.completed ? "checked" : ""}"
        data-action="toggle-task"
        aria-label="Toggle task completion"
      >${task.completed ? "✓" : ""}</button>

      <div class="task-copy">
        <div class="task-title ${task.completed ? "done" : ""}">
          ${escapeHTML(task.title)}
        </div>

        <div class="task-meta">
          <span class="subject-tag">
            ${escapeHTML(task.subject || "General")}
          </span>

          <span>
            <i class="priority-dot priority-${escapeHTML(priority)}"></i>
            ${escapeHTML(priority)}
          </span>

          ${overdue ? '<span class="task-overdue">Overdue</span>' : ""}
        </div>
      </div>

      <span class="task-date">
        ${escapeHTML(task.dueDate || "No date")}
      </span>

      ${context === "planner" ? `
        <div class="task-actions">
          <button
            class="mini-action delete"
            data-action="delete-task"
            aria-label="Delete task"
          >×</button>
        </div>
      ` : ""}

    </div>
  `;
}

function renderTasks() {
  const todayTasks = data.tasks.filter(task =>
    task.dueDate === todayISO() && !task.completed
  );

  const remainingTasks = data.tasks
    .filter(task => !task.completed)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  const dashboardItems = (
    todayTasks.length ? todayTasks : remainingTasks
  ).slice(0, 4);

  $("#dashboardTasks").innerHTML = dashboardItems
    .map(task => renderTask(task, "dashboard"))
    .join("");

  $("#dashboardEmpty").classList.toggle(
    "hidden",
    dashboardItems.length > 0
  );

  $("#dashboardTasks").classList.toggle(
    "hidden",
    dashboardItems.length === 0
  );

  let shownTasks = [...data.tasks];

  if (taskFilter === "open") {
    shownTasks = shownTasks.filter(task => !task.completed);
  }

  if (taskFilter === "done") {
    shownTasks = shownTasks.filter(task => task.completed);
  }

  shownTasks.sort((a, b) =>
    Number(a.completed) - Number(b.completed) ||
    (a.dueDate || "").localeCompare(b.dueDate || "")
  );

  $("#plannerTasks").innerHTML = shownTasks
    .map(task => renderTask(task))
    .join("");

  $("#plannerEmpty").classList.toggle(
    "hidden",
    shownTasks.length > 0
  );

  $("#plannerSummary").textContent =
    `${getCompletedTasks()} of ${data.tasks.length} tasks completed`;

  $("#navTaskCount").textContent =
    data.tasks.filter(task => !task.completed).length;
}

$("#taskDate").value = todayISO();

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("#taskTitle").value.trim();

  if (!title) return;

  const task = {
    id: makeId(),
    title,
    subject: $("#taskSubject").value,
    dueDate: $("#taskDate").value || todayISO(),
    priority: $("#taskPriority").value,
    completed: false,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  data.tasks.push(task);

  saveData();

  $("#taskForm").reset();
  $("#taskDate").value = todayISO();

  renderAll();

  showToast("Task added to your planner!");
});

$$(".filter-chip").forEach(button => {
  button.addEventListener("click", () => {
    taskFilter = button.dataset.filter;

    $$(".filter-chip").forEach(chip => {
      chip.classList.toggle("selected", chip === button);
    });

    renderTasks();
  });
});

function toggleTask(id) {
  const task = data.tasks.find(item => item.id === id);

  if (!task) return;

  task.completed = !task.completed;

  task.completedAt = task.completed
    ? new Date().toISOString()
    : null;

  saveData();
  renderAll();

  showToast(
    task.completed
      ? "Nice work — task completed!"
      : "Task moved back to your to-do list."
  );
}

function deleteTask(id) {
  const task = data.tasks.find(item => item.id === id);

  if (!task) return;

  askConfirmation(
    "Delete this task?",
    `Remove "${task.title}" from your planner?`,
    () => {
      data.tasks = data.tasks.filter(item => item.id !== id);

      saveData();
      renderAll();

      showToast("Task deleted.");
    }
  );
}

/* =================================
   CONFIRMATION DIALOG
================================= */

let pendingConfirmAction = null;

function askConfirmation(title, message, action) {
  const dialog = $("#confirmDialog");

  $("#dialogTitle").textContent = title;
  $("#dialogMessage").textContent = message;

  pendingConfirmAction = action;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else if (window.confirm(message)) {
    action();
    pendingConfirmAction = null;
  }
}

$("#confirmDialog").addEventListener("close", () => {
  if (
    $("#confirmDialog").returnValue === "confirm" &&
    pendingConfirmAction
  ) {
    pendingConfirmAction();
  }

  pendingConfirmAction = null;
});

/* =================================
   HANDLE TASK AND NOTE BUTTONS
================================= */

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const taskRow = button.closest("[data-task-id]");

  if (taskRow) {
    const id = taskRow.dataset.taskId;

    if (button.dataset.action === "toggle-task") {
      toggleTask(id);
    }

    if (button.dataset.action === "delete-task") {
      deleteTask(id);
    }

    return;
  }

  const noteCard = button.closest("[data-note-id]");

  if (noteCard) {
    const id = noteCard.dataset.noteId;
    const note = data.notes.find(item => item.id === id);

    if (button.dataset.action === "edit-note" && note) {
      openNoteEditor(note);
    }

    if (button.dataset.action === "delete-note") {
      deleteNote(id);
    }
  }
});

/* =================================
   FOCUS TIMER
================================= */

let timerMode = "Focus";
let timerInitialSeconds = 25 * 60;
let timerRemaining = timerInitialSeconds;
let timerInterval = null;
let timerRunning = false;

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60)
    .toString().padStart(2, "0");

  const seconds = (timerRemaining % 60)
    .toString().padStart(2, "0");

  const time = `${minutes}:${seconds}`;

  $("#mainTimer").textContent = time;
  $("#dashTimer").textContent = time;

  document.title = timerRunning
    ? `${time} - StudyOS`
    : "StudyOS - Level Up Your Learning";
}

function startTimer() {
  if (timerRunning) {
    pauseTimer();
    return;
  }

  timerRunning = true;

  $("#timerStart").textContent = "Ⅱ Pause timer";
  $("#dashTimerStatus").textContent = "Session in progress";
  $("#timerMessage").textContent = "Stay focused. You've got this.";

  timerInterval = setInterval(() => {
    if (timerRemaining > 0) {
      timerRemaining--;
      updateTimerDisplay();
    } else {
      finishTimer();
    }
  }, 1000);

  updateTimerDisplay();
}

function pauseTimer() {
  timerRunning = false;

  clearInterval(timerInterval);
  timerInterval = null;

  $("#timerStart").textContent = "▶ Resume timer";
  $("#dashTimerStatus").textContent = "Paused";
  $("#timerMessage").textContent = "Take a breath, then continue.";

  updateTimerDisplay();
}

function resetTimer() {
  clearInterval(timerInterval);

  timerInterval = null;
  timerRunning = false;
  timerRemaining = timerInitialSeconds;

  $("#timerStart").textContent =
    timerMode === "Focus" ? "▶ Start focus" : "▶ Start break";

  $("#dashTimerStatus").textContent = "Ready when you are";
  $("#timerMessage").textContent = "Ready to make progress?";

  updateTimerDisplay();
}

function selectTimerMode(mode, minutes) {
  timerMode = mode;
  timerInitialSeconds = minutes * 60;
  timerRemaining = timerInitialSeconds;

  $$(".timer-mode").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  $("#timerModeLabel").textContent =
    mode === "Focus" ? "FOCUS SESSION" : mode.toUpperCase();

  resetTimer();
}

function finishTimer() {
  clearInterval(timerInterval);

  timerInterval = null;
  timerRunning = false;
  timerRemaining = 0;

  $("#timerStart").textContent = "▶ Start again";
  $("#timerMessage").textContent = "Session complete! Take a break.";
  $("#dashTimerStatus").textContent = "Session complete!";

  if (timerMode === "Focus") {
    data.focusSessions.push({
      id: makeId(),
      minutes: Math.round(timerInitialSeconds / 60),
      date: todayISO(),
      completedAt: new Date().toISOString()
    });

    saveData();
    renderAll();

    showToast("Focus session completed! Progress saved.");
  } else {
    showToast("Break complete. Ready when you are!");
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("StudyOS", {
      body: "Your timer has finished!"
    });
  }

  updateTimerDisplay();
}

$("#timerStart").addEventListener("click", startTimer);
$("#timerReset").addEventListener("click", resetTimer);

$$(".timer-mode").forEach(button => {
  button.addEventListener("click", () => {
    selectTimerMode(
      button.dataset.mode,
      Number(button.dataset.minutes)
    );
  });
});

window.addEventListener("beforeunload", () => {
  clearInterval(timerInterval);
});

/* =================================
   QUICK NOTES
================================= */

function saveNote(title, body, id = "") {
  title = title.trim();
  body = body.trim();

  if (!title || !body) {
    showToast("Enter a title and some note content.");
    return false;
  }

  if (id) {
    const note = data.notes.find(item => item.id === id);

    if (note) {
      note.title = title;
      note.body = body;
      note.updatedAt = new Date().toISOString();
    }
  } else {
    data.notes.unshift({
      id: makeId(),
      title,
      body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveData();
  renderAll();
  closeNoteEditor();

  showToast(id ? "Note updated!" : "Note saved!");

  return true;
}

$("#quickNoteForm").addEventListener("submit", event => {
  event.preventDefault();

  const title =
    $("#quickNoteTitle").value.trim() || "Quick thought";

  const body = $("#quickNoteBody").value.trim();

  if (saveNote(title, body)) {
    $("#quickNoteForm").reset();
  }
});

function renderNotes() {
  $("#notesGrid").innerHTML = data.notes.map(note => `
    <article class="note-card" data-note-id="${escapeHTML(note.id)}">

      <div class="note-card-top">
        <span>▤</span>

        <div class="note-card-actions">
          <button class="mini-action" data-action="edit-note"
            aria-label="Edit note">✎</button>

          <button class="mini-action delete" data-action="delete-note"
            aria-label="Delete note">×</button>
        </div>
      </div>

      <h3>${escapeHTML(note.title)}</h3>
      <p>${escapeHTML(note.body)}</p>

      <div class="note-date">
        Updated ${escapeHTML(new Date(
          note.updatedAt || note.createdAt
        ).toLocaleDateString())}
      </div>

    </article>
  `).join("");

  $("#notesEmpty").classList.toggle(
    "hidden",
    data.notes.length > 0
  );
}

function openNoteEditor(note = null) {
  $("#noteEditor").classList.remove("hidden");

  $("#noteEditorHeading").textContent =
    note ? "Edit note" : "Create a note";

  $("#noteId").value = note?.id || "";
  $("#noteTitle").value = note?.title || "";
  $("#noteBody").value = note?.body || "";

  $("#noteEditor").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function closeNoteEditor() {
  $("#noteEditor").classList.add("hidden");
  $("#noteForm").reset();
  $("#noteId").value = "";
}

function deleteNote(id) {
  const note = data.notes.find(item => item.id === id);

  if (!note) return;

  askConfirmation(
    "Delete this note?",
    `Remove "${note.title}" permanently?`,
    () => {
      data.notes = data.notes.filter(item => item.id !== id);

      saveData();
      renderAll();

      showToast("Note deleted.");
    }
  );
}

$("#newNoteButton").addEventListener("click", () => openNoteEditor());
$("#emptyNewNote").addEventListener("click", () => openNoteEditor());
$("#closeNoteEditor").addEventListener("click", closeNoteEditor);
$("#cancelNote").addEventListener("click", closeNoteEditor);

$("#noteForm").addEventListener("submit", event => {
  event.preventDefault();

  saveNote(
    $("#noteTitle").value,
    $("#noteBody").value,
    $("#noteId").value
  );
});

/* =================================
   PROGRESS CHARTS
================================= */

let weeklyChart = null;
let progressChart = null;

function getLastSevenDays() {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();

    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const key = todayISOForDate(date);

    return {
      key,
      label: date.toLocaleDateString(undefined, {
        weekday: "short"
      })
    };
  });
}

function todayISOForDate(date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

function getFocusByDay() {
  const days = getLastSevenDays();

  return days.map(day =>
    data.focusSessions
      .filter(session => session.date === day.key)
      .reduce(
        (total, session) => total + (Number(session.minutes) || 0),
        0
      )
  );
}

function createChart(canvasId, oldChart) {
  if (!window.Chart) return null;

  const canvas = $("#" + canvasId);

  if (!canvas) return null;

  if (oldChart) oldChart.destroy();

  const days = getLastSevenDays();
  const values = getFocusByDay();

  return new Chart(canvas, {
    type: "bar",

    data: {
      labels: days.map(day => day.label),

      datasets: [{
        label: "Focus minutes",
        data: values,
        backgroundColor: "#7e82ff",
        hoverBackgroundColor: "#a38cff",
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 28
      }]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          backgroundColor: "#211a3a",
          titleColor: "#f5f2ff",
          bodyColor: "#d4cced",
          padding: 10,
          displayColors: false
        }
      },

      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: {
            color: "#817a9a",
            font: { size: 9 }
          }
        },

        y: {
          beginAtZero: true,
          grid: { color: "#ffffff0b" },
          border: { display: false },
          ticks: {
            color: "#817a9a",
            precision: 0
          }
        }
      }
    }
  });
}

function renderCharts() {
  weeklyChart = createChart("weeklyChart", weeklyChart);

  if (activeView === "progress") {
    progressChart = createChart("progressChart", progressChart);
  }
}

function renderProgress() {
  const completed = getCompletedTasks();
  const total = data.tasks.length;

  $("#progressCompleted").textContent = completed;
  $("#progressFocus").textContent = getFocusMinutes();
  $("#progressRemaining").textContent = total - completed;
  $("#progressRate").textContent = getCompletionRate();

  const subjects = {};

  data.tasks.forEach(task => {
    const subject = task.subject || "General";

    if (!subjects[subject]) {
      subjects[subject] = { total: 0, completed: 0 };
    }

    subjects[subject].total++;

    if (task.completed) {
      subjects[subject].completed++;
    }
  });

  const entries = Object.entries(subjects);

  $("#progressBreakdown").innerHTML = entries.length
    ? entries.map(([name, item]) => {
        const rate = Math.round(
          item.completed / item.total * 100
        );

        return `
          <div>
            <div class="breakdown-item-top">
              <span>${escapeHTML(name)}</span>
              <span>${item.completed}/${item.total} · ${rate}%</span>
            </div>

            <div class="breakdown-bar">
              <span style="width:${rate}%"></span>
            </div>
          </div>
        `;
      }).join("")
    : `<div class="empty-state">
         <strong>Your progress will show here</strong>
         <p>Add and complete tasks to see your breakdown.</p>
       </div>`;

  progressChart = createChart("progressChart", progressChart);
}

/* =================================
   EXPORT AND RESET
================================= */

$("#exportData").addEventListener("click", () => {
  const backup = {
    app: "StudyOS",
    exportedAt: new Date().toISOString(),
    ...data
  };

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `studyos-backup-${todayISO()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);

  showToast("Your backup has been exported.");
});

$("#clearData").addEventListener("click", () => {
  askConfirmation(
    "Reset all StudyOS data?",
    "This will delete your tasks, notes, and focus history.",
    () => {
      data = defaultData();

      saveData();
      renderAll();

      showToast("StudyOS data has been reset.");
    }
  );
});

/* =================================
   UPDATE THE ENTIRE APP
================================= */

function renderAll() {
  renderTasks();
  renderStats();
  renderNotes();
  renderCharts();

  if (activeView === "progress") {
    renderProgress();
  }
}

/* =================================
   START STUDYOS
================================= */

renderAll();
updateTimerDisplay();
