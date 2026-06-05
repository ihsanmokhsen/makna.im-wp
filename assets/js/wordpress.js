(function () {
  const config = window.SITE_CONFIG || {};
  const wpConfig = config.wordpress || {};
  const categoryCache = new Map();

  function getBaseUrl() {
    return (wpConfig.baseUrl || "").trim().replace(/\/+$/, "");
  }

  function getApiBaseUrl() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return "";

    const url = new URL(baseUrl);

    if (url.hostname.endsWith(".wordpress.com")) {
      return `https://public-api.wordpress.com/wp/v2/sites/${url.hostname}`;
    }

    return `${baseUrl}/wp-json/wp/v2`;
  }

  function isEnabled() {
    return Boolean(getBaseUrl());
  }

  function buildUrl(resource, params = {}) {
    const url = new URL(`${getApiBaseUrl()}/${resource.replace(/^\/+/, "")}`);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  // Fetch with retry and timeout
  async function fetchJson(resource, params, options = {}) {
    const { maxRetries = 2, timeoutMs = 12000 } = options;
    const url = buildUrl(resource, params);

    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: { "Accept": "application/json" }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`WordPress request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.message?.includes("failed: 4")) {
          throw error;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }

  function stripHtml(value) {
    if (!value) return "";
    const doc = new DOMParser().parseFromString(String(value), "text/html");
    return doc.body.textContent.trim();
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function getTimestamp(value) {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  async function getCategoryId(slug) {
    if (!slug) return null;
    if (categoryCache.has(slug)) return categoryCache.get(slug);

    const categories = await fetchJson("categories", { slug, per_page: 1 });
    const id = Array.isArray(categories) && categories[0] ? categories[0].id : null;
    categoryCache.set(slug, id);
    return id;
  }

  function getFeaturedMedia(post) {
    const media = post?._embedded?.["wp:featuredmedia"]?.[0];
    const sizes = media?.media_details?.sizes || {};
    const src =
      sizes.medium_large?.source_url ||
      sizes.large?.source_url ||
      media?.source_url ||
      post?.jetpack_featured_media_url ||
      "";

    return {
      src: src || config.fallbackImage,
      alt: media?.alt_text || stripHtml(post?.title?.rendered) || "Gambar konten",
      hasImage: Boolean(src)
    };
  }

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

  function getArchiveUrl() {
    const baseUrl = getBaseUrl();
    if (!baseUrl) return "#";
    if (!wpConfig.archiveCategorySlug) return baseUrl;
    return `${baseUrl}/category/${wpConfig.archiveCategorySlug}/`;
  }

  window.WordPressData = {
    enabled: isEnabled,
    loadArchive,
    getArchiveUrl
  };
})();
