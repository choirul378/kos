// Repository: semua fungsi CRUD (Kamar, Penghuni, Transaksi, Kas) + laporan & backup.
import { currentPeriod, todayISO } from "../format";
import { DB, getDb } from "./client";

export type RoomStatus = "kosong" | "terisi";
export type TenantStatus = "aktif" | "alumni";
export type PayStatus = "lunas" | "dp";
export type CashType = "masuk" | "keluar";

export type Room = {
  id: number; number: string; type: string; facilities: string; price: number;
  status: RoomStatus; notes: string; created_at: string;
  tenant_id?: number | null; tenant_name?: string | null;
};
export type RoomInput = Pick<Room, "number" | "type" | "facilities" | "price" | "status" | "notes">;

export type Tenant = {
  id: number; name: string; phone: string; ktp_photo: string | null; entry_date: string;
  room_id: number | null; status: TenantStatus; exit_date: string | null; notes: string; created_at: string;
  room_number?: string | null; room_price?: number | null;
};
export type TenantInput = Pick<Tenant, "name" | "phone" | "ktp_photo" | "entry_date" | "room_id" | "status" | "exit_date" | "notes">;

export type Payment = {
  id: number; tenant_id: number; room_id: number | null; pay_date: string; period: string; amount: number;
  status: PayStatus; method: string; notes: string; receipt_no: string | null; created_at: string;
  tenant_name?: string | null; tenant_phone?: string | null; room_number?: string | null;
};
export type PaymentInput = Pick<Payment, "tenant_id" | "pay_date" | "period" | "amount" | "status" | "method" | "notes">;

export type CashEntry = {
  id: number; type: CashType; category: string; amount: number; date: string; description: string; created_at: string;
};
export type CashInput = Pick<CashEntry, "type" | "category" | "amount" | "date" | "description">;

const now = () => new Date().toISOString();

// ───────────────────────── KAMAR ─────────────────────────
const ROOM_SELECT = `SELECT r.*,
  (SELECT t.id FROM tenants t WHERE t.room_id = r.id AND t.status = 'aktif' ORDER BY t.id LIMIT 1) AS tenant_id,
  (SELECT t.name FROM tenants t WHERE t.room_id = r.id AND t.status = 'aktif' ORDER BY t.id LIMIT 1) AS tenant_name
  FROM rooms r`;

export async function listRooms(status?: RoomStatus): Promise<Room[]> {
  const db = await getDb();
  return db.all<Room>(
    `${ROOM_SELECT} ${status ? "WHERE r.status = ?" : ""} ORDER BY LENGTH(r.number), r.number`,
    status ? [status] : [],
  );
}

export async function getRoom(id: number) {
  const db = await getDb();
  return db.get<Room>(`${ROOM_SELECT} WHERE r.id = ?`, [id]);
}

export async function saveRoom(input: RoomInput, id?: number): Promise<number> {
  const db = await getDb();
  const number = input.number.trim();
  if (!number) throw new Error("Nomor kamar wajib diisi");
  if (!(input.price > 0)) throw new Error("Harga sewa harus lebih dari 0");
  const dup = await db.get("SELECT id FROM rooms WHERE number = ? COLLATE NOCASE AND id != ?", [number, id ?? 0]);
  if (dup) throw new Error(`Nomor kamar "${number}" sudah ada`);
  const vals = [number, input.type.trim(), input.facilities.trim(), input.price, input.status, input.notes.trim()];
  if (id) {
    await db.run("UPDATE rooms SET number=?, type=?, facilities=?, price=?, status=?, notes=? WHERE id=?", [...vals, id]);
    return id;
  }
  const r = await db.run(
    "INSERT INTO rooms (number, type, facilities, price, status, notes, created_at) VALUES (?,?,?,?,?,?,?)",
    [...vals, now()],
  );
  return r.lastId;
}

export async function deleteRoom(id: number) {
  const db = await getDb();
  const c = await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM tenants WHERE room_id = ? AND status = 'aktif'", [id]);
  if (c && c.c > 0) throw new Error("Kamar masih dihuni. Checkout atau pindahkan penghuni dulu.");
  await db.run("DELETE FROM rooms WHERE id = ?", [id]);
}

async function syncRoomStatus(db: DB, roomId: number | null | undefined) {
  if (!roomId) return;
  const c = await db.get<{ c: number }>("SELECT COUNT(*) AS c FROM tenants WHERE room_id = ? AND status = 'aktif'", [roomId]);
  await db.run("UPDATE rooms SET status = ? WHERE id = ?", [c && c.c > 0 ? "terisi" : "kosong", roomId]);
}

