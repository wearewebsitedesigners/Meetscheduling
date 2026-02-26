(function bookingPageRendererIife() {
  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeText(value, fallback) {
    if (value === undefined || value === null) return fallback || "";
    const text = String(value).trim();
    if (!text) return fallback || "";
    return text;
  }

  function safeUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      return new URL(raw, window.location.origin).toString();
    } catch {
      return "";
    }
  }

  function toDateKey(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function parseDateKey(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return null;
    const [year, month, day] = String(value)
      .split("-")
      .map((part) => Number(part));
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  function monthLabel(monthKey) {
    const parsed = parseDateKey(monthKey || "");
    if (!parsed) return "";
    return `${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
  }

  function humanDateLabel(dateKey) {
    const parsed = parseDateKey(dateKey || "");
    if (!parsed) return "";
    return parsed.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function normalizeHex(value, fallback) {
    const raw = String(value || "").trim();
    const next = raw.startsWith("#") ? raw : `#${raw}`;
    if (/^#[0-9a-f]{6}$/i.test(next)) return next.toLowerCase();
    return fallback;
  }

  function getThemeVars(theme) {
    const source = theme && typeof theme === "object" ? theme : {};
    const fontFamily = String(source.fontFamily || "Inter");
    let fontStack = "'Inter', 'DM Sans', system-ui, -apple-system, sans-serif";
    if (fontFamily === "DM Sans") {
      fontStack = "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";
    }
    if (fontFamily === "Sora") {
      fontStack = "'Sora', 'Inter', system-ui, -apple-system, sans-serif";
    }
    if (fontFamily === "System") {
      fontStack = "system-ui, -apple-system, 'Segoe UI', sans-serif";
    }

    const radius = Math.max(0, Math.min(24, Number(source.radius) || 14));
    const spacing = Math.max(8, Math.min(32, Number(source.spacing) || 16));

    return [
      `--pb-brand:${normalizeHex(source.brandColor, "#1a73e8")}`,
      `--pb-surface:${normalizeHex(source.surfaceColor, "#ffffff")}`,
      `--pb-background:${normalizeHex(source.backgroundColor, "#f4f7fb")}`,
      `--pb-text:${normalizeHex(source.textColor, "#10274a")}`,
      `--pb-muted:${normalizeHex(source.mutedColor, "#5b7294")}`,
      `--pb-border:${normalizeHex(source.borderColor, "#d7e0ee")}`,
      `--pb-radius:${radius}px`,
      `--pb-spacing:${spacing}px`,
      `--pb-font:${fontStack}`,
      `--pb-button-style:${safeText(source.buttonStyle, "solid")}`,
    ].join(";");
  }

  function editableMarkup({ mode, path, value, tag, className }) {
    const safeTag = safeText(tag, "span");
    const safeClassName = safeText(className, "");
    const safeValue = escapeHtml(safeText(value, ""));

    if (mode !== "preview") {
      return `<${safeTag} class="${safeClassName}">${safeValue}</${safeTag}>`;
    }

    return `<${safeTag}
      class="${safeClassName} pb-editable"
      contenteditable="true"
      spellcheck="false"
      data-edit-path="${escapeHtml(path || "")}"${safeTag === "a" ? ' role="textbox"' : ""}
    >${safeValue}</${safeTag}>`;
  }

  function sectionWrap(section, mode, selectedSectionId, bodyHtml) {
    if (!section || section.visible === false) return "";
    const selected = mode === "preview" && safeText(selectedSectionId, "") === safeText(section.id, "");
    return `<section
      class="pb-section pb-section-${escapeHtml(section.type || "unknown")} ${selected ? "is-selected" : ""}"
      data-section-id="${escapeHtml(section.id || "")}"
      data-section-type="${escapeHtml(section.type || "")}"
    >${bodyHtml}</section>`;
  }

  function getCalendarGrid(monthKey, availabilityMap, selectedDate) {
    const anchor = parseDateKey(monthKey) || new Date();
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const firstDow = monthStart.getDay();
    const daysInMonth = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth() + 1,
      0
    ).getDate();

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const cells = [];

    for (let index = 0; index < firstDow; index += 1) {
      cells.push({ key: `blank-${index}`, blank: true });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const localDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
      const dateKey = toDateKey(localDate);
      const availableState = availabilityMap && typeof availabilityMap === "object"
        ? availabilityMap[dateKey]
        : undefined;
      const known = availableState === true || availableState === false;
      const isPast = localDate < todayDate;
      const hasSlots = availableState === true;

      cells.push({
        key: dateKey,
        blank: false,
        day,
        dateKey,
        selected: dateKey === selectedDate,
        disabled: isPast || !hasSlots,
        known,
        hasSlots,
      });
    }

    return cells;
  }

  function resolveSection(config, type) {
    if (!config || !Array.isArray(config.sections)) return null;
    return config.sections.find((section) => section && section.type === type) || null;
  }

  function renderHeader(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    const logoUrl = safeUrl(settings.logoUrl);
    const navLinks = [
      { label: "Services", href: "#services" },
      { label: "Policies", href: "#policies" },
    ];

    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<header class="pb-header-inner">
        <a class="pb-brand" href="/">
          ${
            logoUrl
              ? `<img src="${escapeHtml(logoUrl)}" alt="" class="pb-logo" />`
              : '<span class="pb-logo pb-logo-fallback">MS</span>'
          }
          ${editableMarkup({
            mode,
            path: `${section.id}.settings.businessName`,
            value: settings.businessName || "MeetScheduling",
            tag: "span",
            className: "pb-brand-name",
          })}
        </a>
        ${
          settings.showNav
            ? `<nav class="pb-top-nav">${navLinks
                .map(
                  (link) =>
                    `<a href="${escapeHtml(link.href)}" class="pb-top-nav-link">${escapeHtml(
                      link.label
                    )}</a>`
                )
                .join("")}</nav>`
            : ""
        }
      </header>`
    );
  }

  function renderHero(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-hero-inner">
        ${
          settings.badge
            ? editableMarkup({
                mode,
                path: `${section.id}.settings.badge`,
                value: settings.badge,
                tag: "span",
                className: "pb-hero-badge",
              })
            : ""
        }
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.title`,
          value: settings.title || "Book your appointment",
          tag: "h1",
          className: "pb-hero-title",
        })}
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.description`,
          value: settings.description || "Choose your preferred service and time.",
          tag: "p",
          className: "pb-hero-description",
        })}
      </div>`
    );
  }

  function visibleServices(section, services) {
    const settings = section && section.settings ? section.settings : {};
    const ids = Array.isArray(settings.selectedServiceIds) ? settings.selectedServiceIds : [];
    if (!ids.length) return services;
    return services.filter((service) => ids.includes(service.id));
  }

  function renderServiceList(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    const selectedId = safeText(state.selectedServiceId, "");
    const list = visibleServices(section, services || []);

    const cards = list.length
      ? list
          .map((service) => {
            const active = selectedId && selectedId === service.id;
            return `<button
              type="button"
              class="pb-service-card ${active ? "is-active" : ""}"
              data-action="select-service"
              data-service-id="${escapeHtml(service.id)}"
              ${mode === "preview" ? "disabled" : ""}
            >
              <span class="pb-service-card-top">
                <span class="pb-service-title">${escapeHtml(service.title || "Service")}</span>
                ${settings.showDuration ? `<span class="pb-service-duration">${escapeHtml(String(service.durationMinutes || 30))} min</span>` : ""}
              </span>
              ${service.description ? `<span class="pb-service-description">${escapeHtml(service.description)}</span>` : ""}
            </button>`;
          })
          .join("")
      : `<div class="pb-empty">No services are available yet.</div>`;

    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-service-inner" id="services">
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.title`,
          value: settings.title || "Choose appointment type",
          tag: "h2",
          className: "pb-section-title",
        })}
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.description`,
          value: settings.description || "Select the service you want to book",
          tag: "p",
          className: "pb-section-subtitle",
        })}
        <div class="pb-service-grid ${settings.layout === "list" ? "is-list" : ""}">${cards}</div>
      </div>`
    );
  }

  function renderCalendarCell(cell, mode) {
    if (cell.blank) {
      return '<span class="pb-day pb-day-empty" aria-hidden="true"></span>';
    }

    const classNames = ["pb-day"];
    if (!cell.known) classNames.push("is-loading");
    if (cell.selected) classNames.push("is-selected");
    if (cell.hasSlots) classNames.push("is-available");

    return `<button
      type="button"
      class="${classNames.join(" ")}"
      data-action="select-date"
      data-date="${escapeHtml(cell.dateKey)}"
      ${cell.disabled || mode === "preview" ? "disabled" : ""}
    >${escapeHtml(String(cell.day))}</button>`;
  }

  function renderBookingWidget(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    const step = safeText(state.step, "schedule");
    const showSection = mode === "preview" ? true : step === "schedule";
    if (!showSection) return "";

    const grid = getCalendarGrid(
      safeText(state.currentMonth, ""),
      state.availabilityMap || {},
      safeText(state.selectedDate, "")
    );

    const slots = Array.isArray(state.slots) ? state.slots : [];
    const slotMarkup = state.loadingSlots
      ? new Array(10)
          .fill(0)
          .map(() => '<div class="pb-slot-skeleton" aria-hidden="true"></div>')
          .join("")
      : slots.length
      ? slots
          .map((slot) => {
            const selected = safeText(state.selectedSlotStart, "") === safeText(slot.startAtUtc, "");
            const label = safeText(slot.startLabel, slot.startLocal?.time || "");
            return `<button
              type="button"
              class="pb-slot-btn ${selected ? "is-selected" : ""}"
              data-action="select-slot"
              data-slot-start="${escapeHtml(slot.startAtUtc)}"
              ${mode === "preview" ? "disabled" : ""}
            >${escapeHtml(label)}</button>`;
          })
          .join("")
      : '<p class="pb-slot-empty">No times available for this date.</p>';

    const timezoneOptions = (Array.isArray(state.timezoneOptions) ? state.timezoneOptions : [state.timezone])
      .filter(Boolean)
      .map(
        (zone) =>
          `<option value="${escapeHtml(zone)}" ${zone === state.timezone ? "selected" : ""}>${escapeHtml(zone)}</option>`
      )
      .join("");

    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-booking-inner" id="booking">
        <div class="pb-booking-head">
          <h2 class="pb-section-title">${escapeHtml(settings.title || "Select a date and time")}</h2>
          ${state.statusText ? `<p class="pb-booking-status">${escapeHtml(state.statusText)}</p>` : ""}
        </div>
        <div class="pb-booking-grid ${settings.layout === "stacked" ? "is-stacked" : ""}">
          <div class="pb-calendar-pane">
            <div class="pb-calendar-header-row">
              <button type="button" class="pb-icon-btn" data-action="month-prev" ${
                mode === "preview" ? "disabled" : ""
              } aria-label="Previous month">&lsaquo;</button>
              <h3>${escapeHtml(monthLabel(state.currentMonth))}</h3>
              <button type="button" class="pb-icon-btn" data-action="month-next" ${
                mode === "preview" ? "disabled" : ""
              } aria-label="Next month">&rsaquo;</button>
            </div>
            <div class="pb-weekdays">${WEEKDAY_LABELS.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}</div>
            <div class="pb-calendar-grid">${grid.map((cell) => renderCalendarCell(cell, mode)).join("")}</div>
            ${
              settings.showTimezone
                ? `<label class="pb-timezone-field"><span>Timezone</span><select data-action="timezone-change" ${
                    mode === "preview" ? "disabled" : ""
                  }>${timezoneOptions}</select></label>`
                : ""
            }
            ${
              settings.showNextAvailable
                ? `<button type="button" class="pb-link-btn" data-action="jump-next-available" ${
                    mode === "preview" || !state.nextAvailable ? "disabled" : ""
                  }>Next available ${
                    state.nextAvailable
                      ? `(${escapeHtml(humanDateLabel(state.nextAvailable.date))})`
                      : ""
                  }</button>`
                : ""
            }
          </div>
          <div class="pb-slots-pane">
            <h3>${escapeHtml(state.selectedDateLabel || "Available times")}</h3>
            <div class="pb-slots-list">${slotMarkup}</div>
            <button
              type="button"
              class="pb-primary-btn"
              data-action="continue-to-details"
              ${mode === "preview" || !state.selectedSlotStart ? "disabled" : ""}
            >Continue</button>
          </div>
        </div>
      </div>`
    );
  }

  function renderDetailsForm(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    const step = safeText(state.step, "schedule");
    const showSection = mode === "preview" ? true : step === "details";
    if (!showSection) return "";

    const form = state.form && typeof state.form === "object" ? state.form : {};
    const answers = form.answers && typeof form.answers === "object" ? form.answers : {};
    const questions = Array.isArray(settings.customQuestions) ? settings.customQuestions : [];

    const questionFields = questions
      .map((question) => {
        const qId = safeText(question.id, "");
        const qLabel = safeText(question.label, "Question");
        const qType = safeText(question.type, "text") === "textarea" ? "textarea" : "text";
        const answer = safeText(answers[qId], "");

        if (qType === "textarea") {
          return `<label class="pb-field pb-field-full"><span>${escapeHtml(qLabel)}</span><textarea data-action="field-change" data-field="question:${escapeHtml(
            qId
          )}" rows="3" ${question.required ? "required" : ""}>${escapeHtml(answer)}</textarea></label>`;
        }

        return `<label class="pb-field"><span>${escapeHtml(qLabel)}</span><input type="text" data-action="field-change" data-field="question:${escapeHtml(
          qId
        )}" value="${escapeHtml(answer)}" ${question.required ? "required" : ""} /></label>`;
      })
      .join("");

    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-details-inner">
        <h2 class="pb-section-title">${escapeHtml(settings.title || "Enter your details")}</h2>
        <p class="pb-section-subtitle">${escapeHtml(
          settings.description || "We'll send your confirmation and meeting link."
        )}</p>
        <form class="pb-form" data-action="submit-booking">
          <div class="pb-form-grid">
            <label class="pb-field"><span>Name *</span><input type="text" required data-action="field-change" data-field="name" value="${escapeHtml(
              form.name || ""
            )}" ${mode === "preview" ? "disabled" : ""} /></label>
            <label class="pb-field"><span>Email *</span><input type="email" required data-action="field-change" data-field="email" value="${escapeHtml(
              form.email || ""
            )}" ${mode === "preview" ? "disabled" : ""} /></label>
            ${
              settings.phoneEnabled
                ? `<label class="pb-field"><span>Phone${settings.phoneRequired ? " *" : ""}</span><input type="tel" data-action="field-change" data-field="phone" value="${escapeHtml(
                    form.phone || ""
                  )}" ${settings.phoneRequired ? "required" : ""} ${
                    mode === "preview" ? "disabled" : ""
                  } /></label>`
                : ""
            }
            <label class="pb-field pb-field-full"><span>Notes</span><textarea rows="4" data-action="field-change" data-field="notes" ${
              mode === "preview" ? "disabled" : ""
            }>${escapeHtml(form.notes || "")}</textarea></label>
            ${questionFields}
          </div>
          ${state.formError ? `<p class="pb-form-error">${escapeHtml(state.formError)}</p>` : ""}
          <div class="pb-form-actions">
            <button type="button" class="pb-secondary-btn" data-action="back-to-schedule" ${
              mode === "preview" ? "disabled" : ""
            }>Back</button>
            <button type="submit" class="pb-primary-btn" ${
              mode === "preview" || state.submitting ? "disabled" : ""
            }>${state.submitting ? "Booking..." : "Confirm booking"}</button>
          </div>
        </form>
      </div>`
    );
  }

  function renderConfirmation(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    const step = safeText(state.step, "schedule");
    const showSection = mode === "preview" ? true : step === "confirmed";
    if (!showSection) return "";

    const confirmation = state.confirmation && typeof state.confirmation === "object"
      ? state.confirmation
      : {};

    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-confirmation-inner">
        <h2 class="pb-section-title">${escapeHtml(settings.title || "You're scheduled")}</h2>
        <p class="pb-section-subtitle">${escapeHtml(
          settings.subtitle || "A confirmation email has been sent to you."
        )}</p>
        ${confirmation.summary ? `<p class="pb-confirm-summary">${escapeHtml(confirmation.summary)}</p>` : ""}
        ${
          confirmation.meetingLink
            ? `<a class="pb-primary-btn pb-link-btn-as-btn" href="${escapeHtml(
                confirmation.meetingLink
              )}" target="_blank" rel="noopener">Join Google Meet</a>`
            : ""
        }
        ${
          settings.showAddToCalendar
            ? `<div class="pb-confirm-actions">
              ${
                confirmation.googleCalendarUrl
                  ? `<a class="pb-secondary-btn" href="${escapeHtml(
                      confirmation.googleCalendarUrl
                    )}" target="_blank" rel="noopener">Add to Google Calendar</a>`
                  : ""
              }
              ${
                confirmation.icsUrl
                  ? `<a class="pb-secondary-btn" href="${escapeHtml(
                      confirmation.icsUrl
                    )}" download="meeting.ics">Download .ics</a>`
                  : ""
              }
            </div>`
            : ""
        }
      </div>`
    );
  }

  function renderPolicies(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<div class="pb-policies-inner" id="policies">
        <h3>${escapeHtml(settings.title || "Policies")}</h3>
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.cancellationPolicy`,
          value: settings.cancellationPolicy || "",
          tag: "p",
          className: "pb-policy-text",
        })}
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.reschedulePolicy`,
          value: settings.reschedulePolicy || "",
          tag: "p",
          className: "pb-policy-text",
        })}
      </div>`
    );
  }

  function renderFooter(section, mode, state, services, payload, config, selectedSectionId) {
    const settings = section.settings || {};
    return sectionWrap(
      section,
      mode,
      selectedSectionId,
      `<footer class="pb-footer-inner">
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.copyright`,
          value: settings.copyright || "",
          tag: "p",
          className: "pb-footer-line",
        })}
        ${editableMarkup({
          mode,
          path: `${section.id}.settings.secondaryText`,
          value: settings.secondaryText || "",
          tag: "p",
          className: "pb-footer-line pb-footer-muted",
        })}
      </footer>`
    );
  }

  const SECTION_RENDERERS = {
    header: renderHeader,
    hero: renderHero,
    serviceList: renderServiceList,
    bookingWidget: renderBookingWidget,
    detailsForm: renderDetailsForm,
    confirmation: renderConfirmation,
    policies: renderPolicies,
    footer: renderFooter,
  };

  function render(config, payload, options) {
    const safeOptions = options && typeof options === "object" ? options : {};
    const mode = safeOptions.mode === "preview" ? "preview" : "live";
    const state = safeOptions.state && typeof safeOptions.state === "object" ? safeOptions.state : {};
    const selectedSectionId = safeText(safeOptions.selectedSectionId, "");

    const sections = Array.isArray(config && config.sections) ? config.sections : [];
    const services = Array.isArray(payload && payload.services) ? payload.services : [];

    const body = sections
      .map((section) => {
        if (!section || typeof section !== "object") return "";
        const renderFn = SECTION_RENDERERS[section.type];
        if (!renderFn) return "";
        const html = renderFn(
          section,
          mode,
          state,
          services,
          payload,
          config,
          selectedSectionId
        );
        if (!html) return "";

        if (!html.startsWith("<section")) {
          return sectionWrap(section, mode, selectedSectionId, html);
        }

        return html;
      })
      .join("");

    return `<div class="pb-root ${mode === "preview" ? "is-preview" : ""}" style="${getThemeVars(
      config && config.theme ? config.theme : {}
    )}">${body}</div>`;
  }

  function mount(container, config, payload, options) {
    if (!(container instanceof HTMLElement)) return;
    container.innerHTML = render(config, payload, options);
  }

  function defaultState() {
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    return {
      step: "schedule",
      currentMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
      selectedServiceId: "",
      selectedDate: "",
      selectedDateLabel: "",
      selectedSlotStart: "",
      slots: [],
      loadingSlots: false,
      availabilityMap: {},
      nextAvailable: null,
      timezone: tz,
      timezoneOptions: [tz, "UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Asia/Kolkata"],
      form: {
        name: "",
        email: "",
        phone: "",
        notes: "",
        answers: {},
      },
      formError: "",
      submitting: false,
      confirmation: null,
      statusText: "",
    };
  }

  window.BookingPageRenderer = {
    render,
    mount,
    defaultState,
    resolveSection,
    toDateKey,
    parseDateKey,
    monthLabel,
    humanDateLabel,
    getCalendarGrid,
  };
})();
