(function () {
  // Mengambil konfigurasi WordPress dari assets/js/config.js.
  const config = window.SITE_CONFIG || {};
  const wpConfig = config.wordpress || {};

  // Cache sederhana agar ID kategori tidak diminta berulang-ulang ke API.
  const categoryCache = new Map();

  // Membersihkan base URL dari slash di akhir agar endpoint API konsisten.
  function getBaseUrl() {
    return (wpConfig.baseUrl || "").trim().replace(/\/+$/, "");
  }

  // Menentukan endpoint API yang benar.
  // WordPress.com memakai public-api.wordpress.com, sedangkan self-hosted memakai /wp-json/wp/v2.
  function getApiBaseUrl() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return "";

    const url = new URL(baseUrl);

    if (url.hostname.endsWith(".wordpress.com")) {
      return `https://public-api.wordpress.com/wp/v2/sites/${url.hostname}`;
    }

    return `${baseUrl}/wp-json/wp/v2`;
  }

  // Website dianggap terhubung ke WordPress jika baseUrl sudah diisi.
  function isEnabled() {
    return Boolean(getBaseUrl());
  }

  // Membuat URL endpoint WordPress beserta query parameter, misalnya posts?categories=...
  function buildUrl(resource, params = {}) {
    const url = new URL(`${getApiBaseUrl()}/${resource.replace(/^\/+/, "")}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  // Fungsi dasar untuk mengambil JSON dari WordPress API.
  async function fetchJson(resource, params) {
    const response = await fetch(buildUrl(resource, params));

    if (!response.ok) {
      throw new Error(`WordPress request failed: ${response.status}`);
    }

    return response.json();
  }

  // Mengubah HTML dari WordPress menjadi teks biasa untuk judul/excerpt.
  function stripHtml(value) {
    if (!value) return "";

    const doc = new DOMParser().parseFromString(String(value), "text/html");
    return doc.body.textContent.trim();
  }

  // Format tanggal WordPress menjadi format Indonesia.
  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  // Mengubah slug kategori seperti "berita" atau "galeri" menjadi ID kategori WordPress.
  async function getCategoryId(slug) {
    if (!slug) return null;
    if (categoryCache.has(slug)) return categoryCache.get(slug);

    const categories = await fetchJson("categories", { slug, per_page: 1 });
    const id = Array.isArray(categories) && categories[0] ? categories[0].id : null;
    categoryCache.set(slug, id);
    return id;
  }

  // Mengambil featured image dari post WordPress. Jika tidak ada, pakai fallback.
  function getFeaturedMedia(post) {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];
    const sizes = media?.media_details?.sizes || {};
    const src = sizes.medium_large?.source_url || sizes.large?.source_url || media?.source_url || post?.jetpack_featured_media_url || "";

    return {
      src: src || config.fallbackImage,
      alt: media?.alt_text || stripHtml(post?.title?.rendered) || "Gambar konten",
      hasImage: Boolean(src)
    };
  }

  // Menyeragamkan format data post WordPress agar mudah dipakai oleh app.js.
  function normalizePost(post) {
    const media = getFeaturedMedia(post);

    return {
      title: stripHtml(post.title?.rendered),
      date: formatDate(post.date),
      image: media.src,
      alt: media.alt,
      hasImage: media.hasImage,
      link: post.link || "#",
      excerpt: stripHtml(post.excerpt?.rendered),
      content: post.content?.rendered || post.excerpt?.rendered || ""
    };
  }

  // Menyeragamkan format data media WordPress jika suatu saat gallerySource memakai "media".
  function normalizeMedia(media) {
    return {
      title: media.alt_text || stripHtml(media.caption?.rendered) || stripHtml(media.title?.rendered) || "Galeri",
      image: media.source_url || config.fallbackImage,
      alt: media.alt_text || stripHtml(media.title?.rendered) || "Visual konten",
      link: media.link || media.source_url || "#"
    };
  }

  // Mengambil konten untuk tab Berita dari kategori yang ditentukan di config.js.
  async function loadNews() {
    if (!isEnabled()) return [];

    const params = {
      _embed: 1,
      per_page: wpConfig.newsPerPage || 6,
      orderby: "date",
      order: "desc"
    };

    const hasCategoryFilter = Boolean(wpConfig.newsCategorySlug);
    const categoryId = await getCategoryId(wpConfig.newsCategorySlug);
    if (hasCategoryFilter && !categoryId) return [];
    if (categoryId) params.categories = categoryId;

    const galleryCategoryId = await getCategoryId(wpConfig.galleryCategorySlug);
    if (galleryCategoryId) params.categories_exclude = galleryCategoryId;

    const posts = await fetchJson("posts", params);
    return posts.map(normalizePost);
  }

  // Mengambil konten untuk tab Galeri dari post kategori galeri yang punya featured image.
  async function loadGallery() {
    if (!isEnabled()) return [];

    if (wpConfig.gallerySource === "posts") {
      const params = {
        _embed: 1,
        per_page: wpConfig.galleryPerPage || 8,
        orderby: "date",
        order: "desc"
      };
      const hasCategoryFilter = Boolean(wpConfig.galleryCategorySlug);
      const categoryId = await getCategoryId(wpConfig.galleryCategorySlug);
      if (hasCategoryFilter && !categoryId) return [];
      if (categoryId) params.categories = categoryId;

      const posts = await fetchJson("posts", params);
      return posts.map(normalizePost).filter((item) => item.hasImage);
    }

    const media = await fetchJson("media", {
      per_page: wpConfig.galleryPerPage || 8,
      media_type: "image",
      orderby: "date",
      order: "desc"
    });

    return media.map(normalizeMedia);
  }

  // Link arsip WordPress. Saat ini tidak dipakai untuk redirect post, tapi tetap disiapkan.
  function getNewsArchiveUrl() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return "#";
    if (!wpConfig.newsCategorySlug) return baseUrl;

    return `${baseUrl}/category/${wpConfig.newsCategorySlug}/`;
  }

  // Mengekspos fungsi WordPressData agar bisa dipanggil dari assets/js/app.js.
  window.WordPressData = {
    enabled: isEnabled,
    loadNews,
    loadGallery,
    getNewsArchiveUrl
  };
})();
