// =====================================================
// مُهندس البرومبت - منطق التطبيق الرئيسي
// =====================================================

const STORAGE_KEYS = {
  apiKey: "promptArchitect_apiKey",
  workerUrl: "promptArchitect_workerUrl",
  model: "promptArchitect_model",
  chats: "promptArchitect_chats",
  activeChat: "promptArchitect_activeChatId",
  onboardingSeen: "promptArchitect_onboardingSeen",
};

// ---------------- الحالة العامة ----------------
let state = {
  chats: [],        // [{id, title, messages: [{role, text}], createdAt}]
  activeChatId: null,
  isSending: false,
};

// ---------------- عناصر DOM ----------------
const el = {
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  openSidebarBtn: document.getElementById("openSidebarBtn"),
  closeSidebarBtn: document.getElementById("closeSidebarBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  historyList: document.getElementById("historyList"),
  chatTitle: document.getElementById("chatTitle"),
  chatArea: document.getElementById("chatArea"),
  emptyState: document.getElementById("emptyState"),
  messagesList: document.getElementById("messagesList"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  langToggle: document.getElementById("langToggle"),
  settingsBtn: document.getElementById("settingsBtn"),
  settingsModal: document.getElementById("settingsModal"),
  closeSettingsBtn: document.getElementById("closeSettingsBtn"),
  apiKeyInput: document.getElementById("apiKeyInput"),
  toggleKeyVisibility: document.getElementById("toggleKeyVisibility"),
  workerUrlInput: document.getElementById("workerUrlInput"),
  modelSelect: document.getElementById("modelSelect"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  onboardingToast: document.getElementById("onboardingToast"),
  onboardingSettingsBtn: document.getElementById("onboardingSettingsBtn"),
};

// ===================== التخزين المحلي =====================

function loadChats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats);
    state.chats = raw ? JSON.parse(raw) : [];
  } catch {
    state.chats = [];
  }
  state.activeChatId = localStorage.getItem(STORAGE_KEYS.activeChat) || null;
}

function saveChats() {
  localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(state.chats));
}

function saveActiveChat() {
  if (state.activeChatId) {
    localStorage.setItem(STORAGE_KEYS.activeChat, state.activeChatId);
  }
}

function getConfig() {
  return {
    apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || "",
    workerUrl: localStorage.getItem(STORAGE_KEYS.workerUrl) || "",
    model: localStorage.getItem(STORAGE_KEYS.model) || "gemini-2.5-flash",
  };
}

function isConfigured() {
  const cfg = getConfig();
  return Boolean(cfg.apiKey && cfg.workerUrl);
}

// ===================== إدارة المحادثات =====================

function createNewChat() {
  const chat = {
    id: "chat_" + Date.now(),
    title: null,
    messages: [],
    createdAt: Date.now(),
  };
  state.chats.unshift(chat);
  state.activeChatId = chat.id;
  saveChats();
  saveActiveChat();
  renderAll();
  closeSidebarMobile();
  el.messageInput.focus();
}

function getActiveChat() {
  return state.chats.find(c => c.id === state.activeChatId) || null;
}

function selectChat(chatId) {
  state.activeChatId = chatId;
  saveActiveChat();
  renderAll();
  closeSidebarMobile();
}

function deleteChat(chatId, ev) {
  ev.stopPropagation();
  if (!confirm(t("deleteConfirm"))) return;
  state.chats = state.chats.filter(c => c.id !== chatId);
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats.length ? state.chats[0].id : null;
  }
  saveChats();
  saveActiveChat();
  renderAll();
}

function deriveTitleFromText(text) {
  const clean = text.trim().replace(/\s+/g, " ");
  return clean.length > 38 ? clean.slice(0, 38) + "…" : clean;
}

// ===================== الإرسال والاتصال بـ Gemini =====================

async function sendMessage() {
  const text = el.messageInput.value.trim();
  if (!text || state.isSending) return;

  if (!isConfigured()) {
    showOnboarding();
    return;
  }

  let chat = getActiveChat();
  if (!chat) {
    createNewChat();
    chat = getActiveChat();
  }

  if (!chat.title) {
    chat.title = deriveTitleFromText(text);
  }

  chat.messages.push({ role: "user", text });
  saveChats();
  el.messageInput.value = "";
  autoGrowTextarea();
  renderAll();
  scrollToBottom();

  state.isSending = true;
  updateSendBtn();
  const thinkingId = appendThinkingBubble();

  try {
    const replyText = await callGemini(chat.messages);
    removeThinkingBubble(thinkingId);
    chat.messages.push({ role: "assistant", text: replyText });
    saveChats();
    renderAll();
    scrollToBottom();
  } catch (err) {
    removeThinkingBubble(thinkingId);
    chat.messages.push({ role: "assistant", text: t("sendError"), isError: true });
    saveChats();
    renderAll();
    scrollToBottom();
    console.error(err);
  } finally {
    state.isSending = false;
    updateSendBtn();
  }
}

