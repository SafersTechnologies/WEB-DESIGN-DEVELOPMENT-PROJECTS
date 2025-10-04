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

// 🧠 Add Task (timezone-safe + smart 15-min suggestion)
function addTask() {
  const name = document.getElementById("taskName").value.trim();
  const start = document.getElementById("startTime").value;
  const end = document.getElementById("endTime").value;

  if (!name || !start || !end) {
    alert("Please fill all fields.");
    return;
  }

  // --- Timezone-safe Date setup ---
  const now = new Date();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);

  const startTime = new Date();
  startTime.setHours(sh, sm, 0, 0);

  const endTime = new Date();
  endTime.setHours(eh, em, 0, 0);

  // --- 1️⃣ Start time check (past or current) ---
  if (startTime <= now) {
    const suggested = new Date(now.getTime() + 15 * 60000); // +15 mins
    const suggestedH = suggested.getHours();
    const suggestedM = suggested.getMinutes();
    const ampm = suggestedH >= 12 ? "PM" : "AM";
    const hour12 = suggestedH % 12 || 12;
    const displaySuggestion = `${hour12}:${String(suggestedM).padStart(2, "0")} ${ampm}`;

    const confirmUse = confirm(
      `⏰ The start time you entered has already passed or is current.\n\nWould you like to set it to the next available slot: ${displaySuggestion}?`
    );

    if (!confirmUse) {
      alert("Please pick a future time to proceed.");
      return;
    }

    // Apply suggestion and maintain duration
    const duration = endTime - startTime;
    startTime.setTime(suggested.getTime());
    endTime.setTime(suggested.getTime() + duration);
  }

  // --- 2️⃣ End time must be after start ---
  if (endTime <= startTime) {
    alert("❌ End time must be after start time.");
    return;
  }

  // --- 3️⃣ Save Task ---
  const newTask = {
    name,
    start: startTime.toTimeString().slice(0, 5),
    end: endTime.toTimeString().slice(0, 5),
    status: "Not Started",
  };

  tasks.push(newTask);
  localStorage.setItem("tasks", JSON.stringify(tasks));

  renderTasks();
  updateRemoveDropdown();
  speak(`Task ${name} added`);
  alert(`✅ Task "${name}" added successfully!`);
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

function printReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");

  const now = new Date();
  const formattedDate = now.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true
  });

  // 🧭 Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(25, 118, 210);
  doc.text("Discipline Clock – Daily Task Report", 105, 18, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Generated on: ${formattedDate}`, 105, 26, { align: "center" });

  // 🧾 Table Data
  const body = tasks.map((t, i) => [
    i + 1,
    t.name,
    formatTime12h(t.start),
    formatTime12h(t.end),
    t.status
  ]);

  // 🎨 AutoTable (styled like your UI)
  doc.autoTable({
    startY: 35,
    head: [["#", "Task", "Start", "End", "Status"]],
    body,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 11,
      cellPadding: 4,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: [25, 118, 210], // deep blue
      textColor: [255, 255, 255],
      lineWidth: 0,
      halign: "center",
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: [33, 33, 33],
    },
    alternateRowStyles: {
      fillColor: [232, 240, 254], // light blue alternate
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        // Color-code Status
        if (data.cell.raw === "Completed") data.cell.styles.textColor = [27, 94, 32]; // green
        if (data.cell.raw === "In Progress") data.cell.styles.textColor = [25, 118, 210]; // blue
        if (data.cell.raw === "Not Started") data.cell.styles.textColor = [198, 40, 40]; // red
      }
    },
    margin: { top: 35, bottom: 15 },
  });

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Generated by Discipline Clock © " + now.getFullYear(), 105, pageHeight - 10, { align: "center" });

  // Save file
  const dateStamp = now
    .toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
    .replace(/[,:\s]/g, "_");
  doc.save(`Discipline_Clock_Report_${dateStamp}.pdf`);
}


// Continuous Updates
setInterval(updateClock, 1000);
setInterval(checkTasks, 1000);

window.onload = () => {
  renderTasks();
  updateRemoveDropdown();
};
