# Panduan Memasang Majelis Mudzakarah Rumah Dakwah Malang

Hasil akhirnya adalah sebuah website (misalnya `mudzakarah-rdm.vercel.app`) yang bisa dibuka siapa saja dari HP, tanpa akun Claude. Website ini juga bisa dipasang seperti aplikasi di layar utama HP.

Semua layanan yang dipakai **gratis**:

| Layanan | Kegunaan |
|---|---|
| **Supabase** | Database: materi, data peserta, nilai, tanya-jawab, berkas PDF |
| **GitHub** | Tempat menyimpan berkas website |
| **Vercel** | Menayangkan website ke internet |

Perkiraan waktu: 20–30 menit.

---

## Langkah 1 — Buat database di Supabase

1. Buka **supabase.com**, klik **Start your project**, lalu daftar (bisa memakai akun GitHub atau email).
2. Klik **New project**:
   - Name: `majelis-mudzakarah`
   - Database Password: buat lalu simpan baik-baik
   - Region: **Southeast Asia (Singapore)**
   - Klik **Create new project** dan tunggu sekitar 2 menit.
3. Buka menu **SQL Editor** di kiri, lalu klik **New query**.
   - Buka berkas `supabase.sql` dari folder ini, salin seluruh isinya, dan tempel.
   - Periksa baris paling bawah: email pengelola sudah diisi `aan@aimmah.ac.id`. Ganti bila memakai email lain. Untuk beberapa pengelola, tambahkan satu baris `insert` per email.
   - Klik **Run**. Bila muncul *Success*, lanjutkan.
4. Buka menu **Authentication** → **Sign In / Providers**, lalu aktifkan **Allow anonymous sign-ins** dan simpan. Ini yang memungkinkan peserta masuk hanya dengan nama dan nomor WA.
5. Buka **Authentication** → **Users** → **Add user** → **Create new user**:
   - isi email pengelola (sama dengan yang ada di SQL) dan kata sandinya,
   - centang **Auto Confirm User**,
   - klik **Create user**.
6. Klik tombol **Connect** di bagian atas, atau buka **Project Settings → API**. Salin dua hal ini:
   - **Project URL** (contoh: `https://abcdxyz.supabase.co`)
   - **anon / public key** (kunci yang panjang)

## Langkah 2 — Isi berkas `config.js`

Buka `config.js` dengan Notepad, lalu ganti dua tulisan `GANTI_...` dengan Project URL dan anon key tadi. Pastikan tanda kutipnya tetap ada. Simpan.

```js
window.MAJELIS_CONFIG = {
  supabaseUrl: "https://abcdxyz.supabase.co",
  supabaseAnonKey: "eyJhbGciOi..."
};
```

Kunci *anon* ini memang boleh dipakai di website. Data tetap aman karena aturan aksesnya sudah diatur lewat SQL di Langkah 1.

## Langkah 3 — Unggah ke GitHub

1. Daftar di **github.com**.
2. Klik **+** (kanan atas) → **New repository**.
   - Repository name: `majelis-mudzakarah`
   - Pilih **Public** atau **Private**, keduanya bisa.
   - Klik **Create repository**.
3. Pada halaman berikutnya, klik tautan **uploading an existing file**.
4. Seret **seluruh isi folder** ini ke sana. Yang diseret adalah isinya (index.html, app.js, style.css, folder img, dan seterusnya), bukan foldernya.
5. Klik **Commit changes**.

## Langkah 4 — Tayangkan di Vercel

1. Buka **vercel.com**, lalu **Sign Up** dengan **Continue with GitHub**.
2. Klik **Add New… → Project**, lalu **Import** repository `majelis-mudzakarah`.
3. Framework Preset: **Other**. Biarkan pengaturan lainnya, lalu klik **Deploy**.
4. Setelah selesai, website langsung bisa dibuka di alamat seperti `majelis-mudzakarah.vercel.app`.
5. Untuk mengganti alamat: **Settings → Domains**. Di sana antum bisa memakai nama lain seperti `mudzakarah-rdm.vercel.app`, atau domain sendiri.

## Langkah 5 — Penerbitan pertama

1. Buka website, lalu ketuk **Saya pengelola majelis** dan masuk dengan email serta kata sandi dari Langkah 1.5.
2. Ketuk **Kelola** di kanan atas, lalu **Terbitkan**. Langkah ini memindahkan materi contoh ke database.
3. Bagikan alamat website ke grup WhatsApp peserta.

---

## Pemakaian sehari-hari

- **Menambah materi:** Kelola → Program → **+ Pertemuan** → isi judul, link YouTube atau Drive, ringkasan, lalu **Terbitkan**.
- **Mengunggah PDF kitab:** buka pertemuan di Kelola → **Unggah berkas** (maksimal 50 MB). Untuk berkas yang lebih besar, simpan di Google Drive lalu tempel tautannya.
- **Soal dan kartu otomatis:** di Kelola → **Pengaturan AI**, tempel kunci gratis dari **aistudio.google.com → Get API key**. Setelah itu, tombol ✦ di setiap pertemuan menyusun soal dari ringkasan, transkrip, dan video YouTube. Periksa setiap soal sebelum diterbitkan.
- **Materi yang disiapkan Claude:** Kelola → **Impor materi** → tempel JSON atau pilih berkas .json → **Impor** → **Terbitkan**.
- **Rekap peserta:** Kelola → **Rekap peserta** → **Salin rekap**, lalu tempel di Excel atau Google Sheets.
- **Menjawab pertanyaan:** pertanyaan yang belum dijawab muncul di Kelola. Ketuk **Buka & jawab**.

## Catatan penting

- **Proyek bisa dijeda:** proyek Supabase gratis otomatis dijeda bila tidak dipakai selama 7 hari. Selama peserta rutin membuka website, proyek tetap aktif. Bila terjeda, buka supabase.com lalu klik **Restore project**.
- **Mengubah tampilan atau kode:** unggah ulang berkas yang diubah ke GitHub. Vercel akan menayangkan ulang secara otomatis dalam sekitar 1 menit.
- **Peserta ganti HP:** cukup masuk lagi dengan nama dan nomor WA yang sama. Di rekap, peserta tersebut bisa muncul dua kali dengan nomor WA yang sama. Progres lamanya tetap tersimpan di HP sebelumnya.
