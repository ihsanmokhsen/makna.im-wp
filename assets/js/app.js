// State utama untuk konten yang sudah diambil dari WordPress.
let allContentItems = [];
let activeSearch = "";
let lastScrollY = 0;

// ═══════════════════════════════════════════
// XSS SANITIZATION
// ═══════════════════════════════════════════

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "a", "img",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "blockquote", "pre", "code",
  "figure", "figcaption", "div", "span", "hr",
  "table", "thead", "tbody", "tr", "th", "td"
]);

const ALLOWED_ATTRS = new Set(["href", "src", "alt", "title", "class", "target", "rel"]);

function sanitizeHtml(dirty) {
  if (!dirty) return "";
  const doc = new DOMParser().parseFromString(String(dirty), "text/html");
  return sanitizeNode(doc.body);
}

function sanitizeNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return "";
  }

  const tag = node.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(tag)) {
    // For unknown tags, just process children
    return Array.from(node.childNodes).map(sanitizeNode).join("");
  }

  // Build attributes
  let attrs = "";
  for (const attr of Array.from(node.attributes || [])) {
    if (ALLOWED_ATTRS.has(attr.name)) {
      // Sanitize href/src to prevent javascript: URLs
      if (attr.name === "href" || attr.name === "src") {
        const val = attr.value.trim().toLowerCase();
        if (val.startsWith("javascript:") || val.startsWith("data:text/html")) {
          continue;
        }
      }
      // Add rel="noopener noreferrer" to links
      if (tag === "a" && attr.name === "target" && attr.value === "_blank") {
        attrs += ` rel="noopener noreferrer"`;
      }
      attrs += ` ${attr.name}="${attr.value.replace(/"/g, "&quot;")}"`;
    }
  }

  const children = Array.from(node.childNodes).map(sanitizeNode).join("");

  if (tag === "br" || tag === "hr" || tag === "img") {
    return `<${tag}${attrs}>`;
  }

  return `<${tag}${attrs}>${children}</${tag}>`;
}

// ═══════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════

function applyTheme(theme) {
  const selectedTheme = theme === "light" ? "light" : "dark";
  const toggle = document.getElementById("themeToggle");
  const toggleIcon = document.getElementById("themeToggleIcon");
  const isDark = selectedTheme === "dark";

  document.documentElement.dataset.theme = selectedTheme;

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Aktifkan light mode" : "Aktifkan dark mode");
  }

  if (toggleIcon) {
    toggleIcon.textContent = isDark ? "☀" : "☾";
  }
}

function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  const storedTheme = (() => {
    try {
      return localStorage.getItem("kenang-theme");
    } catch {
      return null;
    }
  })();
  const currentTheme = storedTheme || "dark";

  applyTheme(currentTheme);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    try {
      localStorage.setItem("kenang-theme", nextTheme);
    } catch {
      // localStorage blocked
    }
  });
}

// ═══════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

// ═══════════════════════════════════════════
// NAVBAR — mobile menu + hide on scroll
// ═══════════════════════════════════════════

function initNavbar() {
  const navLinks = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    hamburger.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(isOpen));
    hamburger.setAttribute("aria-label", isOpen ? "Tutup menu" : "Buka menu");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburger.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
      hamburger.setAttribute("aria-label", "Buka menu");
    });
  });

  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > 80 && currentScrollY > lastScrollY) {
          navbar.classList.add("nav-hidden");
        } else {
          navbar.classList.remove("nav-hidden");
        }
        lastScrollY = currentScrollY;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ═══════════════════════════════════════════
// IMAGES
// ═══════════════════════════════════════════

function createImage(src, alt) {
  const image = document.createElement("img");
  image.src = src || window.SITE_CONFIG?.fallbackImage;
  image.alt = alt || "";
  image.loading = "lazy";
  image.decoding = "async";

  image.addEventListener("load", () => {
    image.classList.add("img-loaded");
  });

  if (image.complete) {
    image.classList.add("img-loaded");
  }

  image.addEventListener("error", () => {
    const fallback = window.SITE_CONFIG?.fallbackImage;
    if (fallback && image.src !== fallback) {
      image.src = fallback;
    }
  });

  return image;
}

function limitText(text, maxLength = 155) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

// ═══════════════════════════════════════════
// MODAL — with focus trap
// ═══════════════════════════════════════════

let _modalFocusable = [];
let _modalFirst = null;
let _modalLast = null;

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  );
}

function trapFocus(e) {
  if (e.key !== "Tab") return;

  if (e.shiftKey) {
    if (document.activeElement === _modalFirst) {
      e.preventDefault();
      _modalLast.focus();
    }
  } else {
    if (document.activeElement === _modalLast) {
      e.preventDefault();
      _modalFirst.focus();
    }
  }
}

