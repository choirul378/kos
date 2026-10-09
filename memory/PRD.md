# KosManager — PRD

## Original Problem
Offline Android boarding-house (kos) management app: dashboard, rooms CRUD, tenants (KTP photo, active/alumni), rent payments (lunas/DP, WhatsApp billing, per-tenant/room history, receipt via WA text or PDF), expenses & monthly cash-flow report, PIN/biometric lock, JSON export/import. Output: folder architecture, SQLite schema with relations, CRUD code, simple UI.

## User Choices
SQLite local (expo-sqlite), PIN 4–6 + biometric, JSON backup, clean light teal UI, Rupiah & Bahasa Indonesia.

## Architecture
Expo Router app, no backend. `src/db/schema.ts` (rooms, tenants, payments, cash_entries + FKs), `client.ts` (expo-sqlite) / `client.web.ts` (sql.js for web preview), `repo.ts` CRUD. Lock overlay (`src/lock.tsx`), feedback toasts/dialogs, share utils (WA, expo-print PDF, backup). Docs: `/app/ARCHITECTURE.md`.

## Implemented (Jun 2026)
- 4 tabs: Beranda, Kamar, Penghuni, Keuangan + Settings, PIN setup
- Room/Tenant/Payment/Cash CRUD, auto room status sync, arrears detection, receipt numbers
- WhatsApp billing & receipt text, PDF receipt share
- 6-month cash-flow recap, category breakdown
- PIN + biometric, auto-relock after 30s in background
- JSON export (share / Android folder) & import
- Tested: iteration_1 all pass
- Monthly cash-flow PDF report export (`src/report.ts`, Finance header + Rekap button)
- "Jatuh Tempo 7 Hari ke Depan" list (`listDueSoon`, `src/components/DueList.tsx`) on Beranda & Penghuni tab, Lunas/DP/Belum badges, WA reminder, pay with period prefilled
- Tested: iteration_2 all pass

## Backlog
- P1: Include KTP photos in backup (zip)
- P2: Deposit tracking; multi-property; filters/sorting for transaction history
