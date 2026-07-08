# CLAUDE.md

Hướng dẫn cho Claude Code khi làm việc trong repo này.

---

## Commands

```bash
npm run dev      # Dev server tại http://localhost:3000
npm run build    # Build production (TypeScript + Next.js compile)
npm run start    # Chạy production build local
```

Không có test framework — kiểm tra bằng cách chạy app thực tế (xem skill `/verify`).

**Migrations:** Schema quản lý thủ công bằng SQL chạy trực tiếp trên Neon SQL Editor — không dùng `drizzle-kit push`.

---

## Tổng quan dự án

**Tên:** Thu Chi Tiết Kiệm — web app mobile-first PWA (Next.js 16 + Vercel + Neon PostgreSQL).
**Mục tiêu:** Bản sao gọn của MISA Sổ Thu Chi — ghi chép thu chi hằng ngày, tổng kết tháng, biểu đồ, ngân sách theo danh mục. Không ôm thêm tính năng ngoài phạm vi này.
**Demo tham khảo:** `demo_app.jpg` (thư mục gốc) — nguồn design duy nhất, không tự ý lệch.
**Logo:** `Logo.png` — đã resize thành icon PNG trong `public/`.
**Deploy:** Vercel (auto-deploy từ `main`) · `thu-chi-tiet-kiem.vercel.app`

---

## Tech Stack

| Package | Mục đích |
|---|---|
| `next` 16 / `react` 19 | App Router, SSR |
| `tailwindcss` 4 | Styling |
| `recharts` | Biểu đồ tròn + cột |
| `lucide-react` | Icons |
| `@neondatabase/serverless` + `drizzle-orm` | DB (HTTP driver, lazy factory trong `lib/db.ts`) |
| `bcryptjs` | Hash mật khẩu (rounds=12) |
| `jose` | JWT sign/verify |
| `resend` | Email OTP (free 3000/tháng) |

---

## Database (Neon PostgreSQL)

**7 bảng** — schema đầy đủ tại [lib/schema.ts](lib/schema.ts):

```
users        id, phone (unique), email, password_hash, is_verified,
             be_partner_phone, be_partner_monthly_target, be_partner_savings_buffer, created_at

otp_codes    id, user_id, target (email), code (6 số), purpose ('register'|'reset'),
             expires_at (5 phút), used, created_at

transactions id, user_id, type ('income'|'expense'), category, amount (bigint VND),
             note, date, created_at

budgets      id, user_id, category, amount (bigint VND), month (YYYY-MM), created_at
             UNIQUE(user_id, category, month) — upsert via POST /api/budgets

loans        id, user_id, name, lender_type, principal (bigint VND),
             monthly_payment (bigint VND, NULL cho vay cá nhân), total_months (NULL cho vay cá nhân),
             months_paid (default 0), start_month (YYYY-MM), due_day (1-31, NULL cho vay cá nhân),
             paid_amount (bigint VND, default 0 — dùng cho vay cá nhân), note, created_at

be_daily_targets  id, user_id, date, target_amount (bigint VND), created_at
                  UNIQUE(user_id, date) — upsert via POST /api/be-targets

bee_fixed_items   id, user_id, type ('income'|'expense'), name, amount (bigint VND), created_at
                  — danh sách thu/chi cố định hằng tháng, dùng để tự tính target Bee
```

**⚠️ Luôn xác nhận bảng đã tồn tại trước khi đưa migration `ALTER TABLE`** — từng đưa nhầm
`ALTER TABLE loans ...` khi bảng `loans` chưa hề được tạo trên Neon, gây lỗi
`relation "loans" does not exist`. An toàn nhất: `CREATE TABLE IF NOT EXISTS` luôn luôn.

**SQL tạo bảng `loans`** (nếu Neon SQL Editor báo `relation "loans" does not exist`, nghĩa là bảng chưa tồn tại — chạy cái này thay vì ALTER):
```sql
CREATE TABLE IF NOT EXISTS "loans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "lender_type" varchar(30) NOT NULL,
  "principal" bigint NOT NULL,
  "monthly_payment" bigint,
  "total_months" integer,
  "months_paid" integer DEFAULT 0 NOT NULL,
  "start_month" varchar(7) NOT NULL,
  "due_day" integer,
  "paid_amount" bigint DEFAULT 0 NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_loans_user_id" ON "loans"("user_id");
```