// ───────────────────────── PENGHUNI ─────────────────────────
const TENANT_SELECT = `SELECT t.*, r.number AS room_number, r.price AS room_price
  FROM tenants t LEFT JOIN rooms r ON r.id = t.room_id`;

export async function listTenants(status?: TenantStatus, q?: string): Promise<Tenant[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (status) { where.push("t.status = ?"); params.push(status); }
  if (q && q.trim()) {
    where.push("(t.name LIKE ? OR t.phone LIKE ? OR r.number LIKE ?)");
    const like = `%${q.trim()}%`;
    params.push(like, like, like);
  }
  return db.all<Tenant>(
    `${TENANT_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY t.status, t.name COLLATE NOCASE`,
    params,
  );
}

export async function getTenant(id: number) {
  const db = await getDb();
  return db.get<Tenant>(`${TENANT_SELECT} WHERE t.id = ?`, [id]);
}

export async function saveTenant(input: TenantInput, id?: number): Promise<number> {
  const db = await getDb();
  const name = input.name.trim();
  if (!name) throw new Error("Nama lengkap wajib diisi");
  if (!input.entry_date) throw new Error("Tanggal masuk wajib diisi");
  const exitDate = input.status === "alumni" ? input.exit_date || todayISO() : null;
  const vals = [name, input.phone.trim(), input.ktp_photo, input.entry_date, input.room_id, input.status, exitDate, input.notes.trim()];
  let resultId = id ?? 0;
  await db.tx(async () => {
    let oldRoom: number | null = null;
    if (id) {
      const old = await db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [id]);
      oldRoom = old?.room_id ?? null;
      await db.run(
        "UPDATE tenants SET name=?, phone=?, ktp_photo=?, entry_date=?, room_id=?, status=?, exit_date=?, notes=? WHERE id=?",
        [...vals, id],
      );
    } else {
      const r = await db.run(
        "INSERT INTO tenants (name, phone, ktp_photo, entry_date, room_id, status, exit_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        [...vals, now()],
      );
      resultId = r.lastId;
    }
    await syncRoomStatus(db, oldRoom);
    await syncRoomStatus(db, input.room_id);
  });
  return resultId;
}

export async function checkoutTenant(id: number) {
  const db = await getDb();
  const t = await db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [id]);
  if (!t) return;
  await db.tx(async () => {
    await db.run("UPDATE tenants SET status = 'alumni', exit_date = ? WHERE id = ?", [todayISO(), id]);
    await syncRoomStatus(db, t.room_id);
  });
}

export async function deleteTenant(id: number) {
  const db = await getDb();
  const t = await db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [id]);
  await db.tx(async () => {
    await db.run("DELETE FROM payments WHERE tenant_id = ?", [id]);
    await db.run("DELETE FROM tenants WHERE id = ?", [id]);
    await syncRoomStatus(db, t?.room_id);
  });
}

// ───────────────────────── TRANSAKSI SEWA ─────────────────────────
const PAY_SELECT = `SELECT p.*, t.name AS tenant_name, t.phone AS tenant_phone, r.number AS room_number
  FROM payments p LEFT JOIN tenants t ON t.id = p.tenant_id LEFT JOIN rooms r ON r.id = p.room_id`;

export async function listPayments(f: { tenantId?: number; roomId?: number; limit?: number } = {}): Promise<Payment[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: number[] = [];
  if (f.tenantId) { where.push("p.tenant_id = ?"); params.push(f.tenantId); }
  if (f.roomId) { where.push("p.room_id = ?"); params.push(f.roomId); }
  return db.all<Payment>(
    `${PAY_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY p.pay_date DESC, p.id DESC ${f.limit ? "LIMIT " + f.limit : ""}`,
    params,
  );
}

export async function getPayment(id: number) {
  const db = await getDb();
  return db.get<Payment>(`${PAY_SELECT} WHERE p.id = ?`, [id]);
}

export async function getPaidForPeriod(tenantId: number, period: string, excludeId = 0) {
  const db = await getDb();
  const r = await db.get<{ s: number | null }>(
    "SELECT SUM(amount) AS s FROM payments WHERE tenant_id = ? AND period = ? AND id != ?",
    [tenantId, period, excludeId],
  );
  return r?.s ?? 0;
}

