function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getUsernameFromPath() {
  const segments = window.location.pathname.split("/").filter(Boolean);
  return segments[0] || "";
}

function eventBookingUrl(username, eventType) {
  const slug = String(eventType?.slug || "").trim();
  if (!slug) return "#";
  return `/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

function createEventItem(username, eventType, ctaLabel) {
  const duration = Number(eventType?.durationMinutes) || 30;
  const location = eventType?.locationType
    ? String(eventType.locationType).replace(/_/g, " ")
    : "custom";
  return `
    <article class="event-item">
      <h3>${escapeHtml(eventType?.title || "Meeting")}</h3>
      <p>${duration} min · ${escapeHtml(location)}</p>
      <a href="${eventBookingUrl(username, eventType)}">${escapeHtml(ctaLabel || "Book now")}</a>
    </article>
  `;
}

function createServiceItem(item) {
  return `
    <article class="service-item">
      <h3>${escapeHtml(item?.title || "Service")}</h3>
      <p>${escapeHtml(item?.description || "Custom booking support for your business needs.")}</p>
    </article>
  `;
}

function createGalleryItem(item, fallbackAlt) {
  const src = String(item?.url || "").trim();
  if (!src) return "";
  const alt = String(item?.alt || fallbackAlt || "Portfolio image").trim();
  return `
    <figure class="gallery-item">
      <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" />
    </figure>
  `;
}

async function fetchLanding(username) {
  const response = await fetch(`/api/public/landing/${encodeURIComponent(username)}`, {
    headers: { Accept: "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Landing page not found");
  }
  return payload.landingPage || null;
}

async function submitLead(username, formData) {
  const response = await fetch(
    `/api/public/landing/${encodeURIComponent(username)}/leads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(formData),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Could not submit lead");
  }
  return payload.lead;
}

function renderLanding(root, username, data) {
  const template = document.getElementById("landing-template");
  if (!(template instanceof HTMLTemplateElement)) return;

  const fragment = template.content.cloneNode(true);
  const coverNode = fragment.querySelector("[data-cover]");
  const profileNode = fragment.querySelector("[data-profile-image]");
  const displayNameNode = fragment.querySelector("[data-display-name]");
  const headlineNode = fragment.querySelector("[data-headline]");
  const subheadlineNode = fragment.querySelector("[data-subheadline]");
  const aboutNode = fragment.querySelector("[data-about]");
  const eventListNode = fragment.querySelector("[data-event-list]");
  const servicesNode = fragment.querySelector("[data-services]");
  const galleryNode = fragment.querySelector("[data-gallery]");
  const eventSelectNode = fragment.querySelector("[data-event-select]");
  const form = fragment.querySelector("#lead-form");
  const statusNode = fragment.querySelector("#lead-status");

  const primaryColor = data.primaryColor || "#1a73e8";
  if (coverNode instanceof HTMLElement) {
    if (data.coverImageUrl) {
      coverNode.style.background = `linear-gradient(130deg, rgba(22, 94, 215, 0.6), rgba(129, 87, 247, 0.55), rgba(220, 86, 247, 0.5)), url("${data.coverImageUrl}") center / cover`;
    } else {
      coverNode.style.background = `linear-gradient(120deg, ${primaryColor}, rgba(129, 87, 247, 0.9), rgba(220, 86, 247, 0.88))`;
    }
  }

  if (profileNode instanceof HTMLImageElement) {
    profileNode.src = data.profileImageUrl || "https://placehold.co/160x160/png";
    profileNode.alt = `${data.displayName || "Profile"} picture`;
  }
  if (displayNameNode) displayNameNode.textContent = data.displayName || username;
  if (headlineNode) headlineNode.textContent = data.headline || `Book time with ${data.displayName || username}`;
  if (subheadlineNode) subheadlineNode.textContent = data.subheadline || "";
  if (aboutNode) aboutNode.textContent = data.aboutText || "";

  const eventTypes = Array.isArray(data.eventTypes) ? data.eventTypes : [];
  if (eventListNode) {
    eventListNode.innerHTML = eventTypes.length
      ? eventTypes
          .map((item) => createEventItem(username, item, data.ctaLabel))
          .join("")
      : `<p class="fallback-text">No event types are published yet.</p>`;
  }

  const services = Array.isArray(data.services) ? data.services : [];
  if (servicesNode) {
    servicesNode.innerHTML = services.length
      ? services.map(createServiceItem).join("")
      : `<p class="fallback-text">Services will appear here once configured by the business owner.</p>`;
  }

  const gallery = Array.isArray(data.gallery) ? data.gallery : [];
  if (galleryNode) {
    galleryNode.innerHTML = gallery.length
      ? gallery
          .map((item, idx) => createGalleryItem(item, `${data.displayName || "Portfolio"} ${idx + 1}`))
          .join("")
      : `<p class="fallback-text">Portfolio images are coming soon.</p>`;
  }

  if (eventSelectNode) {
    eventSelectNode.innerHTML = `
      <option value="">General inquiry</option>
      ${eventTypes
        .map(
          (item) =>
            `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)} (${Number(
              item.durationMinutes
            ) || 30} min)</option>`
        )
        .join("")}
    `;
  }

  if (form instanceof HTMLFormElement) {
    if (data.contactFormEnabled === false) {
      form.replaceWith(
        Object.assign(document.createElement("p"), {
          className: "fallback-text",
          textContent: "Contact form is currently disabled for this profile.",
        })
      );
    } else {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!(statusNode instanceof HTMLElement)) return;

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton instanceof HTMLButtonElement) submitButton.disabled = true;
        statusNode.textContent = "Submitting...";

        try {
          const raw = new FormData(form);
          await submitLead(username, {
            name: String(raw.get("name") || "").trim(),
            email: String(raw.get("email") || "").trim(),
            company: String(raw.get("company") || "").trim(),
            phone: String(raw.get("phone") || "").trim(),
            eventTypeId: String(raw.get("eventTypeId") || "").trim(),
            query: String(raw.get("query") || "").trim(),
            sourceUrl: window.location.href,
          });

          form.reset();
          statusNode.textContent = "Thanks! Your query has been sent.";
          statusNode.style.color = "#157347";
        } catch (error) {
          statusNode.textContent = error?.message || "Could not submit query";
          statusNode.style.color = "#b42318";
        } finally {
          if (submitButton instanceof HTMLButtonElement) submitButton.disabled = false;
        }
      });
    }
  }

  root.replaceChildren(fragment);
}

function renderError(root, message) {
  root.innerHTML = `<section class="error-state"><h1>Page not available</h1><p>${escapeHtml(
    message
  )}</p></section>`;
}

async function boot() {
  const root = document.getElementById("landing-root");
  if (!(root instanceof HTMLElement)) return;

  const username = getUsernameFromPath();
  if (!username) {
    renderError(root, "Invalid business profile URL.");
    return;
  }

  try {
    const payload = await fetchLanding(username);
    renderLanding(root, username, payload);
  } catch (error) {
    renderError(root, error?.message || "Could not load landing page.");
  }
}

boot();
