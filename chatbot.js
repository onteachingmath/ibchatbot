
let fullData = [];
let data = [];
let currentQuestionIndex = 0;
let currentPartIndex = 0;
let score = 0;
let hasSeenContext = false;
let retryMode = false;
let selectedTopic = "All";
let selectedSource = "All";

async function loadQuestions() {
  const res = await fetch("questions.json");

  fullData = await res.json();
  showTopicSelection();
}

function showMessage(message, sender = "bot") {
  const chat = document.createElement("div");
  chat.className = `chat ${sender}`;
  chat.innerHTML = message;
  document.getElementById("chat-log").appendChild(chat);
  MathJax.typeset();
}

function clearChat() {
  document.getElementById("chat-log").innerHTML = "";
}

function showButtons(options, callback) {
  const container = document.createElement("div");
  container.className = "chat bot";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.style.margin = "5px";
    btn.onclick = () => {
      callback(option);
      container.remove();
    };
    container.appendChild(btn);
  });
  document.getElementById("chat-log").appendChild(container);
}

function showTopicSelection() {
  clearChat();
  const topics = [...new Set(fullData.map(q => q.topic.trim()))];

  showMessage("🧠 Choose a topic:");
  showButtons(["All", ...topics], topic => {
    selectedTopic = topic;
    showSourceSelection();
  });
}

function showSourceSelection() {
  const sources = [...new Set(fullData
    .filter(q => selectedTopic === "All" || q.topic.trim() === selectedTopic.trim())
    .map(q => q.source))];

  showMessage("📄 Choose a source:");

  // Add Go Back Button
  const backBtn = document.createElement("button");
  backBtn.textContent = "🔙 Back to Topic Selection";
  backBtn.style.margin = "10px";
  backBtn.onclick = resetToTopicSelection;
  document.getElementById("chat-log").appendChild(backBtn);

  showButtons(["All", ...sources], source => {
    selectedSource = source;
    startQuiz();
  });
}


function startQuiz() {
  data = fullData.filter(q =>
    (selectedTopic === "All" || q.topic.trim() === selectedTopic.trim()) &&
    (selectedSource === "All" || q.source.trim() === selectedSource.trim())
  );

  if (data.length === 0) {
    showMessage("⚠️ No questions found. Try a different topic or paper.");
  } else {
    currentQuestionIndex = 0;
    currentPartIndex = 0;
    score = 0;
    hasSeenContext = false;
    showNextPart();
  }
}

function showContextOnce() {
  if (!hasSeenContext) {
    const q = data[currentQuestionIndex];

    const context = q.question_context.replace(/\\n/g, "<br>");
    showMessage(`<strong>Question ${q.id}:</strong><br>${context}`);

    // ✅ This displays the image if one is provided
    if (q.image) {
      showMessage(`<img src="${q.image}" alt="Question image" style="max-width: 100%; margin-top: 10px;">`);
    }

    hasSeenContext = true;
  }
}


function showPartPrompt() {
  const q = data[currentQuestionIndex];
  const part = q.parts[currentPartIndex];

  // Optional mid-question context
  if (part.part_context) {
    showMessage(`<em>${part.part_context.replace(/\\n/g, "<br>")}</em>`);
  }

  const formattedQuestion = part.question.replace(/\\n/g, "<br>");
  showMessage(`<strong>Part ${part.part_id} (${part.points} pts):</strong><br>${formattedQuestion}`);
}


function smartEquals(studentInput, correctAnswer) {
  const normalize = str => parseFloat(str.replace("%", "").trim());
  try {
    const studentVal = normalize(studentInput);
    const correctVal = normalize(correctAnswer);
    return Math.abs(studentVal - correctVal) < 0.001;
  } catch (e) {
    return false;
  }
}

function showNextPart() {
  const q = data[currentQuestionIndex];
  const part = q.parts[currentPartIndex];

  console.log("🧪 Showing Q:", q.id, "Part:", part.part_id);

  if (currentQuestionIndex >= data.length) {
    showMessage(`<strong>🎉 Quiz Complete! Final Score: ${score} points</strong>`);
    return;
  }

  if (currentPartIndex === 0) showContextOnce();
  showPartPrompt();
}


function submitAnswer() {
  const input = document.getElementById("answer").value.trim();
  document.getElementById("answer").value = "";
  showMessage(input, "user");

  const q = data[currentQuestionIndex];
  const part = q.parts[currentPartIndex];

  if (input === part.correct_answer || smartEquals(input, part.correct_answer)) {
    showMessage(`✅ Correct! (+${part.points} points)`);
    score += part.points;
    retryMode = false;
    nextStep();
  } else {
    handleWrongAnswer(part);
  }
}

function handleWrongAnswer(part) {
  if (retryMode) {
    showMessage(`❌ Incorrect again.<br><br>
      💡 Explanation: ${part.explanation}<br>
      ✅ Final Answer: <strong>${part.correct_answer}</strong>`);
    retryMode = false;
    nextStep();
  } else {
    showMessage(`❌ Not quite. Want to try again or get a hint?`);
    showRetryButtons(part);
  }
}

function showRetryButtons(part) {
  const chatLog = document.getElementById("chat-log");

  const tryBtn = document.createElement("button");
  tryBtn.textContent = "🔁 Try Again";
  tryBtn.onclick = () => {
    retryMode = true;
    showMessage("🔁 Give it another go...");
    chatLog.removeChild(tryBtn);
    chatLog.removeChild(hintBtn);
    if (answerBtn) chatLog.removeChild(answerBtn);
  };

  const hintBtn = document.createElement("button");
  hintBtn.textContent = "💡 Give Me a Hint";
  hintBtn.onclick = () => {
    showMessage(`💡 Hint: ${part.hint || "No hint available."}`);
    // ✅ Show the "Show Answer" button after hint
    chatLog.removeChild(tryBtn);
    chatLog.removeChild(hintBtn);
    chatLog.appendChild(answerBtn);
  };

  const answerBtn = document.createElement("button");
  answerBtn.textContent = "🔎 Show Answer";
  answerBtn.onclick = () => {
    showMessage(`✅ Final Answer: <strong>${part.correct_answer}</strong><br>🧠 Explanation: ${part.explanation}`);
    chatLog.removeChild(answerBtn);
    retryMode = false;
    nextStep();
  };

  chatLog.appendChild(tryBtn);
  chatLog.appendChild(hintBtn);
}
function nextStep() {
  currentPartIndex++;

  const q = data[currentQuestionIndex];
  if (currentPartIndex >= q.parts.length) {
    currentPartIndex = 0;
    currentQuestionIndex++;
    hasSeenContext = false;
  }

  setTimeout(showNextPart, 500); // Delay so it flows smoother
}
function resetToTopicSelection() {
  currentQuestionIndex = 0;
  currentPartIndex = 0;
  score = 0;
  hasSeenContext = false;
  retryMode = false;
  selectedTopic = "All";
  selectedSource = "All";
  clearChat();
  showTopicSelection();
}


window.onload = loadQuestions;
