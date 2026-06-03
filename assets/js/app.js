// State utama untuk konten yang sudah diambil dari WordPress.
let allContentItems = [];
let activeSearch = "";

// Mengaktifkan dark/light mode dan menyimpan pilihan di browser.
function applyTheme(theme) {
  const selectedTheme = theme === "dark" ? "dark" : "light";
  const toggle = document.getElementById("themeToggle");
  const toggleText = document.getElementById("themeToggleText");

  document.documentElement.dataset.theme = selectedTheme;

  if (toggle) {
    const isDark = selectedTheme === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", isDark ? "Aktifkan light mode" : "Aktifkan dark mode");
  }

  if (toggleText) {
    toggleText.textContent = selectedTheme === "dark" ? "Light" : "Dark";
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

// Helper kecil untuk mengganti teks elemen berdasarkan id.
function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

// Mengatur menu mobile: tombol hamburger membuka/menutup link navbar.
function initNavbar() {
  const navLinks = document.getElementById("navLinks");
  const hamburger = document.getElementById("hamburger");

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navLinks.classList.remove("open"));
  });
}

// Membuat elemen gambar dengan fallback jika URL gambar gagal dimuat.
function createImage(src, alt) {
  const image = document.createElement("img");
  image.src = src || window.SITE_CONFIG?.fallbackImage;
  image.alt = alt || "";
  image.loading = "lazy";
  image.decoding = "async";
  image.addEventListener("error", () => {
    const fallback = window.SITE_CONFIG?.fallbackImage;
    if (fallback && image.src !== fallback) {
      image.src = fallback;
    }
  });
  return image;
}

// Membatasi panjang excerpt agar caption kartu tetap rapi.
function limitText(text, maxLength = 155) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

// Membuka popup detail konten tanpa redirect ke WordPress.
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

// Menutup popup detail konten.
function closeContentModal() {
  const modal = document.getElementById("contentModal");
  if (!modal) return;

  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// Menghubungkan tombol close/backdrop/Escape dengan fungsi tutup modal.
function initContentModal() {
  document.querySelectorAll("[data-modal-close]").forEach((element) => {
    element.addEventListener("click", closeContentModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeContentModal();
  });
}

// Memberi label tunggal Archive untuk semua konten yang masuk ke grid.
function normalizeForGrid(items) {
  return items.map((item) => ({
    ...item,
    category: "Archive",
    searchText: `${item.title || ""} ${item.excerpt || ""} Archive`.toLowerCase()
  }));
}

// Membuat satu kartu editorial pada masonry grid.
function createContentCard(item) {
  const card = document.createElement("button");
  card.className = "content-card";
  card.type = "button";
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

// Menampilkan pesan kosong jika data tidak tersedia atau search tidak cocok.
function renderEmpty(message) {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";
  const empty = document.createElement("p");
  empty.className = "content-empty";
  empty.textContent = message;
  grid.appendChild(empty);
}

// Menampilkan state loading saat konten WordPress sedang dimuat.
function renderLoading() {
  const grid = document.getElementById("contentGrid");
  if (!grid) return;

  grid.textContent = "";
  const loading = document.createElement("p");
  loading.className = "content-loading";
  loading.textContent = "Memuat arsip dari makna.im...";
  grid.appendChild(loading);
}

// Menerapkan search untuk satu Archive gabungan.
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
  items.forEach((item) => grid.appendChild(createContentCard(item)));
}

// Mengaktifkan search bar untuk Archive.
function initFilters() {
  const search = document.getElementById("contentSearch");

  if (search) {
    search.addEventListener("input", (event) => {
      activeSearch = event.target.value;
      applyContentFilters();
    });
  }
}

// Titik utama hubungan app.js dengan WordPress:
// fungsi ini memanggil window.WordPressData.loadArchive()
// yang didefinisikan di assets/js/wordpress.js.
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

    // Semua post WordPress tampil sebagai satu Archive, lalu diurutkan dari terbaru.
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

// Jalankan semua fitur setelah HTML selesai dimuat.
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  initNavbar();
  initContentModal();
  initFilters();
  initWordPressContent();
});
