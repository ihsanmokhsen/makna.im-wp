(function () {
  // Mengambil konfigurasi WordPress dari assets/js/config.js.
  const config = window.SITE_CONFIG || {};
  const wpConfig = config.wordpress || {};
  const likeMarker = "[makna-like]";

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

  // Mengirim data form ke WordPress API, dipakai untuk komentar.
  async function postForm(resource, data) {
    const response = await fetch(buildUrl(resource), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
      },
      body: new URLSearchParams(data).toString()
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `WordPress request failed: ${response.status}`);
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

  // Timestamp dipakai oleh app.js untuk mengurutkan Archive gabungan dari yang terbaru.
  function getTimestamp(value) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  // Mengubah slug kategori seperti "archive" menjadi ID kategori WordPress.
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
      id: post.id,
      title: stripHtml(post.title?.rendered),
      date: formatDate(post.date),
      timestamp: getTimestamp(post.date),
      image: media.src,
      alt: media.alt,
      hasImage: media.hasImage,
      link: post.link || "#",
      excerpt: stripHtml(post.excerpt?.rendered),
      content: post.content?.rendered || post.excerpt?.rendered || ""
    };
  }

  // Komentar lama dengan marker like tetap disembunyikan jika pernah ada.
  function isLikeComment(comment) {
    return stripHtml(comment?.content?.rendered || "").includes(likeMarker);
  }

  // Menyeragamkan format komentar WordPress untuk modal.
  function normalizeComment(comment) {
    return {
      id: comment.id,
      post: comment.post,
      author: stripHtml(comment.author_name) || "Pengunjung",
      date: formatDate(comment.date),
      content: comment.content?.rendered || "",
      text: stripHtml(comment.content?.rendered),
      isLike: isLikeComment(comment)
    };
  }

  // Mengambil semua post WordPress sebagai satu Archive.
  // Jika archiveCategorySlug dikosongkan, semua post publik akan tampil.
  // Jika archiveCategorySlug diisi "archive", hanya post kategori Archive yang tampil.
  async function loadArchive() {
    if (!isEnabled()) return [];

    const params = {
      _embed: 1,
      per_page: wpConfig.archivePerPage || 12,
      orderby: "date",
      order: "desc"
    };

    const hasCategoryFilter = Boolean(wpConfig.archiveCategorySlug);
    const categoryId = await getCategoryId(wpConfig.archiveCategorySlug);
    if (hasCategoryFilter && !categoryId) return [];
    if (categoryId) params.categories = categoryId;

    const posts = await fetchJson("posts", params);
    return posts.map(normalizePost);
  }

  // Mengambil komentar sebuah post.
  async function loadComments(postId) {
    if (!isEnabled() || !postId) return [];

    const comments = await fetchJson("comments", {
      post: postId,
      per_page: 100,
      orderby: "date",
      order: "asc"
    });

    return comments.map(normalizeComment);
  }

  // Menyimpan komentar pengunjung ke database WordPress.
  async function submitComment(postId, data) {
    if (!isEnabled() || !postId) {
      throw new Error("Post WordPress tidak ditemukan.");
    }

    return postForm("comments", {
      post: postId,
      author_name: data.name,
      content: data.content
    });
  }

  // Link Archive WordPress. Saat ini tidak dipakai untuk redirect post, tapi tetap disiapkan.
  function getArchiveUrl() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return "#";
    if (!wpConfig.archiveCategorySlug) return baseUrl;

    return `${baseUrl}/category/${wpConfig.archiveCategorySlug}/`;
  }

  // Mengekspos fungsi WordPressData agar bisa dipanggil dari assets/js/app.js.
  window.WordPressData = {
    enabled: isEnabled,
    loadArchive,
    loadComments,
    submitComment,
    getArchiveUrl
  };
})();
