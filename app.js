// ==========================================
// TIMES TABLE TOWN — INTERACTIVE LOGIC
// ==========================================

const TABLE_TRICKS = {
  1: "🔮 **The Mirror Rule (×1):** Any number times 1 stays its exact same self! (1 × 8 = 8)",
  2: "👯 **Double Trouble (×2):** Multiplying by 2 is just doubling the number! (2 × 6 is 6 + 6 = 12)",
  3: "🎵 **Rule of Threes (×3):** Double the number, then add one more group! Plus, the digits of any ×3 answer always add up to 3, 6, or 9!",
  4: "🐸 **Double-Double (×4):** Double the number once, then double it again! For 4 × 7: double 7 is 14, and double 14 is 28!",
  5: "🖐️ **High-Five Nickels (×5):** Every ×5 answer ends in **5** or **0**! Half of ×10!",
  6: "🐝 **Even Sixes Magic (×6):** When you multiply 6 by an even number (2, 4, 6, 8), the answer ends in that SAME digit! (6×2=1**2**, 6×4=2**4**, 6×6=3**6**, 6×8=4**8**)",
  7: "🌈 **Lucky Seven Split (×7):** Break 7 into 5 + 2! Multiply by 5, then add double the number! (7×6 = 5×6 + 2×6 = 30 + 12 = 42)",
  8: "🐙 **Octopus Triple-Double (×8):** Double it three times! Or记住: **5, 6, 7, 8 → 56 = 7 × 8**!",
  9: "🥷 **Nine Ninja Trick (×9):** The tens digit goes UP (0, 1, 2, 3...) while the ones digit goes DOWN (9, 8, 7, 6...)—and both digits ALWAYS add up to 9! (e.g., 9×4 = 36, and 3+6=9!)",
  10: "🚀 **Zero Hero (×10):** Just place a **0** at the end of the number! (10 × 7 = 70)",
  11: "🥢 **Twin Towers (×11):** From 1 to 9, ×11 just repeats the digit twice! (11 × 6 = 66)",
  12: "📦 **Dozen Builder (×12):** Multiply by 10, then add double the number! (12×4 = 40 + 8 = 48)"
};

const BADGE_DEFINITIONS = [
  { id: "first_star", icon: "🌟", name: "First Star!", desc: "Answer your first question right", check: (s) => s.stars >= 1 },
  { id: "streak_5", icon: "🔥", name: "High Five Streak", desc: "Get 5 right in a row", check: (s) => s.bestStreak >= 5 },
  { id: "streak_10", icon: "⚡", name: "10-Streak Wizard", desc: "Get 10 right in a row", check: (s) => s.bestStreak >= 10 },
  { id: "stars_25", icon: "🏅", name: "Star Collector", desc: "Earn 25 total stars", check: (s) => s.stars >= 25 },
  { id: "stars_50", icon: "👑", name: "Math Royalty", desc: "Earn 50 total stars", check: (s) => s.stars >= 50 },
  { id: "bubble_champ", icon: "🫧", name: "Bubble Popper", desc: "Win a round of Bubble Factor Pop", check: (s) => s.bubblesWon >= 1 },
  { id: "detective_pro", icon: "🕵️‍♀️", name: "Super Sleuth", desc: "Solve 5 Mystery Detective cases", check: (s) => s.detectiveSolved >= 5 },
  { id: "master_10", icon: "🎓", name: "Fact Master", desc: "Master 10 facts on the Mastery Map", check: (s) => countMasteredFacts(s) >= 10 }
];

// ==========================================
// STATE & LOCAL STORAGE
// ==========================================
const state = {
  soundEnabled: true,
  // Mode 1: Explore Grid
  gridSize: 10,
  activePattern: "none",
  selectedA: 4,
  selectedB: 6,
  vizMode: "array", // 'array' | 'groups' | 'numberline'

  // Mode 2: Cards
  cardTableNum: 4,
  hideAllCardAnswers: false,

  // Mode 3: Practice Quiz
  selectedTables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  quizStyle: "choices", // 'choices' | 'keypad'
  currentQ: { a: 4, b: 6, ans: 24 },
  typedAnswer: "",
  sessionCorrect: 0,
  sessionTotal: 0,
  quizLocked: false,

  // Mode 4: Games
  bubbleTarget: 24,
  bubbleTotalMatches: 0,
  bubbleFoundMatches: 0,
  detectiveQ: { a: 7, b: 6, product: 42, missing: "a", answer: 7 },

  // Persisted Student Progress
  progress: {
    stars: 0,
    streak: 0,
    bestStreak: 0,
    bubblesWon: 0,
    detectiveSolved: 0,
    factCounts: {} // key "a x b" -> correct count
  }
};