async function callGemini(messages) {
  const cfg = getConfig();

  // تحويل سجل المحادثة لصيغة Gemini (contents)
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.text }],
  }));

  const response = await fetch(cfg.workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: cfg.apiKey,
      model: cfg.model,
      contents: contents,
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
      maxOutputTokens: 8192,
    }),
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }

  const candidate = data.candidates && data.candidates[0];
  const parts = candidate && candidate.content && candidate.content.parts;
  const replyText = parts && parts.map(p => p.text || "").join("");

  if (!replyText) {
    throw new Error("استجابة فارغة من Gemini");
  }

  return replyText;
}

// ===================== العرض (Rendering) =====================

function renderAll() {
  renderHistory();
  renderChatTitle();
  renderMessages();
}

function renderHistory() {
  el.historyList.innerHTML = "";
  state.chats.forEach(chat => {
    const item = document.createElement("div");
    item.className = "history-item" + (chat.id === state.activeChatId ? " active" : "");
    item.onclick = () => selectChat(chat.id);

    const titleSpan = document.createElement("span");
    titleSpan.className = "title";
    titleSpan.textContent = chat.title || t("untitledChat");

    const delBtn = document.createElement("span");
    delBtn.className = "delete-btn";
    delBtn.textContent = "✕";
    delBtn.onclick = (ev) => deleteChat(chat.id, ev);

    item.appendChild(titleSpan);
    item.appendChild(delBtn);
    el.historyList.appendChild(item);
  });
}

function renderChatTitle() {
  const chat = getActiveChat();
  el.chatTitle.textContent = chat && chat.title ? chat.title : t("defaultChatTitle");
}

function renderMessages() {
  const chat = getActiveChat();
  el.messagesList.innerHTML = "";

  if (!chat || chat.messages.length === 0) {
    el.emptyState.style.display = "flex";
    return;
  }

  el.emptyState.style.display = "none";

  chat.messages.forEach(msg => {
    el.messagesList.appendChild(buildMessageRow(msg));
  });
}

function buildMessageRow(msg) {
  const row = document.createElement("div");
  row.className = "msg-row " + (msg.role === "user" ? "user" : "assistant");

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = msg.role === "user" ? "أ" : "٭";

  const wrap = document.createElement("div");
  wrap.className = "msg-bubble-wrap";

  if (msg.role === "assistant" && !msg.isError) {
    wrap.appendChild(renderAssistantContent(msg.text));
  } else {
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble" + (msg.isError ? " error-bubble" : "");
    bubble.textContent = msg.text;
    wrap.appendChild(bubble);
  }

  row.appendChild(avatar);
  row.appendChild(wrap);
  return row;
}

