# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
npm run dev      # Chạy dev server tại http://localhost:3000
npm run build    # Build production (kiểm tra TypeScript + Next.js compile)
npm run lint     # ESLint
npm run start    # Chạy production build local
```

**Không có test framework** trong dự án này — kiểm tra bằng cách chạy app thực tế.

**Drizzle migrations:** Schema được quản lý thủ công bằng SQL chạy trực tiếp trên Neon SQL Editor (không dùng `drizzle-kit push` hay migration files).

---

## Tổng quan dự án

**Tên:** Thu Chi Tiết Kiệm  
**Loại:** Web app mobile-first PWA (Next.js 16 + Vercel + Neon PostgreSQL)  
**Mục tiêu:** Quản lý thu chi cá nhân hằng ngày, tổng kết hằng tháng, biểu đồ trực quan, và theo dõi khoản vay.  
**Demo tham khảo:** `demo_app.jpg` trong thư mục gốc — đây là design gốc cần bám sát.  
**Logo app:** `Logo.png` trong thư mục gốc — đã resize thành các icon PNG trong `public/`.  
**Deploy:** Vercel (auto deploy từ GitHub) · Domain: `thu-chi-tiet-kiem.vercel.app`

---

## Tech Stack

| Package | Phiên bản | Mục đích |
|---|---|---|
| `next` | 16.2.7 | Framework (App Router, SSR) |
| `react` / `react-dom` | 19 | UI |
| `tailwindcss` | 4 | Styling |
| `recharts` | 3 | Biểu đồ cột, biểu đồ tròn, donut chart |
| `lucide-react` | latest | Icons |
| `@neondatabase/serverless` | latest | Neon PostgreSQL HTTP driver |
| `drizzle-orm` / `drizzle-kit` | latest | ORM + migrations |
| `bcryptjs` | latest | Hash mật khẩu |
| `jose` | latest | JWT sign/verify |
| `resend` | latest | Email OTP miễn phí (3000/tháng) |
| `uuid` | 11 | UUID generation |
| `date-fns` | 4 | Date utilities |

---

## Kiến trúc hệ thống

### Database (Neon PostgreSQL)

**7 bảng** — xem schema đầy đủ tại [lib/schema.ts](lib/schema.ts):

```
users         id (uuid PK), phone (unique), email, password_hash,
              is_verified (bool), created_at

otp_codes     id (uuid PK), user_id (FK→users), target (email),
              code (6 chữ số), purpose ('register'|'reset'),
              expires_at (5 phút), used (bool), created_at

transactions  id (uuid PK), user_id (FK→users), type ('income'|'expense'),
              category, amount (bigint VND), note, date,
              is_recurring (bool default false), recurring_day (int nullable),
              created_at

budgets       id (uuid PK), user_id (FK→users), category, amount (bigint VND),
              month (varchar YYYY-MM), created_at
              UNIQUE(user_id, category, month) — upsert via POST /api/budgets

loans         id (uuid PK), user_id (FK→users), name, lender_type,
              principal (bigint VND), monthly_payment (bigint VND),
              total_months (int), months_paid (int default 0),
              start_month (varchar YYYY-MM), due_day (int 1-31),
              note, created_at

goals         id (uuid PK), user_id (FK→users), name, target_amount (bigint VND),
              saved_amount (bigint default 0), deadline (varchar YYYY-MM nullable),
              note, created_at

reminders     id (uuid PK), user_id (FK→users), name, day_of_month (int 1-31),
              amount_estimate (bigint nullable), is_active (bool default true),
              note, created_at

custom_categories  id (uuid PK), user_id (FK→users), type ('income'|'expense'),
                   name (varchar 50), icon (varchar 10 — emoji), color (varchar 7 — hex),
                   created_at
```

**SQL tạo bảng trực tiếp trên Neon SQL Editor:**
```sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "phone" varchar(20) UNIQUE NOT NULL,
  "email" varchar(255) NOT NULL,
  "password_hash" varchar(255) NOT NULL,
  "is_verified" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "otp_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "target" varchar(255) NOT NULL,
  "code" varchar(6) NOT NULL,
  "purpose" varchar(20) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(10) NOT NULL,
  "category" varchar(50) NOT NULL,
  "amount" bigint NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "date" date NOT NULL,
  "is_recurring" boolean DEFAULT false NOT NULL,
  "recurring_day" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Migration nếu bảng đã tồn tại (chạy một lần trên Neon SQL Editor):
-- ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_recurring" boolean DEFAULT false NOT NULL;
-- ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "recurring_day" integer;

CREATE TABLE IF NOT EXISTS "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "target_amount" bigint NOT NULL,
  "saved_amount" bigint DEFAULT 0 NOT NULL,
  "deadline" varchar(7),
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "day_of_month" integer NOT NULL,
  "amount_estimate" bigint,
  "is_active" boolean DEFAULT true NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "custom_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(10) NOT NULL,
  "name" varchar(50) NOT NULL,
  "icon" varchar(10) NOT NULL,
  "color" varchar(7) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_goals_user_id" ON "goals"("user_id");
CREATE INDEX IF NOT EXISTS "idx_reminders_user_id" ON "reminders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_custom_categories_user_id" ON "custom_categories"("user_id");

CREATE TABLE IF NOT EXISTS "loans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "lender_type" varchar(30) NOT NULL,
  "principal" bigint NOT NULL,
  "monthly_payment" bigint NOT NULL,
  "total_months" integer NOT NULL,
  "months_paid" integer DEFAULT 0 NOT NULL,
  "start_month" varchar(7) NOT NULL,
  "due_day" integer NOT NULL,
  "note" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions"("date");
