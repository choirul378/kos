# Import KosManager dari GitHub (choirul378/kos, branch main)

KosManager adalah aplikasi HP untuk mengelola kos yang berjalan 100% offline. Datanya disimpan di HP itu sendiri.
Pekerjaan ini mengambil kode dari GitHub apa adanya, memasang semua dependency, lalu memastikan pratinjau web-nya bisa dibuka tanpa error.

## Untuk siapa
- Pemilik atau pengelola kos yang mencatat kamar, penghuni, pembayaran, dan keuangan dari HP.
- Pemilik repo yang ingin melanjutkan pengembangan KosManager di workspace ini.

## Fitur inti dan pengalaman (yang sudah ada di repo, tidak diubah)
- **Beranda**: jumlah kamar terisi, kosong, dan menunggak, ditambah pemasukan, pengeluaran, dan saldo bulan ini. Ada tombol "Tagih via WhatsApp" dan "Catat Bayar".
- **Kamar**: tambah, edit, dan hapus kamar. Nomor kamar tidak boleh sama, dan kamar yang masih dihuni tidak bisa dihapus.
- **Penghuni**: data lengkap dengan foto KTP, pencarian, status Aktif/Alumni, dan checkout.
- **Pembayaran**: nominal terisi otomatis, status Lunas/DP, dan nomor kuitansi otomatis. Kuitansi bisa dikirim lewat WhatsApp atau disimpan sebagai PDF.
- **Keuangan**: catat pengeluaran dan pemasukan lain, rekap per kategori, grafik arus kas 6 bulan, filter riwayat transaksi, dan laporan bulanan PDF.
- **Keamanan dan backup**: kunci PIN dengan opsi sidik jari/Face ID, serta backup dan restore lewat file .json (termasuk foto KTP).

## Alur pengguna
1. Buka pratinjau web, lalu buat atau masukkan PIN.
2. Lihat ringkasan di Beranda.
3. Kelola Kamar dan Penghuni, lalu catat Pembayaran.
4. Pantau Keuangan, lalu backup data dari Pengaturan.

## Nuansa UI/UX
- Tampilan dan desain dipertahankan persis seperti di repo, tanpa perubahan visual.

## Tahapan implementasi
- **Tahap 1 (MVP, dikerjakan sekarang)**: ambil kode branch main, ganti template web yang ada di workspace dengan proyek Expo dari repo, pasang semua dependency, dan jalankan pratinjau web. Error yang menghalangi aplikasi terbuka atau dipakai di pratinjau akan diperbaiki seperlunya, tanpa mengubah fitur. Setelah itu, alur utama dicek: PIN, Beranda, Kamar, Penghuni, Pembayaran, Keuangan, dan Backup.
- **Tahap 2 (nanti)**: perbaikan bug yang dilaporkan pengguna setelah mencoba aplikasi, serta uji di HP sungguhan lewat Expo Go.
- **Tahap 3 (nanti)**: fitur baru dari daftar ide di repo, misalnya pengingat massal WA, catatan deposit, export CSV, dan riwayat kamar. Juga build APK/iOS lewat Publish.

## Asumsi
- Kode diambil dari branch main pada commit terbaru. Isi workspace saat ini (template React + FastAPI) diganti dengan isi repo.
- Aplikasi tetap offline dengan SQLite di HP. Tidak ada pindah ke MongoDB atau server, dan tidak ada fitur baru.
- Pratinjau web memerlukan internet sekali untuk memuat mesin database. Ini perilaku bawaan repo.
- Fitur khusus HP tidak bisa dites di pratinjau web: kamera/galeri KTP, sidik jari/Face ID, simpan ke folder, dan berbagi file. Fitur-fitur ini hanya dipastikan tidak membuat aplikasi crash.
- Perbaikan hanya untuk error yang muncul saat aplikasi dijalankan. Belum ada bug spesifik dari pengguna.
- Data contoh tidak ditambahkan. Aplikasi mulai dalam keadaan kosong, sama seperti di repo.
