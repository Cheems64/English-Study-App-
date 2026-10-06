const fullTasks = [
  { id: "review", name: "复习旧单词", detail: "昨天 · 3 天前 · 7 天前", minutes: "10 分钟" },
  { id: "newWords", name: "新词快速过", detail: "30–100 个，先接触再重复", minutes: "10 分钟" },
  { id: "lesson", name: "新概念二", detail: "第 12 课 · 先看课文，再听原文", minutes: "20 分钟" },
  { id: "listening", name: "新概念课文听力", detail: "不看字幕听 1–3 遍", minutes: "5 分钟" },
  { id: "input", name: "简单英语输入", detail: "A1 / A2 故事或慢速对话", minutes: "10 分钟" },
  { id: "shadowing", name: "跟读", detail: "跟着原文，练节奏和开口", minutes: "5 分钟" }
];

const minimumIds = ["review", "lesson", "input"];
const rewards = [
  { title: "一杯慢慢喝完的水", message: "给自己两分钟，把今天的节奏留在身体里。", icon: "◒" },
  { title: "一页喜欢的英文", message: "今天的输入已经留下了，明天会更容易一点。", icon: "▤" },
  { title: "五分钟自由时间", message: "你已经完成了和未来自己的约定。", icon: "✦" },
  { title: "一次不带字幕的尝试", message: "把听不懂的部分也算进成长里。", icon: "◌" }
];

const storageKey = "daylight-english-state";
const defaultState = { mode: "full", completed: [], streak: 12, rewardRevealed: false };
let state = loadState();
let toastTimer;

const taskList = document.querySelector("#taskList");
const modeTitle = document.querySelector("#modeTitle");
const modeNote = document.querySelector("#modeNote");
const timeChip = document.querySelector("#timeChip");
const progressRing = document.querySelector("#progressRing");
const progressPercent = document.querySelector("#progressPercent");
const summaryCaption = document.querySelector("#summaryCaption");
const streakCount = document.querySelector("#streakCount");
const rewardButton = document.querySelector("#rewardButton");
const rewardModal = document.querySelector("#rewardModal");
const rewardReveal = document.querySelector("#rewardReveal");
const revealButton = document.querySelector("#revealButton");
const modalMessage = document.querySelector("#modalMessage");
const todayLabel = document.querySelector("#todayLabel");