CREATE INDEX IF NOT EXISTS "idx_otp_user_id" ON "otp_codes"("user_id");
CREATE INDEX IF NOT EXISTS "idx_loans_user_id" ON "loans"("user_id");
```

### Authentication

- **Strategy:** JWT (jose) lưu trong httpOnly cookie `auth-token`, hết hạn 7 ngày
- **Password:** bcryptjs hash (rounds=12)
- **OTP:** 6 chữ số ngẫu nhiên, hết hạn 5 phút, lưu trong DB
- **Email OTP:** Resend API (free 3000 email/tháng) — template tiếng Việt
- **Route protection:** `proxy.ts` — Next.js 16 dùng `proxy.ts` thay cho `middleware.ts` (convention mới). Export function tên `proxy`, build output hiển thị `ƒ Proxy (Middleware)` khi hoạt động đúng. **Không tạo `middleware.ts`** — sẽ conflict.

### Custom Categories

- `lib/categories.ts` — `getMergedCategories(type, custom[])` trả về array merged default + custom
- `PRESET_COLORS` (12 màu), `EXPENSE_EMOJI_SUGGESTIONS`, `INCOME_EMOJI_SUGGESTIONS` để dùng trong UI
- `CustomCategoryModal` — emoji picker (text input + grid gợi ý) + color swatches
- `TransactionModal` fetch custom categories khi mở (`open` → `fetchCustomCategories()`) và merge vào grid
- Link "Quản lý" trong category grid của TransactionModal → `/categories`

### Dark Mode

- **Cơ chế:** Class-based (`dark` trên `<html>`), dùng Tailwind `@custom-variant dark (&:where(.dark, .dark *))` trong `globals.css`
- **Init script** trong `app/layout.tsx` (chạy trước React hydration, tránh flash): `if(localStorage.getItem('theme')==='dark') html.classList.add('dark')`
- **Toggle:** Settings → "Chế độ tối/sáng" — lưu vào `localStorage('theme')`
- **CSS vars:** `.dark { --bg: #0D1117; --card: #161B27; ... }` — `.card` class dùng `var(--card)` nên tự chuyển
- **Tailwind `dark:` variants** đã thêm vào: `page.tsx`, `settings/page.tsx`, `transactions/page.tsx`, `TransactionItem.tsx`, `BottomNav.tsx`, `LoanSummaryWidget.tsx`
- **Chưa có dark mode:** Auth pages (`/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`), `charts/page.tsx`, `loans/page.tsx`, modal components

### State Management

`AppShell` là client component duy nhất giữ toàn bộ state giao dịch:
- Fetch **tất cả** giao dịch của user một lần khi mount (không phân trang, không lọc theo tháng)
- Filter theo tháng xảy ra ở client-side trong `calculations.ts`
- State được cập nhật optimistically sau mỗi PATCH/POST/DELETE — không refetch từ server
- Context `TxContext` (export từ `AppShell.tsx`) cung cấp `transactions`, `loading`, `deleteById`, `openEditModal` cho toàn bộ app

`/loans` page quản lý state khoản vay riêng biệt (local state, không qua context).

### Edit Transaction Flow

```
Tap vào icon hoặc tên giao dịch trong TransactionItem
→ openEditModal(tx) từ TxContext
→ TransactionModal mở với editingTransaction pre-filled
→ PATCH /api/transactions/[id]
→ updateTransaction() cập nhật state local ngay lập tức
```

### Loan Flow

```
Thêm khoản vay:
Settings → "Quản lý khoản vay" → /loans → nút + → LoanModal
→ Nhập: tên, loại, số tiền vay, tiền trả/tháng, tổng tháng, số tháng đã trả, ngày trả/tháng
→ App tự tính: lãi suất %/năm, %/tháng, tổng lãi phải trả
→ POST /api/loans → lưu DB

Xác nhận trả tháng:
LoanItem hiển thị badge "🔴 Đến hạn ngày 15/07/2025"
→ User bấm "Xác nhận đã trả ngày 15/07/2025"
→ POST /api/loans/[id]/pay → months_paid + 1
→ Status tự chuyển sang "upcoming" → không còn tính vào "còn phải trả tháng này"
→ Sang tháng sau status tự thành "due" lại

Trang chủ:
Widget 🏦 Khoản Vay hiển thị khi có khoản vay đang trả
→ Donut chart tỉ lệ dư nợ từng khoản
→ "Còn phải trả tháng này" (chỉ khoản chưa xác nhận)
→ Link → /loans
```

### Auth Flows

```
Đăng ký:
/register → POST /api/auth/register → OTP email
→ /verify-otp?purpose=register → POST /api/auth/verify-otp → JWT cookie → /

Đăng nhập:
/login → POST /api/auth/login → JWT cookie → /

Quên mật khẩu:
/forgot-password → POST /api/auth/forgot-password → OTP email
→ /verify-otp?purpose=reset → resetToken → /reset-password?token=xxx
→ POST /api/auth/reset-password → /login
```

---

## Cấu trúc thư mục

```
chitieu/
├── CLAUDE.md                    ← Tài liệu này
├── demo_app.jpg                 ← Design gốc, KHÔNG xoá
├── Logo.png                     ← Logo app gốc (1254×1254), KHÔNG xoá
├── proxy.ts                     ← Route protection (Next.js 16)
├── drizzle.config.ts            ← Drizzle Kit config
├── .env.local.example           ← Template env vars
│
├── app/
│   ├── layout.tsx               ← Root layout + PWA meta tags + icons metadata
│   ├── globals.css              ← Tailwind + CSS vars
│   ├── page.tsx                 ← Tổng quan (trang chủ) + LoanSummaryWidget
│   ├── transactions/page.tsx    ← Danh sách giao dịch
│   ├── charts/page.tsx          ← Biểu đồ phân tích
│   ├── loans/page.tsx           ← Quản lý khoản vay
│   ├── goals/page.tsx           ← Mục tiêu tiết kiệm (progress bars + modal)
│   ├── reminders/page.tsx       ← Nhắc nhở hoá đơn (toggle active + modal)
│   ├── categories/page.tsx      ← Quản lý danh mục tùy chỉnh
│   ├── settings/page.tsx        ← Cài đặt + logout + links → /loans, /goals, /reminders, /categories
│   ├── login/page.tsx           ← Đăng nhập (SDT + MK)
│   ├── register/page.tsx        ← Đăng ký (SDT + Email + MK)
│   ├── verify-otp/page.tsx      ← Nhập 6 số OTP
│   ├── forgot-password/page.tsx ← Quên mật khẩu
│   ├── reset-password/page.tsx  ← Đặt mật khẩu mới
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── verify-otp/route.ts
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   ├── forgot-password/route.ts
│       │   └── reset-password/route.ts
│       ├── transactions/
│       │   ├── route.ts         ← GET (list) + POST (create)
│       │   └── [id]/route.ts    ← PATCH (edit) + DELETE
│       ├── loans/
│       │   ├── route.ts         ← GET (list) + POST (create)
│       │   └── [id]/
│       │       ├── route.ts     ← PATCH (edit) + DELETE
│       │       └── pay/route.ts ← POST (xác nhận trả tháng → months_paid++)
│       ├── goals/
│       │   ├── route.ts         ← GET + POST
│       │   └── [id]/route.ts    ← PATCH + DELETE
│       ├── reminders/
│       │   ├── route.ts         ← GET + POST
│       │   └── [id]/route.ts    ← PATCH + DELETE
│       └── categories/
│           ├── route.ts         ← GET + POST (custom categories)
│           └── [id]/route.ts    ← PATCH + DELETE
│
├── components/
│   ├── AppShell.tsx             ← Context: transactions, deleteById, openEditModal
│   │                               Milestone toast: streak 3/7/30 ngày, tháng đầu số dư dương
│   ├── BottomNav.tsx            ← Bottom nav + FAB button (+)
│   ├── TransactionModal.tsx     ← Form thêm/sửa giao dịch (edit mode)
│   ├── TransactionItem.tsx      ← Row giao dịch (tap để sửa, icon xoá)
│   ├── LoanModal.tsx            ← Form thêm/sửa khoản vay (bottom sheet)
│   ├── LoanItem.tsx             ← Card khoản vay (badge ngày đến hạn, progress, confirm btn)
│   ├── LoanSummaryWidget.tsx    ← Widget trang chủ: donut chart + còn phải trả tháng này
│   ├── BudgetModal.tsx          ← Bottom sheet đặt/sửa/xoá ngân sách per category
│   ├── HealthScoreWidget.tsx    ← Widget trang chủ: SVG arc score 0-100 + breakdown collapsible
│   ├── GoalModal.tsx            ← Form thêm/sửa mục tiêu tiết kiệm
│   ├── ReminderModal.tsx        ← Form thêm/sửa nhắc nhở hoá đơn
│   └── CustomCategoryModal.tsx  ← Emoji picker + color swatches + type toggle
│
│   [LoanItem] What-If Panel: collapsible "Nếu trả thêm mỗi tháng?" với input + kết quả realtime
│   [AppShell] Recurring check: khi mount, tự tạo giao dịch lặp lại chưa có tháng này + toast
│   [AppShell] Reminder check: khi mount, kiểm tra nhắc nhở trong 3 ngày tới → toast cam (1 lần/ngày)
│
├── lib/
│   ├── schema.ts                ← Drizzle schema (7 bảng: users, otpCodes, transactions, loans,
│   │                               budgets, goals, reminders, customCategories)
│   ├── db.ts                    ← getDb() factory (lazy, serverless-safe)
│   ├── auth.ts                  ← signJWT, verifyJWT, cookie helpers
│   ├── email.ts                 ← sendOTPEmail() via Resend
│   ├── otp.ts                   ← generateOTPCode, saveOTP, verifyOTP
│   ├── api.ts                   ← fetchTransactions, createTransaction, updateTransaction,
│   │                               deleteTransactionById, logout,
│   │                               fetchLoans, createLoan, updateLoan, deleteLoanById, confirmLoanPayment,
│   │                               fetchBudgets, upsertBudget, deleteBudgetById,
│   │                               fetchGoals, createGoal, updateGoal, deleteGoalById,
│   │                               fetchReminders, createReminder, updateReminder, deleteReminderById,
│   │                               fetchCustomCategories, createCustomCategory, updateCustomCategory,
│   │                               deleteCustomCategoryById
│   ├── calculations.ts          ← calcMonthSummary, calcExpenseByCategory,
│   │                               calcWeeklyData, getLast6Months,
│   │                               calcCategoryInsights (so sánh với TB 3 tháng),
│   │                               solveMonthlyRate (Newton's method),
│   │                               calcAnnualRate, calcRemainingBalance,
│   │                               calcLoanStatus, calcTotalMonthlyLoanBurden,
│   │                               calcTotalRemainingDebt,
│   │                               calcEarlyPayoff (what-if: trả thêm → hết sớm + tiết kiệm lãi),
│   │                               calcMonthEndForecast (dự báo chi tiêu cuối tháng),
│   │                               calcStreak (đếm ngày ghi chép liên tiếp),
│   │                               calcHealthScore (0-100: tiết kiệm + nợ + ổn định + ngân sách)
│   ├── categories.ts            ← getMergedCategories(), PRESET_COLORS, emoji suggestions
│   ├── formatters.ts            ← formatVND, formatMonth, ...
│   ├── voiceParser.ts           ← parseVoiceInput(transcript, customCats) → {type, amount, category, note}
│   │                               Hỗ trợ: số tiền VN (nghìn/triệu/k/rưỡi), type keywords, 11 category maps
│   └── storage.ts               ← Legacy (không dùng nữa, an toàn để xoá)
│
├── types/
│   └── index.ts                 ← Transaction, Loan, Budget, Goal, Reminder, CustomCategory
│                                   EXPENSE_CATEGORIES, INCOME_CATEGORIES, LENDER_TYPES
│
└── public/
    ├── manifest.json            ← PWA manifest (dùng PNG icons)
    ├── apple-touch-icon.png     ← 180×180 — iOS home screen icon
    ├── icon-192.png             ← 192×192 — PWA manifest
    ├── icon-512.png             ← 512×512 — PWA splash screen
    ├── favicon.png              ← 32×32  — Browser tab icon
    └── icon.svg                 ← Legacy SVG (không dùng cho iOS)
```

---

## Environment Variables

```bash
# .env.local (local dev) — copy từ .env.local.example
DATABASE_URL=postgresql://...   # Neon → Connection string (pooled)
JWT_SECRET=                     # Chuỗi ngẫu nhiên 32+ ký tự
RESEND_API_KEY=re_xxx...        # resend.com → API Keys
RESEND_FROM=Thu Chi <onboarding@resend.dev>
```

**Vercel:** Thêm 4 biến trên vào **Project Settings → Environment Variables**.

---

## API Routes

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Tạo user + gửi OTP email | Public |
| POST | `/api/auth/verify-otp` | Xác nhận OTP → JWT cookie | Public |
| POST | `/api/auth/login` | Đăng nhập → JWT cookie | Public |
| POST | `/api/auth/logout` | Xoá JWT cookie | Public |
| POST | `/api/auth/forgot-password` | Gửi OTP reset về email | Public |
| POST | `/api/auth/reset-password` | Đặt lại mật khẩu | Public (resetToken) |
| GET | `/api/transactions?month=YYYY-MM` | Lấy danh sách giao dịch | JWT |
| POST | `/api/transactions` | Tạo giao dịch mới | JWT |
| PATCH | `/api/transactions/[id]` | Sửa giao dịch (Edit) | JWT |
| DELETE | `/api/transactions/[id]` | Xoá giao dịch | JWT |
| GET | `/api/budgets?month=YYYY-MM` | Lấy ngân sách theo tháng | JWT |
| POST | `/api/budgets` | Tạo/cập nhật ngân sách (upsert) | JWT |
| PATCH | `/api/budgets/[id]` | Sửa số tiền ngân sách | JWT |
| DELETE | `/api/budgets/[id]` | Xoá ngân sách | JWT |
| GET | `/api/loans` | Lấy danh sách khoản vay | JWT |
| POST | `/api/loans` | Tạo khoản vay mới | JWT |
| PATCH | `/api/loans/[id]` | Sửa khoản vay | JWT |
| DELETE | `/api/loans/[id]` | Xoá khoản vay | JWT |
| POST | `/api/loans/[id]/pay` | Xác nhận trả tháng (months_paid++) | JWT |
| GET | `/api/goals` | Lấy danh sách mục tiêu | JWT |
| POST | `/api/goals` | Tạo mục tiêu mới | JWT |
| PATCH | `/api/goals/[id]` | Sửa mục tiêu | JWT |
| DELETE | `/api/goals/[id]` | Xoá mục tiêu | JWT |
| GET | `/api/reminders` | Lấy danh sách nhắc nhở | JWT |
| POST | `/api/reminders` | Tạo nhắc nhở mới | JWT |
| PATCH | `/api/reminders/[id]` | Sửa nhắc nhở | JWT |
| DELETE | `/api/reminders/[id]` | Xoá nhắc nhở | JWT |
| GET | `/api/categories` | Lấy danh mục tùy chỉnh | JWT |
| POST | `/api/categories` | Tạo danh mục tùy chỉnh | JWT |
| PATCH | `/api/categories/[id]` | Sửa danh mục tùy chỉnh | JWT |
| DELETE | `/api/categories/[id]` | Xoá danh mục tùy chỉnh | JWT |

---

## Tính năng cốt lõi

### 1. Nhập / Sửa thu chi nhanh
- Loại (thu/chi) + danh mục + số tiền + ghi chú + ngày
- FAB button (+) ở bottom nav → mở modal thêm mới
- Tap vào icon hoặc tên giao dịch → modal mở với data cũ điền sẵn (edit)
- Button ✏️ trên mỗi row → cũng mở edit modal
- Toggle **"Lặp lại hàng tháng"** + chọn ngày trong tháng → giao dịch được đánh dấu `is_recurring`
- Lưu qua API: POST tạo mới, PATCH sửa
- **Bug fix:** Modal không bị nén khi bàn phím iOS mở (`max-h-[90dvh] overflow-y-auto`)

### 2. Tổng quan tài chính (Trang chủ)
- Số dư hiện tại (Thu - Chi tháng này)
- Badge Dư / Âm — màu xanh/đỏ
- **Streak badge 🔥:** hiển thị khi ≥ 2 ngày liên tiếp — "🔥 5 ngày liên tiếp" (ẩn nếu streak < 2)
- **Lịch chi tiêu hằng ngày:** grid 7 cột (T2–CN) dạng lịch tháng
  - Mỗi ô = 1 ngày: số ngày + số tiền chi (compact: "250k", "1.5tr") — không hiển thị thu
  - Ngày có chi tiêu: nền đỏ nhạt + chữ đỏ
  - Ngày hiện tại: nền xanh `#1E90FF` + chữ trắng
  - Chủ nhật: số ngày màu đỏ
  - `calendarData` (Map date→expense) + `calendarGrid` (array of day|null), `fmtCal()` ultra-compact trong `app/page.tsx`
  - Bắt đầu tuần từ Thứ Hai (T2), offset = `(firstDow + 6) % 7`
- **Widget 💡 Dự báo cuối tháng:** chỉ hiện khi đang xem tháng hiện tại và đã có ≥ 5 ngày dữ liệu — hiện chi dự kiến + số dư dự kiến dựa trên đà chi tiêu trung bình/ngày
- **Widget 🏦 Khoản Vay:** donut chart + còn phải trả tháng này (tự ẩn nếu không có khoản vay)
- Danh sách 8 giao dịch gần nhất (có nút sửa + xoá)

### 3. Tổng kết tháng (`/charts`)
- Biểu đồ tròn phân bổ chi tiêu theo danh mục
- Biểu đồ cột xu hướng 6 tháng gần nhất
- Bảng kết quả từng tháng (dư/âm)

### 4. Quản lý khoản vay (`/loans`)
- Truy cập: Settings → "Quản lý khoản vay"
- **Thêm khoản vay:** nhập tên, loại (ngân hàng/tiêu dùng/cá nhân/khác), số tiền vay gốc,
  tiền trả hằng tháng, tổng số tháng, số tháng đã trả, ngày trả hằng tháng
- **App tự tính:** lãi suất %/năm và %/tháng (Newton's method từ P, M, N),
  tổng lãi, tổng phải trả — hiển thị realtime trong modal
- **Mỗi loan card hiển thị:**
  - Tên + loại + `~X%/tháng` (lãi suất tháng)
  - Badge ngày đến hạn cụ thể: `🔴 Đến hạn ngày 15/07/2025`
  - Tiền trả/tháng + ngày trả | Còn phải trả (= tháng còn lại × tiền/tháng)
  - Progress bar X/Y tháng
  - Nút "Xác nhận đã trả ngày 15/07/2025" (chỉ hiện khi đến hạn/quá hạn)
  - Panel **"💡 Nếu trả thêm mỗi tháng?"** (collapsible): nhập thêm X đ → hiện hết nợ sớm Y tháng + tiết kiệm Z đ lãi (tính bằng `calcEarlyPayoff`)
- **Header page:** "Còn phải trả tháng này" = tổng khoản chưa xác nhận (giảm khi user confirm, reset tháng sau)
- **months_paid** tăng dần khi xác nhận, tự reset trạng thái tháng sau theo logic time-based

### 5. Tìm kiếm & lọc giao dịch (`/transactions`)
- Thanh search tìm theo danh mục hoặc ghi chú
- Filter tabs: Tất cả / Thu / Chi
- Hiển thị số lượng kết quả
- Client-side filter trên TxContext (không cần API mới)

### 6. Xuất dữ liệu CSV
- Nút "Xuất dữ liệu (CSV)" trong Settings
- Format: `Ngày,Loại,Danh mục,Số tiền (VND),Ghi chú` với BOM UTF-8 (mở được trong Excel)
- Client-side generation từ transactions đã load, không cần API riêng
- Tên file: `thu-chi-YYYY-MM-DD.csv`

### 7. Giao dịch lặp lại (Recurring)
- Toggle "Lặp lại hàng tháng" trong TransactionModal + chọn ngày trong tháng
- Khi app mount: scan tất cả recurring templates, tự động tạo bản tháng hiện tại nếu chưa có và ngày đã đến
- Xử lý tháng ngắn: dùng ngày cuối tháng nếu `recurring_day` > số ngày thực của tháng
- Toast thông báo: "📅 Đã tự động thêm N giao dịch lặp lại tháng này"
- Nhận biết trùng lặp bằng (type, category, amount, recurringDay) trong cùng tháng

### 8. Dự báo cuối tháng (Cash Flow Forecast)
- `calcMonthEndForecast(transactions, month)` trong `lib/calculations.ts`
- Điều kiện hiển thị: đang xem tháng hiện tại + đã qua ≥ 5 ngày + có ít nhất 1 giao dịch chi
- Công thức: `projectedExpense = totalExpense + (totalExpense / daysPassed) × daysLeft`
- Hiển thị: "Chi dự kiến X đ" + "Số dư dự kiến ±X đ" + "Theo đà chi tiêu Y đ/ngày"
- Widget tự ẩn khi xem tháng khác hoặc chưa đủ dữ liệu

### 9. Gamification (Streak & Milestones)
- `calcStreak(transactions)` — đếm ngày liên tiếp (tính ngược từ hôm nay) có ít nhất 1 giao dịch
- **Streak badge** trên header trang chủ: hiện khi streak ≥ 2 ngày
- **Milestone toasts** (AppShell.tsx, kiểm tra khi mount):
  - 🔥 3 ngày liên tiếp
  - 🔥 7 ngày liên tiếp
  - 🏆 30 ngày streak
  - 🎉 Tháng đầu tiên số dư dương (kiểm tra 5 tháng trước có positive chưa)
- Milestone đã hiện được lưu vào `localStorage` (`ms_s3`, `ms_s7`, `ms_s30`, `ms_fp`) để không hiện lại
- Milestone toast màu gradient xanh, hiện sau recurring toast 5 giây (hoặc 1.5 giây nếu không có recurring)

### 10. Dark Mode
- Toggle trong Settings → "Công cụ" card: icon Moon/Sun, slider toggle
- Lưu preference vào `localStorage('theme')` — persist qua reload
- Init script trong `<head>` (trước React hydration) tránh flash of unstyled content
- Tailwind `@custom-variant dark` trong `globals.css` — dùng class `.dark` trên `<html>`
- **Đã có dark mode:** trang chủ, giao dịch, cài đặt, bottom nav, loan widget, transaction items
- **Chưa có dark mode:** auth pages, charts, loans, modal components (v1 scope)

### 11. Danh mục
**Chi (mặc định):** Ăn uống 🍜, Di chuyển 🚗, Giải trí 🎮, Mua sắm 🛍️, Y tế 💊, Hoá đơn 📱, Giáo dục 📚, Khác  
**Thu (mặc định):** Lương 💼, Thưởng 🎁, Phụ cấp 💵, Đầu tư 📈, Khác  
**Loại khoản vay:** Ngân hàng 🏦, Vay tiêu dùng 💳, Vay cá nhân 👤, Khác 📝  
**Custom categories** (T2-6): User tự thêm qua Settings → "Danh mục tùy chỉnh" → `/categories`
- Merge vào cuối danh sách khi chọn trong TransactionModal
- Emoji tự chọn + 12 màu preset + type (chi/thu)

### 12. Financial Health Score (T2-2)
- `calcHealthScore(transactions, loans, budgets, month)` → 0-100
- 4 thành phần: tiết kiệm 30đ + nợ vay 30đ + ổn định 3 tháng 20đ + ngân sách 20đ
- `HealthScoreWidget` trên trang chủ: SVG arc + color (xanh/cam/đỏ) + collapsible breakdown
- Fallback tháng trước nếu tháng hiện tại chưa có data

### 13. Savings Goals (T2-3)
- `app/goals/page.tsx`: CRUD goals + progress bars
- `GoalModal`: target_amount, saved_amount, deadline (month), note
- Auto-tính: cần tiết kiệm X đ/tháng = remaining / months_until_deadline
- Widget: header tổng saved / tổng target

### 14. Bill Reminders (T2-4)
- `app/reminders/page.tsx`: CRUD reminders + toggle active
- `ReminderModal`: name, day_of_month (1-31), amount_estimate optional
- AppShell mount check: nhắc nhở trong 3 ngày → toast cam, lưu key `reminders_shown_YYYY-MM-DD` để không spam

### 15. Voice Input tiếng Việt (T3-2)
- Nút **"🎤 Nói nhanh"** trong header của `TransactionModal` (góc phải, cạnh nút ✕)
- Tap → browser xin quyền microphone → nói câu → auto-fill form (type + amount + category + note)
- Tự ẩn nếu browser không hỗ trợ (feature-detect `window.SpeechRecognition`)
- **Trạng thái nút:** xanh (idle) → đỏ pulse "Đang nghe..." (listening) → xanh (done)
- **Toast xanh** hiện transcript ngắn gọn 3.5 giây sau khi nhận giọng
- **Parser** (`lib/voiceParser.ts` — `parseVoiceInput(transcript, customCats)`):
  - **Amount:** "250 nghìn/ngàn/k", "1 triệu/tr", "1 triệu rưỡi", "5 trăm nghìn", "250000"
  - **Type:** detect từ keywords ("được/nhận" → income; "mua/chi/trả" → expense)
  - **Category:** custom categories kiểm tra trước (by name match), sau đó default map 11 loại
  - Fallback: infer type từ category nếu keywords không đủ
- Ví dụ: "Hôm nay chạy bee được 250 nghìn" → Thu + Di chuyển/custom "Bee" + 250.000đ
- **Platform:** iOS Safari ≥ 14.5 ✅, Android Chrome ✅ (dùng `vi-VN` lang code)

---

## Design System (bám sát demo_app.jpg)

### Màu sắc
```
                    Light           Dark
Primary Blue:       #1E90FF         #1E90FF  (không đổi)
Background:         #F0F8FF         #0D1117
Card BG:            #FFFFFF         #161B27  (bo góc 16px)
Text Primary:       #1A1A2E         #E6EDF3
Text Secondary:     #6B7280         #8B949E
Income Green:       #4CAF50         #4CAF50  (không đổi)
Expense Red:        #F44336         #F44336  (không đổi)
Interest Rate:      #FF9800         #FF9800  (orange — lãi suất)
```

**CSS variables** (trong `globals.css`): `--bg`, `--card`, `--text-primary`, `--text-secondary`  
`.card` class dùng `var(--card)` → tự chuyển màu theo dark/light mode không cần thêm `dark:` class.

### Layout
- Max width: 430px (mobile-first)
- Bottom navigation: 4 tabs + FAB (+) chính giữa
- Header xanh bo góc dưới (rounded-b-[32px])
- Modal bottom sheet: rounded-t-3xl, max-h-[90dvh], scroll khi cần

### Typography
- Font: system-ui / -apple-system
- Số tiền lớn: font-extrabold, clamp(1.6rem, 6vw, 2rem)
- Format VND: `1.500.000 đ` (vi-VN locale + space trước đ)

---

## PWA & Icon Setup

### Icons (tất cả trong `public/`)
| File | Kích thước | Dùng cho |
|---|---|---|
| `apple-touch-icon.png` | 180×180 | iOS "Thêm vào màn hình chính" |
| `icon-192.png` | 192×192 | PWA manifest (Android) |
| `icon-512.png` | 512×512 | PWA splash screen |
| `favicon.png` | 32×32 | Tab trình duyệt |

### Quan trọng về iOS apple-touch-icon
- iOS Safari **không hỗ trợ SVG** làm home screen icon
- Phải dùng PNG, khai báo qua `metadata.icons.apple` trong `app/layout.tsx`
- **KHÔNG** đặt `apple-icon.png` trong `app/` directory — tạo dynamic route, iOS không load được
- Icons phải serve từ `public/` (static file, không có hash)
- Sau khi deploy, verify bằng cách View Page Source tìm `apple-touch-icon`

### Thêm vào màn hình chính iPhone
1. Mở URL trong **Safari** (bắt buộc)
2. Nhấn nút **Chia sẻ** (□↑)
3. Chọn **Thêm vào màn hình chính**
4. Nhấn **Thêm** — app hiển thị fullscreen như native

---

## Quy tắc bắt buộc khi phát triển

### R1 — Screenshot sau mỗi thay đổi lớn
Sau mỗi task lớn (tính năng mới, UI overhaul, layout change):
1. Chạy `/verify` để chụp screenshot thực tế
2. So sánh với `demo_app.jpg` — liệt kê điểm khác biệt
3. Ghi nhận: ✅ đúng design / ⚠️ lệch / ❌ sai hoàn toàn
4. Không đánh dấu task "done" cho đến khi screenshot pass

### R2 — Vòng lặp: Tinh chỉnh → Verify → Update
```
1. Implement → 2. Screenshot → 3. So sánh design gốc
       ↑                                   ↓
6. Done ← 5. Pass?  Yes     No → 4. List điểm lệch → quay lại 1
```
- Tối đa 3 vòng cho 1 component
- Sau 3 vòng vẫn lệch → báo cáo chi tiết, không tự ý đổi design

### R3 — Task nguyên tử để hiệu chỉnh (Fine-tune)
```
[ ] FINE-TUNE: <mô tả cụ thể> | File: <path> | Expected: <kết quả>
```
- ✅ "Tăng font-size số dư lên 28px"
- ✅ "Đổi màu nền header sang #1E90FF"
- ❌ "Sửa lại toàn bộ giao diện" — quá mơ hồ

### R4 — Không tự ý thay đổi design gốc
- `demo_app.jpg` là nguồn sự thật duy nhất
- Lệch design vì lý do kỹ thuật → comment rõ lý do trong code

### R5 — Bảo toàn dữ liệu
- Thay đổi schema DB → viết migration SQL, chạy trên Neon trước
- Không drop bảng hoặc cột mà không backup
- Kiểm tra với dữ liệu thật trước khi deploy

### R6 — Security
- Không log JWT token hay password hash
- API routes phải kiểm tra `getAuthUser()` trước khi truy cập DB
- OTP chỉ valid 1 lần (field `used=true` sau khi dùng)
- Không expose thông tin user qua error message (dùng generic message)

---

## Quy trình deploy lên Vercel

1. Tạo GitHub repo → push code lên `main`
2. Vào [vercel.com](https://vercel.com) → Import GitHub repo
3. Framework: Next.js (auto detect)
4. Thêm 4 env vars: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`
5. Deploy → nhận domain: `thu-chi-tiet-kiem.vercel.app`
6. Mỗi push lên `main` tự động deploy

---

## Checklist trước khi deploy

- [ ] `npm run build` pass không lỗi
- [ ] **⚠️ Đã chạy migration recurring trên Neon SQL Editor** (xem SQL trong phần Database)
- [ ] Đã chạy SQL tạo bảng `loans` trên Neon SQL Editor
- [ ] **⚠️ Đã chạy SQL tạo bảng `goals`, `reminders`, `custom_categories` trên Neon SQL Editor** (xem phần Database)
- [ ] Đăng ký → nhận OTP email → đăng nhập được
- [ ] Thêm giao dịch → lưu DB → reload vẫn còn
- [ ] Sửa giao dịch → PATCH API → cập nhật đúng ngay lập tức
- [ ] Xoá giao dịch → biến mất khỏi danh sách
- [ ] Modal không bị nén khi bàn phím mở trên iOS
- [ ] Biểu đồ tròn hiển thị đúng % theo danh mục
- [ ] Tổng kết tháng: dư/âm đúng màu
- [ ] Quên MK → OTP email → đặt MK mới → login được
- [ ] Logout → redirect `/login`, không vào được trang chủ
- [ ] Responsive trên 390px (mobile)
- [ ] Format tiền VND đúng: `1.500.000 đ`
- [ ] **[Loans]** Settings → "Quản lý khoản vay" → mở /loans
- [ ] **[Loans]** Thêm khoản vay → app hiển thị lãi suất tự tính + preview tiền trả
- [ ] **[Loans]** LoanItem hiển thị đúng: `~X%/tháng`, ngày đến hạn cụ thể, progress bar
- [ ] **[Loans]** Bấm "Xác nhận đã trả" → months_paid tăng, "còn phải trả tháng này" giảm
- [ ] **[Loans]** Widget trang chủ hiện đúng khi có khoản vay đang trả
- [ ] **[Loans]** Panel "Nếu trả thêm?" → nhập số tiền → hiện kết quả hết nợ sớm + tiết kiệm lãi
- [ ] **[Recurring]** Thêm giao dịch với toggle "Lặp lại hàng tháng" → lưu is_recurring + recurring_day
- [ ] **[Recurring]** Mở app tháng sau → giao dịch lặp lại tự xuất hiện + có toast thông báo
- [ ] **[Search]** Trang /transactions: search + filter Thu/Chi hoạt động đúng
- [ ] **[Export]** Settings → "Xuất dữ liệu (CSV)" → tải file .csv mở được trong Excel
- [ ] View Page Source → có `<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>`
- [ ] Thêm vào màn hình chính iOS → hiển thị logo đúng
- [ ] **[Forecast]** Trang chủ tháng hiện tại (sau ngày 5) → hiện widget "💡 Dự báo cuối tháng" với chi dự kiến + số dư dự kiến
- [ ] **[Forecast]** Chuyển sang tháng khác → widget ẩn
- [ ] **[Streak]** Ghi chép ≥ 2 ngày liên tiếp → badge "🔥 X ngày liên tiếp" xuất hiện trong header trang chủ
- [ ] **[Streak]** Milestone 3 ngày → toast xanh gradient xuất hiện lần đầu
- [ ] **[Dark Mode]** Settings → "Chế độ tối" → toàn app đổi nền tối, bottom nav tối, cards tối
- [ ] **[Dark Mode]** Reload trang → vẫn giữ dark mode (localStorage persist)
- [ ] **[Dark Mode]** Settings → "Chế độ sáng" → trở lại light mode
- [ ] **[Health Score]** Trang chủ → widget "💪 Sức khoẻ tài chính" hiển thị sau Khoản Vay widget
- [ ] **[Health Score]** Tap vào widget → mở rộng breakdown 4 thành phần
- [ ] **[Goals]** Settings → "Mục tiêu tiết kiệm" → /goals → thêm/sửa/xoá goal
- [ ] **[Goals]** GoalModal → tính live "Cần X đ/tháng để đúng hạn"
- [ ] **[Reminders]** Settings → "Nhắc nhở hoá đơn" → /reminders → thêm/sửa/xoá
- [ ] **[Reminders]** Toggle bật/tắt nhắc nhở hoạt động đúng
- [ ] **[Reminders]** Mở app khi có nhắc nhở trong 3 ngày → toast cam xuất hiện 1 lần/ngày
- [ ] **[Custom Categories]** Settings → "Danh mục tùy chỉnh" → /categories → thêm/sửa/xoá
- [ ] **[Custom Categories]** Thêm giao dịch → custom categories xuất hiện sau mặc định
- [ ] **[Custom Categories]** Link "Quản lý" trong TransactionModal → /categories
- [ ] **[Voice Input T3-2]** Mở TransactionModal → nút "🎤 Nói nhanh" hiện trong header (iOS Safari/Android Chrome)
- [ ] **[Voice Input T3-2]** Tap → allow microphone → nói "ăn cơm 50 nghìn" → Chi + Ăn uống + 50.000đ tự fill
- [ ] **[Voice Input T3-2]** Nói "lương tháng 8 triệu" → Thu + Lương + 8.000.000đ
- [ ] **[Voice Input T3-2]** Nói tên custom category → match đúng category tùy chỉnh
- [ ] **[Voice Input T3-2]** Browser không hỗ trợ SpeechRecognition → nút tự ẩn

---

## Lộ trình Native Android App (.apk)

### Chiến lược: Capacitor (Web → Native wrapper)

Giữ nguyên toàn bộ Next.js web app, dùng **Capacitor** để wrap thành `.apk` cho Android Studio.  
**Không dùng React Native** — tốn công rewrite toàn bộ UI.  
**Không dùng TWA** — TWA phụ thuộc Chrome, không có native APIs.

```
Web App (Next.js/Vercel) ←── API calls ───→ Neon PostgreSQL
        ↓  build static (next export)
   Capacitor wrapper
        ↓  Android Studio
   app-release.apk
```

### Cài đặt Capacitor (khi cần build .apk)

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Thu Chi Tiết Kiệm" "com.thuchi.app" --web-dir=out
npx cap add android
```

**`capacitor.config.ts`** (tạo khi init):
```ts
import { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'com.thuchi.app',
  appName: 'Thu Chi Tiết Kiệm',
  webDir: 'out',
  server: {
    // Dev: trỏ vào Vercel URL để test nhanh không cần build
    url: 'https://thu-chi-tiet-kiem.vercel.app',
    cleartext: true,
  },
};
export default config;
```

**Build flow:**
```bash
# 1. Build static Next.js
next.config.ts: thêm output: 'export'
npm run build       # tạo thư mục /out

# 2. Sync vào Android project
npx cap sync android

# 3. Mở Android Studio
npx cap open android
# → Build → Generate Signed Bundle/APK → APK
```

### Các vấn đề cần giải quyết khi build native

| Vấn đề | Web | Native (Capacitor) |
|---|---|---|
| Auth cookie | httpOnly cookie tự động | WebView hỗ trợ cookies — cần `server.cleartext: true` |
| Voice Input | WebSpeech API (Chrome/Safari) | Thay bằng `@capacitor/speech-recognition` plugin |
| Push Notifications | Không có | Thêm `@capacitor/push-notifications` |
| File export CSV | `<a download>` | `@capacitor/filesystem` + Share API |
| Camera/photo | Không cần | Sẵn sàng nếu cần sau |

### Plugins Capacitor cần cài khi build native

```bash
# Voice recognition thay WebSpeech API
npm install @capacitor-community/speech-recognition

# Push notifications
npm install @capacitor/push-notifications

# Share file CSV
npm install @capacitor/share @capacitor/filesystem
```

### next.config.ts khi export static

```ts
// Chỉ bật khi build cho Capacitor, tắt khi deploy Vercel
output: process.env.CAPACITOR_BUILD === 'true' ? 'export' : undefined,
trailingSlash: true,  // cần cho static export
images: { unoptimized: true }, // Next Image không dùng được với static
```

### Checklist build .apk

- [ ] `CAPACITOR_BUILD=true npm run build` → thư mục `/out` tạo thành công
- [ ] `npx cap sync android` không lỗi
- [ ] Android Studio → Run trên emulator → app load đúng
- [ ] Auth cookie hoạt động trong WebView (login → reload vẫn đăng nhập)
- [ ] Voice input dùng plugin native (nếu WebSpeech không hoạt động trong WebView)
- [ ] Build APK → install trên device thật
- [ ] App icon đúng (dùng `icon-512.png` resize theo Android sizes)

---

## Tối ưu hiệu năng (Performance)

### Vấn đề hiện tại đã xác định

| # | Vấn đề | File | Mức độ |
|---|---|---|---|
| P1 | `fetchTransactions()` tải **toàn bộ** lịch sử, không giới hạn | `AppShell.tsx:66` | Cao |
| P2 | Mount AppShell: 2 `useEffect` riêng biệt → 2 request song song không được `Promise.all` | `AppShell.tsx:56-66` | Trung bình |
| P3 | Recurring check chạy tuần tự N lần `createTransaction` trong callback | `AppShell.tsx:80+` | Trung bình |
| P4 | Không có cache layer — mỗi reload = full DB query | `lib/api.ts` | Cao |
| P5 | `recharts`, `LoanSummaryWidget`, `HealthScoreWidget` load eagerly | `app/page.tsx` | Trung bình |
| P6 | `fetchReminders` trong AppShell mount gây thêm 1 DB round-trip | `AppShell.tsx` | Thấp |

### Giải pháp ưu tiên cao (P1 + P4)

**P1 — Fetch theo tháng trước, load thêm khi cần:**
```ts
// AppShell: fetch tháng hiện tại trước, lazy load full history
const [transactions, setTransactions] = useState<Transaction[]>([]);
const [allLoaded, setAllLoaded] = useState(false);

useEffect(() => {
  const currentMonth = getCurrentMonth();
  fetchTransactions(currentMonth).then(async (monthData) => {
    setTransactions(monthData);
    setLoading(false);
    // Load full history ngầm sau khi UI đã render
    const allData = await fetchTransactions();
    setTransactions(allData);
    setAllLoaded(true);
  });
}, []);
```

**P4 — Cache với SWR (cài thêm `swr`):**
```bash
npm install swr
```
```ts
import useSWR from 'swr';
// Trong page dùng data ít thay đổi (loans, goals, reminders)
const { data: loans } = useSWR('/api/loans', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 60000, // 60s cache
});
```

**Hoặc dùng Response Cache header trên API GET routes:**
```ts
// app/api/loans/route.ts — loans ít thay đổi, cache 60s
return NextResponse.json(rows, {
  headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' }
});
```

### Giải pháp ưu tiên trung bình (P2 + P3 + P5)

**P2 — Parallel fetch khi mount:**
```ts
// AppShell: gom tất cả fetch vào Promise.all
useEffect(() => {
  Promise.all([
    fetchTransactions(),
    fetchUserProfile(),
    fetchReminders(),
  ]).then(([txData, profile, reminders]) => {
    // xử lý tất cả cùng lúc
  });
}, []);
```

**P3 — Batch recurring transactions:**
```ts
// Thay vì await createTransaction() tuần tự trong vòng lặp
const newTxs = await Promise.all(toCreate.map(t => createTransaction(t)));
```

**P5 — Dynamic import cho heavy components:**
```ts
import dynamic from 'next/dynamic';
const LoanSummaryWidget = dynamic(() => import('@/components/LoanSummaryWidget'), { ssr: false });
const HealthScoreWidget = dynamic(() => import('@/components/HealthScoreWidget'), { ssr: false });
// recharts tự dynamic khi import bên trong component có "use client"
```

### Quy tắc hiệu năng bắt buộc (R7)

- **R7.1** — Mỗi page mount không được gọi quá **2 API endpoints** tuần tự; dùng `Promise.all` cho parallel.
- **R7.2** — Không fetch lại data đã có trong TxContext; pass qua context thay vì fetch riêng.
- **R7.3** — Mọi `useMemo` dependency phải minimal — không đưa cả `transactions` array vào dep nếu chỉ cần sub-slice.
- **R7.4** — Loading state phải hiển thị skeleton, không để blank screen > 200ms.
- **R7.5** — Optimistic update là mặc định: cập nhật local state trước, rollback nếu API lỗi.
- **R7.6** — Khi thêm tính năng mới, không thêm `useEffect` fetch mới trong AppShell — tận dụng data đã có hoặc lazy fetch trong page riêng.

### DB Index cần đảm bảo có trên Neon

```sql
-- Đã có (xem phần Database), nhưng xác nhận lại:
CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions"("date");

-- Thêm composite index cho query lọc theo user + tháng:
CREATE INDEX IF NOT EXISTS "idx_transactions_user_date"
  ON "transactions"("user_id", "date" DESC);
```
