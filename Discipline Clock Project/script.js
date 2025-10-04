let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let fiveMinAlerted = false;

// Convert 24-hour time to readable 12-hour string
function formatTime12h(time) {
  let [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Convert HH:MM to total seconds
function timeToSeconds(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 3600 + m * 60;
}

// Get current time in seconds
function currentSeconds() {
  const now = new Date();
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

// Simple beep
function beep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

// Speak function
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  speechSynthesis.speak(utter);
}

// Notifications
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}
function notify(title, msg) {
  if (Notification.permission === "granted") {
    new Notification(title, { body: msg });
  }
}

// Add Task
function addTask() {
  const name = document.getElementById("taskName").value.trim();
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!name || !start || !end) return alert("Please fill all fields.");
  if (timeToSeconds(end) <= timeToSeconds(start)) {
    alert("End time must be after start time.");
    return;
  }

  tasks.push({ name, start, end, status: "Not Started" });
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  updateRemoveDropdown();
  speak(`Task ${name} added`);
  document.getElementById("taskName").value = "";
  document.getElementById("startTime").value = "";
  document.getElementById("endTime").value = "";
}

// Remove Task
function removeTask() {
  const select = document.getElementById("removeSelect");
  const index = select.value;
  if (index === "") return alert("Select a task to remove.");

  const removed = tasks.splice(index, 1);
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
  updateRemoveDropdown();
  speak(`Removed ${removed[0].name}`);
}

// Toggle Add/Remove
function toggleTaskMode() {
  const mode = document.getElementById("taskAction").value;
  document.getElementById("taskForm").style.display = mode === "add" ? "block" : "none";
  document.getElementById("removeForm").style.display = mode === "remove" ? "block" : "none";
  updateRemoveDropdown();
}

// Update dropdown for deletion
function updateRemoveDropdown() {
  const select = document.getElementById("removeSelect");
  select.innerHTML = "";
  tasks.forEach((t, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${i + 1}. ${t.name}`;
    select.appendChild(opt);
  });
}

// Render Task Table
function renderTasks() {
  const tbody = document.querySelector("#taskTable tbody");
  tbody.innerHTML = "";
  tasks.forEach((t, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${t.name}</td>
      <td>${formatTime12h(t.start)}</td>
      <td>${formatTime12h(t.end)}</td>
      <td class="${t.status === "In Progress"
        ? "status-progress"
        : t.status === "Completed"
        ? "status-done"
        : "status-not"}">${t.status}</td>`;
    tbody.appendChild(row);
  });
}

// Update Clock Display
function updateClock() {
  const now = new Date();
  const hr = now.getHours() % 12;
  const min = now.getMinutes();
  const sec = now.getSeconds();
  document.getElementById("hour").style.transform = `translateX(-50%) rotate(${hr * 30 + min * 0.5}deg)`;
  document.getElementById("minute").style.transform = `translateX(-50%) rotate(${min * 6 + sec * 0.1}deg)`;
  document.getElementById("second").style.transform = `translateX(-50%) rotate(${sec * 6}deg)`;
}

// Real-time Task Tracker
function checkTasks() {
  const nowSec = currentSeconds();
  let active = false;

  tasks.forEach((t) => {
    const start = timeToSeconds(t.start);
    const end = timeToSeconds(t.end);

    if (nowSec >= start && nowSec < end) {
      if (t.status !== "In Progress") {
        t.status = "In Progress";
        beep(); speak(`Starting ${t.name}`); notify("Task Started", t.name);
      }
      const remaining = end - nowSec;
      const mins = Math.floor((remaining % 3600) / 60);
      const secs = remaining % 60;
      document.getElementById("remainingTime").textContent = `⏳ ${t.name} — ${mins}m ${secs}s left`;

      if (remaining === 300 && !fiveMinAlerted) {
        beep(); speak("Five minutes remaining");
        fiveMinAlerted = true;
      }

      active = true;
    } else if (nowSec >= end && t.status === "In Progress") {
      t.status = "Completed";
      beep(); speak(`${t.name} completed`);
      notify("Task Completed", t.name);
      fiveMinAlerted = false;
    }
  });

  if (!active) document.getElementById("remainingTime").textContent = "Waiting for next task...";
  localStorage.setItem("tasks", JSON.stringify(tasks));
  renderTasks();
}

setInterval(updateClock, 1000);
setInterval(checkTasks, 1000);

window.onload = () => {
  renderTasks();
  updateRemoveDropdown();
};