function loadProgress() {
  try {
    const saved = localStorage.getItem("timesTableTownProgress_v1");
    if (saved) {
      const parsed = JSON.parse(saved);
      state.progress = { ...state.progress, ...parsed };
    }
  } catch (err) {
    console.warn("Could not load saved progress:", err);
  }
}

function saveProgress() {
  try {
    localStorage.setItem("timesTableTownProgress_v1", JSON.stringify(state.progress));
  } catch (err) {
    console.warn("Could not save progress:", err);
  }
}

function countMasteredFacts(prog = state.progress) {
  let count = 0;
  for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      if ((prog.factCounts[`${a}x${b}`] || 0) >= 3) {
        count++;
      }
    }
  }
  return count;
}

// ==========================================
// WEB AUDIO SYNTHESIZER & SPEECH
// ==========================================
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const now = ctx.currentTime;
  if (type === "click" || type === "pop") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(type === "pop" ? 520 : 380, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  } else if (type === "correct") {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + i * 0.07);
      gain.gain.setValueAtTime(0.16, now + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.23);
    });
  } else if (type === "wrong") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(150, now + 0.22);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.pitch = 1.1;
  window.speechSynthesis.speak(utter);
}

// ==========================================
// HEADER & STATS UPDATER
// ==========================================
function updateHeaderStats() {
  document.getElementById("totalStarsDisplay").textContent = state.progress.stars;
  document.getElementById("currentStreakDisplay").textContent = state.progress.streak;
  document.getElementById("masteredCountDisplay").textContent = `${countMasteredFacts()}/100`;
}

function awardStarAndRecordFact(a, b) {
  state.progress.stars += 1;
  state.progress.streak += 1;
  if (state.progress.streak > state.progress.bestStreak) {
    state.progress.bestStreak = state.progress.streak;
  }
  const key1 = `${a}x${b}`;
  const key2 = `${b}x${a}`;
  state.progress.factCounts[key1] = (state.progress.factCounts[key1] || 0) + 1;
  if (key1 !== key2) {
    state.progress.factCounts[key2] = (state.progress.factCounts[key2] || 0) + 1;
  }
  saveProgress();
  updateHeaderStats();
  if (state.progress.streak % 5 === 0) {
    launchConfetti();
  }
}

// ==========================================
// MODE 1: EXPLORE INTERACTIVE GRID & VISUALIZER
// ==========================================
function renderMultiplicationGrid() {
  const container = document.getElementById("multiplicationGrid");
  const N = state.gridSize;
  container.style.gridTemplateColumns = `repeat(${N + 1}, minmax(36px, 1fr))`;
  container.innerHTML = "";

  // Top-left corner cell
  const corner = document.createElement("div");
  corner.className = "grid-cell corner-cell";
  corner.textContent = "×";
  container.appendChild(corner);

  // Column headers (1..N)
  for (let col = 1; col <= N; col++) {
    const hCol = document.createElement("div");
    hCol.className = "grid-cell header-col";
    hCol.dataset.colHeader = col;
    hCol.textContent = col;
    container.appendChild(hCol);
  }

  // Rows
  for (let row = 1; row <= N; row++) {
    // Row header
    const hRow = document.createElement("div");
    hRow.className = "grid-cell header-row";
    hRow.dataset.rowHeader = row;
    hRow.textContent = row;
    container.appendChild(hRow);

    // Data cells
    for (let col = 1; col <= N; col++) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "grid-cell data-cell";
      cell.dataset.row = row;
      cell.dataset.col = col;
      const product = row * col;
      cell.textContent = product;
      cell.setAttribute("aria-label", `${row} times ${col} equals ${product}`);

      if (matchesPattern(row, col, product, state.activePattern)) {
        cell.classList.add("pattern-match");
      }

      cell.addEventListener("mouseenter", () => highlightAreaOnGrid(row, col, false));
      cell.addEventListener("mouseleave", () => highlightAreaOnGrid(state.selectedA, state.selectedB, true));
      cell.addEventListener("click", () => {
        playSound("pop");
        state.selectedA = row;
        state.selectedB = col;
        highlightAreaOnGrid(row, col, true);
        renderVisualizer();
      });

      container.appendChild(cell);
    }
  }

  highlightAreaOnGrid(state.selectedA, state.selectedB, true);
}

