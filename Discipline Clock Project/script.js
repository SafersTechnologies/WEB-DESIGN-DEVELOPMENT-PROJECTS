let running = false;
let timer;
let startSeconds = 0;
let endSeconds = 0;
let currentSeconds = 0;
let remainingSeconds = 0;
let fiveMinAlerted = false;

// Simple beep sound
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
  osc.stop(ctx.currentTime + 1);
}

// Speak message repeatedly
function speakRepeated(text, repeat = 3) {
  if (!("speechSynthesis" in window)) return;
  let count = 0;

  function say() {
    if (count < repeat) {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 1;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
      count++;
      setTimeout(say, 2000);
    }
  }
  say();
}

function setAndStart() {
  const startInput = document.getElementById('startTime').value;
  const endInput = document.getElementById('endTime').value;

  const [sh, sm, ss] = startInput.split(':').map(Number);
  const [eh, em, es] = endInput.split(':').map(Number);

  startSeconds = sh * 3600 + sm * 60 + ss;
  endSeconds = eh * 3600 + em * 60 + es;
  currentSeconds = startSeconds;
  fiveMinAlerted = false;

  if (endSeconds <= startSeconds) {
    alert("End time must be greater than start time!");
    return;
  }

  remainingSeconds = endSeconds - startSeconds;
  updateRemainingDisplay();

  if (running) stopClock();
  running = true;
  timer = setInterval(updateClock, 1000);
}

function updateClock() {
  if (!running) return;

  const hours = Math.floor(currentSeconds / 3600) % 12;
  const minutes = Math.floor(currentSeconds / 60) % 60;
  const seconds = currentSeconds % 60;

  const hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const secondDeg = seconds * 6;

  document.getElementById('hour').style.transform = `translateX(-50%) rotate(${hourDeg}deg)`;
  document.getElementById('minute').style.transform = `translateX(-50%) rotate(${minuteDeg}deg)`;
  document.getElementById('second').style.transform = `translateX(-50%) rotate(${secondDeg}deg)`;

  if (currentSeconds < endSeconds) {
    currentSeconds++;
    remainingSeconds = endSeconds - currentSeconds;
    updateRemainingDisplay();

    if (remainingSeconds === 300 && !fiveMinAlerted) {
      fiveMinAlerted = true;
      beep();
      alert("⚠️ Only 5 minutes remaining!");
      speakRepeated("Attention! Only five minutes remaining!", 3);
    }
  } else {
    stopClock();
    remainingSeconds = 0;
    updateRemainingDisplay();
    beep();
    speakRepeated("Time is up! Well done!", 3);
    alert("⏰ End time reached!");
  }
}

function updateRemainingDisplay() {
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;
  const timeDisplay = document.getElementById('remainingTime');

  timeDisplay.textContent = `Remaining: ${hrs}h ${mins}m ${secs}s`;
  if (remainingSeconds <= 300) {
    timeDisplay.classList.add('low');
  } else {
    timeDisplay.classList.remove('low');
  }
}

function stopClock() {
  running = false;
  clearInterval(timer);
}

function resetClock() {
  stopClock();
  currentSeconds = startSeconds;
  remainingSeconds = endSeconds - startSeconds;
  fiveMinAlerted = false;
  updateClock();
  updateRemainingDisplay();
}
