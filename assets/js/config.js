window.SITE_CONFIG = {
  // Bagian ini adalah pusat pengaturan koneksi website ke WordPress.
  wordpress: {
    // Domain publik WordPress yang menjadi sumber data konten.
    baseUrl: "https://rexorange7.wordpress.com",

    // Kategori WordPress untuk tab Berita.
    newsCategorySlug: "berita",

    // Kategori WordPress untuk tab Galeri.
    galleryCategorySlug: "galeri",

    // Jumlah data maksimal yang diambil dari WordPress.
    newsPerPage: 6,
    galleryPerPage: 8,

    // Untuk WordPress.com gratis, galeri paling aman diambil dari post kategori galeri.
    gallerySource: "posts"
  },

  // Gambar cadangan jika post WordPress belum punya featured image.
  fallbackImage: "https://picsum.photos/seed/ntt-default/800/450"
};