function matchesPattern(r, c, prod, pattern) {
  if (pattern === "squares") return r === c;
  if (pattern === "even") return prod % 2 === 0;
  if (pattern === "odd") return prod % 2 !== 0;
  if (pattern === "fives") return prod % 5 === 0;
  if (pattern === "nines") return prod % 9 === 0;
  return false;
}

function highlightAreaOnGrid(targetRow, targetCol, isSelected) {
  const container = document.getElementById("multiplicationGrid");
  const cells = container.querySelectorAll(".grid-cell");

  cells.forEach((cell) => {
    cell.classList.remove("in-area", "selected-cell", "active-header");
    const rHeader = Number(cell.dataset.rowHeader);
    const cHeader = Number(cell.dataset.colHeader);
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);

    if (rHeader && rHeader === targetRow) {
      cell.classList.add("active-header");
    }
    if (cHeader && cHeader === targetCol) {
      cell.classList.add("active-header");
    }
    if (r && c) {
      if (r <= targetRow && c <= targetCol) {
        cell.classList.add("in-area");
      }
      if (r === targetRow && c === targetCol) {
        cell.classList.add("selected-cell");
      }
    }
  });
}

function renderVisualizer() {
  const a = state.selectedA;
  const b = state.selectedB;
  const product = a * b;

  document.getElementById("vizFactorA").textContent = a;
  document.getElementById("vizFactorB").textContent = b;
  document.getElementById("vizProduct").textContent = product;
  document.getElementById("flipBtnText").textContent = `${b} × ${a}`;
  document.getElementById("vizWordMeaning").innerHTML =
    `<strong>${a} ${a === 1 ? "group" : "groups"} of ${b}</strong> makes <strong>${product}</strong>!`;

  // Repeated addition string
  const parts = Array.from({ length: a }, () => b);
  document.getElementById("vizRepeatedAddition").textContent =
    `${parts.join(" + ")} = ${product}`;

  // Smart Tip for Factor A
  const rawTip = TABLE_TRICKS[a] || TABLE_TRICKS[b] || "";
  document.getElementById("vizSmartTip").innerHTML = rawTip.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Render active visual stage
  const stage = document.getElementById("vizStage");
  stage.innerHTML = "";

  if (state.vizMode === "array") {
    const arrayWrap = document.createElement("div");
    arrayWrap.className = "dot-array-container";
    let counter = 1;
    for (let r = 1; r <= a; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "dot-row";

      const label = document.createElement("span");
      label.className = "row-label-badge";
      label.textContent = `Row ${r}`;
      rowEl.appendChild(label);

      for (let c = 1; c <= b; c++) {
        const dot = document.createElement("span");
        dot.className = "array-dot";
        dot.style.animationDelay = `${(counter - 1) * 0.008}s`;
        dot.textContent = counter;
        rowEl.appendChild(dot);
        counter++;
      }
      arrayWrap.appendChild(rowEl);
    }
    stage.appendChild(arrayWrap);
  } else if (state.vizMode === "groups") {
    const groupsWrap = document.createElement("div");
    groupsWrap.className = "groups-grid";
    for (let g = 1; g <= a; g++) {
      const basket = document.createElement("div");
      basket.className = "group-basket";
      const title = document.createElement("div");
      title.className = "basket-title";
      title.textContent = `Group ${g} (+${b})`;
      const items = document.createElement("div");
      items.className = "basket-items";
      for (let i = 1; i <= b; i++) {
        const star = document.createElement("span");
        star.className = "basket-star";
        star.textContent = "⭐";
        items.appendChild(star);
      }
      basket.appendChild(title);
      basket.appendChild(items);
      groupsWrap.appendChild(basket);
    }
    stage.appendChild(groupsWrap);
  } else if (state.vizMode === "numberline") {
    const jumpsWrap = document.createElement("div");
    jumpsWrap.className = "skip-jumps-container";

    // Start at 0
    const zeroStep = document.createElement("div");
    zeroStep.className = "jump-step";
    zeroStep.innerHTML = `<span class="jump-label">Start</span><span class="jump-value">0</span>`;
    jumpsWrap.appendChild(zeroStep);

    for (let step = 1; step <= a; step++) {
      const arrow = document.createElement("span");
      arrow.textContent = `➕${b} ➡️`;
      arrow.style.fontWeight = "800";
      arrow.style.fontSize = "0.82rem";
      arrow.style.color = "#4f46e5";
      jumpsWrap.appendChild(arrow);

      const box = document.createElement("div");
      box.className = `jump-step ${step === a ? "last-step" : ""}`;
      box.innerHTML = `<span class="jump-label">Jump ${step}</span><span class="jump-value">${step * b}</span>`;
      jumpsWrap.appendChild(box);
    }
    stage.appendChild(jumpsWrap);
  }
}

