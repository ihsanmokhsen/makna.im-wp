# kenang-kenangan hidup

`kenang-kenangan hidup` adalah website **Digital Memory Magazine**: ruang digital untuk merawat cerita, visual, dokumentasi, dan momen hidup yang punya makna.

Website ini memakai WordPress sebagai CMS, sementara tampilan depannya dibuat sebagai frontend statis modern. Konten tidak dibuka dengan redirect ke WordPress, tetapi ditampilkan langsung di website melalui popup/modal.

## Konsep

Konsep utama aplikasi:

- Brand: `kenang-kenangan hidup`
- Tema: `kenang-kenangan hidup`
- Gaya visual: minimalis, premium, modern, editorial, cinematic
- Inspirasi desain: Apple, Behance, Swiss editorial layout, high-end SaaS
- Fungsi utama: menampilkan konten WordPress dalam bentuk landing page dan grid editorial

## Fitur

- Landing page premium dengan hero besar.
- Search bar untuk mencari konten yang sudah dimuat (desktop di navbar, mobile di section Archive).
- Satu tab utama: `Archive`.
- Semua post WordPress digabung dalam satu grid editorial.
- Setiap kartu memakai label tunggal `Archive`.
- Grid editorial/masonry dengan kartu visual.
- Popup/modal detail konten di dalam website.
- Tidak redirect ke WordPress saat kartu diklik.
- Responsive untuk desktop dan mobile.
- Data konten diambil dari WordPress public API.
- Theme toggle (dark/light mode) dengan persistensi localStorage.
- Navbar dengan hide-on-scroll dan mobile hamburger menu.

## Struktur File

```text
kenang kenangan hidup _ wp/
├── index.html
├── README.md
├── CNAME
└── assets/
    ├── logo.png
    ├── favicon.svg
    ├── favicon-16.png
    ├── favicon-32.png
    ├── favicon-48.png
    ├── favicon-192.png
    ├── favicon-512.png
    ├── favicon-180.png
    ├── site.webmanifest
    ├── css/
    │   └── style.css
    └── js/
        ├── config.js
        ├── wordpress.js
        └── app.js
```

Penjelasan:

- `index.html`: struktur halaman utama, navbar, hero, Archive, grid, dan modal.
- `assets/css/style.css`: seluruh desain visual, layout, responsive, grid, dan modal.
- `assets/js/config.js`: konfigurasi koneksi WordPress.
- `assets/js/wordpress.js`: pengambilan data dari WordPress API.
- `assets/js/app.js`: rendering konten ke halaman, search Archive, dan popup.

## Hubungan Dengan WordPress

Website ini mengambil konten dari:

```text
https://rexorange7.wordpress.com
```

Konfigurasinya ada di:

```text
assets/js/config.js
```

Isi konfigurasi saat ini:

```js
window.SITE_CONFIG = {
  wordpress: {
    baseUrl: "https://rexorange7.wordpress.com",
    archiveCategorySlug: "archive",
    archivePerPage: 12
  },
  fallbackImage: "data:image/svg+xml,..."
};
```

Arti setiap konfigurasi:

- `baseUrl`: domain WordPress yang menjadi sumber konten.
- `archiveCategorySlug`: slug kategori WordPress untuk Archive.
- `archivePerPage`: jumlah maksimal post Archive yang diambil.
- `fallbackImage`: gambar cadangan jika post tidak punya featured image (SVG inline).

## Endpoint API

Karena situs memakai WordPress.com, website otomatis memakai endpoint:

```text
https://public-api.wordpress.com/wp/v2/sites/rexorange7.wordpress.com
```

Contoh endpoint yang dipakai:

```text
/posts
/categories?slug=archive
/posts?categories={archiveCategoryId}
```

Jika suatu saat memakai WordPress self-hosted, script otomatis memakai format:

```text
https://domainanda.com/wp-json/wp/v2
```

## Alur Data

Alur data aplikasi:

1. `config.js` menyimpan alamat WordPress dan nama kategori.
2. `wordpress.js` membaca konfigurasi tersebut.
3. `wordpress.js` mencari ID kategori berdasarkan slug `archive`.
4. `wordpress.js` mengambil post dari kategori Archive.
5. `wordpress.js` merapikan data post menjadi format umum.
6. `app.js` mengambil data dari `WordPressData.loadArchive()`.
7. `app.js` menampilkan semua konten sebagai satu Archive.
8. `app.js` mengurutkan Archive dari konten terbaru.
9. `app.js` memberi label `Archive` pada setiap kartu.
10. `app.js` menampilkan konten ke grid editorial.
11. Saat kartu diklik, `app.js` membuka konten di modal/popup.

## Cara Menjalankan Lokal

Jalankan dari folder project:

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Lalu buka:

```text
http://127.0.0.1:4174/index.html
```

Catatan: jangan membuka langsung dengan `file://.../index.html`, karena akses API dan asset lebih stabil jika dijalankan melalui server lokal.

## Cara Menambahkan Konten Archive

Di WordPress:

1. Buka dashboard WordPress.
2. Buat post baru.
3. Pilih kategori `Archive` jika kategori tersebut sudah dibuat.
4. Isi judul dan konten.
5. Tambahkan `Featured Image` jika ingin kartu tampil lebih visual.
6. Publish.
7. Refresh website lokal.

Post tersebut akan muncul di `Archive`.

## Archive

Frontend hanya memakai satu tab:

- `Archive` menampilkan semua post WordPress sebagai satu koleksi.
- Jika ingin lebih rapi di dashboard WordPress, gunakan satu kategori bernama `Archive`.
- Label yang tampil di kartu adalah `Archive`.
- Konten diurutkan dari yang terbaru berdasarkan tanggal post WordPress.

Search hanya mencari konten pada data yang sudah dimuat dari WordPress.

## Modal/Popup

Saat kartu diklik:

- Website tidak membuka halaman WordPress.
- Website membuka modal di halaman yang sama.
- Modal menampilkan:
  - gambar
  - kategori
  - tanggal
  - judul
  - isi post WordPress

Modal bisa ditutup dengan:

- tombol `×`
- klik area gelap di luar popup
- tombol `Escape`

## Catatan Teknis

- Website ini masih frontend statis.
- Tidak ada backend khusus.
- Data diambil langsung dari WordPress public API melalui browser.
- Untuk produksi, sebaiknya tambah sanitasi HTML untuk isi post.
- Untuk SEO detail post, sebaiknya tambah halaman detail atau routing khusus.
- Untuk konten banyak, sebaiknya tambah pagination atau load more.
- Untuk performa gambar, sebaiknya gunakan optimasi image/CDN yang lebih baik.

## File Penting

Jika ingin mengganti domain WordPress:

```text
assets/js/config.js
```

Jika ingin mengubah cara data diambil:

```text
assets/js/wordpress.js
```

Jika ingin mengubah tampilan data, search, Archive, atau modal:

```text
assets/js/app.js
```

Jika ingin mengubah desain:

```text
assets/css/style.css
```