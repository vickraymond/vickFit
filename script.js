// GRAB ALL ELEMENTS
const exerciseCards = document.querySelectorAll('.exercise-card');
const currentExercise = document.getElementById('currentExercise');
const exerciseDesc = document.getElementById('exerciseDesc');
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const restInput = document.getElementById('restInput');
const circuitBtn = document.getElementById('circuitBtn');
const circuitStatus = document.getElementById('circuitStatus');
const circuitStep = document.getElementById('circuitStep');
const circuitTotal = document.getElementById('circuitTotal');
const repsDisplay = document.getElementById('reps');
const plusBtn = document.getElementById('plusBtn');
const minusBtn = document.getElementById('minusBtn');
const logBtn = document.getElementById('logBtn');
const clearBtn = document.getElementById('clearBtn');
const installBtn = document.getElementById('installBtn');
const apkBtn = document.getElementById('apkBtn');
const muteBtn = document.getElementById('muteBtn');
const exerciseVideo = document.getElementById('exerciseVideo');
const videoOverlay = document.getElementById('videoOverlay');
const progressList = document.getElementById('progressList');
const totalWorkoutsDisplay = document.getElementById('totalWorkouts');
const totalRepsDisplay = document.getElementById('totalReps');
const streakDisplay = document.getElementById('streak');

const storageKey = 'fitvick_state';

// APP STATE
let seconds = 30;
let running = false;
let interval;
let reps = 0;
let totalReps = 0;
let totalWorkouts = 0;
let workoutLog = [];
let selectedTime = 30;
let selectedName = 'Push Ups';
let audioEnabled = true;
let ytPlayer = null;
let currentVideoId = '';

// Circuit mode state
let circuitRunning = false;
let circuitIndex = 0;
let circuitStage = 'exercise'; // 'exercise' | 'rest'
let circuitExercises = [];

/**
 * Persist user progress (log, totals) between sessions.
 */
function saveState() {
  const state = {
    workoutLog,
    totalReps,
    totalWorkouts,
    audioEnabled,
  };
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    const state = JSON.parse(raw);
    if (state?.workoutLog) workoutLog = state.workoutLog;
    if (typeof state?.totalReps === 'number') totalReps = state.totalReps;
    if (typeof state?.totalWorkouts === 'number') totalWorkouts = state.totalWorkouts;
    if (typeof state?.audioEnabled === 'boolean') audioEnabled = state.audioEnabled;

    // Ensure totals match the stored log to prevent drift
    totalReps = workoutLog.reduce((sum, entry) => sum + (entry.reps || 0), 0);
    totalWorkouts = workoutLog.length;
  } catch (err) {
    console.warn('Failed to load saved workout state', err);
  }
}


function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function getTodayKey() {
  return formatDate(new Date());
}

function calculateStreak(log) {
  const dates = new Set(log.map((item) => item.date));
  let streak = 0;
  const current = new Date();

  while (true) {
    const key = formatDate(current);
    if (!dates.has(key)) break;
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 440;
    gain.gain.value = 0.12;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 150);
  } catch (err) {
    // Ignore audio errors in unsupported browsers
  }
}

