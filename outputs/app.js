const fullTasks = [
  { id: "review", name: "复习旧单词", detail: "昨天 · 3 天前 · 7 天前", minutes: "10 分钟", feedback: "主动回忆一次，记忆会更牢。" },
  { id: "newWords", name: "新词快速过", detail: "30–100 个，先接触再重复", minutes: "10 分钟", feedback: "今天先认识它们，之后还会再遇见。" },
  { id: "lesson", name: "新概念二", detail: "第 12 课 · 先看课文，再听原文", minutes: "20 分钟", feedback: "理解一小段，也是在建立基础。" },
  { id: "listening", name: "新概念课文听力", detail: "不看字幕听 1–3 遍", minutes: "5 分钟", feedback: "刚才没听出来的声音，现在多听见了一点。" },
  { id: "input", name: "简单英语输入", detail: "A1 / A2 故事或慢速对话", minutes: "10 分钟", feedback: "可理解的输入，会慢慢变成语感。" },
  { id: "shadowing", name: "跟读", detail: "跟着原文，练节奏和开口", minutes: "5 分钟", feedback: "开口的这一分钟，也算今天的进步。" }
];

const minimumIds = ["review", "lesson", "input"];
const fallbackRewards = [
  { title: "今天的自然观察", message: "没有联网也没关系。抬头看看窗外，找一个正在生长的细节。", icon: "◒", sourceLabel: "Daylight 离线卡片" },
  { title: "给自己留一小片天空", message: "完成一个小动作，记忆就多一条回家的路。", icon: "✦", sourceLabel: "Daylight 离线卡片" },
  { title: "一只想象中的候鸟", message: "今天已经回来过一次，明天也可以从最小任务开始。", icon: "◌", sourceLabel: "Daylight 离线卡片" },
  { title: "一颗正在远行的星", message: "你不需要一次走很远，只需要继续向前一点点。", icon: "✧", sourceLabel: "Daylight 离线卡片" }
];

const storageKey = "daylight-english-state";
const defaultState = { mode: "full", completed: [], streak: 12, rewardRevealed: false, history: {}, pendingReward: null };
let state = loadState();
let toastTimer;
let rewardRequest = null;

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
const taskFeedback = document.querySelector("#taskFeedback");
const weekDays = document.querySelector("#weekDays");
const weekTotal = document.querySelector("#weekTotal");
const weekCaption = document.querySelector("#weekCaption");
const historyWeeks = document.querySelector("#historyWeeks");
const rewardStatus = document.querySelector("#rewardStatus");
const rewardArt = document.querySelector("#rewardArt");
const rewardPreviewImage = document.querySelector("#rewardPreviewImage");

function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date = new Date()) {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function weekKeys(start = startOfWeek()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return todayKey(date);
  });
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    const next = { ...defaultState, ...stored, history: stored.history && typeof stored.history === "object" ? stored.history : {} };
    next.completed = Array.isArray(next.completed) ? next.completed : [];
    const today = todayKey();
    const todayRecord = next.history[today];
    if (todayRecord && Array.isArray(todayRecord.completed)) {
      next.completed = todayRecord.completed;
      next.mode = todayRecord.mode || next.mode;
      next.rewardRevealed = Boolean(todayRecord.rewardRevealed);
      next.pendingReward = todayRecord.pendingReward || next.pendingReward || null;
    } else if (!Object.keys(next.history).length && next.completed.length) {
      next.history[today] = { completed: next.completed, mode: next.mode, rewardRevealed: next.rewardRevealed, savedAt: Date.now() };
    } else {
      next.completed = [];
      next.rewardRevealed = false;
      next.pendingReward = null;
    }
    return next;
  } catch (error) {
    return { ...defaultState, history: {} };
  }
}

function saveState() {
  state.history[todayKey()] = { completed: [...state.completed], mode: state.mode, rewardRevealed: Boolean(state.rewardRevealed), pendingReward: state.pendingReward, savedAt: Date.now() };
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character]));
}