**SQL tạo bảng `be_daily_targets`:**
```sql
CREATE TABLE IF NOT EXISTS "be_daily_targets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "target_amount" bigint NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  UNIQUE ("user_id", "date")
);
CREATE INDEX IF NOT EXISTS "idx_be_daily_targets_user_id" ON "be_daily_targets"("user_id");
```

**SQL cho tính năng tự tính target Bee** (thêm cột trên `users` đã có sẵn — an toàn — và bảng mới `bee_fixed_items`):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS be_partner_savings_buffer BIGINT;

CREATE TABLE IF NOT EXISTS "bee_fixed_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(10) NOT NULL,
  "name" varchar(100) NOT NULL,
  "amount" bigint NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_bee_fixed_items_user_id" ON "bee_fixed_items"("user_id");
```

Indexes cần có trên Neon: `idx_transactions_user_id`, `idx_transactions_date`,
`idx_otp_user_id`, và composite `(user_id, date DESC)` cho query lọc theo tháng.

`bePartnerPhone` / `bePartnerMonthlyTarget` / `bePartnerSavingsBuffer` phục vụ tính năng
Beepartner (§ bên dưới) — không phải bảng riêng, chỉ là 3 cột trên `users`.

---

## Authentication

- JWT (jose) trong httpOnly cookie `auth-token`, hết hạn 7 ngày.
- OTP 6 số, hết hạn 5 phút, `used=true` sau khi dùng 1 lần.
- Route protection: `proxy.ts` (Next.js 16 dùng `proxy.ts` thay `middleware.ts` — **không tạo `middleware.ts`**, sẽ conflict). Export function tên `proxy`; build output phải hiện `ƒ Proxy (Middleware)`.
- Public routes (không cần JWT): `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` + các API `/api/auth/*`.

```
Đăng ký: /register → OTP email → /verify-otp?purpose=register → JWT cookie → /
Đăng nhập: /login → JWT cookie → /
Quên MK: /forgot-password → OTP → /verify-otp?purpose=reset → resetToken → /reset-password
```

---

## State Management

`AppShell` (client component) giữ toàn bộ state giao dịch qua `TxContext`:
- Mount: fetch **toàn bộ** giao dịch của user 1 lần + fetch user profile (Beepartner).
- Filter theo tháng ở client-side (`lib/calculations.ts`).
- Optimistic update sau mỗi POST/PATCH/DELETE — không refetch.
- Context cung cấp: `transactions`, `loading`, `deleteById`, `openEditModal`, `openAddModal`, `recordTransaction`, `bePartnerPhone`, `bePartnerMonthlyTarget`.
- `recordTransaction(data)` — tạo + đồng bộ 1 giao dịch mà không mở modal, dùng cho các luồng tự động ghi chi/thu ngoài form thêm/sửa thông thường (hiện tại: xác nhận trả khoản vay ở `/loans`).

Edit flow: tap icon/tên giao dịch trong `TransactionItem` → `openEditModal(tx)` → `TransactionModal` mở với data pre-filled → PATCH → cập nhật state local.

---

## Cấu trúc thư mục

```
chitieu/
├── demo_app.jpg, Logo.png        ← Design gốc, KHÔNG xoá
├── proxy.ts                      ← Route protection
├── app/
│   ├── layout.tsx                ← Root layout, PWA meta, dark-mode init script
│   ├── globals.css               ← Tailwind + CSS vars (dark mode)
│   ├── page.tsx                  ← Tổng quan: balance, lịch chi tiêu hằng ngày, loan widget, Beepartner widget, giao dịch gần đây
│   ├── transactions/page.tsx     ← Danh sách + search/filter (Thu/Chi)
│   ├── charts/page.tsx           ← Donut chi tiêu theo danh mục + Ngân sách tháng + xu hướng 6 tháng
│   ├── loans/page.tsx            ← Quản lý khoản vay (CRUD + xác nhận trả tháng)
│   ├── settings/page.tsx         ← Cài đặt: khoản vay, Beepartner, dark mode, CSV export, logout
│   ├── login|register|verify-otp|forgot-password|reset-password/page.tsx
│   └── api/
│       ├── auth/**                       ← register, verify-otp, login, logout, forgot-password, reset-password
│       ├── transactions/route.ts + [id]/route.ts
│       ├── budgets/route.ts + [id]/route.ts
│       ├── loans/route.ts + [id]/route.ts + [id]/pay/route.ts
│       ├── be-targets/route.ts
│       ├── bee-fixed-items/route.ts + [id]/route.ts
│       └── user/me/route.ts, user/beepartner/route.ts
├── components/
│   ├── AppShell.tsx               ← TxContext + BottomNav + TransactionModal mount
│   ├── BottomNav.tsx              ← 4 tab + FAB (+)
│   ├── TransactionModal.tsx       ← Form thêm/sửa giao dịch
│   ├── TransactionItem.tsx        ← Row giao dịch (tap sửa, icon xoá)
│   ├── BudgetModal.tsx            ← Bottom sheet đặt/sửa/xoá ngân sách
│   ├── LoanModal.tsx              ← Form thêm/sửa khoản vay (bottom sheet, preview lãi suất realtime)
│   ├── LoanItem.tsx               ← Card khoản vay (badge đến hạn, progress bar, nút xác nhận trả)
│   ├── LoanSummaryWidget.tsx      ← Widget trang chủ: tổng "còn phải trả tháng này" + link /loans (không chart)
│   ├── AllowanceWidget.tsx        ← Widget trang chủ: tổng Phụ cấp tháng này + nút thêm nhanh (không target)
│   ├── BeepartnerWidget.tsx       ← Widget trang chủ: thu nhập Be theo tháng + mục tiêu + entry point tuần/cố định
│   ├── BeeWeekTargetModal.tsx     ← Bottom sheet đặt target 7 ngày T2-CN + badge Đạt/Chưa đạt
│   ├── BeeFixedBudgetModal.tsx    ← Bottom sheet danh sách thu/chi cố định → tự tính target tháng
│   └── BeepartnerLinkModal.tsx    ← Liên kết/huỷ liên kết SĐT Be
├── lib/
│   ├── schema.ts, db.ts, auth.ts, email.ts, otp.ts
│   ├── api.ts                     ← fetch/create/update/delete transactions, budgets, loans,
│   │                                 be-targets, bee-fixed-items, user profile, Beepartner
│   ├── calculations.ts            ← calcMonthSummary, calcExpenseByCategory, getLast6Months,
│   │                                 calcAnnualRate, calcRemainingBalance, calcLoanStatus,
│   │                                 calcDueThisMonthTotal, isLoanActive, calcBeeSuggestedDailyTarget
│   └── formatters.ts              ← formatVND, formatMonth, ...
├── types/index.ts                 ← Transaction, Budget, Loan, LenderType, BeDailyTarget, BeeFixedItem, EXPENSE/INCOME_CATEGORIES
└── public/                        ← PWA icons + manifest.json
```

---

## Tính năng cốt lõi

### 1. Thu chi (thêm/sửa/xoá)
Loại (thu/chi) + danh mục (grid emoji cố định, `EXPENSE_CATEGORIES`/`INCOME_CATEGORIES` trong `types/index.ts`) + số tiền + ghi chú + ngày. FAB (+) mở modal thêm mới; tap vào giao dịch mở modal sửa. Modal dùng `max-h-[90dvh] overflow-y-auto` để không bị bàn phím iOS đè.

### 2. Trang chủ (`/`)
- Số dư tháng hiện tại (Thu − Chi), badge Dư/Âm.
- Lịch chi tiêu hằng ngày: grid 7 cột (T2–CN), mỗi ô hiện số ngày + chi tiêu rút gọn ("250k", "1.5tr"); có thể đặt target chi/ngày để tô xanh/đỏ.
- Widget Khoản vay (`LoanSummaryWidget`, nếu có khoản vay đang trả).
- Widget Phụ cấp (`AllowanceWidget`, luôn hiện — không cần liên kết gì): tổng "Phụ cấp" đã ghi nhận tháng này + nút "+ Thêm" mở modal thu chi điền sẵn `type: "income", category: "Phụ cấp"`. Chỉ là shortcut nhập nhanh, không có target/bảng riêng (khác với Beepartner).
- Widget Beepartner (nếu đã liên kết SĐT) — xem §6.
- 8 giao dịch gần nhất.

### 3. Biểu đồ (`/charts`)
- Donut chart phân bổ chi tiêu theo danh mục (tương đương màn 2 của demo MISA).
- Ngân sách tháng này ("Hạn mức chi"): đặt/sửa/xoá ngân sách per category qua `BudgetModal`, progress bar + cảnh báo "Gần đạt"/"Vượt!".
- Xu hướng 6 tháng (bar chart Thu/Chi) + bảng kết quả từng tháng (dư/âm).

### 4. Tìm kiếm & lọc (`/transactions`)
Search theo danh mục/ghi chú + filter tab Tất cả/Thu/Chi — client-side trên `TxContext`, không cần API riêng.

### 5. Quản lý khoản vay (`/loans`)
Bản basic — **không có** panel "Nếu trả thêm mỗi tháng?" (early-payoff what-if, đã cắt chủ động để giữ gọn) hay biểu đồ donut trên widget trang chủ.
- Truy cập: Settings → "Quản lý khoản vay", hoặc widget trên trang chủ (chỉ hiện khi có khoản vay chưa trả hết, `isLoanActive()`).
- **2 chế độ, tự động theo loại vay** (`LoanModal`):
  - **Ngân hàng/Tiêu dùng/Khác** — lịch trả cố định: trả/tháng, tổng số tháng, số tháng đã trả, ngày trả/tháng. Lãi suất %/năm hiện live-preview khi nhập (Newton's method, `calcAnnualRate`). `LoanItem` hiện `~X%/tháng`, badge đến hạn (🔴 due/overdue theo `calcLoanStatus`, ✅ khi trả hết), còn phải trả (`calcRemainingBalance`), progress bar `monthsPaid/totalMonths`.
  - **Cá nhân** — không có lịch cố định: chỉ nhập số tiền vay + (khi tạo/sửa) số đã trả trước đó nếu có. Còn nợ = `principal − paidAmount`, tự tính, không có lãi suất/badge đến hạn. Xác nhận trả qua ô nhập số tiền tự do (mỗi lần khác nhau) → `paidAmount` cộng dồn.
- **Xác nhận trả** (`POST /api/loans/[id]/pay`, body `{ amount }` optional — có `amount` → cộng vào `paidAmount` (vay cá nhân); không có → `monthsPaid + 1` (vay lịch cố định)) **luôn tự động ghi thêm 1 giao dịch chi**: category **"Trả nợ"** 💸 (`EXPENSE_CATEGORIES`), note `"Trả nợ: {tên khoản vay}"`, ngày hôm nay — qua `recordTransaction()` trong `TxContext` (`components/AppShell.tsx`), đồng bộ ngay trang chủ/`/transactions` không cần reload.
- `calcDueThisMonthTotal(loans)` — tổng trả/tháng của các khoản vay lịch cố định đang due/overdue (vay cá nhân không có ngày đến hạn nên không tính) — dùng chung cho header `/loans` và `LoanSummaryWidget` trên trang chủ.
- State loans quản lý cục bộ trên trang riêng, không qua `TxContext` — chỉ mượn `recordTransaction` từ context để ghi giao dịch tự động khi xác nhận trả.

### 6. Beepartner (tích hợp thu nhập chạy Be)
- Settings → nút "Tài khoản Beepartner" → `BeepartnerLinkModal` nhập SĐT → `POST /api/user/beepartner` lưu `bePartnerPhone` trên `users`.
- Sau khi liên kết, `BeepartnerWidget` xuất hiện trên trang chủ, lọc giao dịch có `category === "Be Income"` — đây là 1 category cố định trong `INCOME_CATEGORIES` (icon 🐝), chọn được bình thường trong grid category hoặc qua nút "+ Thêm" của widget.
- Có thể đặt mục tiêu thu nhập tháng (`bePartnerMonthlyTarget`) → progress bar + gợi ý "cần X đ/ngày" để đạt mục tiêu. Có thể đặt tay qua ô "sửa mục tiêu" (bút chì) hoặc để app tự tính (xem mục tự tính bên dưới) — cả 2 đều ghi vào cùng 1 field `bePartnerMonthlyTarget`, không có cờ phân biệt tự động/thủ công.
- **Tự tính target tháng từ thu/chi cố định** (`BeeFixedBudgetModal`, mở từ link "📋 Thu chi cố định" trong `BeepartnerWidget`): nhập danh sách nhiều khoản thu cố định (Lương, Phụ cấp...) và chi cố định — mỗi khoản có tên + số tiền riêng (`bee_fixed_items`, CRUD qua `/api/bee-fixed-items`). "Chi cố định" gồm cả nghĩa vụ cố định thật (tiền trọ, trả nợ) **lẫn** chi tiêu sinh hoạt biến đổi (ăn uống, di chuyển...) — không tách riêng, cùng 1 danh sách. Để đỡ phải tự nhớ số, modal tự gợi ý thêm nhanh dựa trên chi tiêu **thực tế tháng trước** (group theo category từ `transactions`, bỏ qua category đã có tên trùng trong danh sách **hoặc** đã có ngân sách ở `/charts` — xem mục dưới, tránh cộng trùng) — bấm 1 phát vào chip gợi ý là thêm luôn, không cần gõ tay.
  - **Tự động cộng thêm "Ngân sách tháng này" từ `/charts`** (`fetchBudgets(getCurrentMonth())`, tổng tất cả category đã đặt hạn mức chi ở đó) — không cần thao tác gì thêm, cứ có ngân sách nào đang set cho tháng hiện tại là tự cộng vào target Bee luôn, hiển thị dòng riêng "🎯 Ngân sách danh mục tháng này (từ Biểu đồ)" để rõ ràng số đến từ đâu.
  - Công thức đầy đủ: `target = (tổng chi cố định + tổng ngân sách danh mục tháng này + tiền để dư) − tổng thu cố định` — phần thiếu hụt mà thu nhập cố định chưa che phủ hết, Bee cần bù vào (**không phải** `thu − chi − để dư`, đã từng làm sai chiều công thức này).
  - Tiền để dư mặc định 2.000.000đ, chỉnh được, lưu ở `bePartnerSavingsBuffer`. Bấm "Lưu" → tính lại và ghi đè `bePartnerMonthlyTarget` (chỉ khi đã có ít nhất 1 khoản thu/chi cố định hoặc 1 ngân sách danh mục), đồng bộ ngay vào context nên progress bar ở widget cập nhật không cần reload.
- **Mục tiêu theo từng ngày trong tuần** (`BeeWeekTargetModal`, mở từ nút trong `BeepartnerWidget`): đặt target riêng cho từng ngày T2–CN của tuần hiện tại (`be_daily_targets`, upsert qua `POST /api/be-targets`). Ngày chưa có target đã lưu → tự điền sẵn gợi ý qua `calcBeeSuggestedDailyTarget()` (`lib/calculations.ts`) = **(target tháng − đã kiếm tháng này) / số ngày còn lại trong tháng** (làm tròn nghìn) — tức là dựa theo số tiền "còn thiếu", không phải chia đều `target/tổng số ngày` — nên tự động đổi theo tiến độ thực tế (kiếm chậm hơn dự kiến → gợi ý ngày sau tăng lên; kiếm nhanh hơn → giảm xuống). Vẫn sửa/xoá về 0 được cho ngày nghỉ. "Đã kiếm" của mỗi ngày **không lưu riêng** — tính trực tiếp từ tổng giao dịch `category === "Be Income"` ngày đó, tránh 2 nguồn dữ liệu cho cùng 1 khoản tiền. Ngày đã qua có target → hiện badge ✅ Đạt / ❌ Chưa đạt; ngày tương lai chỉ hiện ô nhập target, chưa đánh giá.
- Widget tự kiểm tra tuần hiện tại đã có target chưa: chưa có → hiện nút nổi bật (viền nét đứt, `animate-pulse`) "🎯 Mục tiêu tuần này"; đã có → chỉ hiện link nhỏ "Xem mục tiêu tuần". Không dùng toast/thông báo tự động (dự án đã chủ động bỏ hệ thống toast trước đây).

### 7. Xuất CSV
Settings → "Xuất dữ liệu (CSV)" — sinh client-side từ transactions đã load (`Ngày,Loại,Danh mục,Số tiền,Ghi chú`, BOM UTF-8), tên file `thu-chi-YYYY-MM-DD.csv`.

### 8. Dark Mode
- Class-based (`dark` trên `<html>`), `@custom-variant dark` trong `globals.css`.
- Init script trong `app/layout.tsx` chạy trước hydration (đọc `localStorage('theme')`) để tránh flash.
- Toggle trong Settings.
- **Quan trọng:** rule mặc định `input, textarea, select { color: ... }` trong `globals.css` phải nằm trong `@layer base` — Tailwind v4 đặt utility (kể cả `dark:text-white`) vào layer `utilities`, và một rule KHÔNG nằm trong layer nào luôn thắng mọi rule có layer bất kể specificity. Nếu viết rule input màu ngoài `@layer`, mọi `dark:text-*` trên input sẽ bị đè âm thầm (đã từng gặy lỗi chữ đen-trên-đen vì việc này).
- **Có dark mode:** trang chủ, giao dịch, charts, loans, settings, bottom nav, TransactionModal, BudgetModal, LoanModal, Beepartner widget/modal.
- **Chưa có:** các trang auth (`/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`) — chấp nhận được vì đây là màn hình ngắn, dùng 1 lần. Input trên các trang này giữ nền sáng cố định (không có class `dark:`) nên vẫn đọc được chữ dù `<html>` đang có class `dark`.

### 9. Danh mục
Cố định, không có custom category:
**Chi:** Ăn uống 🍜, Di chuyển 🚗, Giải trí 🎮, Mua sắm 🛍️, Y tế 💊, Hoá đơn 📱, Giáo dục 📚, Trả nợ 💸, Khác
**Thu:** Lương 💼, Thưởng 🎁, Phụ cấp 💵, Đầu tư 📈, Be Income 🐝, Khác

---

## Design System (bám sát demo_app.jpg)

```
                    Light           Dark
Primary Blue:       #1E90FF         #1E90FF
Background:         #F0F8FF         #0D1117
Card BG:             #FFFFFF         #161B27   (bo góc 16px)
Text Primary:        #1A1A2E         #E6EDF3
Text Secondary:      #6B7280         #8B949E
Income Green:        #4CAF50         #4CAF50
Expense Red:         #F44336         #F44336
```

CSS vars `--bg`, `--card`, `--text-primary`, `--text-secondary` trong `globals.css` — class `.card` dùng `var(--card)` nên tự chuyển theo dark/light, không cần thêm `dark:` riêng cho nó.

**Layout:** max-width 430px (mobile-first), bottom nav 4 tab + FAB giữa, header xanh bo góc dưới (`rounded-b-[32px]`), modal bottom-sheet `rounded-t-3xl max-h-[90dvh]`.
**Typography:** system-ui, số tiền lớn `font-extrabold clamp(1.6rem,6vw,2rem)`, format VND `1.500.000 đ` (vi-VN locale).

---

## Quy tắc bắt buộc

- **R1 — Bám demo gốc:** `demo_app.jpg` là nguồn sự thật duy nhất cho UI. Lệch vì lý do kỹ thuật → comment rõ lý do trong code, không tự ý đổi.
- **R2 — Không phình tính năng:** Trước khi thêm tính năng mới, tự hỏi: MISA có tính năng này không? Nếu không và không phải yêu cầu rõ ràng của user → hỏi trước khi làm, đừng tự thêm.
- **R3 — Bảo toàn dữ liệu:** Đổi schema → viết migration SQL chạy trên Neon trước, không tự ý `DROP TABLE`/xoá cột khi chưa xác nhận với user (đây là thao tác trên DB thật, không phải local).
- **R4 — Security:** Không log JWT/password hash. Mọi API route phải check `getAuthUser()` trước khi chạm DB. OTP chỉ dùng 1 lần. Lỗi trả về generic message, không lộ thông tin user.
- **R5 — Responsive:** Test ở tối thiểu 360px và 390px width trước khi coi 1 thay đổi UI là xong.

---

## Environment Variables

```bash
# .env.local — copy từ .env.local.example
DATABASE_URL=postgresql://...   # Neon connection string (pooled)
JWT_SECRET=                     # Chuỗi ngẫu nhiên 32+ ký tự
RESEND_API_KEY=re_xxx...
RESEND_FROM=Thu Chi <onboarding@resend.dev>
```

Vercel: thêm 4 biến trên vào Project Settings → Environment Variables.

---

## API Routes

| Method | Endpoint | Auth |
|---|---|---|
| POST | `/api/auth/register` \| `verify-otp` \| `login` \| `logout` \| `forgot-password` \| `reset-password` | theo route |
| GET/POST | `/api/transactions` (`?month=YYYY-MM`) | JWT |
| PATCH/DELETE | `/api/transactions/[id]` | JWT |
| GET/POST | `/api/budgets` (`?month=YYYY-MM`, POST = upsert) | JWT |
| DELETE | `/api/budgets/[id]` | JWT |
| GET/POST | `/api/loans` | JWT |
| PATCH/DELETE | `/api/loans/[id]` | JWT |
| POST | `/api/loans/[id]/pay` (xác nhận trả tháng → `months_paid + 1`) | JWT |
| GET | `/api/user/me` | JWT |
| POST/PATCH/DELETE | `/api/user/beepartner` (link / update target+savingsBuffer / unlink) | JWT |
| GET/POST | `/api/be-targets` (`?start=YYYY-MM-DD&end=YYYY-MM-DD`, POST = upsert 1 ngày) | JWT |
| GET/POST | `/api/bee-fixed-items` (POST = tạo khoản thu/chi cố định) | JWT |
| PATCH/DELETE | `/api/bee-fixed-items/[id]` | JWT |

---

## Deploy

1. Push `main` → Vercel auto-deploy (Next.js auto-detect).
2. Env vars đã set trên Vercel (4 biến ở trên).
3. Domain: `thu-chi-tiet-kiem.vercel.app`.

---

## Smoke test trước khi deploy

- [ ] `npm run build` pass.
- [ ] Đăng ký → OTP email → đăng nhập được; Quên MK → đặt lại MK → login được.
- [ ] Thêm/sửa/xoá giao dịch → phản ánh đúng ngay lập tức, reload vẫn còn.
- [ ] `/charts`: donut đúng %, đặt ngân sách → progress bar + cảnh báo đúng.
- [ ] `/transactions`: search + filter Thu/Chi đúng kết quả.
- [ ] `/loans`: thêm khoản vay → lãi suất preview đúng; xác nhận trả → progress bar + "còn phải trả tháng này" cập nhật ngay; widget trang chủ ẩn khi không còn khoản vay đang trả.
- [ ] Settings: liên kết Beepartner → widget trang chủ hiện đúng; CSV export mở được trong Excel; dark mode toggle + persist qua reload.
- [ ] Beepartner: chưa đặt target tuần → nút nổi bật hiện; đặt target 1 ngày → lưu, thêm giao dịch "Be Income" ngày đó → badge Đạt/Chưa đạt hiện đúng.
- [ ] Beepartner: thêm khoản thu/chi cố định → target tháng tự tính đúng công thức; bấm Lưu → widget trang chủ cập nhật target ngay; mở lại màn mục tiêu tuần → target/ngày tự điền sẵn theo target tháng mới.
- [ ] Responsive tại 360px và 390px, không tràn/vỡ layout.