// ==========================================
// MODE 2: TABLE CARDS & SECRET TRICKS
// ==========================================
function renderTableCardsMode() {
  const selectorBar = document.getElementById("cardTableSelector");
  selectorBar.innerHTML = "";
  for (let n = 1; n <= 12; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `num-pick-btn ${state.cardTableNum === n ? "active" : ""}`;
    btn.textContent = `×${n}`;
    btn.addEventListener("click", () => {
      playSound("click");
      state.cardTableNum = n;
      renderTableCardsMode();
    });
    selectorBar.appendChild(btn);
  }

  const trickBanner = document.getElementById("cardSecretTrickBanner");
  const trickHtml = (TABLE_TRICKS[state.cardTableNum] || "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  trickBanner.innerHTML = `<div style="font-size:2rem;">🧙‍♂️</div><div>${trickHtml}</div>`;

  const cardsGrid = document.getElementById("tableCardsContainer");
  cardsGrid.innerHTML = "";
  for (let i = 1; i <= 12; i++) {
    const prod = state.cardTableNum * i;
    const card = document.createElement("div");
    card.className = `fact-flip-card ${state.hideAllCardAnswers ? "hidden-answer" : ""}`;
    card.innerHTML = `
      <span class="fact-eq">${state.cardTableNum} × ${i} =</span>
      <span class="fact-ans" data-real="${prod}">${state.hideAllCardAnswers ? "?" : prod}</span>
    `;
    card.addEventListener("click", () => {
      playSound("pop");
      const ansEl = card.querySelector(".fact-ans");
      const isHidden = card.classList.toggle("hidden-answer");
      ansEl.textContent = isHidden ? "?" : prod;
      if (!isHidden) {
        speakText(`${state.cardTableNum} times ${i} equals ${prod}`);
      }
    });
    cardsGrid.appendChild(card);
  }
}

// ==========================================
// MODE 3: PRACTICE QUIZ STUDIO
// ==========================================
function renderPracticeTableButtons() {
  const grid = document.getElementById("practiceTableSelector");
  grid.innerHTML = "";
  for (let n = 1; n <= 12; n++) {
    const isSelected = state.selectedTables.includes(n);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `table-toggle-btn ${isSelected ? "selected" : ""}`;
    btn.textContent = `×${n}`;
    btn.addEventListener("click", () => {
      playSound("click");
      if (state.selectedTables.includes(n)) {
        if (state.selectedTables.length > 1) {
          state.selectedTables = state.selectedTables.filter((item) => item !== n);
        }
      } else {
        state.selectedTables.push(n);
      }
      renderPracticeTableButtons();
      generateNextQuizQuestion();
    });
    grid.appendChild(btn);
  }
}

function generateNextQuizQuestion() {
  state.quizLocked = false;
  state.typedAnswer = "";
  const pool = state.selectedTables.length > 0 ? state.selectedTables : [2, 5, 10];
  const a = pool[Math.floor(Math.random() * pool.length)];
  const maxB = pool.some((n) => n > 10) ? 12 : 10;
  const b = Math.floor(Math.random() * maxB) + 1;
  const ans = a * b;

  state.currentQ = { a, b, ans };

  document.getElementById("quizTableBadge").textContent = `Practicing ×${a} Table`;
  document.getElementById("quizFactorA").textContent = a;
  document.getElementById("quizFactorB").textContent = b;
  document.getElementById("quizAnswerSlot").textContent = "?";
  document.getElementById("quizHintDrawer").classList.add("hidden");

  const feedback = document.getElementById("quizFeedback");
  feedback.className = "quiz-feedback";
  feedback.textContent = "Pick or type the answer below!";

  renderQuizChoices(a, b, ans);
}

function renderQuizChoices(a, b, correctAns) {
  const container = document.getElementById("quizChoicesContainer");
  container.innerHTML = "";

  const choicesSet = new Set([correctAns]);
  // Add smart plausible distractors
  const candidates = [
    a * (b + 1),
    a * Math.max(1, b - 1),
    (a + 1) * b,
    correctAns + a,
    correctAns - b,
    correctAns + 2,
    correctAns + 10
  ].filter((val) => val > 0 && val !== correctAns);

  for (const c of candidates) {
    if (choicesSet.size < 4) choicesSet.add(c);
  }
  while (choicesSet.size < 4) {
    choicesSet.add(Math.floor(Math.random() * 80) + 2);
  }

  const choices = Array.from(choicesSet).sort(() => Math.random() - 0.5);
  choices.forEach((choiceVal) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.textContent = choiceVal;
    btn.addEventListener("click", () => handleQuizSubmission(choiceVal, btn));
    container.appendChild(btn);
  });
}

