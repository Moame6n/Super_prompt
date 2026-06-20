// =====================================================
// نظام الترجمة - عربي / إنجليزي
// =====================================================

const translations = {
  ar: {
    brandName: "مُهندس البرومبت",
    brandTag: "Prompt Architect",
    newChat: "محادثة جديدة",
    history: "السجل",
    settings: "الإعدادات",
    defaultChatTitle: "محادثة جديدة",
    emptyTitle: "من فكرة صغيرة... لبرومبت محترف",
    emptySubtitle: "اكتب موضوعك أو فكرتك مهما كانت بسيطة، وهفككها معاك خطوة بخطوة لحد ما نوصل لبرومبت دقيق وشامل.",
    sug1: "بوت خدمة عملاء",
    sug2: "محتوى تسويقي",
    sug3: "تحليل بيانات",
    sug4: "منهج تعليمي",
    composerPlaceholder: "اكتب فكرتك هنا...",
    composerHint: "قد يسأل المساعد أسئلة توضيحية قبل بناء البرومبت النهائي",
    settingsTitle: "الإعدادات",
    apiKeyLabel: "مفتاح Gemini API",
    apiKeyPlaceholder: "AIza...",
    apiKeyHint: "يُخزَّن المفتاح في متصفحك فقط ولا يُرسل لأي مكان سوى Google مباشرة عبر الخادم الوسيط الخاص بك.",
    getKeyLink: "الحصول على مفتاح مجاني من Google AI Studio ↗",
    workerUrlLabel: "رابط الـ Worker (الخادم الوسيط)",
    workerUrlHint: "رابط Cloudflare Worker الذي يربط هذه الصفحة بـ Gemini API.",
    modelLabel: "الموديل",
    saveSettings: "حفظ الإعدادات",
    onboardingMsg: "ابدأ بإدخال مفتاح Gemini ورابط الـ Worker من الإعدادات ⚙",
    openSettings: "فتح الإعدادات",
    copyPrompt: "نسخ البرومبت",
    copied: "تم النسخ ✓",
    promptCardLabel: "البرومبت النهائي",
    thinking: "بيفكّر...",
    sendError: "حصل خطأ في الاتصال. تأكد من المفتاح ورابط الـ Worker في الإعدادات.",
    missingConfig: "محتاج تدخل مفتاح Gemini ورابط الـ Worker الأول من ⚙ الإعدادات",
    deleteConfirm: "تأكيد حذف المحادثة؟",
    untitledChat: "محادثة بدون عنوان",
  },
  en: {
    brandName: "Prompt Architect",
    brandTag: "مُهندس البرومبت",
    newChat: "New chat",
    history: "History",
    settings: "Settings",
    defaultChatTitle: "New chat",
    emptyTitle: "From a small idea... to a professional prompt",
    emptySubtitle: "Write your topic or idea, however simple, and I'll break it down with you step by step until we reach a precise, comprehensive prompt.",
    sug1: "Customer service bot",
    sug2: "Marketing content",
    sug3: "Data analysis",
    sug4: "Curriculum design",
    composerPlaceholder: "Type your idea here...",
    composerHint: "The assistant may ask clarifying questions before building the final prompt",
    settingsTitle: "Settings",
    apiKeyLabel: "Gemini API key",
    apiKeyPlaceholder: "AIza...",
    apiKeyHint: "Your key is stored only in your browser and is sent only to Google, via your own proxy server.",
    getKeyLink: "Get a free key from Google AI Studio ↗",
    workerUrlLabel: "Worker URL (proxy server)",
    workerUrlHint: "The Cloudflare Worker URL that connects this page to the Gemini API.",
    modelLabel: "Model",
    saveSettings: "Save settings",
    onboardingMsg: "Start by entering your Gemini key and Worker URL in Settings ⚙",
    openSettings: "Open settings",
    copyPrompt: "Copy prompt",
    copied: "Copied ✓",
    promptCardLabel: "Final prompt",
    thinking: "Thinking...",
    sendError: "Connection error. Check your API key and Worker URL in settings.",
    missingConfig: "Please enter your Gemini key and Worker URL in ⚙ Settings first",
    deleteConfirm: "Delete this conversation?",
    untitledChat: "Untitled chat",
  }
};

let currentLang = localStorage.getItem("promptArchitect_lang") || "ar";

function t(key) {
  return translations[currentLang][key] || translations.ar[key] || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("lang-en", currentLang === "en");

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
  });

  const langToggle = document.getElementById("langToggle");
  if (langToggle) langToggle.textContent = currentLang === "ar" ? "EN" : "ع";
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("promptArchitect_lang", lang);
  applyTranslations();
}
