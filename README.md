# Papan Kontrol Project Team

Papan koordinasi visual terpusat untuk tim kecil yang selama ini
mengandalkan grup WhatsApp untuk tahu siapa mengerjakan apa. Semua tugas
tampil dalam satu layar, dikelompokkan berdasarkan status, dan **datanya
sama untuk semua orang** yang membuka link-nya.

## Fitur

- Tambah tugas baru (nama tugas, penanggung jawab, status awal).
- Ubah status tugas kapan saja antara **Belum Mulai / Dikerjakan / Selesai**
  langsung dari kartu tugas.
- Untuk tugas berstatus **Dikerjakan**, penanggung jawab bisa mengisi sendiri
  persentase progres pengerjaannya lewat slider di kartu tugas.
- Progres keseluruhan (persentase tugas yang sudah Selesai) ditampilkan di
  bagian atas papan.
- Tiga kolom status punya warna berbeda supaya mudah dibedakan sekilas.
- Hapus tugas yang sudah tidak relevan.
- **Multi-project** — satu deployment bisa dipakai untuk banyak tim/project
  sekaligus. Setiap project punya papan dan datanya sendiri-sendiri
  (`/nama-project`), tapi berbagi satu database dan satu link Vercel. Kalau
  cuma ada satu project, link utama otomatis langsung membuka papannya
  (tidak ada langkah tambahan untuk tim yang belum butuh multi-project).
- Data tersimpan di database bersama (Vercel Postgres), bukan localStorage
  — semua anggota tim melihat data yang sama dari perangkat masing-masing.
  Tampilan otomatis memperbarui data setiap beberapa detik.
- Tanpa login — siapa pun yang punya link bisa menambah tugas dan mengubah
  status.

## Multi-Project

Buka link utama (`/`):

- Kalau baru ada **1 project**, Anda langsung diarahkan ke papan project itu
  — tidak ada langkah ekstra.
- Kalau ada **2 project atau lebih**, Anda akan melihat daftar project untuk
  dipilih, plus form untuk **membuat project baru** (misal "Tim Marketing",
  "Tim Produksi", dst). Setiap project baru otomatis dapat papan tugasnya
  sendiri di `/nama-project-nya` dan datanya terpisah dari project lain.

Bagikan link project (`.../nama-project`) ke tim yang bersangkutan, atau
bagikan link utama (`/`) kalau anggota tim perlu memilih sendiri project
mana yang mau dibuka.

## Teknologi

- Next.js (App Router) + TypeScript + Tailwind CSS
- Vercel Postgres (`@vercel/postgres`) sebagai database bersama
- Tabel database dibuat otomatis saat request pertama — tidak perlu langkah
  migrasi manual.

## Menjalankan di Lokal (opsional, untuk pengembangan)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Siapkan database. Cara termudah: buat Vercel Postgres store lewat
   dashboard Vercel (lihat langkah deploy di bawah), lalu di tab **Storage**
   pilih **.env.local** dan salin isinya ke file `.env.local` di root
   proyek ini (gunakan `.env.example` sebagai referensi nama variabel).

3. Jalankan server pengembangan:

   ```bash
   npm run dev
   ```

4. Buka [http://localhost:3000](http://localhost:3000).

## Langkah Deploy ke Vercel

1. **Push repo ini ke GitHub** (jika belum), lalu buka
   [vercel.com/new](https://vercel.com/new) dan import repo tersebut.
2. Saat konfigurasi project, Anda bisa langsung klik **Deploy** — belum
   perlu isi environment variable apa pun di langkah ini.
3. Setelah deploy pertama selesai (kemungkinan akan error karena database
   belum ada, tidak apa-apa), buka project Anda di dashboard Vercel:
   - Masuk ke tab **Storage** → **Create Database** → pilih **Postgres**
     (Neon).
   - Pilih region yang paling dekat (misal Singapura), lalu buat database.
   - Setelah dibuat, klik **Connect Project** dan hubungkan ke project ini.
     Vercel akan otomatis mengisi environment variable `POSTGRES_URL` dkk
     ke project Anda.
4. Kembali ke tab **Deployments**, buka deployment terakhir, lalu klik
   **Redeploy** (agar env variable baru terpakai).
5. Selesai. Buka URL project Anda (contoh: `nama-project.vercel.app`) —
   tabel tugas akan otomatis dibuat saat halaman pertama kali diakses.
6. Bagikan link tersebut ke grup tim Anda. Tidak perlu login atau instalasi
   apa pun — semua orang yang buka link melihat data tugas yang sama.

### Catatan

- Aplikasi ini sengaja **tanpa login/autentikasi** — siapa pun yang punya
  link bisa menambah tugas, mengubah status, dan menghapus tugas.
- Tidak ada notifikasi otomatis, riwayat perubahan, komentar, atau lampiran
  file — sesuai spesifikasi awal, agar aplikasi tetap sederhana dan cepat
  dipakai.