function handleQuizSubmission(userValue, clickedBtn = null) {
  if (state.quizLocked) return;
  const numVal = Number(userValue);
  const { a, b, ans } = state.currentQ;
  const feedback = document.getElementById("quizFeedback");

  state.sessionTotal += 1;

  if (numVal === ans) {
    state.quizLocked = true;
    state.sessionCorrect += 1;
    playSound("correct");
    document.getElementById("quizAnswerSlot").textContent = ans;
    if (clickedBtn) clickedBtn.classList.add("correct-choice");

    const praises = [
      `🎉 Awesome! ${a} × ${b} = ${ans}! (+1 ⭐)`,
      `🚀 Boom! You nailed it: ${a} × ${b} = ${ans}! (+1 ⭐)`,
      `🦁 Super Math Star! ${a} groups of ${b} is ${ans}! (+1 ⭐)`
    ];
    feedback.className = "quiz-feedback correct";
    feedback.textContent = praises[Math.floor(Math.random() * praises.length)];

    awardStarAndRecordFact(a, b);
    updateSessionStatsUI();

    setTimeout(() => {
      generateNextQuizQuestion();
    }, 1150);
  } else {
    playSound("wrong");
    state.progress.streak = 0;
    saveProgress();
    updateHeaderStats();
    updateSessionStatsUI();

    if (clickedBtn) clickedBtn.classList.add("wrong-choice");
    feedback.className = "quiz-feedback wrong";
    feedback.textContent = `Not quite ${numVal}! Try again or click "Need a Visual Hint?" 💡`;
    state.typedAnswer = "";
    document.getElementById("quizAnswerSlot").textContent = "?";
  }
}

function updateSessionStatsUI() {
  document.getElementById("sessionCorrect").textContent = state.sessionCorrect;
  const acc = state.sessionTotal > 0
    ? Math.round((state.sessionCorrect / state.sessionTotal) * 100)
    : 100;
  document.getElementById("sessionAccuracy").textContent = `${acc}%`;
}

function showQuizVisualHint() {
  const { a, b, ans } = state.currentQ;
  const drawer = document.getElementById("quizHintDrawer");
  drawer.classList.remove("hidden");
  document.getElementById("quizHintText").textContent =
    `💡 Hint: ${a} rows of ${b} dots! Skip count by ${b}: ` +
    Array.from({ length: a }, (_, idx) => (idx + 1) * b).join(" → ");

  const visual = document.getElementById("quizHintVisual");
  visual.innerHTML = "";
  for (let r = 1; r <= a; r++) {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "4px";
    for (let c = 1; c <= b; c++) {
      const dot = document.createElement("span");
      dot.style.width = "16px";
      dot.style.height = "16px";
      dot.style.borderRadius = "4px";
      dot.style.background = "#4f46e5";
      row.appendChild(dot);
    }
    visual.appendChild(row);
  }
}

// ==========================================
// MODE 4: FACTOR & DETECTIVE GAMES
// ==========================================
const RICH_PRODUCTS = [12, 16, 18, 20, 24, 30, 36, 40, 48];

