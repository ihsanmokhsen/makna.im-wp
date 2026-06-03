// State utama untuk konten yang sudah diambil dari WordPress.
let allContentItems = [];
let activeSearch = "";
let lastScrollY = 0;

// ═══════════════════════════════════════════
// THEME TOGGLE
// ═══════════════════════════════════════════

function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  const toggle = document.getElementById("themeToggle");
  const toggleText = document.getElementById("themeToggleText");
  const isDark = selectedTheme === "dark";

  document.documentElement.dataset.theme = selectedTheme;

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Aktifkan light mode" : "Aktifkan dark mode");
  }

  if (toggleText) {
    toggleText.textContent = isDark ? "Light" : "Dark";
  }
}

function initThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  const storedTheme = (() => {
    try {
      return localStorage.getItem("makna-theme");
    } catch (error) {
      return null;
    }
  })();
  const currentTheme = storedTheme || document.documentElement.dataset.theme || "light";

  applyTheme(currentTheme);

  if (!toggle) return;

  toggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);

    try {
      localStorage.setItem("makna-theme", nextTheme);
    } catch (error) {
      // Jika browser memblokir localStorage, toggle tetap bekerja untuk sesi ini.
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
    navLinks.classList.toggle("open");
    hamburger.classList.toggle("active");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      hamburger.classList.remove("active");
    });
  });

  // Hide navbar on scroll down, show on scroll up
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

  // Fade in when loaded
  image.addEventListener("load", () => {
    image.classList.add("img-loaded");
  });
  // If already cached
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
// MODAL
// ═══════════════════════════════════════════

function openContentModal(item) {
  const modal = document.getElementById("contentModal");
  const modalImage = document.getElementById("modalImage");
  const modalDate = document.getElementById("modalDate");
  const modalTitle = document.getElementById("modalTitle");
  const modalContent = document.getElementById("modalContent");

  if (!modal || !modalImage || !modalDate || !modalTitle || !modalContent) return;

  modalImage.textContent = "";
  modalImage.appendChild(createImage(item.image, item.alt || item.title));
  modalDate.textContent = `${item.category} · ${item.date || "makna.im"}`;
  modalTitle.textContent = item.title || "Untitled";
  modalContent.innerHTML = item.content || `<p>${item.excerpt || "Konten belum tersedia."}</p>`;

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeContentModal() {
  const modal = document.getElementById("contentModal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
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
  card.style.transitionDelay = `${Math.min(index * 0.08, 0.6)}s`;
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
  date.textContent = item.date || "makna.im";
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

  const count = 6;
  for (let i = 0; i < count; i++) {
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
// EMPTY STATE
// ═══════════════════════════════════════════

function renderEmpty(message) {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";

  const empty = document.createElement("div");
  empty.className = "empty-state fade-in visible";

  const icon = document.createElement("span");
  icon.className = "empty-icon";
  icon.textContent = "📭";
  icon.setAttribute("aria-hidden", "true");

  const heading = document.createElement("h3");
  heading.textContent = "Tidak ada konten";

  const desc = document.createElement("p");
  desc.textContent = message || "Belum ada konten Archive yang cocok dengan pencarian ini.";

  empty.append(icon, heading, desc);
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

  // Trigger fade-in for new cards
  scheduleReveal();
}

function initFilters() {
  const search = document.getElementById("contentSearch");

  if (search) {
    search.addEventListener("input", (event) => {
      activeSearch = event.target.value;
      applyContentFilters();
    });
  }
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

  // Observe elements that already exist
  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));

  // Store observer for later use
  window.__fadeObserver = observer;

  // Use MutationObserver to auto-observe new .fade-in elements added to DOM
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

// Re-observe cards after they are rendered (async WordPress fetch)
function scheduleReveal() {
  // Small delay to let the browser paint first
  setTimeout(() => {
    revealVisibleCards();
    // Also immediately reveal cards already in viewport
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
    setText("contentStatus", "Gagal memuat konten WordPress.");
    renderEmpty("Konten WordPress belum bisa dimuat.");
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
  initWordPressContent();
});
