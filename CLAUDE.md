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

**5 bảng** — schema đầy đủ tại [lib/schema.ts](lib/schema.ts):

```
users        id, phone (unique), email, password_hash, is_verified,
             be_partner_phone, be_partner_monthly_target, created_at

otp_codes    id, user_id, target (email), code (6 số), purpose ('register'|'reset'),
             expires_at (5 phút), used, created_at

transactions id, user_id, type ('income'|'expense'), category, amount (bigint VND),
             note, date, created_at

budgets      id, user_id, category, amount (bigint VND), month (YYYY-MM), created_at
             UNIQUE(user_id, category, month) — upsert via POST /api/budgets

loans        id, user_id, name, lender_type, principal (bigint VND),
             monthly_payment (bigint VND), total_months, months_paid (default 0),
             start_month (YYYY-MM), due_day (1-31), note, created_at
```

Indexes cần có trên Neon: `idx_transactions_user_id`, `idx_transactions_date`,
`idx_otp_user_id`, và composite `(user_id, date DESC)` cho query lọc theo tháng.

`bePartnerPhone` / `bePartnerMonthlyTarget` phục vụ tính năng Beepartner (§ bên dưới) —
không phải một bảng riêng, chỉ là 2 cột trên `users`.

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
- Context cung cấp: `transactions`, `loading`, `deleteById`, `openEditModal`, `openAddModal`, `bePartnerPhone`, `bePartnerMonthlyTarget`.

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
│   ├── BeepartnerWidget.tsx       ← Widget trang chủ: thu nhập Be theo tháng + mục tiêu
│   └── BeepartnerLinkModal.tsx    ← Liên kết/huỷ liên kết SĐT Be
├── lib/
│   ├── schema.ts, db.ts, auth.ts, email.ts, otp.ts
│   ├── api.ts                     ← fetch/create/update/delete transactions, budgets, loans, user profile, Beepartner
│   ├── calculations.ts            ← calcMonthSummary, calcExpenseByCategory, getLast6Months,
│   │                                 calcAnnualRate, calcRemainingBalance, calcLoanStatus, calcDueThisMonthTotal
│   └── formatters.ts              ← formatVND, formatMonth, ...
├── types/index.ts                 ← Transaction, Budget, Loan, LenderType, EXPENSE/INCOME_CATEGORIES
└── public/                        ← PWA icons + manifest.json
```

---

## Tính năng cốt lõi

### 1. Thu chi (thêm/sửa/xoá)
Loại (thu/chi) + danh mục (grid emoji cố định, `EXPENSE_CATEGORIES`/`INCOME_CATEGORIES` trong `types/index.ts`) + số tiền + ghi chú + ngày. FAB (+) mở modal thêm mới; tap vào giao dịch mở modal sửa. Modal dùng `max-h-[90dvh] overflow-y-auto` để không bị bàn phím iOS đè.

### 2. Trang chủ (`/`)
- Số dư tháng hiện tại (Thu − Chi), badge Dư/Âm.
- Lịch chi tiêu hằng ngày: grid 7 cột (T2–CN), mỗi ô hiện số ngày + chi tiêu rút gọn ("250k", "1.5tr"); có thể đặt target chi/ngày để tô xanh/đỏ.
- Widget Beepartner (nếu đã liên kết SĐT) — xem §5.
- 8 giao dịch gần nhất.

### 3. Biểu đồ (`/charts`)
- Donut chart phân bổ chi tiêu theo danh mục (tương đương màn 2 của demo MISA).
- Ngân sách tháng này ("Hạn mức chi"): đặt/sửa/xoá ngân sách per category qua `BudgetModal`, progress bar + cảnh báo "Gần đạt"/"Vượt!".
- Xu hướng 6 tháng (bar chart Thu/Chi) + bảng kết quả từng tháng (dư/âm).

### 4. Tìm kiếm & lọc (`/transactions`)
Search theo danh mục/ghi chú + filter tab Tất cả/Thu/Chi — client-side trên `TxContext`, không cần API riêng.

### 5. Quản lý khoản vay (`/loans`)
Bản basic — **không có** panel "Nếu trả thêm mỗi tháng?" (early-payoff what-if, đã cắt chủ động để giữ gọn) hay biểu đồ donut trên widget trang chủ.
- Truy cập: Settings → "Quản lý khoản vay", hoặc widget trên trang chủ (chỉ hiện khi có khoản vay chưa trả hết).
- Thêm/sửa khoản vay qua `LoanModal`: tên, loại (ngân hàng/tiêu dùng/cá nhân/khác), số tiền vay, trả/tháng, tổng số tháng, số tháng đã trả, tháng bắt đầu, ngày trả/tháng, ghi chú. Lãi suất %/năm hiện live-preview khi nhập (Newton's method, `calcAnnualRate` trong `lib/calculations.ts`).
- Mỗi `LoanItem` hiện: `~X%/tháng`, badge đến hạn (🔴 due/overdue theo `calcLoanStatus`, ✅ khi trả hết), trả/tháng + ngày trả, còn phải trả (`calcRemainingBalance`), progress bar `monthsPaid/totalMonths`, nút "Xác nhận đã trả" (chỉ hiện khi due/overdue → `POST /api/loans/[id]/pay` → `monthsPaid + 1`).
- `calcDueThisMonthTotal(loans)` — tổng trả/tháng của các khoản đang due/overdue (chưa xác nhận chu kỳ này) — dùng chung cho cả header `/loans` và `LoanSummaryWidget` trên trang chủ.
- State loans quản lý cục bộ trên trang riêng (không qua `TxContext`, giống thiết kế budgets).

### 6. Beepartner (tích hợp thu nhập chạy Be)
- Settings → nút "Tài khoản Beepartner" → `BeepartnerLinkModal` nhập SĐT → `POST /api/user/beepartner` lưu `bePartnerPhone` trên `users`.
- Sau khi liên kết, `BeepartnerWidget` xuất hiện trên trang chủ, lọc giao dịch có `category === "Be Income"` — đây là 1 category cố định trong `INCOME_CATEGORIES` (icon 🐝), chọn được bình thường trong grid category hoặc qua nút "+ Thêm" của widget.
- Có thể đặt mục tiêu thu nhập tháng (`bePartnerMonthlyTarget`) → progress bar + gợi ý "cần X đ/ngày" để đạt mục tiêu.

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
**Chi:** Ăn uống 🍜, Di chuyển 🚗, Giải trí 🎮, Mua sắm 🛍️, Y tế 💊, Hoá đơn 📱, Giáo dục 📚, Khác
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
| POST/PATCH/DELETE | `/api/user/beepartner` (link / update target / unlink) | JWT |

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
- [ ] Responsive tại 360px và 390px, không tràn/vỡ layout.
