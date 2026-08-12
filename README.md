# Papan Koordinasi Tim

Papan koordinasi visual sederhana untuk tim kecil yang selama ini
mengandalkan grup WhatsApp untuk tahu siapa mengerjakan apa. Semua tugas
tampil dalam satu layar, dikelompokkan berdasarkan status.

## Fitur

- Tambah tugas baru (nama tugas, penanggung jawab, status awal).
- Ubah status tugas kapan saja antara **Belum Mulai / Dikerjakan / Selesai**
  langsung dari kartu tugas.
- Hapus tugas yang sudah tidak relevan.
- Semua tugas ditampilkan sekaligus dalam tiga kolom status, jadi tidak
  perlu scroll chat untuk tahu progres tim.
- Tanpa login, tanpa instalasi — tinggal buka halamannya.

## Teknologi

Halaman tunggal `index.html` berisi HTML, CSS, dan JavaScript biasa
(tanpa framework, tanpa proses build). Data tugas disimpan di
**localStorage** browser masing-masing pengguna.

> Catatan: karena data disimpan di localStorage (bukan database bersama),
> data hanya tersimpan di browser/perangkat yang dipakai untuk mengisi
> tugas — tidak otomatis sinkron antar anggota tim yang membuka dari
> perangkat berbeda.

## Menjalankan di Lokal

Cukup buka file `index.html` langsung di browser, atau jalankan server
statis sederhana, misalnya:

```bash
python3 -m http.server 8080
```

lalu buka [http://localhost:8080](http://localhost:8080).

## Deploy ke Vercel

1. Push repo ini ke GitHub (jika belum), lalu buka
   [vercel.com/new](https://vercel.com/new) dan import repo tersebut.
2. Saat konfigurasi project, pilih **Framework Preset: Other** (tidak perlu
   build command maupun output directory — Vercel akan menyajikan
   `index.html` langsung sebagai situs statis).
3. Klik **Deploy**. Setelah selesai, bagikan link `nama-project.vercel.app`
   ke grup tim Anda.