function speak(text) {
  if (!audioEnabled || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1.05;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

function stopSpeech() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

function initYouTubePlayer() {
  if (ytPlayer || !window.YT || !window.YT.Player) return;

  ytPlayer = new YT.Player('exerciseVideo', {
    playerVars: {
      rel: 0,
      modestbranding: 1,
      controls: 1,
      autoplay: 0,
      mute: 1,
      origin: window.location.origin
    },
    events: {
      onReady: (event) => {
        // Start muted by default (prevents autoplay blocking)
        if (audioEnabled) {
          event.target.unMute();
        } else {
          event.target.mute();
        }
        if (currentVideoId) {
          event.target.loadVideoById(currentVideoId);
        }
      }
    }
  });
}

function updateAudioButton() {
  if (!muteBtn) return;
  muteBtn.textContent = audioEnabled ? '🎧 Coach' : '🔇 Muted';
  muteBtn.title = audioEnabled ? 'Disable coach voice' : 'Enable coach voice';
}

function updateStatsDisplay() {
  totalRepsDisplay.textContent = totalReps;
  totalWorkoutsDisplay.textContent = totalWorkouts;
  streakDisplay.textContent = calculateStreak(workoutLog) + '🔥';
}

function updateVideo(videoId) {
  if (!exerciseVideo) return;
  if (!videoId) return;

  currentVideoId = videoId;

  // Initialize the YouTube iframe player if the API is loaded.
  initYouTubePlayer();

  if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
    ytPlayer.loadVideoById(videoId);
    if (audioEnabled) {
      ytPlayer.unMute();
    } else {
      ytPlayer.mute();
    }
  } else {
    // Fallback: direct iframe URL (plays when user taps).
    const url = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0&mute=1&controls=1&enablejsapi=1`;
    exerciseVideo.src = url;
  }

  // If autoplay is blocked, allow user to tap to start.
  if (videoOverlay) videoOverlay.hidden = false;
}

function playVideo() {
  if (!videoOverlay) return;
  videoOverlay.hidden = true;
  if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
    ytPlayer.playVideo();
  } else {
    // Reload current src to attempt playback in browsers without JS API.
    exerciseVideo.src = exerciseVideo.src;
  }
}

function updateCircuitDisplay() {
  if (!circuitRunning) {
    circuitStatus.hidden = true;
    return;
  }

  circuitStatus.hidden = false;
  circuitStep.textContent = String(circuitIndex + 1).padStart(1, '0');
  circuitTotal.textContent = String(circuitExercises.length).padStart(1, '0');
}

function buildCircuitExercises() {
  circuitExercises = Array.from(exerciseCards).map((card) => ({
    name: card.dataset.name,
    time: parseInt(card.dataset.time, 10),
    desc: card.dataset.desc,
    videoId: card.dataset.videoId,
  }));
}

function stopCircuit() {
  circuitRunning = false;
  circuitIndex = 0;
  circuitStage = 'exercise';
  running = false;
  clearInterval(interval);
  circuitBtn.textContent = '⧗ Circuit';
  startBtn.disabled = false;
  resetBtn.disabled = false;
  updateCircuitDisplay();

  // Reset timer display to currently selected exercise
  seconds = selectedTime;
  timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
  timerDisplay.classList.remove('running');
}

function startCircuit() {
  if (running) {
    running = false;
    clearInterval(interval);
    startBtn.textContent = '▶ Start';
  }

  buildCircuitExercises();
  if (!circuitExercises.length) return;

  const activeCard = document.querySelector('.exercise-card.active');
  circuitIndex = activeCard ? Array.from(exerciseCards).indexOf(activeCard) : 0;
  circuitStage = 'exercise';
  circuitRunning = true;
  circuitBtn.textContent = '⛔ Stop';
  startBtn.disabled = true;
  resetBtn.disabled = true;
  updateCircuitDisplay();
  runCircuitStep();
}

function runCircuitStep() {
  if (!circuitRunning) return;

  if (circuitStage === 'rest') {
    const restSeconds = Math.max(5, Number(restInput.value) || 15);
    seconds = restSeconds;
    timerDisplay.textContent = 'REST ' + String(seconds).padStart(2, '0');
    timerDisplay.classList.add('running');
    speak(`Rest for ${seconds} seconds.`);

    interval = setInterval(() => {
      if (seconds > 0) {
        seconds--;
        timerDisplay.textContent = 'REST ' + String(seconds).padStart(2, '0');
      } else {
        clearInterval(interval);
        playBeep();
        if (navigator.vibrate) navigator.vibrate(150);
        circuitStage = 'exercise';
        circuitIndex += 1;
        if (circuitIndex >= circuitExercises.length) {
          stopCircuit();
        } else {
          updateCircuitDisplay();
          runCircuitStep();
        }
      }
    }, 1000);

    return;
  }

  const current = circuitExercises[circuitIndex];
  if (!current) {
    stopCircuit();
    return;
  }

  // Highlight current exercise card
  exerciseCards.forEach((card, idx) => {
    card.classList.toggle('active', idx === circuitIndex);
  });

  currentExercise.textContent = current.name;
  exerciseDesc.textContent = current.desc;
  updateVideo(current.videoId);
  seconds = current.time;
  timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
  timerDisplay.classList.add('running');
  speak(`Next: ${current.name} for ${seconds} seconds`);

  interval = setInterval(() => {
    if (seconds > 0) {
      seconds--;
      timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
    } else {
      clearInterval(interval);
      playBeep();
      if (navigator.vibrate) navigator.vibrate(150);
      circuitStage = 'rest';
      runCircuitStep();
    }
  }, 1000);
}

// EXERCISE CARDS - click to select
exerciseCards.forEach(function(card) {
  card.addEventListener('click', function() {

    // remove active from all cards
    exerciseCards.forEach(function(c) {
      c.classList.remove('active');
    });

    // add active to clicked card
    card.classList.add('active');

    // read data from clicked card
    selectedName = card.dataset.name;
    selectedTime = parseInt(card.dataset.time);
    const desc = card.dataset.desc;
    const videoId = card.dataset.videoId;

    // update the panel
    currentExercise.textContent = selectedName;
    exerciseDesc.textContent = desc;
    updateVideo(videoId);

    // reset timer for new exercise
    clearInterval(interval);
    running = false;
    seconds = selectedTime;
    timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
    timerDisplay.classList.remove('running');
    startBtn.textContent = '▶ Start';

    // reset reps
    reps = 0;
    repsDisplay.textContent = '0';

    speak(`Now training ${selectedName}.`);
  });
});

// TIMER - start and pause
startBtn.addEventListener('click', function() {
  if (circuitRunning) return; // disable manual start during circuit

  if (!running) {
    running = true;
    startBtn.textContent = '⏸ Pause';
    timerDisplay.classList.add('running');
    speak(`Starting ${selectedName} for ${seconds} seconds.`);

    interval = setInterval(function() {
      if (seconds > 0) {
        seconds--;
        timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
      } else {
        clearInterval(interval);
        running = false;
        startBtn.textContent = '▶ Start';
        timerDisplay.textContent = 'DONE! 🔥';
        timerDisplay.classList.remove('running');
        playBeep();
        if (navigator.vibrate) navigator.vibrate(200);
        speak('Time is up! Great job.');
      }
    }, 1000);

  } else {
    running = false;
    clearInterval(interval);
    startBtn.textContent = '▶ Start';
    timerDisplay.classList.remove('running');
  }
});

// CIRCUIT MODE
circuitBtn.addEventListener('click', function() {
  if (circuitRunning) {
    stopCircuit();
  } else {
    startCircuit();
  }
});

// RESET TIMER
resetBtn.addEventListener('click', function() {
  if (circuitRunning) {
    stopCircuit();
  }

  clearInterval(interval);
  running = false;
  seconds = selectedTime;
  timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');
  timerDisplay.classList.remove('running');
  startBtn.textContent = '▶ Start';
});

// REP COUNTER - plus
plusBtn.addEventListener('click', function() {
  reps++;
  repsDisplay.textContent = reps;
});

// REP COUNTER - minus
minusBtn.addEventListener('click', function() {
  if (reps > 0) {
    reps--;
    repsDisplay.textContent = reps;
  }
});

// LOG WORKOUT
logBtn.addEventListener('click', function() {
  if (reps === 0) {
    alert('Do some reps first! 💪');
    return;
  }

  // save to log
  workoutLog.push({
    date: getTodayKey(),
    name: selectedName,
    reps: reps
  });

  // update totals
  totalReps += reps;
  totalWorkouts++;
  updateStatsDisplay();
  saveState();

  // update progress section
  updateProgress();

  // reset reps
  reps = 0;
  repsDisplay.textContent = '0';

  logBtn.textContent = '✅ Logged!';
  setTimeout(function() {
    logBtn.textContent = '✅ Log Workout';
  }, 2000);
});

// CLEAR WORKOUT HISTORY
clearBtn.addEventListener('click', function() {
  if (!workoutLog.length && totalWorkouts === 0 && totalReps === 0) {
    alert('Nothing to clear yet. Log a workout first.');
    return;
  }

  if (!confirm('Clear all logged workouts? This cannot be undone.')) return;

  workoutLog = [];
  totalReps = 0;
  totalWorkouts = 0;
  updateStatsDisplay();
  updateProgress();
  saveState();
});

// UPDATE PROGRESS LIST
function updateProgress() {
  progressList.innerHTML = '';

  if (!workoutLog.length) {
    progressList.innerHTML = '<p class="progress-empty">No workouts logged yet. Start with a set!</p>';
    return;
  }

  const groupedByDay = workoutLog.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || [];
    acc[entry.date].push(entry);
    return acc;
  }, {});

  const days = Object.keys(groupedByDay).sort((a, b) => b.localeCompare(a));

  days.forEach((day) => {
    const entries = groupedByDay[day];
    const dayTotal = entries.reduce((sum, e) => sum + e.reps, 0);

    const dayBlock = document.createElement('div');
    dayBlock.className = 'progress-day';

    const dateHeader = document.createElement('div');
    dateHeader.className = 'progress-day-header';
    dateHeader.textContent = new Date(day).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });

    const daySummary = document.createElement('div');
    daySummary.className = 'progress-day-summary';
    daySummary.textContent = `${entries.length} exercise${entries.length === 1 ? '' : 's'} • ${dayTotal} reps`;

    dayBlock.appendChild(dateHeader);
    dayBlock.appendChild(daySummary);

    entries.forEach(function(entry) {
      const item = document.createElement('div');
      item.className = 'progress-item';
      item.innerHTML = `
        <div class="progress-label">
          <span>${entry.name}</span>
          <span>${entry.reps} reps</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.min(entry.reps * 3, 100)}%"></div>
        </div>
      `;
      dayBlock.appendChild(item);
    });

    progressList.appendChild(dayBlock);
  });
}

// Initialize app state from storage
loadState();
updateStatsDisplay();
updateProgress();
updateAudioButton();

// Ensure timer shows correct initial value
timerDisplay.textContent = '00:' + String(seconds).padStart(2, '0');

// Set initial video based on selected exercise
const activeCard = document.querySelector('.exercise-card.active');
if (activeCard) {
  updateVideo(activeCard.dataset.videoId);
}

// Allow user to tap overlay (or video area) to force start video playback
const videoWrap = document.querySelector('.video-wrap');
if (videoWrap) {
  videoWrap.addEventListener('click', playVideo);
}

// MUTE / COACH VOICE
if (muteBtn) {
  muteBtn.addEventListener('click', function () {
    const nextAudioEnabled = !audioEnabled;
    if (!nextAudioEnabled) {
      stopSpeech();
    }
    audioEnabled = nextAudioEnabled;
    updateAudioButton();

    if (audioEnabled) {
      speak('Coach voice enabled');
    } else {
      playBeep();
    }

    saveState();
  });
}

// Hide overlay once iframe has loaded (helps with browsers that allow autoplay)
if (exerciseVideo) {
  exerciseVideo.addEventListener('load', () => {
    if (videoOverlay) videoOverlay.hidden = true;
  });
}

// PWA install prompt handler
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) {
    installBtn.hidden = false;
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    installBtn.disabled = true;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome !== 'accepted') {
      installBtn.disabled = false;
    } else {
      installBtn.hidden = true;
    }
    deferredPrompt = null;
  });
}

if (apkBtn) {
  apkBtn.addEventListener('click', () => {
    const url = window.location.origin + window.location.pathname;
    window.open(`https://www.pwabuilder.com/?url=${encodeURIComponent(url)}`, '_blank');
  });
}
