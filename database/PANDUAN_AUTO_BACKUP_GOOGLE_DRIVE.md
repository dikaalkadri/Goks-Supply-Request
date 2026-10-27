# Panduan Setup Auto-Backup Bulanan ke Google Drive

Sistem backup ini menggunakan **GitHub Actions** yang berjalan otomatis setiap tanggal 1 tiap bulan pukul **08:00 WIB**. Backup disimpan langsung ke **Google Drive** Anda dalam format terkompresi (`.sql.gz`).

---

## 1. Dapatkan Connection String Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih project Anda, masuk ke **Project Settings** > **Database**.
3. Gulir ke bagian **Connection string** > pilih tab **URI**.
4. Salin URL tersebut. Bentuknya seperti:
   ```text
   postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   *(Pastikan password database Anda sudah diisi menggantikan `[YOUR-PASSWORD]`)*.

---

## 2. Siapkan Folder Google Drive & Service Account
1. Buka [Google Drive](https://drive.google.com/), buat folder baru bernama **`Backup Supabase Goks`**.
2. Buka folder tersebut, lalu salin **Folder ID** dari address bar browser:
   `https://drive.google.com/drive/folders/`**`1a2b3c4d5e...`** *(teks setelah /folders/ adalah Folder ID)*.
3. Buka [Google Cloud Console](https://console.cloud.google.com/):
   - Buat project baru (misal: `Goks Backup`).
   - Masuk ke **APIs & Services** > **Library**, cari **Google Drive API**, lalu klik **Enable**.
   - Masuk ke **APIs & Services** > **Credentials**, klik **Create Credentials** > **Service Account**.
   - Beri nama service account, klik **Create and Continue**, lalu **Done**.
   - Klik email Service Account yang baru dibuat > tab **Keys** > **Add Key** > **Create new key** > pilih **JSON** > download file JSON-nya.
4. Salin alamat email Service Account (contoh: `goks-backup@...iam.gserviceaccount.com`).
5. Kembali ke Google Drive > klik kanan folder **`Backup Supabase Goks`** > **Share** > masukkan email Service Account tadi dan beri akses **Editor**.

---

## 3. Masukkan Secrets di GitHub Repository
Buka repository GitHub Anda, masuk ke **Settings** > **Secrets and variables** > **Actions**, tambahkan 3 secret berikut:

1. `SUPABASE_DB_URL`
   - Isi dengan connection string Supabase dari Langkah 1.
2. `GDRIVE_FOLDER_ID`
   - Isi dengan Folder ID Google Drive dari Langkah 2.
3. `GDRIVE_SERVICE_ACCOUNT_JSON`
   - Buka file JSON key yang didownload tadi dengan Notepad/VS Code, salin seluruh teks isinya (termasuk kurung kurawal `{ ... }`), lalu paste ke secret ini.

---

## 4. Uji Coba Backup (Manual Trigger)
Anda tidak perlu menunggu tanggal 1 untuk mengetesnya:
1. Buka tab **Actions** di GitHub repository Anda.
2. Pilih workflow **Monthly Database Backup to Google Drive** di sisi kiri.
3. Klik tombol **Run workflow** di sebelah kanan.
4. Setelah selesai (tanda centang hijau), periksa folder Google Drive Anda: file `backup_supabase_YYYY-MM-DD_HHMMSS.sql.gz` akan langsung muncul!
