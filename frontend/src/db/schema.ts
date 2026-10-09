// Skema database SQLite KosManager (versi 1)
// Relasi:
//   rooms 1 ──< tenants        (tenants.room_id  → rooms.id, ON DELETE SET NULL)
//   tenants 1 ──< payments     (payments.tenant_id → tenants.id, ON DELETE CASCADE)
//   rooms 1 ──< payments       (payments.room_id → rooms.id, ON DELETE SET NULL)
//   cash_entries               (pemasukan lain & pengeluaran operasional, berdiri sendiri)
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  number TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT '',
  facilities TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'kosong' CHECK (status IN ('kosong','terisi')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  ktp_photo TEXT,
  entry_date TEXT NOT NULL,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','alumni')),
  exit_date TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
  pay_date TEXT NOT NULL,
  period TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'lunas' CHECK (status IN ('lunas','dp')),
  method TEXT NOT NULL DEFAULT 'Tunai',
  notes TEXT NOT NULL DEFAULT '',
  receipt_no TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS cash_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('masuk','keluar')),
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tenants_room ON tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id, period);
CREATE INDEX IF NOT EXISTS idx_payments_room ON payments(room_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(pay_date);
CREATE INDEX IF NOT EXISTS idx_cash_date ON cash_entries(date, type);
`;