function startNewBubbleRound() {
  const target = RICH_PRODUCTS[Math.floor(Math.random() * RICH_PRODUCTS.length)];
  state.bubbleTarget = target;

  // Find all factor pairs (a, b) with 1 <= a, b <= 12
  const matchingPairs = [];
  const wrongPairs = [];
  for (let a = 2; a <= 12; a++) {
    for (let b = a; b <= 12; b++) {
      if (a * b === target) {
        matchingPairs.push(`${a} × ${b}`);
        if (a !== b && matchingPairs.length < 4) {
          matchingPairs.push(`${b} × ${a}`);
        }
      } else if (Math.abs(a * b - target) <= 8) {
        wrongPairs.push(`${a} × ${b}`);
      }
    }
  }

  const chosenMatches = matchingPairs.slice(0, 3);
  state.bubbleTotalMatches = chosenMatches.length;
  state.bubbleFoundMatches = 0;

  const chosenWrongs = wrongPairs.sort(() => Math.random() - 0.5).slice(0, 9 - chosenMatches.length);
  const allBubbles = [
    ...chosenMatches.map((expr) => ({ expr, isMatch: true })),
    ...chosenWrongs.map((expr) => ({ expr, isMatch: false }))
  ].sort(() => Math.random() - 0.5);

  document.getElementById("bubbleTargetNumber").textContent = target;
  document.getElementById("bubbleTargetInline").textContent = target;
  document.getElementById("bubbleFoundCount").textContent = `0 / ${state.bubbleTotalMatches}`;
  document.getElementById("bubbleFeedback").innerHTML =
    `Pop all <strong>${state.bubbleTotalMatches}</strong> bubbles that equal <strong>${target}</strong>!`;

  const arena = document.getElementById("bubbleArena");
  arena.innerHTML = "";

  allBubbles.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "factor-bubble";
    btn.textContent = item.expr;
    btn.addEventListener("click", () => {
      if (btn.classList.contains("popped-good")) return;
      if (item.isMatch) {
        playSound("correct");
        btn.classList.add("popped-good");
        btn.textContent = `✅ ${item.expr} = ${target}`;
        state.bubbleFoundMatches += 1;
        document.getElementById("bubbleFoundCount").textContent =
          `${state.bubbleFoundMatches} / ${state.bubbleTotalMatches}`;

        if (state.bubbleFoundMatches === state.bubbleTotalMatches) {
          state.progress.stars += 2;
          state.progress.bubblesWon += 1;
          saveProgress();
          updateHeaderStats();
          launchConfetti();
          document.getElementById("bubbleFeedback").innerHTML =
            `🎉 <strong>You found all factors of ${target}! (+2 ⭐)</strong> Click "New Target" for another round!`;
        }
      } else {
        playSound("wrong");
        btn.classList.add("popped-bad");
        const parts = item.expr.split("×").map((s) => Number(s.trim()));
        document.getElementById("bubbleFeedback").innerHTML =
          `Oops! ${item.expr} = ${parts[0] * parts[1]}, not ${target}. Keep looking!`;
        setTimeout(() => btn.classList.remove("popped-bad"), 500);
      }
    });
    arena.appendChild(btn);
  });
}

function generateDetectiveMystery() {
  const a = Math.floor(Math.random() * 9) + 2; // 2..10
  const b = Math.floor(Math.random() * 9) + 2;
  const product = a * b;
  const hideFirst = Math.random() < 0.5;
  const answer = hideFirst ? a : b;
  const known = hideFirst ? b : a;

  state.detectiveQ = { a, b, product, answer, known };

  const eqContainer = document.getElementById("detectiveEquation");
  eqContainer.innerHTML = hideFirst
    ? `<span class="mystery-box" id="detectiveMysterySlot">?</span> <span>×</span> <span>${b}</span> <span>=</span> <span>${product}</span>`
    : `<span>${a}</span> <span>×</span> <span class="mystery-box" id="detectiveMysterySlot">?</span> <span>=</span> <span>${product}</span>`;

  document.getElementById("detectiveClue").textContent =
    `🕵️ Clue: How many groups of ${known} does it take to reach ${product}?`;
  document.getElementById("detectiveFeedback").textContent = "";

  const optsSet = new Set([answer]);
  while (optsSet.size < 4) {
    const candidate = Math.max(1, answer + (Math.floor(Math.random() * 7) - 3));
    optsSet.add(candidate);
  }

  const optionsWrap = document.getElementById("detectiveOptions");
  optionsWrap.innerHTML = "";
  Array.from(optsSet)
    .sort((x, y) => x - y)
    .forEach((optVal) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choice-btn";
      btn.textContent = optVal;
      btn.addEventListener("click", () => {
        if (optVal === answer) {
          playSound("correct");
          btn.classList.add("correct-choice");
          document.getElementById("detectiveMysterySlot").textContent = answer;
          document.getElementById("detectiveFeedback").innerHTML =
            `🎉 Case Closed! <strong>${a} × ${b} = ${product}</strong>! (+1 ⭐)`;
          state.progress.detectiveSolved += 1;
          document.getElementById("detectiveSolvedCount").textContent = state.progress.detectiveSolved;
          awardStarAndRecordFact(a, b);
          setTimeout(generateDetectiveMystery, 1200);
        } else {
          playSound("wrong");
          btn.classList.add("wrong-choice");
          document.getElementById("detectiveFeedback").innerHTML =
            `🔎 Try again! (${optVal} × ${known} = ${optVal * known})`;
        }
      });
      optionsWrap.appendChild(btn);
    });
}

