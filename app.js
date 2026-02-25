const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasFinePointer = window.matchMedia("(pointer: fine)").matches;

const siteHeader = document.querySelector(".site-header");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const themePicker = document.getElementById("theme-picker");
const navLinks = navMenu ? [...navMenu.querySelectorAll("a")] : [];
const megaNavItems = [...document.querySelectorAll(".nav-item.has-mega")];
const megaNavTriggers = megaNavItems
  .map((item) => item.querySelector(".nav-trigger"))
  .filter((trigger) => trigger instanceof HTMLButtonElement);

const revealItems = [...document.querySelectorAll(".reveal")];
const countItems = [...document.querySelectorAll("[data-count]")];
const tiltItems = [...document.querySelectorAll("[data-tilt]")];
const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
const billingButtons = [...document.querySelectorAll("[data-billing]")];
const planPrices = [...document.querySelectorAll(".plan-price")];
const compareTabs = [...document.querySelectorAll("[data-compare-tab]")];
const compareRows = [...document.querySelectorAll(".compare-table tbody tr[data-cat]")];
const demoSlots = [...document.querySelectorAll("[data-demo-slot]")];
const demoDates = [...document.querySelectorAll("[data-demo-date]")];
const flowSteps = [...document.querySelectorAll("[data-flow-step]")];
const flowCards = [...document.querySelectorAll("[data-flow-card]")];
const themeStorageKey = "meetscheduling-theme";
const availableThemes = new Set(["light", "dark", "ocean", "forest", "sunset"]);

function getSavedTheme() {
  try {
    return localStorage.getItem(themeStorageKey) || "";
  } catch {
    return "";
  }
}

function applyTheme(nextTheme, { persist = true } = {}) {
  const theme = availableThemes.has(nextTheme) ? nextTheme : "light";
  document.documentElement.setAttribute("data-theme", theme);

  if (persist) {
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch {
      // ignore storage errors
    }
  }

  return theme;
}

const initialTheme = applyTheme(getSavedTheme(), { persist: false });

if (themePicker instanceof HTMLSelectElement) {
  themePicker.value = initialTheme;
  themePicker.addEventListener("change", () => {
    applyTheme(themePicker.value);
  });
}

function closeMenu() {
  if (!navMenu || !navToggle) return;
  navMenu.classList.remove("open");
  navToggle.setAttribute("aria-expanded", "false");
}

function isMobileMenuView() {
  return window.matchMedia("(max-width: 820px)").matches;
}

function closeMegaMenus(exceptItem = null) {
  megaNavItems.forEach((item) => {
    const shouldOpen = item === exceptItem;
    item.classList.toggle("open", shouldOpen);

    const trigger = item.querySelector(".nav-trigger");
    if (trigger instanceof HTMLButtonElement) {
      trigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    }
  });
}

if (navToggle && navMenu) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) closeMegaMenus();
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMegaMenus();
      closeMenu();
    });
  });

  megaNavTriggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const parent = trigger.closest(".nav-item.has-mega");
      if (!parent) return;
      const shouldOpen = !parent.classList.contains("open");

      closeMegaMenus();
      if (shouldOpen) {
        parent.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  megaNavItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      if (isMobileMenuView()) return;
      closeMegaMenus(item);
    });

    item.addEventListener("mouseleave", () => {
      if (isMobileMenuView()) return;
      closeMegaMenus();
    });
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!navMenu.contains(target) && !navToggle.contains(target)) {
      closeMegaMenus();
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMegaMenus();
    closeMenu();
  });

  window.addEventListener("resize", () => {
    if (!isMobileMenuView()) {
      closeMenu();
    }
    closeMegaMenus();
  });
}

function updateHeaderState() {
  if (!siteHeader) return;
  siteHeader.classList.toggle("is-scrolled", window.scrollY > 10);
}

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

function animateCount(node) {
  if (!(node instanceof HTMLElement)) return;
  if (node.dataset.countDone === "1") return;

  const target = Number(node.dataset.count || 0);
  if (!Number.isFinite(target) || target <= 0) return;

  if (prefersReducedMotion) {
    node.textContent = `${target}%`;
    node.dataset.countDone = "1";
    return;
  }

  const duration = 1300;
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    node.textContent = `${value}%`;

    if (progress < 1) {
      requestAnimationFrame(tick);
      return;
    }

    node.dataset.countDone = "1";
  }

  requestAnimationFrame(tick);
}

if (prefersReducedMotion) {
  revealItems.forEach((item) => item.classList.add("in-view"));
  countItems.forEach(animateCount);
} else if (revealItems.length) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("in-view");

        if (entry.target instanceof HTMLElement) {
          if (entry.target.hasAttribute("data-count")) {
            animateCount(entry.target);
          }

          entry.target.querySelectorAll("[data-count]").forEach((counter) => {
            if (counter instanceof HTMLElement) {
              animateCount(counter);
            }
          });
        }

        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -30px 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  countItems.forEach(animateCount);
}

function bindTilt(card) {
  const maxRotate = 7;

  function onMove(event) {
    const rect = card.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / rect.width;
    const pointerY = (event.clientY - rect.top) / rect.height;
    const rotateY = (pointerX - 0.5) * maxRotate * 2;
    const rotateX = (0.5 - pointerY) * maxRotate * 2;

    card.style.transform = `rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(
      2
    )}deg) scale(1.01)`;
  }

  function onLeave() {
    card.style.transform = "";
  }

  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseleave", onLeave);
}

if (!prefersReducedMotion && hasFinePointer && tiltItems.length) {
  tiltItems.forEach(bindTilt);
}

