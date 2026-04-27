const DEFAULT_METADATA = {
  developer: "AstraTeam",
  version: "0.0.7",
  subtitle: "Мобильная версия лаунчера AstraLife для устройств iOS и iPadOS.",
  website: "https://astralife.top",
  updatedAt: "23 февраля 2026",
  size: "5 МБ"
};

const STORAGE_KEY = "astraMobileInstallPhase";

const state = {
  phase: loadPhase(),
  metadata: { ...DEFAULT_METADATA }
};

const PHASE_NAMES = {
  1: "initial",
  2: "step2",
  3: "step3"
};

const STATUS_MESSAGES = {
  1: "Нажмите на кнопку ниже, чтобы открыть системную установку AstraMobile.",
  2: "Подтвердите установку AstraMobile в системном окне, затем откройте инструкцию ниже.",
  3: "Если обычная установка не сработала, используйте резервную загрузку .ipa и инструкцию для ПК."
};

const STATUS_PILLS = {
  1: "Готово к установке",
  2: "Установка запущена",
  3: "Резервный путь"
};

const TRUST_MESSAGES = {
  2: "После установки откройте инструкцию и разрешите профиль разработчика в настройках iOS.",
  3: "Если шаг с доверием не помог, переходите к резервной установке через .ipa."
};

const FALLBACK_MESSAGES = {
  3: "Скачайте .ipa, перенесите файл на ПК и выполните установку по подробной инструкции."
};

const FALLBACK_ARTICLE_URL = "https://teletype.in/@astra_life/astramobile_ios";

const refs = {};
let activeDialogResolve = null;
let lastFocusedElement = null;

document.addEventListener("DOMContentLoaded", () => {
  refs.appSubtitle = document.getElementById("appSubtitle");
  refs.statusPill = document.getElementById("statusPill");
  refs.statusMessage = document.getElementById("statusMessage");
  refs.primaryAction = document.getElementById("primaryAction");
  refs.secondaryAction = document.getElementById("secondaryAction");
  refs.guideAction = document.getElementById("guideAction");
  refs.trustMessage = document.getElementById("trustMessage");
  refs.fallbackMessage = document.getElementById("fallbackMessage");
  refs.versionValue = document.getElementById("versionValue");
  refs.dateValue = document.getElementById("dateValue");
  refs.sizeValue = document.getElementById("sizeValue");
  refs.hostNotice = document.getElementById("hostNotice");
  refs.trustPanel = document.getElementById("trustPanel");
  refs.fallbackPanel = document.getElementById("fallbackPanel");
  refs.dialogBackdrop = document.getElementById("dialogBackdrop");
  refs.dialogPanel = document.getElementById("dialogPanel");
  refs.dialogEyebrow = document.getElementById("dialogEyebrow");
  refs.dialogTitle = document.getElementById("dialogTitle");
  refs.dialogMessage = document.getElementById("dialogMessage");
  refs.dialogList = document.getElementById("dialogList");
  refs.dialogConfirm = document.getElementById("dialogConfirm");

  refs.primaryAction.addEventListener("click", handlePrimaryInstall);
  refs.secondaryAction.addEventListener("click", handleFallbackInstall);
  refs.dialogConfirm.addEventListener("click", closeDialog);

  if (window.location.protocol !== "https:") {
    refs.hostNotice.classList.add("is-visible");
  }

  renderMetadata();
  renderPhase();
  loadMetadata();
});