// ==========================================
// MODE 5: STAR PASSPORT & MASTERY HEATMAP
// ==========================================
function renderStarPassport() {
  const badgesContainer = document.getElementById("badgesContainer");
  badgesContainer.innerHTML = "";

  BADGE_DEFINITIONS.forEach((badge) => {
    const unlocked = badge.check(state.progress);
    const card = document.createElement("div");
    card.className = `badge-card ${unlocked ? "unlocked" : ""}`;
    card.innerHTML = `
      <div class="badge-icon">${badge.icon}</div>
      <div class="badge-name">${badge.name}</div>
      <div class="badge-desc">${badge.desc}</div>
    `;
    badgesContainer.appendChild(card);
  });

  const heatmap = document.getElementById("masteryHeatmap");
  heatmap.innerHTML = "";

  // Corner
  const corner = document.createElement("div");
  corner.className = "mastery-cell m-header";
  corner.textContent = "×";
  heatmap.appendChild(corner);

  for (let c = 1; c <= 10; c++) {
    const hc = document.createElement("div");
    hc.className = "mastery-cell m-header";
    hc.textContent = c;
    heatmap.appendChild(hc);
  }

  for (let r = 1; r <= 10; r++) {
    const hr = document.createElement("div");
    hr.className = "mastery-cell m-header";
    hr.textContent = r;
    heatmap.appendChild(hr);

    for (let c = 1; c <= 10; c++) {
      const count = state.progress.factCounts[`${r}x${c}`] || 0;
      const cell = document.createElement("div");
      let statusClass = "";
      if (count >= 3) statusClass = "m-mastered";
      else if (count >= 1) statusClass = "m-learning";
      cell.className = `mastery-cell ${statusClass}`;
      cell.textContent = r * c;
      cell.title = `${r} × ${c} = ${r * c} (Correct ${count} times)`;
      heatmap.appendChild(cell);
    }
  }
}

// ==========================================
// CONFETTI CELEBRATION EFFECT
// ==========================================
function launchConfetti() {
  const canvas = document.getElementById("confettiCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 70 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    size: 7 + Math.random() * 7,
    color: ["#fde047", "#4f46e5", "#22c55e", "#f97316", "#ec4899"][Math.floor(Math.random() * 5)],
    vx: (Math.random() - 0.5) * 5,
    vy: 3 + Math.random() * 4,
    angle: Math.random() * Math.PI * 2
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.angle += 0.08;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });
    frame++;
    if (frame < 90) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(animate);
}

