window.SITE_CONFIG = {
  // Bagian ini adalah pusat pengaturan koneksi website ke WordPress.
  wordpress: {
    // Domain publik WordPress yang menjadi sumber data konten.
    baseUrl: "https://rexorange7.wordpress.com",

    // Satu sumber utama: kategori Archive di WordPress.
    archiveCategorySlug: "archive",

    // Jumlah data maksimal yang diambil dari WordPress untuk Archive.
    archivePerPage: 12
  },

  // Gambar cadangan jika post WordPress belum punya featured image.
  fallbackImage: "https://picsum.photos/seed/ntt-default/800/450"
};
