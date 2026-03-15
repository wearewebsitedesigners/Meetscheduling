(function landingPageRendererIife() {
  const DEFAULT_THEME = {
    primary: "#7c3aed",
    secondary: "#d946ef",
    background: "#f6f5fb",
    surface: "#ffffff",
    text: "#171a2b",
    muted: "#5f6377",
    border: "#e4ddf8",
    font: "Inter",
    radius: 14,
    sectionPadding: 52,
    buttonStyle: "solid",
    shadowStyle: "soft",
    animationsEnabled: true,
    animationStyle: "subtle",
  };

  const SECTION_ORDER_FALLBACK = [
    "marquee",
    "header",
    "imageBanner",
    "slideShow",
    "hero",
    "text",
    "imageShowcase",
    "spotlightGrid",
    "productGrid",
    "servicesMenu",
    "stylists",
    "customerReviewBlock",
    "reviewsMarquee",
    "newsletterSignup",
    "instagramGrid",
    "contactMap",
    "faq",
    "footer",
  ];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeText(value, fallback, max) {
    if (value === undefined || value === null) return fallback || "";
    const text = String(value).trim();
    if (!text) return "";
    if (!max) return text;
    return text.slice(0, max);
  }

  function safeUrl(value) {
    const raw = safeText(value, "");
    if (!raw) return "";
    if (
      raw.startsWith("#") ||
      raw.startsWith("/") ||
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:")
    ) {
      return raw;
    }
    try {
      return new URL(raw, window.location.origin).toString();
    } catch {
      return "";
    }
  }

  function normalizeColor(value, fallback) {
    const raw = safeText(value, fallback || "#7c3aed");
    const normalized = raw.startsWith("#") ? raw : `#${raw}`;
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return fallback || "#7c3aed";
    return normalized.toLowerCase();
  }

  function toRgb(hex) {
    const clean = normalizeColor(hex, "#7c3aed").slice(1);
    const num = Number.parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  function alpha(hex, amount) {
    const rgb = toRgb(hex);
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${amount})`;
  }

  function clamp(value, min, max, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < min) return min;
    if (parsed > max) return max;
    return parsed;
  }

  function resolveFontStack(font) {
    const value = safeText(font, DEFAULT_THEME.font);
    if (value === "DM Sans") return "'DM Sans', 'Inter', system-ui, -apple-system, sans-serif";
    if (value === "Sora") return "'Sora', 'Inter', system-ui, -apple-system, sans-serif";
    if (value === "System") return "system-ui, -apple-system, 'Segoe UI', sans-serif";
    return "'Inter', 'DM Sans', system-ui, -apple-system, sans-serif";
  }

  function normalizeTheme(theme) {
    const source = theme && typeof theme === "object" ? theme : {};
    return {
      primary: normalizeColor(source.primary, DEFAULT_THEME.primary),
      secondary: normalizeColor(source.secondary, DEFAULT_THEME.secondary),
      background: normalizeColor(source.background, DEFAULT_THEME.background),
      surface: normalizeColor(source.surface, DEFAULT_THEME.surface),
      text: normalizeColor(source.text, DEFAULT_THEME.text),
      muted: normalizeColor(source.muted, DEFAULT_THEME.muted),
      border: normalizeColor(source.border, DEFAULT_THEME.border),
      font: safeText(source.font, DEFAULT_THEME.font, 40),
      radius: clamp(source.radius, 0, 32, DEFAULT_THEME.radius),
      sectionPadding: clamp(source.sectionPadding, 20, 120, DEFAULT_THEME.sectionPadding),
      buttonStyle: ["solid", "outline", "gradient"].includes(safeText(source.buttonStyle, "", 20))
        ? safeText(source.buttonStyle, DEFAULT_THEME.buttonStyle, 20)
        : DEFAULT_THEME.buttonStyle,
      shadowStyle: ["none", "minimal", "soft", "medium"].includes(
        safeText(source.shadowStyle, "", 20)
      )
        ? safeText(source.shadowStyle, DEFAULT_THEME.shadowStyle, 20)
        : DEFAULT_THEME.shadowStyle,
      animationsEnabled:
        source.animationsEnabled === undefined
          ? DEFAULT_THEME.animationsEnabled
          : Boolean(source.animationsEnabled),
      animationStyle: ["subtle", "medium", "bold"].includes(safeText(source.animationStyle, "", 20))
        ? safeText(source.animationStyle, DEFAULT_THEME.animationStyle, 20)
        : DEFAULT_THEME.animationStyle,
    };
  }

  function shadowValue(shadowStyle) {
    if (shadowStyle === "none") return "none";
    if (shadowStyle === "minimal") return "0 4px 14px rgba(15, 23, 42, 0.06)";
    if (shadowStyle === "medium") return "0 18px 42px rgba(15, 23, 42, 0.16)";
    return "0 12px 34px rgba(15, 23, 42, 0.1)";
  }

  function themeCssVars(theme) {
    return [
      `--lp-primary:${theme.primary}`,
      `--lp-secondary:${theme.secondary}`,
      `--lp-bg:${theme.background}`,
      `--lp-surface:${theme.surface}`,
      `--lp-text:${theme.text}`,
      `--lp-muted:${theme.muted}`,
      `--lp-border:${theme.border}`,
      `--lp-radius:${theme.radius}px`,
      `--lp-section-pad:${theme.sectionPadding}px`,
      `--lp-font:${resolveFontStack(theme.font)}`,
      `--lp-shadow:${shadowValue(theme.shadowStyle)}`,
      `--lp-primary-soft:${alpha(theme.primary, 0.12)}`,
      `--lp-primary-soft-strong:${alpha(theme.primary, 0.18)}`,
      `--lp-primary-ring:${alpha(theme.primary, 0.32)}`,
      `--lp-button-style:${theme.buttonStyle}`,
      `--lp-animation:${theme.animationsEnabled ? "1" : "0"}`,
      `--lp-animation-strength:${theme.animationStyle}`,
    ].join(";");
  }

  function editableTag(mode, path, value, className, tagName) {
    const tag = safeText(tagName, "span");
    const text = escapeHtml(safeText(value, ""));
    const klass = safeText(className, "");
    if (mode !== "preview") {
      return `<${tag} class="${klass}">${text}</${tag}>`;
    }
    return `<${tag} class="${klass} lp-editable" contenteditable="true" spellcheck="false" data-edit-path="${escapeHtml(
      path
    )}" role="textbox">${text}</${tag}>`;
  }

  function sectionWrapper(section, mode, selectedSectionId, index, bodyHtml) {
    if (!section || section.enabled === false || section.visible === false) return "";
    const isSelected = mode === "preview" && String(section.id) === String(selectedSectionId);
    return `<section class="lp-section ${isSelected ? "is-selected" : ""}" data-lp-section="${
      escapeHtml(section.id)
    }" data-lp-index="${index}" data-lp-type="${escapeHtml(section.type)}">${bodyHtml}</section>`;
  }

  function formatPrice(cents) {
    const amount = Number(cents);
    if (!Number.isFinite(amount)) return "$0.00";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100);
  }

  function formatDuration(minutes) {
    const total = Math.max(0, Number(minutes) || 0);
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours}h ${mins}m`;
    if (hours) return `${hours}h`;
    return `${mins}m`;
  }

  function visibleSections(config) {
    const list = Array.isArray(config && config.sections) ? config.sections : [];
    if (list.length) return list;
    return SECTION_ORDER_FALLBACK.map((type, index) => ({
      id: `${type}-${index + 1}`,
      type,
      enabled: true,
      settings: {},
    }));
  }

  function resolveServiceCatalog(section, categories, services) {
    const safeCategories = Array.isArray(categories) ? categories.filter((item) => item && item.isActive !== false) : [];
    const safeServices = Array.isArray(services) ? services.filter((item) => item && item.isActive !== false) : [];

    const requestedIds = Array.isArray(section?.settings?.categoryIds)
      ? section.settings.categoryIds.map((id) => String(id))
      : [];

    const activeCategories = requestedIds.length
      ? safeCategories.filter((category) => requestedIds.includes(String(category.id)))
      : safeCategories;

    const fallbackCategory = activeCategories[0] || safeCategories[0] || null;
    const categoryIds = activeCategories.length
      ? activeCategories.map((category) => String(category.id))
      : fallbackCategory
        ? [String(fallbackCategory.id)]
        : [];

    return {
      categories: activeCategories,
      services: safeServices.filter((item) =>
        !categoryIds.length ? true : categoryIds.includes(String(item.categoryId || ""))
      ),
      categoryIds,
    };
  }

  function renderMarquee(section, mode, index) {
    const settings = section.settings || {};
    const items = Array.isArray(settings.items) ? settings.items.filter(Boolean).slice(0, 16) : [];
    const speed = clamp(settings.speed, 10, 80, 28);
    const trackItems = items.length ? items : ["Premium quality hair", "Book your appointment today"];
    const textClass = settings.uppercase ? "is-uppercase" : "";
    return `
      <div class="lp-marquee-shell" style="--lp-marquee-speed:${speed}s;">
        <div class="lp-marquee-track">
          ${trackItems
            .map(
              (item, itemIndex) => `
                <span class="lp-marquee-item ${textClass}">${
                  mode === "preview"
                    ? editableTag(
                        mode,
                        `sections.${index}.settings.items.${itemIndex}`,
                        safeText(item, ""),
                        "lp-marquee-text",
                        "span"
                      )
                    : `<span class="lp-marquee-text">${escapeHtml(safeText(item, ""))}</span>`
                }</span>
              `
            )
            .join("")}
          ${trackItems
            .map(
              (item) =>
                `<span class="lp-marquee-item ${textClass}" aria-hidden="true"><span class="lp-marquee-text">${escapeHtml(
                  safeText(item, "")
                )}</span></span>`
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderImageBanner(section, mode, index) {
    const settings = section.settings || {};
    const align = safeText(settings.align, "left");
    const height = safeText(settings.height, "lg");
    const overlayOpacity = clamp(settings.overlayOpacity, 0, 80, 22);
    const background = safeUrl(settings.backgroundImageUrl);
    const mobileBackground = safeUrl(settings.mobileImageUrl);
    const buttonHref = safeUrl(settings.buttonHref) || "#services";
    return `
      <div class="lp-shell lp-image-banner-shell lp-banner-${escapeHtml(align)} lp-banner-height-${escapeHtml(
      height
    )}" style="${
      background ? `--lp-banner-bg:url('${escapeHtml(background)}');` : ""
    }${mobileBackground ? `--lp-banner-bg-mobile:url('${escapeHtml(mobileBackground)}');` : ""}--lp-banner-overlay:${overlayOpacity /
      100};">
        <div class="lp-image-banner-overlay"></div>
        <div class="lp-image-banner-content">
          ${
            settings.pretitle
              ? editableTag(
                  mode,
                  `sections.${index}.settings.pretitle`,
                  settings.pretitle,
                  "lp-image-banner-pretitle",
                  "span"
                )
              : ""
          }
          ${editableTag(
            mode,
            `sections.${index}.settings.title`,
            safeText(settings.title, "Image banner"),
            "lp-image-banner-title",
            "h2"
          )}
          ${
            settings.subtitle
              ? editableTag(
                  mode,
                  `sections.${index}.settings.subtitle`,
                  settings.subtitle,
                  "lp-image-banner-subtitle",
                  "p"
                )
              : ""
          }
          ${
            settings.buttonLabel
              ? `<a class="lp-btn lp-btn-primary" href="${escapeHtml(buttonHref)}">${escapeHtml(
                  safeText(settings.buttonLabel, "Book now")
                )}</a>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderSlideShow(section, mode, index) {
    const settings = section.settings || {};
    const slides = Array.isArray(settings.slides) ? settings.slides.filter(Boolean).slice(0, 12) : [];
    const autoplay = settings.autoplay ? "is-autoplay" : "";
    const interval = clamp(settings.intervalSeconds, 3, 12, 6);
    return `
      <div class="lp-shell lp-slideshow-shell ${autoplay}" style="--lp-slideshow-interval:${interval}s;">
        ${
          settings.title
            ? editableTag(mode, `sections.${index}.settings.title`, settings.title, "lp-section-title", "h2")
            : ""
        }
        ${
          settings.subtitle
            ? editableTag(mode, `sections.${index}.settings.subtitle`, settings.subtitle, "lp-section-copy", "p")
            : ""
        }
        <div class="lp-slideshow-track">
          ${slides
            .map(
              (slide, slideIndex) => `
                <article class="lp-slide-card">
                  <div class="lp-slide-media">
                    ${
                      slide.imageUrl
                        ? `<img src="${escapeHtml(safeUrl(slide.imageUrl))}" alt="${escapeHtml(
                            safeText(slide.title, `Slide ${slideIndex + 1}`)
                          )}" loading="lazy" />`
                        : `<div class="lp-slide-fallback">Slide ${slideIndex + 1}</div>`
                    }
                  </div>
                  <div class="lp-slide-copy">
                    ${
                      slide.title
                        ? `<h3>${escapeHtml(safeText(slide.title, ""))}</h3>`
                        : ""
                    }
                    ${
                      slide.subtitle
                        ? `<p>${escapeHtml(safeText(slide.subtitle, ""))}</p>`
                        : ""
                    }
                    ${
                      slide.buttonLabel
                        ? `<a class="lp-btn lp-btn-secondary" href="${escapeHtml(
                            safeUrl(slide.buttonHref) || "#services"
                          )}">${escapeHtml(safeText(slide.buttonLabel, "View"))}</a>`
                        : ""
                    }
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderSpotlightGrid(section, mode, index) {
    const settings = section.settings || {};
    const cards = Array.isArray(settings.cards) ? settings.cards.filter(Boolean).slice(0, 18) : [];
    const columns = clamp(settings.columnsDesktop, 1, 4, 3);
    return `
      <div class="lp-shell lp-spotlight-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Spotlight"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-spotlight-grid" style="--lp-spotlight-columns:${columns};">
          ${cards
            .map(
              (card) => `
                <article class="lp-spotlight-card">
                  ${
                    card.imageUrl
                      ? `<img src="${escapeHtml(safeUrl(card.imageUrl))}" alt="${escapeHtml(
                          safeText(card.title, "Spotlight")
                        )}" loading="lazy" />`
                      : '<div class="lp-spotlight-fallback"></div>'
                  }
                  <div class="lp-spotlight-content">
                    <h3>${escapeHtml(safeText(card.title, "Spotlight"))}</h3>
                    ${
                      card.description
                        ? `<p>${escapeHtml(safeText(card.description, ""))}</p>`
                        : ""
                    }
                    ${
                      card.buttonLabel
                        ? `<a class="lp-btn lp-btn-secondary lp-btn-small" href="${escapeHtml(
                            safeUrl(card.buttonHref) || "#services"
                          )}">${escapeHtml(safeText(card.buttonLabel, "Explore"))}</a>`
                        : ""
                    }
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderProductGrid(section, mode, index, data) {
    const settings = section.settings || {};
    const list = Array.isArray(data.services) ? data.services.filter((item) => item && item.isActive !== false) : [];
    const limit = clamp(settings.limit, 1, 24, 8);
    const columns = clamp(settings.columnsDesktop, 1, 4, 4);
    const items = list.slice(0, limit);
    return `
      <div class="lp-shell lp-product-grid-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Featured services"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-product-grid" style="--lp-product-columns:${columns};">
          ${items
            .map((item) => {
              const href = safeUrl(item.bookUrl || data.page?.bookUrl || "#");
              return `
                <article class="lp-product-card">
                  <div class="lp-product-media">
                    ${
                      item.imageUrl
                        ? `<img src="${escapeHtml(safeUrl(item.imageUrl))}" alt="${escapeHtml(
                            safeText(item.name, "Service")
                          )}" loading="lazy" />`
                        : `<div class="lp-product-fallback">${escapeHtml(
                            safeText(item.name || "S", "S").slice(0, 1).toUpperCase()
                          )}</div>`
                    }
                  </div>
                  <div class="lp-product-content">
                    <h3>${escapeHtml(safeText(item.name, "Service"))}</h3>
                    ${
                      settings.showDescription && item.description
                        ? `<p>${escapeHtml(safeText(item.description, "", 220))}</p>`
                        : ""
                    }
                    <div class="lp-product-meta">
                      ${
                        settings.showDuration
                          ? `<span>${escapeHtml(formatDuration(item.durationMinutes))}</span>`
                          : ""
                      }
                      ${
                        settings.showPrice
                          ? `<strong>${escapeHtml(formatPrice(item.priceCents))}</strong>`
                          : ""
                      }
                    </div>
                    <a class="lp-btn lp-btn-primary lp-btn-small" href="${escapeHtml(href)}">${escapeHtml(
                safeText(settings.buttonLabel, "Book")
              )}</a>
                  </div>
                </article>
              `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  function renderCustomerReviewBlock(section, mode, index, data) {
    const settings = section.settings || {};
    const reviews = Array.isArray(data.reviews) ? data.reviews.filter(Boolean) : [];
    const columns = clamp(settings.columnsDesktop, 1, 3, 3);
    return `
      <div class="lp-shell lp-customer-reviews-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "What our clients say"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-customer-reviews-grid" style="--lp-review-columns:${columns};">
          ${reviews
            .map(
              (review) => `
                <article class="lp-customer-review-card">
                  <header>
                    <h3>${escapeHtml(safeText(review.name, "Customer"))}</h3>
                    ${
                      settings.showStars
                        ? `<p class="lp-stars">${starsMarkup(review.rating)}</p>`
                        : ""
                    }
                  </header>
                  <p>${escapeHtml(safeText(review.text, "", 520))}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderNewsletterSignup(section, mode, index) {
    const settings = section.settings || {};
    const background = safeUrl(settings.backgroundImageUrl);
    return `
      <div class="lp-shell lp-newsletter-shell" ${
        background ? `style="--lp-newsletter-bg:url('${escapeHtml(background)}');"` : ""
      }>
        <div class="lp-newsletter-card">
          ${editableTag(
            mode,
            `sections.${index}.settings.title`,
            safeText(settings.title, "Newsletter sign up"),
            "lp-section-title",
            "h2"
          )}
          ${
            settings.subtitle
              ? editableTag(
                  mode,
                  `sections.${index}.settings.subtitle`,
                  settings.subtitle,
                  "lp-section-copy",
                  "p"
                )
              : ""
          }
          <form class="lp-newsletter-form" action="javascript:void(0)" novalidate>
            <input
              type="email"
              class="lp-search-input"
              placeholder="${escapeHtml(safeText(settings.placeholder, "Enter your email"))}"
              aria-label="Email address"
            />
            <button type="submit" class="lp-btn lp-btn-primary">${escapeHtml(
              safeText(settings.buttonLabel, "Submit")
            )}</button>
          </form>
          ${
            settings.note
              ? editableTag(
                  mode,
                  `sections.${index}.settings.note`,
                  settings.note,
                  "lp-newsletter-note",
                  "p"
                )
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderInstagramGrid(section, mode, index) {
    const settings = section.settings || {};
    const images = Array.isArray(settings.images) ? settings.images.filter((item) => item && item.url) : [];
    const columns = clamp(settings.columnsDesktop, 2, 6, 5);
    return `
      <div class="lp-shell lp-instagram-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Instagram"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-instagram-grid" style="--lp-instagram-columns:${columns};">
          ${images
            .map(
              (item, itemIndex) => `
                <a class="lp-instagram-card" href="${escapeHtml(
                  safeUrl(item.link) || "#"
                )}" ${safeUrl(item.link) ? 'target="_blank" rel="noopener"' : ""}>
                  <img src="${escapeHtml(safeUrl(item.url))}" alt="${escapeHtml(
                safeText(settings.handle, `Instagram ${itemIndex + 1}`)
              )}" loading="lazy" />
                </a>
              `
            )
            .join("")}
        </div>
        ${
          settings.handle
            ? editableTag(
                mode,
                `sections.${index}.settings.handle`,
                settings.handle,
                "lp-instagram-handle",
                "p"
              )
            : ""
        }
      </div>
    `;
  }

  function renderHeader(section, mode, index) {
    const settings = section.settings || {};
    const logoUrl = safeUrl(settings.logoUrl);
    const brandDisplay = ["image", "text"].includes(safeText(settings.brandDisplay, "", 12))
      ? safeText(settings.brandDisplay, "image", 12)
      : "image";
    const showImageBrand = brandDisplay === "image" && Boolean(logoUrl);
    const showTextBrand = brandDisplay === "text" || !showImageBrand;
    const styleVariant = ["style1", "style2", "style3", "style4", "style5"].includes(
      safeText(settings.styleVariant, "", 16)
    )
      ? safeText(settings.styleVariant, "style1", 16)
      : "style1";
    const desktopMenuMode = ["inline", "center"].includes(safeText(settings.desktopMenuMode, "", 16))
      ? safeText(settings.desktopMenuMode, "center", 16)
      : "center";
    const mobileMenuMode = ["drawer", "inline"].includes(safeText(settings.mobileMenuMode, "", 16))
      ? safeText(settings.mobileMenuMode, "drawer", 16)
      : "drawer";
    const logoWidth = clamp(settings.logoWidth, 28, 240, 46);
    const logoHeight = clamp(settings.logoHeight, 28, 140, 46);
    const links = Array.isArray(settings.navLinks) ? settings.navLinks : [];
    const navItems = links
      .map((item, linkIndex) => {
        if (!item || typeof item !== "object") return "";
        const label = safeText(item.label, "", 40);
        if (!label) return "";
        const href = safeUrl(item.href) || "#";
        return `<a href="${escapeHtml(href)}" class="lp-nav-link">${editableTag(
          mode,
          `sections.${index}.settings.navLinks.${linkIndex}.label`,
          label,
          "lp-inline-link",
          "span"
        )}</a>`;
      })
      .join("");
    const ctaHref = safeUrl(settings.ctaHref) || "#services";
    const searchMarkup = settings.showSearch
      ? `<input class="lp-search-input" type="search" placeholder="${escapeHtml(
          safeText(settings.searchPlaceholder, "Search services...")
        )}" />`
      : "";
    const ctaMarkup = `<a class="lp-btn lp-btn-primary" href="${escapeHtml(ctaHref)}">${escapeHtml(
      safeText(settings.ctaLabel, "Book Now")
    )}</a>`;
    return `
      <div class="lp-shell lp-header-shell lp-header-variant-${escapeHtml(styleVariant)} lp-desktop-menu-${escapeHtml(
        desktopMenuMode
      )} lp-mobile-menu-${escapeHtml(mobileMenuMode)} ${
      settings.sticky ? "is-sticky" : ""
    }" id="top" style="--lp-logo-width:${logoWidth}px;--lp-logo-height:${logoHeight}px;">
        <div class="lp-brand-wrap">
          ${
            showImageBrand
              ? `<img class="lp-brand-logo" src="${escapeHtml(logoUrl)}" alt="" />`
              : ""
          }
          ${
            showTextBrand
              ? editableTag(
                  mode,
                  `sections.${index}.settings.brandName`,
                  safeText(settings.brandName, "MeetScheduling"),
                  "lp-brand-name",
                  "span"
                )
              : ""
          }
        </div>
        <div class="lp-header-actions">
          ${navItems ? `<nav class="lp-nav lp-header-nav">${navItems}</nav>` : '<span class="lp-header-nav"></span>'}
          <div class="lp-header-tools">
            ${searchMarkup}
            ${ctaMarkup}
          </div>
        </div>
        ${
          mobileMenuMode === "drawer"
            ? `
          <details class="lp-mobile-menu">
            <summary class="lp-mobile-menu-toggle" aria-label="Open menu">
              <span class="lp-mobile-menu-toggle-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
              </span>
              <span>Menu</span>
            </summary>
            <div class="lp-mobile-menu-panel">
              ${navItems ? `<nav class="lp-nav lp-mobile-nav">${navItems}</nav>` : ""}
              <div class="lp-mobile-tools">
                ${searchMarkup}
                ${ctaMarkup}
              </div>
            </div>
          </details>
        `
            : ""
        }
      </div>
    `;
  }

  function renderHero(section, mode, index) {
    const settings = section.settings || {};
    const background = safeUrl(settings.backgroundImageUrl);
    const alignClass = safeText(settings.align, "left") === "center" ? "lp-hero-center" : "lp-hero-left";
    return `
      <div class="lp-shell lp-hero-shell ${alignClass}" style="${
      background ? `--lp-hero-bg:url('${escapeHtml(background)}');` : ""
    }">
        ${
          settings.badge
            ? editableTag(mode, `sections.${index}.settings.badge`, settings.badge, "lp-hero-badge", "span")
            : ""
        }
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Where beauty meets precision"),
          "lp-hero-title",
          "h1"
        )}
        ${editableTag(
          mode,
          `sections.${index}.settings.subtitle`,
          safeText(settings.subtitle, ""),
          "lp-hero-subtitle",
          "p"
        )}
        <div class="lp-hero-cta">
          <a class="lp-btn lp-btn-primary" href="${escapeHtml(
            safeUrl(settings.primaryButtonHref) || "#services"
          )}">${escapeHtml(safeText(settings.primaryButtonLabel, "Book consultation"))}</a>
          <a class="lp-btn lp-btn-secondary" href="${escapeHtml(
            safeUrl(settings.secondaryButtonHref) || "#services"
          )}">${escapeHtml(safeText(settings.secondaryButtonLabel, "View services"))}</a>
        </div>
      </div>
    `;
  }

  function renderTextSection(section, mode, index) {
    const settings = section.settings || {};
    return `
      <div class="lp-shell lp-text-shell ${safeText(settings.align, "left") === "center" ? "is-center" : ""}">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "About"),
          "lp-section-title",
          "h2"
        )}
        ${editableTag(
          mode,
          `sections.${index}.settings.body`,
          safeText(settings.body, ""),
          "lp-section-copy",
          "p"
        )}
      </div>
    `;
  }

  function renderImageShowcase(section, mode, index) {
    const settings = section.settings || {};
    const images = Array.isArray(settings.images) ? settings.images.filter((item) => item && item.url) : [];
    const columnsDesktop = clamp(settings.columnsDesktop, 1, 4, 3);
    const columnsMobile = clamp(settings.columnsMobile, 1, 2, 1);

    return `
      <div class="lp-shell lp-gallery-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Gallery"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-gallery-grid" style="--lp-gallery-desktop:${columnsDesktop};--lp-gallery-mobile:${columnsMobile};">
          ${images
            .map(
              (item, imageIndex) => `
                <figure class="lp-gallery-card">
                  <img src="${escapeHtml(safeUrl(item.url))}" alt="${escapeHtml(
                safeText(item.alt, `Gallery image ${imageIndex + 1}`)
              )}" loading="lazy" />
                </figure>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderServicesMenu(section, mode, index, data) {
    const settings = section.settings || {};
    const isStacked = safeText(settings.viewMode, "tabs") === "stacked";
    const catalog = resolveServiceCatalog(section, data.categories, data.services);
    const categoryTabs = catalog.categories
      .map(
        (category) => `
          <button type="button" class="lp-service-tab" data-lp-service-tab="${escapeHtml(
            String(section.id)
          )}" data-category-id="${escapeHtml(String(category.id))}">
            ${escapeHtml(safeText(category.name, "Category"))}
          </button>
        `
      )
      .join("");

    const cards = catalog.services
      .map((service) => {
        const href = safeUrl(service.bookUrl || data.page?.bookUrl || "#");
        return `
          <article class="lp-service-card" data-lp-service-card="${escapeHtml(
            String(section.id)
          )}" data-category-id="${escapeHtml(String(service.categoryId || ""))}">
            ${
              settings.showPhotos
                ? `<div class="lp-service-image-wrap">${
                    service.imageUrl
                      ? `<img src="${escapeHtml(safeUrl(service.imageUrl))}" alt="${escapeHtml(
                          safeText(service.name, "Service")
                        )}" loading="lazy" />`
                      : `<div class="lp-service-image-fallback">${escapeHtml(
                          safeText(service.name || "Service", "S").slice(0, 1).toUpperCase()
                        )}</div>`
                  }</div>`
                : ""
            }
            <div class="lp-service-content">
              <h3>${escapeHtml(safeText(service.name, "Service"))}</h3>
              ${
                service.description
                  ? `<p>${escapeHtml(safeText(service.description, "", 240))}</p>`
                  : ""
              }
              <div class="lp-service-meta">
                ${
                  settings.showDuration
                    ? `<span>${escapeHtml(formatDuration(service.durationMinutes))}</span>`
                    : ""
                }
                ${
                  settings.showPrice
                    ? `<strong>${escapeHtml(formatPrice(service.priceCents))}</strong>`
                    : ""
                }
                <a class="lp-btn lp-btn-small lp-book-btn" href="${escapeHtml(href)}">${escapeHtml(
          safeText(settings.bookButtonLabel, "Book")
        )}</a>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    return `
      <div class="lp-shell lp-services-shell" id="services">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Service Menu"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        ${
          settings.showSearch
            ? `<input class="lp-search-input lp-service-search" type="search" placeholder="Search services..." data-lp-service-search="${escapeHtml(
                String(section.id)
              )}" />`
            : ""
        }
        ${categoryTabs && !isStacked ? `<div class="lp-service-tabs">${categoryTabs}</div>` : ""}
        <div class="lp-services-grid ${isStacked ? "is-stacked" : ""}" style="--lp-service-columns:${clamp(
      isStacked ? 1 : settings.columnsDesktop,
      1,
      3,
      2
    )};--lp-service-radius:${clamp(
      settings.cardRadius,
      0,
      30,
      14
    )}px;">
          ${cards || '<p class="lp-empty">No active services available right now.</p>'}
        </div>
        ${
          settings.showViewAll
            ? `<div class="lp-section-cta-wrap"><a class="lp-btn lp-btn-secondary" href="#services">${escapeHtml(
                safeText(settings.viewAllLabel, "View All Services")
              )}</a></div>`
            : ""
        }
      </div>
    `;
  }

  function renderStylists(section, mode, index) {
    const settings = section.settings || {};
    const members = Array.isArray(settings.members) ? settings.members.filter(Boolean) : [];
    return `
      <div class="lp-shell lp-stylists-shell" id="stylists">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Meet the Stylists"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-stylists-grid">
          ${members
            .map(
              (member) => `
                <article class="lp-stylist-card">
                  ${
                    member.imageUrl
                      ? `<img src="${escapeHtml(safeUrl(member.imageUrl))}" alt="${escapeHtml(
                          safeText(member.name, "Stylist")
                        )}" loading="lazy" />`
                      : '<div class="lp-stylist-avatar-fallback"></div>'
                  }
                  <h3>${escapeHtml(safeText(member.name, "Stylist"))}</h3>
                  <p class="lp-stylist-role">${escapeHtml(safeText(member.role, ""))}</p>
                  ${
                    member.bio
                      ? `<p class="lp-stylist-bio">${escapeHtml(safeText(member.bio, "", 220))}</p>`
                      : ""
                  }
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function starsMarkup(rating) {
    const score = clamp(rating, 1, 5, 5);
    return Array.from({ length: 5 }, (_, index) => (index < score ? "&#9733;" : "&#9734;")).join("");
  }

  function renderReviews(section, mode, index, data) {
    const settings = section.settings || {};
    const reviews = Array.isArray(data.reviews) ? data.reviews.filter(Boolean) : [];
    const rows = clamp(settings.rows, 1, 3, 1);
    const speed = clamp(settings.speed, 10, 80, 35);
    return `
      <div class="lp-shell lp-reviews-shell" id="reviews" data-lp-reviews="${escapeHtml(
      String(section.id)
    )}" style="--lp-review-speed:${speed}s;--lp-review-rows:${rows};">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Loved by clients"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-review-track-wrap ${
      settings.pauseOnHover ? "pause-on-hover" : ""
    }">
          <div class="lp-review-track">
            ${reviews
              .map(
                (review) => `
                  <article class="lp-review-card">
                    <div class="lp-review-head">
                      ${
                        review.avatarUrl
                          ? `<img src="${escapeHtml(safeUrl(review.avatarUrl))}" alt="${escapeHtml(
                              safeText(review.name, "Client")
                            )}" loading="lazy" />`
                          : `<span class="lp-review-avatar-fallback">${escapeHtml(
                              safeText(review.name, "C").slice(0, 1).toUpperCase()
                            )}</span>`
                      }
                      <div>
                        <h3>${escapeHtml(safeText(review.name, "Client"))}</h3>
                        ${
                          settings.showStars
                            ? `<p class="lp-stars">${starsMarkup(review.rating)}</p>`
                            : ""
                        }
                      </div>
                    </div>
                    <p class="lp-review-text">${escapeHtml(safeText(review.text, "", 600))}</p>
                    ${
                      review.serviceName
                        ? `<p class="lp-review-service">${escapeHtml(review.serviceName)}</p>`
                        : ""
                    }
                  </article>
                `
              )
              .join("")}
            ${reviews
              .map(
                (review) => `
                  <article class="lp-review-card lp-review-clone" aria-hidden="true">
                    <div class="lp-review-head">
                      ${
                        review.avatarUrl
                          ? `<img src="${escapeHtml(safeUrl(review.avatarUrl))}" alt="" loading="lazy" />`
                          : `<span class="lp-review-avatar-fallback">${escapeHtml(
                              safeText(review.name, "C").slice(0, 1).toUpperCase()
                            )}</span>`
                      }
                      <div>
                        <h3>${escapeHtml(safeText(review.name, "Client"))}</h3>
                        ${
                          settings.showStars
                            ? `<p class="lp-stars">${starsMarkup(review.rating)}</p>`
                            : ""
                        }
                      </div>
                    </div>
                    <p class="lp-review-text">${escapeHtml(safeText(review.text, "", 600))}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderContact(section, mode, index) {
    const settings = section.settings || {};
    return `
      <div class="lp-shell lp-contact-shell" id="contact">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "Visit us"),
          "lp-section-title",
          "h2"
        )}
        ${
          settings.subtitle
            ? editableTag(
                mode,
                `sections.${index}.settings.subtitle`,
                settings.subtitle,
                "lp-section-copy",
                "p"
              )
            : ""
        }
        <div class="lp-contact-grid">
          <div class="lp-contact-card">
            <p><strong>Address</strong><br />${escapeHtml(safeText(settings.address, "Address not set"))}</p>
            <p><strong>Phone</strong><br />${escapeHtml(safeText(settings.phone, "Not set"))}</p>
            <p><strong>Email</strong><br />${escapeHtml(safeText(settings.email, "Not set"))}</p>
          </div>
          ${
            settings.mapEmbedUrl
              ? `<iframe class="lp-map-frame" loading="lazy" src="${escapeHtml(
                  safeUrl(settings.mapEmbedUrl)
                )}" referrerpolicy="no-referrer-when-downgrade" title="Map"></iframe>`
              : `<div class="lp-map-frame lp-map-placeholder">Map embed URL not set</div>`
          }
        </div>
      </div>
    `;
  }

  function renderFaq(section, mode, index) {
    const settings = section.settings || {};
    const items = Array.isArray(settings.items) ? settings.items.filter(Boolean) : [];
    return `
      <div class="lp-shell lp-faq-shell">
        ${editableTag(
          mode,
          `sections.${index}.settings.title`,
          safeText(settings.title, "FAQ"),
          "lp-section-title",
          "h2"
        )}
        <div class="lp-faq-list">
          ${items
            .map(
              (item, itemIndex) => `
                <details class="lp-faq-item" ${itemIndex === 0 ? "open" : ""}>
                  <summary>${escapeHtml(safeText(item.question, "Question"))}</summary>
                  <p>${escapeHtml(safeText(item.answer, ""))}</p>
                </details>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFooter(section, mode, index) {
    const settings = section.settings || {};
    const links = Array.isArray(settings.links) ? settings.links.filter(Boolean) : [];
    return `
      <div class="lp-shell lp-footer-shell">
        <div class="lp-footer-main">
          ${editableTag(
            mode,
            `sections.${index}.settings.copyright`,
            safeText(settings.copyright, "© MeetScheduling"),
            "lp-footer-copy",
            "span"
          )}
          ${
            settings.tagline
              ? editableTag(
                  mode,
                  `sections.${index}.settings.tagline`,
                  settings.tagline,
                  "lp-footer-tagline",
                  "span"
                )
              : ""
          }
        </div>
        ${links.length
          ? `<nav class="lp-footer-links">${links
              .map(
                (item, linkIndex) =>
                  `<a href="${escapeHtml(safeUrl(item.href) || "#")}">${editableTag(
                    mode,
                    `sections.${index}.settings.links.${linkIndex}.label`,
                    safeText(item.label, "Link"),
                    "lp-inline-link",
                    "span"
                  )}</a>`
              )
              .join("")}</nav>`
          : ""}
      </div>
    `;
  }

  function renderSection(section, mode, selectedSectionId, index, data) {
    if (!section || !section.type) return "";
    let body = "";
    if (section.type === "marquee") body = renderMarquee(section, mode, index);
    if (section.type === "header") body = renderHeader(section, mode, index);
    if (section.type === "imageBanner") body = renderImageBanner(section, mode, index);
    if (section.type === "slideShow") body = renderSlideShow(section, mode, index);
    if (section.type === "hero") body = renderHero(section, mode, index);
    if (section.type === "text") body = renderTextSection(section, mode, index);
    if (section.type === "imageShowcase") body = renderImageShowcase(section, mode, index);
    if (section.type === "spotlightGrid") body = renderSpotlightGrid(section, mode, index);
    if (section.type === "productGrid") body = renderProductGrid(section, mode, index, data);
    if (section.type === "servicesMenu") body = renderServicesMenu(section, mode, index, data);
    if (section.type === "stylists") body = renderStylists(section, mode, index);
    if (section.type === "customerReviewBlock") body = renderCustomerReviewBlock(section, mode, index, data);
    if (section.type === "reviewsMarquee") body = renderReviews(section, mode, index, data);
    if (section.type === "newsletterSignup") body = renderNewsletterSignup(section, mode, index);
    if (section.type === "instagramGrid") body = renderInstagramGrid(section, mode, index);
    if (section.type === "contactMap") body = renderContact(section, mode, index);
    if (section.type === "faq") body = renderFaq(section, mode, index);
    if (section.type === "footer") body = renderFooter(section, mode, index);
    if (!body) return "";
    return sectionWrapper(section, mode, selectedSectionId, index, body);
  }

  function attachPreviewEvents(root, options) {
    if (!root || !options) return;
    if (typeof options.onSelectSection === "function") {
      root.querySelectorAll("[data-lp-section]").forEach((node) => {
        node.addEventListener("click", (event) => {
          const target = event.currentTarget;
          const sectionId = target.getAttribute("data-lp-section");
          if (!sectionId) return;
          options.onSelectSection(sectionId);
        });
      });
    }

    if (typeof options.onInlineEdit === "function") {
      root.querySelectorAll("[data-edit-path]").forEach((node) => {
        node.addEventListener("blur", (event) => {
          const path = event.currentTarget.getAttribute("data-edit-path");
          if (!path) return;
          options.onInlineEdit(path, event.currentTarget.textContent || "");
        });
      });
    }
  }

  function initServicesInteractions(root) {
    const applyFilter = (sectionId, activeCategoryOverride) => {
      const cards = root.querySelectorAll(`[data-lp-service-card="${sectionId}"]`);
      const search = root.querySelector(`[data-lp-service-search="${sectionId}"]`);
      const activeTab = root.querySelector(`[data-lp-service-tab="${sectionId}"].is-active`);
      const activeCategory =
        activeCategoryOverride !== undefined
          ? activeCategoryOverride
          : activeTab
            ? activeTab.getAttribute("data-category-id")
            : "";
      const query = search ? String(search.value || "").trim().toLowerCase() : "";

      cards.forEach((card) => {
        const categoryId = card.getAttribute("data-category-id");
        const text = String(card.textContent || "").toLowerCase();
        const categoryMatch = !activeCategory || categoryId === activeCategory;
        const textMatch = !query || text.includes(query);
        card.style.display = categoryMatch && textMatch ? "" : "none";
      });
    };

    const tabNodes = root.querySelectorAll("[data-lp-service-tab]");
    root.querySelectorAll("[data-lp-service-tab]").forEach((tab) => {
      tab.addEventListener("click", () => {
        const sectionId = tab.getAttribute("data-lp-service-tab");
        if (!sectionId) return;
        root.querySelectorAll(`[data-lp-service-tab="${sectionId}"]`).forEach((item) => {
          item.classList.remove("is-active");
        });
        tab.classList.add("is-active");
        applyFilter(sectionId);
      });
    });

    root.querySelectorAll("[data-lp-service-search]").forEach((input) => {
      input.addEventListener("input", () => {
        const sectionId = input.getAttribute("data-lp-service-search");
        if (!sectionId) return;
        applyFilter(sectionId);
      });
    });

    const sectionIds = new Set();
    root.querySelectorAll("[data-lp-service-card]").forEach((card) => {
      const sectionId = card.getAttribute("data-lp-service-card");
      if (sectionId) sectionIds.add(sectionId);
    });

    sectionIds.forEach((sectionId) => {
      const first = root.querySelector(`[data-lp-service-tab="${sectionId}"]`);
      if (first && tabNodes.length) first.classList.add("is-active");
      applyFilter(sectionId);
    });
  }

  function renderInto(target, payload, options) {
    if (!target) return;

    const data = payload && typeof payload === "object" ? payload : {};
    const config = data.config && typeof data.config === "object" ? data.config : { theme: {}, sections: [] };
    const mode = options && options.mode === "preview" ? "preview" : "live";
    const selectedSectionId = options && options.selectedSectionId ? String(options.selectedSectionId) : "";
    const theme = normalizeTheme(config.theme);

    const html = visibleSections(config)
      .map((section, index) => renderSection(section, mode, selectedSectionId, index, data))
      .join("");

    target.innerHTML = `<div class="lp-root ${mode === "preview" ? "lp-preview-mode" : "lp-live-mode"}" style="${themeCssVars(
      theme
    )}">${html}</div>`;

    const root = target.querySelector(".lp-root");
    if (!root) return;

    attachPreviewEvents(root, options || {});
    initServicesInteractions(root);
  }

  window.LandingPageRenderer = {
    renderInto,
    formatPrice,
    formatDuration,
  };
})();