export async function savePayment(input: PaymentInput, id?: number): Promise<number> {
  const db = await getDb();
  if (!input.tenant_id) throw new Error("Pilih penghuni terlebih dahulu");
  if (!(input.amount > 0)) throw new Error("Nominal harus lebih dari 0");
  const tenant = await db.get<Tenant>("SELECT * FROM tenants WHERE id = ?", [input.tenant_id]);
  if (!tenant) throw new Error("Penghuni tidak ditemukan");
  const vals = [input.tenant_id, tenant.room_id, input.pay_date, input.period, input.amount, input.status, input.method, input.notes.trim()];
  if (id) {
    await db.run(
      "UPDATE payments SET tenant_id=?, room_id=?, pay_date=?, period=?, amount=?, status=?, method=?, notes=? WHERE id=?",
      [...vals, id],
    );
    return id;
  }
  const r = await db.run(
    "INSERT INTO payments (tenant_id, room_id, pay_date, period, amount, status, method, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
    [...vals, now()],
  );
  const receipt = `KW/${input.period.replace("-", "")}/${String(r.lastId).padStart(4, "0")}`;
  await db.run("UPDATE payments SET receipt_no = ? WHERE id = ?", [receipt, r.lastId]);
  return r.lastId;
}

export async function deletePayment(id: number) {
  const db = await getDb();
  await db.run("DELETE FROM payments WHERE id = ?", [id]);
}

// ───────────────────────── KAS (PEMASUKAN LAIN / PENGELUARAN) ─────────────────────────
export async function getCash(id: number) {
  const db = await getDb();
  return db.get<CashEntry>("SELECT * FROM cash_entries WHERE id = ?", [id]);
}

export async function saveCash(input: CashInput, id?: number): Promise<number> {
  const db = await getDb();
  if (!input.category.trim()) throw new Error("Pilih kategori");
  if (!(input.amount > 0)) throw new Error("Nominal harus lebih dari 0");
  const vals = [input.type, input.category.trim(), input.amount, input.date, input.description.trim()];
  if (id) {
    await db.run("UPDATE cash_entries SET type=?, category=?, amount=?, date=?, description=? WHERE id=?", [...vals, id]);
    return id;
  }
  const r = await db.run(
    "INSERT INTO cash_entries (type, category, amount, date, description, created_at) VALUES (?,?,?,?,?,?)",
    [...vals, now()],
  );
  return r.lastId;
}

export async function deleteCash(id: number) {
  const db = await getDb();
  await db.run("DELETE FROM cash_entries WHERE id = ?", [id]);
}

export type FinanceItem = {
  key: string; kind: "sewa" | "masuk" | "keluar"; id: number;
  title: string; subtitle: string; amount: number; date: string;
};

export async function listFinance(period: string, type: CashType): Promise<FinanceItem[]> {
  const db = await getDb();
  const items: FinanceItem[] = [];
  if (type === "masuk") {
    const pays = await db.all<Payment>(`${PAY_SELECT} WHERE substr(p.pay_date, 1, 7) = ?`, [period]);
    pays.forEach((p) => items.push({
      key: "p" + p.id, kind: "sewa", id: p.id,
      title: `Sewa ${p.room_number ? "Kamar " + p.room_number : ""} · ${p.tenant_name ?? "-"}`,
      subtitle: `Periode ${p.period} · ${p.status === "lunas" ? "Lunas" : "DP"}`,
      amount: p.amount, date: p.pay_date,
    }));
  }
  const cash = await db.all<CashEntry>(
    "SELECT * FROM cash_entries WHERE type = ? AND substr(date, 1, 7) = ?", [type, period],
  );
  cash.forEach((c) => items.push({
    key: "c" + c.id, kind: type, id: c.id, title: c.category,
    subtitle: c.description || (type === "masuk" ? "Pemasukan lain" : "Pengeluaran"),
    amount: c.amount, date: c.date,
  }));
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
}

export async function monthSummary(period: string) {
  const db = await getDb();
  const rent = await db.get<{ s: number | null }>("SELECT SUM(amount) AS s FROM payments WHERE substr(pay_date,1,7) = ?", [period]);
  const other = await db.get<{ s: number | null }>("SELECT SUM(amount) AS s FROM cash_entries WHERE type='masuk' AND substr(date,1,7) = ?", [period]);
  const exp = await db.get<{ s: number | null }>("SELECT SUM(amount) AS s FROM cash_entries WHERE type='keluar' AND substr(date,1,7) = ?", [period]);
  const byCategory = await db.all<{ category: string; total: number }>(
    "SELECT category, SUM(amount) AS total FROM cash_entries WHERE type='keluar' AND substr(date,1,7) = ? GROUP BY category ORDER BY total DESC",
    [period],
  );
  const income = (rent?.s ?? 0) + (other?.s ?? 0);
  const expense = exp?.s ?? 0;
  return { rent: rent?.s ?? 0, otherIncome: other?.s ?? 0, income, expense, net: income - expense, byCategory };
}