// ==========================================
// EVENT LISTENERS & INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadProgress();
  updateHeaderStats();
  renderMultiplicationGrid();
  renderVisualizer();
  renderTableCardsMode();
  renderPracticeTableButtons();
  generateNextQuizQuestion();
  startNewBubbleRound();
  generateDetectiveMystery();
  renderStarPassport();

  // Sound toggle
  const soundBtn = document.getElementById("soundToggleBtn");
  soundBtn.addEventListener("click", () => {
    state.soundEnabled = !state.soundEnabled;
    soundBtn.textContent = state.soundEnabled ? "🔊 Sound ON" : "🔇 Sound OFF";
  });

  // Top Navigation Tabs
  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      playSound("click");
      const mode = tab.dataset.mode;
      document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      document.querySelectorAll(".mode-section").forEach((sec) => sec.classList.remove("active"));
      document.getElementById(`mode-${mode}`).classList.add("active");

      if (mode === "passport") {
        renderStarPassport();
      }
    });
  });

  // Grid Size Buttons (1-9, 1-10, 1-12)
  document.querySelectorAll("#gridSizeButtons .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll("#gridSizeButtons .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.gridSize = Number(btn.dataset.size);
      if (state.selectedA > state.gridSize) state.selectedA = state.gridSize;
      if (state.selectedB > state.gridSize) state.selectedB = state.gridSize;
      renderMultiplicationGrid();
      renderVisualizer();
    });
  });

  // Pattern Highlight Chips
  document.querySelectorAll(".pattern-chips .chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll(".pattern-chips .chip-btn").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.activePattern = chip.dataset.pattern;
      renderMultiplicationGrid();
    });
  });

  // Visualizer Tabs (Array / Groups / Skip Counting)
  document.querySelectorAll(".viz-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll(".viz-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      state.vizMode = tab.dataset.viz;
      renderVisualizer();
    });
  });

  // Speak Equation Aloud
  document.getElementById("speakEquationBtn").addEventListener("click", () => {
    const a = state.selectedA;
    const b = state.selectedB;
    speakText(`${a} times ${b} equals ${a * b}. That is ${a} groups of ${b}.`);
  });

  // Flip Commutative Factors
  document.getElementById("flipFactorsBtn").addEventListener("click", () => {
    playSound("pop");
    const temp = state.selectedA;
    state.selectedA = state.selectedB;
    state.selectedB = temp;
    highlightAreaOnGrid(state.selectedA, state.selectedB, true);
    renderVisualizer();
  });

  // Mode 2: Hide/Show All Answers & Speak Full Table
  const toggleAllBtn = document.getElementById("toggleAllCardsBtn");
  toggleAllBtn.addEventListener("click", () => {
    playSound("click");
    state.hideAllCardAnswers = !state.hideAllCardAnswers;
    toggleAllBtn.textContent = state.hideAllCardAnswers ? "👀 Show All Answers" : "🙈 Hide All Answers";
    renderTableCardsMode();
  });

  document.getElementById("speakFullTableBtn").addEventListener("click", () => {
    const n = state.cardTableNum;
    const lines = [];
    for (let i = 1; i <= 10; i++) {
      lines.push(`${n} times ${i} is ${n * i}`);
    }
    speakText(lines.join(". "));
  });

  // Mode 3: Practice Presets
  document.querySelectorAll(".preset-buttons .chip-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll(".preset-buttons .chip-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const preset = btn.dataset.preset;
      if (preset === "easy") state.selectedTables = [1, 2, 5, 10];
      else if (preset === "medium") state.selectedTables = [3, 4, 6];
      else if (preset === "hard") state.selectedTables = [7, 8, 9, 12];
      else if (preset === "all10") state.selectedTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      else if (preset === "all12") state.selectedTables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      renderPracticeTableButtons();
      generateNextQuizQuestion();
    });
  });

  // Quiz Answer Style (4 Choices vs Keypad)
  document.querySelectorAll("#quizStyleControl .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll("#quizStyleControl .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.quizStyle = btn.dataset.style;
      document.getElementById("quizChoicesContainer").classList.toggle("hidden", state.quizStyle !== "choices");
      document.getElementById("quizKeypadContainer").classList.toggle("hidden", state.quizStyle !== "keypad");
    });
  });

  // Keypad Buttons
  document.querySelectorAll(".key-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      const key = btn.dataset.key;
      if (key === "clear") {
        state.typedAnswer = state.typedAnswer.slice(0, -1);
        document.getElementById("quizAnswerSlot").textContent = state.typedAnswer || "?";
      } else if (key === "submit") {
        if (state.typedAnswer.length > 0) {
          handleQuizSubmission(Number(state.typedAnswer));
        }
      } else if (state.typedAnswer.length < 3) {
        state.typedAnswer += key;
        document.getElementById("quizAnswerSlot").textContent = state.typedAnswer;
      }
    });
  });

  // Keyboard typing support when in Practice Mode
  window.addEventListener("keydown", (e) => {
    const practiceActive = document.getElementById("mode-practice").classList.contains("active");
    if (!practiceActive || state.quizLocked) return;
    if (e.key >= "0" && e.key <= "9") {
      if (state.typedAnswer.length < 3) {
        state.typedAnswer += e.key;
        document.getElementById("quizAnswerSlot").textContent = state.typedAnswer;
      }
    } else if (e.key === "Backspace") {
      state.typedAnswer = state.typedAnswer.slice(0, -1);
      document.getElementById("quizAnswerSlot").textContent = state.typedAnswer || "?";
    } else if (e.key === "Enter" && state.typedAnswer.length > 0) {
      handleQuizSubmission(Number(state.typedAnswer));
    }
  });

  document.getElementById("showQuizHintBtn").addEventListener("click", () => {
    playSound("pop");
    showQuizVisualHint();
  });

  // Mode 4: Games Picker
  document.querySelectorAll(".game-picker .seg-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      playSound("click");
      document.querySelectorAll(".game-picker .seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const game = btn.dataset.game;
      document.getElementById("game-bubbles").classList.toggle("hidden", game !== "bubbles");
      document.getElementById("game-detective").classList.toggle("hidden", game !== "detective");
    });
  });

  document.getElementById("newBubbleRoundBtn").addEventListener("click", () => {
    playSound("click");
    startNewBubbleRound();
  });

  document.getElementById("nextDetectiveBtn").addEventListener("click", () => {
    playSound("click");
    generateDetectiveMystery();
  });

  // Mode 5: Reset Progress
  document.getElementById("resetProgressBtn").addEventListener("click", () => {
    if (confirm("Reset all your stars, streaks, and mastery map?")) {
      state.progress = {
        stars: 0,
        streak: 0,
        bestStreak: 0,
        bubblesWon: 0,
        detectiveSolved: 0,
        factCounts: {}
      };
      saveProgress();
      updateHeaderStats();
      renderStarPassport();
    }
  });
});