function openContentModal(item) {
  const modal = document.getElementById("contentModal");
  const modalImage = document.getElementById("modalImage");
  const modalDate = document.getElementById("modalDate");
  const modalTitle = document.getElementById("modalTitle");
  const modalContent = document.getElementById("modalContent");

  if (!modal || !modalImage || !modalDate || !modalTitle || !modalContent) return;

  // Show image loading state
  modalImage.innerHTML = "";
  const imgLoading = document.createElement("div");
  imgLoading.className = "modal-image-loading";
  const imgBar = document.createElement("div");
  imgBar.className = "skeleton";
  imgLoading.appendChild(imgBar);
  modalImage.appendChild(imgLoading);

  const image = createImage(item.image, item.alt || item.title);
  image.addEventListener("load", () => {
    imgLoading.remove();
  });
  image.addEventListener("error", () => {
    imgLoading.remove();
  });
  modalImage.appendChild(image);

  modalDate.textContent = `${item.category} · ${item.date || "kenang-kenangan hidup"}`;
  modalTitle.textContent = item.title || "Untitled";

  // Sanitize HTML content to prevent XSS
  modalContent.innerHTML = sanitizeHtml(item.content || `<p>${item.excerpt || "Konten belum tersedia."}</p>`);

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  // Setup focus trap
  _modalFocusable = getFocusableElements(modal);
  _modalFirst = _modalFocusable[0] || null;
  _modalLast = _modalFocusable[_modalFocusable.length - 1] || null;

  // Focus the close button
  const closeBtn = modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.focus();

  document.addEventListener("keydown", trapFocus);
}