// ───────────────────────── DASHBOARD & TUNGGAKAN ─────────────────────────
export type Arrear = {
  tenant_id: number; name: string; phone: string; room_number: string; price: number; paid: number; remaining: number;
};

export async function listArrears(period: string): Promise<Arrear[]> {
  const db = await getDb();
  const rows = await db.all<Omit<Arrear, "remaining">>(
    `SELECT t.id AS tenant_id, t.name, t.phone, r.number AS room_number, r.price,
      COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.tenant_id = t.id AND p.period = ?), 0) AS paid
     FROM tenants t JOIN rooms r ON r.id = t.room_id
     WHERE t.status = 'aktif' AND t.entry_date <= ?
     ORDER BY LENGTH(r.number), r.number`,
    [period, period + "-31"],
  );
  return rows.filter((r) => r.paid < r.price).map((r) => ({ ...r, remaining: r.price - r.paid }));
}

export async function getDashboard(period = currentPeriod()) {
  const db = await getDb();
  const counts = await db.get<{ total: number; terisi: number | null; kosong: number | null }>(
    "SELECT COUNT(*) AS total, SUM(CASE WHEN status='terisi' THEN 1 ELSE 0 END) AS terisi, SUM(CASE WHEN status='kosong' THEN 1 ELSE 0 END) AS kosong FROM rooms",
  );
  const arrears = await listArrears(period);
  const summary = await monthSummary(period);
  const recent = await listPayments({ limit: 5 });
  return {
    total: counts?.total ?? 0,
    terisi: counts?.terisi ?? 0,
    kosong: counts?.kosong ?? 0,
    menunggak: new Set(arrears.map((a) => a.room_number)).size,
    arrears, summary, recent,
  };
}

// ───────────────────────── BACKUP & RESTORE ─────────────────────────
export type BackupData = {
  app: "kosmanager"; version: 1; exported_at: string;
  rooms: Room[]; tenants: Tenant[]; payments: Payment[]; cash_entries: CashEntry[];
};

export async function exportAll(): Promise<BackupData> {
  const db = await getDb();
  return {
    app: "kosmanager", version: 1, exported_at: now(),
    rooms: await db.all<Room>("SELECT * FROM rooms"),
    tenants: await db.all<Tenant>("SELECT * FROM tenants"),
    payments: await db.all<Payment>("SELECT * FROM payments"),
    cash_entries: await db.all<CashEntry>("SELECT * FROM cash_entries"),
  };
}

export function validateBackup(obj: any): obj is BackupData {
  return !!obj && obj.app === "kosmanager" && Array.isArray(obj.rooms) && Array.isArray(obj.tenants)
    && Array.isArray(obj.payments) && Array.isArray(obj.cash_entries);
}

export async function importAll(data: BackupData) {
  const db = await getDb();
  await db.tx(async () => {
    await db.run("DELETE FROM payments");
    await db.run("DELETE FROM cash_entries");
    await db.run("DELETE FROM tenants");
    await db.run("DELETE FROM rooms");
    for (const r of data.rooms) {
      await db.run("INSERT INTO rooms (id, number, type, facilities, price, status, notes, created_at) VALUES (?,?,?,?,?,?,?,?)",
        [r.id, r.number, r.type ?? "", r.facilities ?? "", r.price, r.status, r.notes ?? "", r.created_at ?? now()]);
    }
    for (const t of data.tenants) {
      await db.run("INSERT INTO tenants (id, name, phone, ktp_photo, entry_date, room_id, status, exit_date, notes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        [t.id, t.name, t.phone ?? "", t.ktp_photo ?? null, t.entry_date, t.room_id ?? null, t.status, t.exit_date ?? null, t.notes ?? "", t.created_at ?? now()]);
    }
    for (const p of data.payments) {
      await db.run("INSERT INTO payments (id, tenant_id, room_id, pay_date, period, amount, status, method, notes, receipt_no, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        [p.id, p.tenant_id, p.room_id ?? null, p.pay_date, p.period, p.amount, p.status, p.method ?? "Tunai", p.notes ?? "", p.receipt_no ?? null, p.created_at ?? now()]);
    }
    for (const c of data.cash_entries) {
      await db.run("INSERT INTO cash_entries (id, type, category, amount, date, description, created_at) VALUES (?,?,?,?,?,?,?)",
        [c.id, c.type, c.category, c.amount, c.date, c.description ?? "", c.created_at ?? now()]);
    }
  });
}
