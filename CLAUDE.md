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

**4 bảng chính** — xem schema đầy đủ tại [lib/schema.ts](lib/schema.ts):

```
users         id (uuid PK), phone (unique), email, password_hash,
              is_verified (bool), created_at

otp_codes     id (uuid PK), user_id (FK→users), target (email),
              code (6 chữ số), purpose ('register'|'reset'),
              expires_at (5 phút), used (bool), created_at

transactions  id (uuid PK), user_id (FK→users), type ('income'|'expense'),
              category, amount (bigint VND), note, date, created_at

budgets       id (uuid PK), user_id (FK→users), category, amount (bigint VND),
              month (varchar YYYY-MM), created_at
              UNIQUE(user_id, category, month) — upsert via POST /api/budgets

loans         id (uuid PK), user_id (FK→users), name, lender_type,
              principal (bigint VND), monthly_payment (bigint VND),
              total_months (int), months_paid (int default 0),
              start_month (varchar YYYY-MM), due_day (int 1-31),
              note, created_at
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
  "created_at" timestamp DEFAULT now() NOT NULL
);

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
│   ├── settings/page.tsx        ← Cài đặt + logout + link → /loans
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
│       └── loans/
│           ├── route.ts         ← GET (list) + POST (create)
│           └── [id]/
│               ├── route.ts     ← PATCH (edit) + DELETE
│               └── pay/route.ts ← POST (xác nhận trả tháng → months_paid++)
│
├── components/
│   ├── AppShell.tsx             ← Context: transactions, deleteById, openEditModal
│   ├── BottomNav.tsx            ← Bottom nav + FAB button (+)
│   ├── TransactionModal.tsx     ← Form thêm/sửa giao dịch (edit mode)
│   ├── TransactionItem.tsx      ← Row giao dịch (tap để sửa, icon xoá)
│   ├── LoanModal.tsx            ← Form thêm/sửa khoản vay (bottom sheet)
│   ├── LoanItem.tsx             ← Card khoản vay (badge ngày đến hạn, progress, confirm btn)
│   ├── LoanSummaryWidget.tsx    ← Widget trang chủ: donut chart + còn phải trả tháng này
│   └── BudgetModal.tsx          ← Bottom sheet đặt/sửa/xoá ngân sách per category
│
├── lib/
│   ├── schema.ts                ← Drizzle schema (4 bảng: users, otpCodes, transactions, loans)
│   ├── db.ts                    ← getDb() factory (lazy, serverless-safe)
│   ├── auth.ts                  ← signJWT, verifyJWT, cookie helpers
│   ├── email.ts                 ← sendOTPEmail() via Resend
│   ├── otp.ts                   ← generateOTPCode, saveOTP, verifyOTP
│   ├── api.ts                   ← fetchTransactions, createTransaction, updateTransaction,
│   │                               deleteTransactionById, logout,
│   │                               fetchLoans, createLoan, updateLoan,
│   │                               deleteLoanById, confirmLoanPayment
│   ├── calculations.ts          ← calcMonthSummary, calcExpenseByCategory,
│   │                               calcWeeklyData, getLast6Months,
│   │                               calcCategoryInsights (so sánh với TB 3 tháng),
│   │                               solveMonthlyRate (Newton's method),
│   │                               calcAnnualRate, calcRemainingBalance,
│   │                               calcLoanStatus, calcTotalMonthlyLoanBurden,
│   │                               calcTotalRemainingDebt
│   ├── formatters.ts            ← formatVND, formatMonth, ...
│   └── storage.ts               ← Legacy (không dùng nữa, an toàn để xoá)
│
├── types/
│   └── index.ts                 ← Transaction type, categories, constants,
│                                   Loan interface, LenderType, LENDER_TYPES
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

---

## Tính năng cốt lõi

### 1. Nhập / Sửa thu chi nhanh
- Loại (thu/chi) + danh mục + số tiền + ghi chú + ngày
- FAB button (+) ở bottom nav → mở modal thêm mới
- Tap vào icon hoặc tên giao dịch → modal mở với data cũ điền sẵn (edit)
- Button ✏️ trên mỗi row → cũng mở edit modal
- Lưu qua API: POST tạo mới, PATCH sửa
- **Bug fix:** Modal không bị nén khi bàn phím iOS mở (`max-h-[90dvh] overflow-y-auto`)

### 2. Tổng quan tài chính (Trang chủ)
- Số dư hiện tại (Thu - Chi tháng này)
- Badge Dư / Âm — màu xanh/đỏ
- Biểu đồ cột: Thu vs Chi theo 4 tuần trong tháng
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
- **Header page:** "Còn phải trả tháng này" = tổng khoản chưa xác nhận (giảm khi user confirm, reset tháng sau)
- **months_paid** tăng dần khi xác nhận, tự reset trạng thái tháng sau theo logic time-based

### 5. Danh mục
**Chi:** Ăn uống 🍜, Di chuyển 🚗, Giải trí 🎮, Mua sắm 🛍️, Y tế 💊, Hoá đơn 📱, Giáo dục 📚, Khác  
**Thu:** Lương 💼, Thưởng 🎁, Phụ cấp 💵, Đầu tư 📈, Khác  
**Loại khoản vay:** Ngân hàng 🏦, Vay tiêu dùng 💳, Vay cá nhân 👤, Khác 📝

---

## Design System (bám sát demo_app.jpg)

### Màu sắc
```
Primary Blue:  #1E90FF  (header, buttons, FAB)
Background:    #F0F8FF  (light blue-white)
Income Green:  #4CAF50
Expense Red:   #F44336
Card BG:       #FFFFFF  (bo góc 16px, shadow nhẹ)
Text Primary:  #1A1A2E
Text Secondary:#6B7280
Interest Rate: #FF9800 (orange — lãi suất %/tháng trên loan card)
```

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
- [ ] Đã chạy SQL tạo bảng `loans` trên Neon SQL Editor
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
- [ ] View Page Source → có `<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>`
- [ ] Thêm vào màn hình chính iOS → hiển thị logo đúng