// يفصل نص الرد لأجزاء عادية + بلوكات البرومبت الخاصة (```prompt ... ```)
function renderAssistantContent(text) {
  const container = document.createElement("div");
  const regex = /```prompt\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  let foundPrompt = false;

  while ((match = regex.exec(text)) !== null) {
    foundPrompt = true;
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      container.appendChild(makeTextBubble(before));
    }
    container.appendChild(makePromptCard(match[1].trim()));
    lastIndex = regex.lastIndex;
  }

  const after = text.slice(lastIndex).trim();
  if (after) {
    container.appendChild(makeTextBubble(after));
  }

  if (!foundPrompt && container.children.length === 0) {
    container.appendChild(makeTextBubble(text));
  }

  return container;
}

function makeTextBubble(text) {
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.style.marginBottom = "10px";
  bubble.innerHTML = formatInlineText(text);
  return bubble;
}

function formatInlineText(text) {
  // تحويل بسيط لـ markdown خفيف: **bold** وعناوين بسيطة
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<strong>$1</strong>")
    .replace(/^## (.+)$/gm, "<strong>$1</strong>");
}

function makePromptCard(promptText) {
  const card = document.createElement("div");
  card.className = "prompt-card";

  const header = document.createElement("div");
  header.className = "prompt-card-header";

  const label = document.createElement("span");
  label.textContent = t("promptCardLabel");

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.textContent = t("copyPrompt");
  copyBtn.onclick = () => copyPromptText(promptText, copyBtn);

  header.appendChild(label);
  header.appendChild(copyBtn);

  const body = document.createElement("div");
  body.className = "prompt-card-body";
  body.textContent = promptText;

  card.appendChild(header);
  card.appendChild(body);
  return card;
}

function copyPromptText(text, btnEl) {
  navigator.clipboard.writeText(text).then(() => {
    const original = btnEl.textContent;
    btnEl.textContent = t("copied");
    setTimeout(() => { btnEl.textContent = original; }, 1800);
  });
}

// ---------------- مؤشر الكتابة ----------------
function appendThinkingBubble() {
  const id = "thinking_" + Date.now();
  const row = document.createElement("div");
  row.className = "msg-row assistant";
  row.id = id;

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar";
  avatar.textContent = "٭";

  const wrap = document.createElement("div");
  wrap.className = "msg-bubble-wrap";
  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = `<div class="typing-indicator"><span></span><span></span><span></span></div>`;
  wrap.appendChild(bubble);

  row.appendChild(avatar);
  row.appendChild(wrap);
  el.emptyState.style.display = "none";
  el.messagesList.appendChild(row);
  scrollToBottom();
  return id;
}

function removeThinkingBubble(id) {
  const node = document.getElementById(id);
  if (node) node.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    el.chatArea.scrollTop = el.chatArea.scrollHeight;
  });
}

function updateSendBtn() {
  el.sendBtn.disabled = state.isSending;
}

// ===================== خانة الكتابة =====================

function autoGrowTextarea() {
  el.messageInput.style.height = "auto";
  el.messageInput.style.height = Math.min(el.messageInput.scrollHeight, 160) + "px";
}

el.messageInput.addEventListener("input", autoGrowTextarea);
el.messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
el.sendBtn.addEventListener("click", sendMessage);

// أزرار الاقتراحات في الشاشة الفارغة
document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    el.messageInput.value = chip.getAttribute("data-fill");
    autoGrowTextarea();
    el.messageInput.focus();
  });
});

// ===================== الشريط الجانبي (موبايل) =====================

function openSidebarMobile() {
  el.sidebar.classList.add("open");
  el.sidebarOverlay.classList.add("show");
}
function closeSidebarMobile() {
  el.sidebar.classList.remove("open");
  el.sidebarOverlay.classList.remove("show");
}
el.openSidebarBtn.addEventListener("click", openSidebarMobile);
el.closeSidebarBtn.addEventListener("click", closeSidebarMobile);
el.sidebarOverlay.addEventListener("click", closeSidebarMobile);
el.newChatBtn.addEventListener("click", createNewChat);

// ===================== اللغة =====================

el.langToggle.addEventListener("click", () => {
  setLang(currentLang === "ar" ? "en" : "ar");
  renderAll();
});

// ===================== الإعدادات =====================

function openSettings() {
  const cfg = getConfig();
  el.apiKeyInput.value = cfg.apiKey;
  el.workerUrlInput.value = cfg.workerUrl;
  el.modelSelect.value = cfg.model;
  el.settingsModal.classList.add("open");
  hideOnboarding();
}
function closeSettings() {
  el.settingsModal.classList.remove("open");
}

el.settingsBtn.addEventListener("click", openSettings);
el.closeSettingsBtn.addEventListener("click", closeSettings);
el.settingsModal.addEventListener("click", (e) => {
  if (e.target === el.settingsModal) closeSettings();
});

el.toggleKeyVisibility.addEventListener("click", () => {
  el.apiKeyInput.type = el.apiKeyInput.type === "password" ? "text" : "password";
});

el.saveSettingsBtn.addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEYS.apiKey, el.apiKeyInput.value.trim());
  localStorage.setItem(STORAGE_KEYS.workerUrl, el.workerUrlInput.value.trim());
  localStorage.setItem(STORAGE_KEYS.model, el.modelSelect.value);
  closeSettings();
  hideOnboarding();
});

// ---------------- تنبيه الإعداد الأولي ----------------
function showOnboarding() {
  // لو المستخدم شافه قبل كده، أو الإعدادات متظبطة أصلاً، متظهروش
  if (isConfigured() || localStorage.getItem(STORAGE_KEYS.onboardingSeen)) return;
  el.onboardingToast.classList.add("show");
}
function hideOnboarding() {
  el.onboardingToast.classList.remove("show");
  localStorage.setItem(STORAGE_KEYS.onboardingSeen, "1");
}
el.onboardingSettingsBtn.addEventListener("click", openSettings);

// ===================== التهيئة الأولى =====================

function init() {
  applyTranslations();
  loadChats();

  if (state.chats.length === 0) {
    createNewChat();
  } else {
    if (!getActiveChat()) {
      state.activeChatId = state.chats[0].id;
    }
    renderAll();
  }

  if (!isConfigured()) {
    setTimeout(showOnboarding, 600);
  }
}

init();