if (!prefersReducedMotion && hasFinePointer && parallaxItems.length) {
  window.addEventListener(
    "mousemove",
    (event) => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;

      parallaxItems.forEach((item, index) => {
        const strength = 10 + index * 6;
        const moveX = x * strength;
        const moveY = y * strength;
        item.style.transform = `translate3d(${moveX.toFixed(2)}px, ${moveY.toFixed(2)}px, 0)`;
      });
    },
    { passive: true }
  );
}

function applyBilling(mode) {
  billingButtons.forEach((button) => {
    const isActive = button.dataset.billing === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  planPrices.forEach((price) => {
    if (!(price instanceof HTMLElement)) return;
    const next = mode === "yearly" ? price.dataset.yearly : price.dataset.monthly;
    if (next) price.textContent = next;
  });
}

if (billingButtons.length) {
  const defaultMode =
    billingButtons.find((button) => button.classList.contains("active"))?.dataset.billing ||
    "monthly";

  applyBilling(defaultMode === "yearly" ? "yearly" : "monthly");

  billingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.billing === "yearly" ? "yearly" : "monthly";
      applyBilling(mode);
    });
  });
}

function applyCompareFilter(category) {
  compareTabs.forEach((button) => {
    const isActive = button.dataset.compareTab === category;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  compareRows.forEach((row) => {
    const rowCategory = row.dataset.cat;
    const shouldShow = category === "all" || rowCategory === category;
    row.dataset.hidden = shouldShow ? "false" : "true";
  });
}

if (compareTabs.length && compareRows.length) {
  const defaultCategory =
    compareTabs.find((button) => button.classList.contains("active"))?.dataset.compareTab ||
    "all";
  applyCompareFilter(defaultCategory);

  compareTabs.forEach((button) => {
    button.addEventListener("click", () => {
      const category = button.dataset.compareTab || "all";
      applyCompareFilter(category);
    });
  });
}

if (!prefersReducedMotion && demoSlots.length > 1) {
  let activeIndex = demoSlots.findIndex((slot) => slot.classList.contains("slot-on"));
  if (activeIndex < 0) activeIndex = 0;

  window.setInterval(() => {
    if (document.hidden) return;

    demoSlots[activeIndex].classList.remove("slot-on");
    activeIndex = (activeIndex + 1) % demoSlots.length;
    demoSlots[activeIndex].classList.add("slot-on");
  }, 2400);
}

if (!prefersReducedMotion && demoDates.length > 1) {
  let dateIndex = demoDates.findIndex((date) => date.classList.contains("date-active"));
  if (dateIndex < 0) dateIndex = 0;

  window.setInterval(() => {
    if (document.hidden) return;

    demoDates[dateIndex].classList.remove("date-active");
    demoDates[dateIndex].classList.add("date-soft");
    dateIndex = (dateIndex + 1) % demoDates.length;
    demoDates[dateIndex].classList.add("date-active");
    demoDates[dateIndex].classList.remove("date-soft");
  }, 2400);
}

if (flowSteps.length && flowCards.length && flowSteps.length === flowCards.length) {
  const flowDuration = 3600;
  let flowIndex = flowSteps.findIndex((step) => step.classList.contains("is-active"));
  let flowAutoTimer = null;
  let flowProgressFrame = 0;

  if (flowIndex < 0) flowIndex = 0;

  function renderFlow(nextIndex, resetProgress = true) {
    flowIndex = nextIndex;

    flowSteps.forEach((step, index) => {
      const isActive = index === nextIndex;
      step.classList.toggle("is-active", isActive);
      step.setAttribute("aria-selected", String(isActive));
      step.setAttribute("tabindex", isActive ? "0" : "-1");

      const progressValue = isActive ? (prefersReducedMotion ? "100%" : "0%") : "0%";
      step.style.setProperty("--flow-progress", progressValue);
    });

    flowCards.forEach((card, index) => {
      const isActive = index === nextIndex;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-hidden", String(!isActive));
    });

    if (!prefersReducedMotion && resetProgress) {
      startFlowProgress();
    }
  }

  function startFlowProgress() {
    if (flowProgressFrame) cancelAnimationFrame(flowProgressFrame);
    const activeStep = flowSteps[flowIndex];
    if (!activeStep) return;

    const startedAt = performance.now();

    const tick = (now) => {
      const elapsed = now - startedAt;
      const progress = Math.min((elapsed / flowDuration) * 100, 100);
      activeStep.style.setProperty("--flow-progress", `${progress.toFixed(2)}%`);

      if (progress < 100) {
        flowProgressFrame = requestAnimationFrame(tick);
      }
    };

    flowProgressFrame = requestAnimationFrame(tick);
  }

  function restartFlowAuto() {
    if (flowAutoTimer) clearInterval(flowAutoTimer);
    if (prefersReducedMotion) return;

    flowAutoTimer = window.setInterval(() => {
      if (document.hidden) return;
      const nextIndex = (flowIndex + 1) % flowSteps.length;
      renderFlow(nextIndex, true);
    }, flowDuration);
  }

  function focusFlowStep(index) {
    const step = flowSteps[index];
    if (!step) return;
    step.focus();
  }

  flowSteps.forEach((step, index) => {
    const panel = flowCards[index];
    step.setAttribute("role", "tab");
    if (panel) {
      if (!panel.id) panel.id = `flow-panel-${index + 1}`;
      panel.setAttribute("role", "tabpanel");
      step.setAttribute("aria-controls", panel.id);
    }

    step.addEventListener("click", () => {
      renderFlow(index, true);
      restartFlowAuto();
    });

    step.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();

      const offset = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (index + offset + flowSteps.length) % flowSteps.length;
      renderFlow(nextIndex, true);
      focusFlowStep(nextIndex);
      restartFlowAuto();
    });
  });

  renderFlow(flowIndex, true);
  restartFlowAuto();
}