function closeContentModal() {
  const modal = document.getElementById("contentModal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  document.removeEventListener("keydown", trapFocus);
  _modalFocusable = [];
  _modalFirst = null;
  _modalLast = null;
}

function initContentModal() {
  document.querySelectorAll("[data-modal-close]").forEach((element) => {
    element.addEventListener("click", closeContentModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeContentModal();
  });
}

// ═══════════════════════════════════════════
// GRID & CARDS
// ═══════════════════════════════════════════

function normalizeForGrid(items) {
  return items.map((item) => ({
    ...item,
    category: "Archive",
    searchText: `${item.title || ""} ${item.excerpt || ""} Archive`.toLowerCase()
  }));
}

function createContentCard(item, index) {
  const card = document.createElement("button");
  card.className = "content-card fade-in";
  card.type = "button";
  card.style.transitionDelay = `${Math.min(index * 0.07, 0.5)}s`;
  card.setAttribute("aria-label", `Buka ${item.title || item.category}`);
  card.addEventListener("click", () => openContentModal(item));

  const image = createImage(item.image, item.alt || item.title);

  const caption = document.createElement("div");
  caption.className = "card-caption";

  const meta = document.createElement("p");
  meta.className = "card-meta";
  const category = document.createElement("span");
  category.textContent = item.category;
  const date = document.createElement("span");
  date.textContent = item.date || "kenang-kenangan hidup";
  meta.append(category, date);

  const title = document.createElement("h3");
  title.textContent = item.title || "Untitled";

  caption.append(meta, title);

  if (item.excerpt) {
    const excerpt = document.createElement("p");
    excerpt.textContent = limitText(item.excerpt);
    caption.appendChild(excerpt);
  }

  card.append(image, caption);
  return card;
}

// ═══════════════════════════════════════════
// SKELETON LOADER
// ═══════════════════════════════════════════

function renderSkeletons() {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";

  for (let i = 0; i < 6; i++) {
    const card = document.createElement("div");
    card.className = "skeleton-card";

    const img = document.createElement("div");
    img.className = "skeleton skeleton-image";

    const caption = document.createElement("div");
    caption.className = "skeleton-caption";

    const meta = document.createElement("div");
    meta.className = "skeleton skeleton-meta";

    const title = document.createElement("div");
    title.className = `skeleton ${i % 3 === 0 ? "skeleton-title-short" : "skeleton-title"}`;

    const excerpt1 = document.createElement("div");
    excerpt1.className = "skeleton skeleton-excerpt";

    const excerpt2 = document.createElement("div");
    excerpt2.className = "skeleton skeleton-excerpt-short";

    caption.append(meta, title, excerpt1, excerpt2);
    card.append(img, caption);
    grid.appendChild(card);
  }
}

// ═══════════════════════════════════════════
// EMPTY & ERROR STATES
// ═══════════════════════════════════════════

function renderEmpty(message) {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";

  const empty = document.createElement("div");
  empty.className = "empty-state fade-in visible";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.textContent = "◎";
  icon.setAttribute("aria-hidden", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Tidak ada konten";

  const desc = document.createElement("p");
  desc.textContent = message || "Belum ada konten Archive yang cocok dengan pencarian ini.";

  empty.append(icon, heading, desc);
  grid.appendChild(empty);
}

function renderError(message, onRetry) {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";

  const empty = document.createElement("div");
  empty.className = "empty-state fade-in visible";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.textContent = "⟡";
  icon.setAttribute("aria-hidden", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Gagal memuat konten";

  const desc = document.createElement("p");
  desc.textContent = message || "Terjadi kesalahan saat mengambil data dari WordPress.";

  const retryBtn = document.createElement("button");
  retryBtn.className = "btn btn-ghost retry-btn";
  retryBtn.textContent = "Coba Lagi";
  retryBtn.addEventListener("click", onRetry);

  empty.append(icon, heading, desc, retryBtn);
  grid.appendChild(empty);
}

function renderLoading() {
  setText("contentStatus", "Memuat konten...");
  renderSkeletons();
}

// ═══════════════════════════════════════════
// FILTERS & SEARCH
// ═══════════════════════════════════════════

function applyContentFilters() {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  const query = activeSearch.trim().toLowerCase();
  const items = allContentItems.filter((item) => {
    const matchesSearch = !query || item.searchText.includes(query);
    return matchesSearch;
  });

  if (!items.length) {
    renderEmpty("Belum ada konten Archive yang cocok dengan pencarian ini.");
    return;
  }

  grid.textContent = "";
  items.forEach((item, index) => grid.appendChild(createContentCard(item, index)));

  scheduleReveal();
}

function initFilters() {
  const searchDesktop = document.getElementById("contentSearch");
  const searchMobile = document.getElementById("contentSearchMobile");
  const searches = [searchDesktop, searchMobile].filter(Boolean);

  searches.forEach((search) => {
    search.addEventListener("input", (event) => {
      activeSearch = event.target.value;
      // Sync both inputs
      searches.forEach((s) => {
        if (s !== event.target) s.value = activeSearch;
      });
      applyContentFilters();
    });
  });
}

// ═══════════════════════════════════════════
// INTERSECTION OBSERVER — fade-in on scroll
// ═══════════════════════════════════════════

function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.05,
      rootMargin: "0px 0px -20px 0px"
    }
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  window.__fadeObserver = observer;

  const grid = document.getElementById("contentGrid");
  if (grid) {
    const mutationObserver = new MutationObserver(() => {
      document.querySelectorAll(".fade-in:not(.visible)").forEach((el) => {
        observer.observe(el);
      });
    });
    mutationObserver.observe(grid, { childList: true, subtree: true });
  }
}

function revealVisibleCards() {
  const observer = window.__fadeObserver;
  if (!observer) return;

  document.querySelectorAll(".fade-in:not(.visible)").forEach((el) => {
    observer.observe(el);
  });
}

function scheduleReveal() {
  setTimeout(() => {
    revealVisibleCards();
    document.querySelectorAll(".fade-in:not(.visible)").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("visible");
      }
    });
  }, 60);
}

// ═══════════════════════════════════════════
// BACK TO TOP
// ═══════════════════════════════════════════

function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 400) {
          btn.classList.add("visible");
        } else {
          btn.classList.remove("visible");
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ═══════════════════════════════════════════
// FOOTER YEAR
// ═══════════════════════════════════════════

function initFooter() {
  const yearEl = document.getElementById("footerYear");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// ═══════════════════════════════════════════
// WORDPRESS INTEGRATION
// ═══════════════════════════════════════════

async function initWordPressContent() {
  const wp = window.WordPressData;

  renderLoading();

  if (!wp?.enabled()) {
    setText("contentStatus", "WordPress belum dikonfigurasi.");
    renderEmpty("Hubungkan WordPress untuk menampilkan konten.");
    return;
  }

  try {
    const archive = await wp.loadArchive();

    allContentItems = normalizeForGrid(archive)
      .sort((first, second) => (second.timestamp || 0) - (first.timestamp || 0));

    setText("contentStatus", `${allContentItems.length} item Archive`);
    applyContentFilters();
  } catch (error) {
    console.warn("Gagal memuat konten WordPress.", error);
    setText("contentStatus", "Gagal memuat konten.");
    renderError("Konten WordPress belum bisa dimuat. Periksa koneksi internet dan coba lagi.", () => {
      initWordPressContent();
    });
  }
}

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initNavbar();
  initContentModal();
  initFilters();
  initScrollReveal();
  initBackToTop();
  initFooter();
  initWordPressContent();
});