function loadState() {
  try {
    return { ...defaultState, ...JSON.parse(localStorage.getItem(storageKey) || "{}") };
  } catch (error) {
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function renderTodayLabel() {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(now).toUpperCase();
  const date = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(now);
  todayLabel.textContent = `${weekday} · ${date}`;
}

function visibleTasks() {
  return state.mode === "minimum" ? fullTasks.filter((task) => minimumIds.includes(task.id)) : fullTasks;
}

function renderTasks() {
  const tasks = visibleTasks();
  taskList.innerHTML = tasks.map((task) => {
    const complete = state.completed.includes(task.id);
    return `<button class="task-item ${complete ? "is-complete" : ""}" data-task-id="${task.id}" type="button" aria-pressed="${complete}">
      <span class="check-box" aria-hidden="true"></span>
      <span class="task-body"><span class="task-name">${task.name}</span><span class="task-detail">${task.detail}</span></span>
      <span class="task-minutes">${task.minutes}</span>
    </button>`;
  }).join("");

  taskList.querySelectorAll("[data-task-id]").forEach((item) => {
    item.addEventListener("click", () => toggleTask(item.dataset.taskId));
  });
  updateProgress();
}

function updateProgress() {
  const tasks = visibleTasks();
  const completed = tasks.filter((task) => state.completed.includes(task.id)).length;
  const percent = Math.round((completed / tasks.length) * 100);
  progressPercent.textContent = `${percent}%`;
  progressRing.style.strokeDashoffset = `${276.46 - (276.46 * percent) / 100}`;
  progressRing.parentElement.setAttribute("aria-label", `今日完成 ${percent}%`);
  const remaining = tasks.length - completed;
  summaryCaption.textContent = remaining === 0 ? "今天的节奏完成了，给自己一个小奖励。" : `再完成 ${remaining} 个小任务，保持今天的节奏。`;
  rewardButton.disabled = completed !== tasks.length;
  rewardButton.innerHTML = completed === tasks.length ? "<span aria-hidden='true'>✦</span> 打开今日奖励" : "完成任务后解锁奖励";
}

function updateMode() {
  const isMinimum = state.mode === "minimum";
  modeTitle.textContent = isMinimum ? "最低任务" : "完整模式";
  timeChip.textContent = isMinimum ? "约 20 分钟" : "约 45 分钟";
  modeNote.textContent = isMinimum ? "很累也没关系，完成最小闭环，今天就算成功。" : "状态正常时，按完整路径积累输入和重复。";
  document.querySelectorAll(".segment").forEach((segment) => {
    const active = segment.dataset.mode === state.mode;
    segment.classList.toggle("is-active", active);
    segment.setAttribute("aria-selected", String(active));
  });
  renderTasks();
}

function toggleTask(taskId) {
  const hasTask = state.completed.includes(taskId);
  state.completed = hasTask ? state.completed.filter((id) => id !== taskId) : [...state.completed, taskId];
  saveState();
  renderTasks();
  const task = fullTasks.find((item) => item.id === taskId);
  if (!hasTask) showToast(`${task.name} 已完成`);
  if (visibleTasks().every((item) => state.completed.includes(item.id))) {
    showToast("今日任务完成，奖励已解锁");
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2300);
}

function openReward() {
  if (rewardButton.disabled) {
    showToast("先完成今日任务，再打开奖励");
    return;
  }
  rewardModal.classList.add("is-open");
  rewardModal.setAttribute("aria-hidden", "false");
  revealButton.focus();
}

function closeReward() {
  rewardModal.classList.remove("is-open");
  rewardModal.setAttribute("aria-hidden", "true");
}

function revealReward() {
  const reward = rewards[Math.floor(Math.random() * rewards.length)];
  rewardReveal.classList.add("is-revealed");
  rewardReveal.innerHTML = `<span class="reveal-icon">${reward.icon}</span><span class="reveal-label">${reward.title}</span>`;
  modalMessage.textContent = reward.message;
  revealButton.textContent = "收下这份鼓励";
  state.rewardRevealed = true;
  saveState();
}

document.querySelectorAll(".segment").forEach((segment) => {
  segment.addEventListener("click", () => {
    state.mode = segment.dataset.mode;
    saveState();
    updateMode();
    showToast(state.mode === "minimum" ? "已切换到最低任务" : "已回到完整模式");
  });
});

document.querySelector("#resetButton").addEventListener("click", () => {
  state.completed = [];
  state.rewardRevealed = false;
  saveState();
  renderTasks();
  showToast("今天重新开始，慢慢来");
});

document.querySelector("#reviewButton").addEventListener("click", () => showToast("复习队列准备好了，先从 18 个到期词开始"));
document.querySelector("#profileButton").addEventListener("click", () => showToast("Ming 的学习空间"));
document.querySelector("#navReview").addEventListener("click", () => document.querySelector(".review-section").scrollIntoView({ behavior: "smooth", block: "center" }));
document.querySelector("#navStats").addEventListener("click", () => document.querySelector(".week-section").scrollIntoView({ behavior: "smooth", block: "center" }));
document.querySelector("#navSettings").addEventListener("click", () => showToast("更多设置会在后续版本加入"));
rewardButton.addEventListener("click", openReward);
document.querySelector("#closeModal").addEventListener("click", closeReward);
revealButton.addEventListener("click", () => {
  if (rewardReveal.classList.contains("is-revealed")) closeReward();
  else revealReward();
});
rewardReveal.addEventListener("click", revealReward);
rewardModal.addEventListener("click", (event) => {
  if (event.target === rewardModal) closeReward();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && rewardModal.classList.contains("is-open")) closeReward();
});

streakCount.textContent = state.streak;
renderTodayLabel();
updateMode();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./service-worker.js").catch(() => {});
}