async function handlePrimaryInstall() {
  state.phase = Math.max(state.phase, 2);
  persistPhase();
  renderPhase();
  scrollToPanel(refs.trustPanel);

  await openDialog({
    title: "Подтвердите установку",
    message: "В следующем системном окне подтвердите установку AstraMobile с нашего сайта.",
    confirmLabel: "Продолжить"
  });

  setTimeout(() => {
    const manifestUrl = resolveAssetUrl("files/AstraMobile.plist");
    window.location.href = `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;
  }, 80);
}

async function handleFallbackInstall() {
  state.phase = 3;
  persistPhase();
  renderPhase();

  await openDialog({
    tone: "warn",
    eyebrow: "Резервная установка",
    title: "Сейчас начнется загрузка .ipa",
    message: "Используйте этот сценарий, если обычная установка не сработала.",
    items: [
      "Если приложение не установилось даже после инструкции, бесплатный сертификат, скорее всего, был отозван.",
      "После загрузки .ipa для завершения установки потребуется ПК.",
      `Подробная инструкция уже доступна ниже и по ссылке: ${FALLBACK_ARTICLE_URL}`
    ],
    confirmLabel: "Скачать .ipa"
  });

  setTimeout(() => {
    window.location.href = resolveAssetUrl("files/AstraMobile.ipa");
  }, 80);
}

async function loadMetadata() {
  try {

    state.metadata = {
      developer: DEFAULT_METADATA.developer,
      version: DEFAULT_METADATA.version,
      subtitle: DEFAULT_METADATA.subtitle,
      website: DEFAULT_METADATA.website,
      updatedAt: DEFAULT_METADATA.updatedAt,
      size: DEFAULT_METADATA.size
    };

    renderMetadata();
  } catch (error) {
    // Keep the static fallback metadata when the JSON cannot be loaded.
  }
}

function renderMetadata() {
  refs.appSubtitle.textContent = state.metadata.subtitle;
  refs.versionValue.textContent = state.metadata.version;
  refs.dateValue.textContent = state.metadata.updatedAt;
  refs.sizeValue.textContent = state.metadata.size;
}

function renderPhase() {
  document.body.dataset.phase = PHASE_NAMES[state.phase] || PHASE_NAMES[1];

  refs.statusPill.textContent = STATUS_PILLS[state.phase] || STATUS_PILLS[1];
  refs.statusMessage.textContent = STATUS_MESSAGES[state.phase] || STATUS_MESSAGES[1];
  refs.primaryAction.textContent = state.phase >= 2
    ? "Повторно установить AstraMobile"
    : "Установить AstraMobile";

  refs.trustPanel.hidden = state.phase < 2;
  refs.fallbackPanel.hidden = state.phase < 2;
  refs.trustMessage.textContent = TRUST_MESSAGES[state.phase] || TRUST_MESSAGES[2];

  if (state.phase >= 2) {
    refs.secondaryAction.textContent = state.phase >= 3 ? "Скачать .ipa еще раз" : "Не работает? Скачать .ipa";
  }

  if (state.phase >= 3) {
    refs.fallbackMessage.textContent = FALLBACK_MESSAGES[3];
    refs.fallbackPanel.querySelector(".status-chip").textContent = "Активно";
    scrollToPanel(refs.fallbackPanel);
  } else {
    refs.fallbackMessage.textContent = "Если после инструкции приложение не запускается, используйте резервную загрузку .ipa.";
    refs.fallbackPanel.querySelector(".status-chip").textContent = "Резервный путь";
  }
}

function persistPhase() {
  // try {
  //   window.sessionStorage.setItem(STORAGE_KEY, String(state.phase));
  // } catch (error) {
  //   // Ignore storage failures and keep the in-memory state.
  // }
}

function loadPhase() {
  // try {
  //   const saved = Number(window.sessionStorage.getItem(STORAGE_KEY));

  //   if (saved >= 1 && saved <= 3) {
  //     return saved;
  //   }
  // } catch (error) {
  //   // Ignore storage failures and keep the default phase.
  // }

  return 1;
}

function formatDate(isoDate) {
  if (!isoDate) {
    return "";
  }

  const parsed = new Date(isoDate);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} КБ`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".0", "")} МБ`;
}

function resolveAssetUrl(path) {
  const normalizedPath = path.replace(/^\.\//, "");

  if (window.location.protocol === "file:") {
    return new URL(normalizedPath, window.location.href).href;
  }

  const { origin, pathname } = window.location;
  const lastSegment = pathname.split("/").pop() || "";
  const directoryPath = pathname.endsWith("/")
    ? pathname
    : lastSegment.includes(".")
      ? pathname.slice(0, pathname.lastIndexOf("/") + 1)
      : `${pathname}/`;

  return new URL(normalizedPath, `${origin}${directoryPath}`).href;
}

function scrollToPanel(panel) {
  if (!panel || panel.hidden) {
    return;
  }

  window.requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function openDialog({
  tone = "info",
  eyebrow = "Уведомление",
  title,
  message,
  items = [],
  confirmLabel = "Продолжить"
}) {
  if (activeDialogResolve) {
    closeDialog();
  }

  refs.dialogPanel.dataset.tone = tone;
  refs.dialogEyebrow.textContent = eyebrow;
  refs.dialogTitle.textContent = title;
  refs.dialogMessage.textContent = message;
  refs.dialogConfirm.textContent = confirmLabel;

  refs.dialogList.innerHTML = "";

  if (items.length > 0) {
    const fragment = document.createDocumentFragment();

    items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      fragment.appendChild(li);
    });

    refs.dialogList.appendChild(fragment);
    refs.dialogList.hidden = false;
  } else {
    refs.dialogList.hidden = true;
  }

  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  refs.dialogBackdrop.hidden = false;
  document.body.classList.add("dialog-open");

  return new Promise((resolve) => {
    activeDialogResolve = resolve;
    window.requestAnimationFrame(() => {
      refs.dialogConfirm.focus();
    });
  });
}

function closeDialog() {
  if (!activeDialogResolve) {
    return;
  }

  const resolve = activeDialogResolve;
  activeDialogResolve = null;
  refs.dialogBackdrop.hidden = true;
  document.body.classList.remove("dialog-open");

  if (lastFocusedElement) {
    lastFocusedElement.focus();
    lastFocusedElement = null;
  }

  resolve();
}
