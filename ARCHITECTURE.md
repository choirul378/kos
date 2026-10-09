# KosManager — Arsitektur & Skema Database

Aplikasi manajemen rumah kos **100% offline** (Expo / React Native, target Android .apk).
Semua data disimpan di **SQLite lokal** (`expo-sqlite`, file `kosmanager.db`). Tidak memakai server.

## 1. Struktur Folder
```
frontend/
├── app/                       # Layar (expo-router, file-based routing)
│   ├── _layout.tsx            # Root: Feedback (toast/dialog) + LockProvider (PIN/biometrik) + Stack
│   ├── (tabs)/                # Navigasi bawah (4 tab)
│   │   ├── _layout.tsx        # Tabs (NativeTabs di iOS 26+)
│   │   ├── index.tsx          # Beranda / Dashboard
│   │   ├── rooms.tsx          # Daftar kamar (filter Semua/Kosong/Terisi)
│   │   ├── tenants.tsx        # Daftar penghuni (cari + Aktif/Alumni)
│   │   └── finance.tsx        # Keuangan: pemasukan, pengeluaran, rekap arus kas
│   ├── room-form.tsx          # Tambah/Edit/Hapus kamar
│   ├── room/[id].tsx          # Detail kamar + riwayat bayar per kamar
│   ├── tenant-form.tsx        # Tambah/Edit penghuni (foto KTP kamera/galeri)
│   ├── tenant/[id].tsx        # Detail penghuni, tagih WA, checkout, riwayat bayar
│   ├── payment-form.tsx       # Catat pembayaran sewa (Lunas/DP)
│   ├── receipt/[id].tsx       # Kuitansi: kirim WhatsApp / simpan PDF
│   ├── cash-form.tsx          # Catat pengeluaran / pemasukan lain
│   ├── settings.tsx           # Profil kos, PIN, biometrik, backup & restore
│   └── pin-setup.tsx          # Buat / ubah PIN
└── src/
    ├── db/
    │   ├── schema.ts          # DDL SQLite (CREATE TABLE + INDEX)
    │   ├── client.ts          # Koneksi expo-sqlite (Android/iOS)
    │   ├── client.web.ts      # sql.js (khusus pratinjau web)
    │   └── repo.ts            # CRUD Kamar, Penghuni, Transaksi, Kas, Dashboard, Backup
    ├── components/PinPad.tsx  # Keypad PIN
    ├── lock.tsx               # Kunci aplikasi (PIN hash di SecureStore + biometrik)
    ├── feedback.tsx           # Toast & dialog konfirmasi (bottom sheet)
    ├── share.ts               # WhatsApp, PDF (expo-print), export/import JSON, simpan foto KTP
    ├── format.ts              # Rupiah, tanggal, pesan tagihan & kuitansi (teks/HTML)
    ├── settings.ts            # Nama kos & pemilik
    ├── hooks.ts               # useFocusData (muat ulang data saat layar fokus)
    ├── ui.tsx                 # Komponen UI (Button, Field, Card, Chips, Badge, ...)
    └── theme.ts               # Token warna (teal)
```

## 2. Skema Database (SQLite)
```
rooms (1) ──< tenants (N)        tenants.room_id   → rooms.id   ON DELETE SET NULL
tenants (1) ──< payments (N)     payments.tenant_id → tenants.id ON DELETE CASCADE
rooms (1) ──< payments (N)       payments.room_id  → rooms.id   ON DELETE SET NULL
cash_entries                     (pemasukan lain & pengeluaran operasional)
```
| Tabel | Kolom |
|---|---|
| rooms | id PK, number UNIQUE, type, facilities, price, status ('kosong'/'terisi'), notes, created_at |
| tenants | id PK, name, phone, ktp_photo (path file lokal), entry_date, room_id FK, status ('aktif'/'alumni'), exit_date, notes, created_at |
| payments | id PK, tenant_id FK, room_id FK, pay_date, period ('YYYY-MM'), amount, status ('lunas'/'dp'), method, notes, receipt_no, created_at |
| cash_entries | id PK, type ('masuk'/'keluar'), category, amount, date, description, created_at |

DDL lengkap: `src/db/schema.ts`. Status kamar otomatis disinkronkan saat penghuni masuk/pindah/checkout.

**Menunggak** = penghuni aktif yang total pembayaran untuk periode bulan berjalan < harga sewa kamar.

## 3. CRUD Utama (`src/db/repo.ts`)
- Kamar: `listRooms`, `getRoom`, `saveRoom` (insert/update + cek nomor unik), `deleteRoom` (ditolak bila masih dihuni)
- Penghuni: `listTenants`, `getTenant`, `saveTenant` (transaksi + sinkron status kamar), `checkoutTenant`, `deleteTenant`
- Transaksi: `listPayments` (per penghuni/kamar), `getPayment`, `savePayment` (nomor kuitansi otomatis `KW/YYYYMM/0001`), `deletePayment`, `getPaidForPeriod`
- Kas: `saveCash`, `getCash`, `deleteCash`, `listFinance`, `monthSummary`
- Dashboard: `getDashboard`, `listArrears`
- Backup: `exportAll`, `validateBackup`, `importAll`

## 4. Backup & Keamanan
- Export JSON → bagikan (Drive/WA/email) atau simpan langsung ke folder (Android SAF). Import JSON → mengganti seluruh data.
- PIN 4–6 digit (hash di SecureStore), opsi sidik jari/Face ID (expo-local-authentication), kunci otomatis setelah 30 detik di background.