function stripHtml(value = "") {
  const element = document.createElement("div");
  element.innerHTML = value;
  return (element.textContent || "").replace(/\s+/g, " ").trim();
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

function renderTasks(animatedTaskId = "") {
  const tasks = visibleTasks();
  taskList.innerHTML = tasks.map((task) => {
    const complete = state.completed.includes(task.id);
    return `<button class="task-item ${complete ? "is-complete" : ""}" data-task-id="${task.id}" type="button" aria-pressed="${complete}">
      <span class="check-box" aria-hidden="true"></span>
      <span class="task-body"><span class="task-name">${task.name}</span><span class="task-detail">${task.detail}</span></span>
      <span class="task-minutes">${task.minutes}</span>
    </button>`;
  }).join("");
  taskList.querySelectorAll("[data-task-id]").forEach((item) => item.addEventListener("click", () => toggleTask(item.dataset.taskId)));
  if (animatedTaskId) taskList.querySelector(`[data-task-id="${animatedTaskId}"]`)?.classList.add("just-completed");
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
  if (completed === 0) taskFeedback.textContent = "先完成一个最小动作，今天就开始了。";
  else if (remaining > 0) taskFeedback.textContent = `已完成 ${completed} / ${tasks.length}，再做一个就会更轻松。`;
  else taskFeedback.textContent = "这一轮完成了，正在准备一张自然或宇宙卡片。";
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

function getRecord(key) {
  if (key === todayKey()) return { completed: state.completed, mode: state.mode, rewardRevealed: state.rewardRevealed };
  return state.history[key] || null;
}

function recordPercent(record) {
  if (!record || !Array.isArray(record.completed) || !record.completed.length) return 0;
  const total = record.mode === "minimum" ? minimumIds.length : fullTasks.length;
  return Math.min(100, Math.round((record.completed.length / total) * 100));
}

function renderWeek() {
  const keys = weekKeys();
  const dayNames = ["一", "二", "三", "四", "五", "六", "日"];
  const completeDays = keys.filter((key) => recordPercent(getRecord(key)) >= 100).length;
  weekTotal.textContent = `${completeDays} / 7 天`;
  weekCaption.textContent = completeDays ? `本周已经完成 ${completeDays} 天，继续保持可回来的节奏。` : "每天完成多少都算数，完成情况会留在这里。";
  weekDays.innerHTML = keys.map((key, index) => {
    const record = getRecord(key);
    const count = record?.completed?.length || 0;
    const total = record?.mode === "minimum" ? minimumIds.length : fullTasks.length;
    const percent = recordPercent(record);
    const date = parseKey(key);
    const isToday = key === todayKey();
    const isFuture = date > new Date();
    const label = isFuture ? "未到" : (record ? `${count}/${total}` : "—");
    return `<div class="week-day ${isToday ? "is-today" : ""} ${record ? "has-record" : "is-empty"}">
      <div class="week-day-top"><strong>${dayNames[index]}</strong><span>${date.getMonth() + 1}/${date.getDate()}</span></div>
      <div class="week-progress-track"><span style="width:${percent}%"></span></div>
      <div class="week-day-bottom"><b>${label}</b><small>${isToday ? "今天" : (record?.mode === "minimum" ? "最低任务" : (record ? "完整模式" : "等待记录"))}</small></div>
    </div>`;
  }).join("");
}

function renderHistory() {
  const currentStart = startOfWeek();
  const weeks = [];
  for (let offset = 1; offset <= 12; offset += 1) {
    const start = new Date(currentStart);
    start.setDate(start.getDate() - offset * 7);
    const keys = weekKeys(start);
    const records = keys.map((key) => getRecord(key));
    if (records.some(Boolean)) weeks.push({ start, keys, records });
  }
  if (!weeks.length) {
    historyWeeks.innerHTML = `<div class="empty-history"><span>✦</span><strong>还没有历史周报</strong><p>从今天开始打卡，下一周会在这里留下自己的节奏。</p></div>`;
    return;
  }
  historyWeeks.innerHTML = weeks.map(({ start, keys, records }) => {
    const doneDays = records.filter((record) => recordPercent(record) >= 100).length;
    const totalTasks = records.reduce((sum, record) => sum + (record?.completed?.length || 0), 0);
    const title = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日这一周`;
    const bars = keys.map((key, index) => `<div class="history-day"><span>${["一", "二", "三", "四", "五", "六", "日"][index]}</span><i><em style="width:${recordPercent(getRecord(key))}%"></em></i></div>`).join("");
    return `<article class="history-week-card"><div class="history-week-heading"><div><strong>${title}</strong><small>完成 ${doneDays} 天 · 记录 ${totalTasks} 项任务</small></div><span>${doneDays}/7</span></div><div class="history-bars">${bars}</div></article>`;
  }).join("");
}

function toggleTask(taskId) {
  const hasTask = state.completed.includes(taskId);
  state.completed = hasTask ? state.completed.filter((id) => id !== taskId) : [...state.completed, taskId];
  state.rewardRevealed = false;
  saveState();
  renderTasks(hasTask ? "" : taskId);
  renderWeek();
  const task = fullTasks.find((item) => item.id === taskId);
  if (!hasTask) {
    showToast(`${task.name} 已完成 · ${task.feedback}`);
    if (visibleTasks().every((item) => state.completed.includes(item.id))) void prepareReward();
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function openModal(modal) { modal.classList.add("is-open"); modal.setAttribute("aria-hidden", "false"); }
function closeModal(modal) { modal.classList.remove("is-open"); modal.setAttribute("aria-hidden", "true"); }

function openReward() {
  if (rewardButton.disabled) { showToast("先完成今日任务，再打开奖励"); return; }
  openModal(rewardModal);
  if (state.rewardRevealed && state.pendingReward) renderRewardCard(state.pendingReward);
  revealButton.focus();
}

function renderRewardCard(reward) {
  const image = reward.imageUrl ? `<img src="${escapeHtml(reward.imageUrl)}" alt="${escapeHtml(reward.title)}" />` : `<span class="reveal-icon">${escapeHtml(reward.icon || "✦")}</span>`;
  rewardReveal.classList.add("is-revealed");
  rewardReveal.innerHTML = `${image}<span class="reveal-label">${escapeHtml(reward.title)}</span>`;
  modalMessage.innerHTML = `${escapeHtml(reward.message || "今天也为自己留出了时间。")}<br><a href="${escapeHtml(reward.sourceUrl || "#")}" target="_blank" rel="noopener">${escapeHtml(reward.sourceLabel || "Daylight 卡片")}</a>`;
  revealButton.textContent = "收下这份鼓励";
}

async function fetchJson(url, timeout = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal, mode: "cors", cache: "no-store" });
    if (!response.ok) throw new Error(`request failed: ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchCommonsReward() {
  const category = Math.random() > 0.5 ? "Nature" : "Astronomy";
  const api = `https://commons.wikimedia.org/w/api.php?action=query&generator=categorymembers&gcmtitle=Category:${category}&gcmtype=file&gcmlimit=30&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=900&format=json&origin=*`;
  const data = await fetchJson(api);
  const pages = Object.values(data.query?.pages || {}).filter((page) => page.imageinfo?.[0]?.url);
  if (!pages.length) throw new Error("no commons image");
  const page = pages[Math.floor(Math.random() * pages.length)];
  const info = page.imageinfo[0];
  const title = stripHtml(info.extmetadata?.ObjectName?.value || page.title.replace(/^File:/, ""));
  const description = stripHtml(info.extmetadata?.ImageDescription?.value || "");
  return { title: title || `来自 ${category === "Nature" ? "自然" : "宇宙"} 的随机观察`, message: description.slice(0, 180) || "一张随机遇见的自然图像，给今天留一点远方。", imageUrl: info.thumburl || info.url, sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`, sourceLabel: `Wikimedia Commons · ${category === "Nature" ? "自然" : "天文"}` };
}

async function fetchWikipediaReward() {
  const term = ["动物", "植物", "天文", "宇宙", "自然保护"][Math.floor(Math.random() * 5)];
  const api = `https://zh.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=20&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=thumbnail&pithumbsize=900&format=json&origin=*`;
  const data = await fetchJson(api);
  const pages = Object.values(data.query?.pages || {}).filter((page) => page.extract || page.thumbnail?.source);
  if (!pages.length) throw new Error("no wikipedia result");
  const page = pages[Math.floor(Math.random() * pages.length)];
  return { title: page.title, message: (page.extract || "今天从一个自然或宇宙词条开始，带走一个新词。").slice(0, 180), imageUrl: page.thumbnail?.source || "", sourceUrl: `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`, sourceLabel: "中文维基百科 · 随机知识" };
}

async function fetchOnlineReward() {
  if (!navigator.onLine) return null;
  const providers = Math.random() > 0.5 ? [fetchCommonsReward, fetchWikipediaReward] : [fetchWikipediaReward, fetchCommonsReward];
  try {
    return await Promise.any(providers.map((provider) => provider()));
  } catch (error) {
    return null;
  }
}

async function prepareReward() {
  if (state.pendingReward?.date === todayKey()) return state.pendingReward;
  if (rewardRequest) return rewardRequest;
  rewardStatus.textContent = navigator.onLine ? "正在从自然和宇宙内容里随机挑选一张卡片…" : "当前离线，完成后会送你一张离线鼓励卡片。";
  rewardRequest = (async () => {
    const reward = await fetchOnlineReward();
    const finalReward = reward || { ...fallbackRewards[Math.floor(Math.random() * fallbackRewards.length)], date: todayKey() };
    finalReward.date = todayKey();
    state.pendingReward = finalReward;
    saveState();
    renderRewardPreview(finalReward);
    rewardStatus.textContent = reward ? "已准备好一张来自自然或宇宙的随机卡片。" : "联网内容暂时不可用，已准备一张备用卡片。";
    return finalReward;
  })();
  try {
    return await rewardRequest;
  } finally {
    rewardRequest = null;
  }
}

function renderRewardPreview(reward = state.pendingReward) {
  if (reward?.imageUrl) {
    rewardPreviewImage.src = reward.imageUrl;
    rewardPreviewImage.alt = reward.title || "自然或宇宙图片";
    rewardArt.classList.add("has-image");
  } else {
    rewardPreviewImage.removeAttribute("src");
    rewardArt.classList.remove("has-image");
  }
}

async function revealReward() {
  if (rewardReveal.classList.contains("is-revealed")) { closeModal(rewardModal); return; }
  revealButton.disabled = true;
  revealButton.textContent = "正在寻找一张卡片…";
  const finalReward = state.pendingReward?.date === todayKey() ? state.pendingReward : await prepareReward();
  state.pendingReward = finalReward;
  state.rewardRevealed = true;
  saveState();
  renderRewardCard(finalReward);
  renderRewardPreview(finalReward);
  revealButton.disabled = false;
}

document.querySelectorAll(".segment").forEach((segment) => segment.addEventListener("click", () => {
  state.mode = segment.dataset.mode;
  saveState();
  updateMode();
  showToast(state.mode === "minimum" ? "已切换到最低任务 · 今天完成最小闭环就算成功" : "已回到完整模式 · 慢慢积累输入");
}));

document.querySelector("#resetButton").addEventListener("click", () => {
  state.completed = [];
  state.rewardRevealed = false;
  state.pendingReward = null;
  saveState();
  renderTasks();
  renderWeek();
  renderRewardPreview(null);
  rewardStatus.textContent = "完成今天的任务后，联网随机取一则自然或宇宙内容。";
  showToast("今天重新开始，慢慢来");
});

document.querySelector("#reviewButton").addEventListener("click", () => showToast("先从今天到期的 18 个词开始，想不起来再看答案"));
document.querySelector("#profileButton").addEventListener("click", () => showToast("Ming 的学习空间 · 每次回来都算数"));
document.querySelector("#navReview").addEventListener("click", () => document.querySelector(".review-section").scrollIntoView({ behavior: "smooth", block: "center" }));
document.querySelector("#navStats").addEventListener("click", () => document.querySelector(".week-section").scrollIntoView({ behavior: "smooth", block: "center" }));
document.querySelector("#navMore").addEventListener("click", () => openModal(document.querySelector("#menuModal")));
document.querySelector("#closeMenu").addEventListener("click", () => closeModal(document.querySelector("#menuModal")));
document.querySelector("#openHistoryButton").addEventListener("click", () => { closeModal(document.querySelector("#menuModal")); renderHistory(); openModal(document.querySelector("#historyModal")); });
document.querySelector("#closeHistory").addEventListener("click", () => closeModal(document.querySelector("#historyModal")));
document.querySelector("#menuTipsButton").addEventListener("click", () => { closeModal(document.querySelector("#menuModal")); showToast("今天只要完成最低任务，就没有中断这条线"); });
rewardButton.addEventListener("click", openReward);
document.querySelector("#closeModal").addEventListener("click", () => closeModal(rewardModal));
revealButton.addEventListener("click", revealReward);
rewardReveal.addEventListener("click", revealReward);
document.querySelectorAll(".modal-backdrop").forEach((modal) => modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(modal); }));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") document.querySelectorAll(".modal-backdrop.is-open").forEach((modal) => closeModal(modal)); });
window.addEventListener("online", () => { showToast("已联网 · 会为你准备一张新的自然卡片"); if (!state.pendingReward || state.pendingReward.date !== todayKey()) void prepareReward(); });
window.addEventListener("offline", () => showToast("已离线 · 打卡和历史记录仍可继续使用"));

streakCount.textContent = state.streak;
renderTodayLabel();
updateMode();
renderWeek();
renderRewardPreview();
if (state.completed.length === visibleTasks().length) void prepareReward();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./service-worker.js").catch(() => {});
