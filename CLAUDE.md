# Thu Chi Tiết Kiệm — CLAUDE.md

## Tổng quan dự án

**Tên:** Thu Chi Tiết Kiệm  
**Loại:** Web app mobile-first PWA (Next.js 16 + Vercel + Neon PostgreSQL)  
**Mục tiêu:** Quản lý thu chi cá nhân hằng ngày, tổng kết hằng tháng, biểu đồ trực quan.  
**Demo tham khảo:** `demo_app.jpg` trong thư mục gốc — đây là design gốc cần bám sát.  
**Deploy:** Vercel (auto deploy từ GitHub) · Domain: `thu-chi-tiet-kiem.vercel.app`

---

## Tech Stack

| Package | Phiên bản | Mục đích |
|---|---|---|
| `next` | 16.2.7 | Framework (App Router, SSR) |
| `react` / `react-dom` | 19 | UI |
| `tailwindcss` | 4 | Styling |
| `recharts` | 3 | Biểu đồ cột, biểu đồ tròn |
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

**3 bảng chính** — xem schema đầy đủ tại [lib/schema.ts](lib/schema.ts):

```
users         id (uuid PK), phone (unique), email, password_hash,
              is_verified (bool), created_at

otp_codes     id (uuid PK), user_id (FK→users), target (email),
              code (6 chữ số), purpose ('register'|'reset'),
              expires_at (5 phút), used (bool), created_at

transactions  id (uuid PK), user_id (FK→users), type ('income'|'expense'),
              category, amount (bigint VND), note, date, created_at
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

CREATE INDEX IF NOT EXISTS "idx_transactions_user_id" ON "transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_transactions_date" ON "transactions"("date");
CREATE INDEX IF NOT EXISTS "idx_otp_user_id" ON "otp_codes"("user_id");
```

### Authentication

- **Strategy:** JWT (jose) lưu trong httpOnly cookie `auth-token`, hết hạn 7 ngày
- **Password:** bcryptjs hash (rounds=12)
- **OTP:** 6 chữ số ngẫu nhiên, hết hạn 5 phút, lưu trong DB
- **Email OTP:** Resend API (free 3000 email/tháng) — template tiếng Việt
- **Route protection:** `proxy.ts` (Next.js 16 thay thế middleware.ts)

### Edit Transaction Flow

```
Tap vào icon hoặc tên giao dịch trong TransactionItem
→ openEditModal(tx) từ TxContext
→ TransactionModal mở với editingTransaction pre-filled
→ PATCH /api/transactions/[id]
→ updateTransaction() cập nhật state local
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
├── proxy.ts                     ← Route protection (Next.js 16)
├── drizzle.config.ts            ← Drizzle Kit config
├── .env.local.example           ← Template env vars
│
├── app/
│   ├── layout.tsx               ← Root layout + PWA meta tags
│   ├── globals.css              ← Tailwind + CSS vars
│   ├── page.tsx                 ← Tổng quan (trang chủ)
│   ├── transactions/page.tsx    ← Danh sách giao dịch
│   ├── charts/page.tsx          ← Biểu đồ phân tích
│   ├── settings/page.tsx        ← Cài đặt + logout
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
│       └── transactions/
│           ├── route.ts         ← GET (list) + POST (create)
│           └── [id]/route.ts    ← DELETE
│
├── components/
│   ├── AppShell.tsx             ← Context provider, gọi API thay localStorage
│   ├── BottomNav.tsx            ← Bottom nav + FAB button (+)
│   ├── TransactionModal.tsx     ← Form thêm giao dịch
│   └── TransactionItem.tsx      ← Row giao dịch (icon + tên + số tiền)
│
├── lib/
│   ├── schema.ts                ← Drizzle schema (3 bảng)
│   ├── db.ts                    ← getDb() factory (lazy, serverless-safe)
│   ├── auth.ts                  ← signJWT, verifyJWT, cookie helpers
│   ├── email.ts                 ← sendOTPEmail() via Resend
│   ├── otp.ts                   ← generateOTPCode, saveOTP, verifyOTP
│   ├── api.ts                   ← Client-side fetch helpers (thay localStorage)
│   ├── calculations.ts          ← calcMonthSummary, calcExpenseByCategory, ...
│   ├── formatters.ts            ← formatVND, formatMonth, ...
│   └── storage.ts               ← Legacy (không dùng nữa, có thể xoá)
│
├── types/
│   └── index.ts                 ← Transaction type, categories, constants
│
└── public/
    ├── manifest.json            ← PWA manifest
    └── icon.svg                 ← App icon (₫ trên nền xanh)
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

---

## Tính năng cốt lõi

### 1. Nhập / Sửa thu chi nhanh
- Loại (thu/chi) + danh mục + số tiền + ghi chú + ngày
- Modal FAB button (+) ở bottom nav (thêm mới)
- Tap vào icon hoặc tên giao dịch → mở modal với data pre-filled (sửa)
- Button edit (✏️) trên mỗi giao dịch → cũng mở modal sửa
- Lưu vào Neon PostgreSQL qua API (POST tạo mới, PATCH sửa)

### 2. Tổng quan tài chính (Trang chủ)
- Số dư hiện tại (Thu - Chi tháng này)
- Badge Dư / Âm — màu xanh/đỏ
- Biểu đồ cột: Thu vs Chi theo 4 tuần trong tháng
- Danh sách 8 giao dịch gần nhất

### 3. Tổng kết tháng (`/charts`)
- Biểu đồ tròn phân bổ chi tiêu theo danh mục
- Biểu đồ cột xu hướng 6 tháng gần nhất
- Bảng kết quả từng tháng (dư/âm)

### 4. Danh mục
**Chi:** Ăn uống 🍜, Di chuyển 🚗, Giải trí 🎮, Mua sắm 🛍️, Y tế 💊, Hoá đơn 📱, Giáo dục 📚, Khác  
**Thu:** Lương 💼, Thưởng 🎁, Phụ cấp 💵, Đầu tư 📈, Khác

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
```

### Layout
- Max width: 430px (mobile-first)
- Bottom navigation: 4 tabs + FAB (+) chính giữa
- Header xanh bo góc dưới (rounded-b-[32px])
- Form cards: rounded-t-[32px] slide lên từ dưới

### Typography
- Font: system-ui / -apple-system
- Số tiền lớn: font-extrabold, clamp(1.6rem, 6vw, 2rem)
- Format VND: `1.500.000 đ` (vi-VN locale + space trước đ)

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

### R6 — Security (NEW)
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

## PWA — Thêm vào màn hình chính iPhone

1. Mở URL trong **Safari** (bắt buộc)
2. Nhấn nút **Chia sẻ** (□↑)
3. Chọn **Thêm vào màn hình chính**
4. Nhấn **Thêm** — app hiển thị fullscreen như native

---

## Checklist trước khi deploy

- [ ] `npm run build` pass không lỗi
- [ ] Đăng ký → nhận OTP email → đăng nhập được
- [ ] Thêm giao dịch → lưu DB → reload vẫn còn
- [ ] **Sửa giao dịch → PATCH API → cập nhật đúng**
- [ ] Modal không bị thu nhỏ khi bàn phím mở trên iOS
- [ ] Biểu đồ tròn hiển thị đúng % theo danh mục
- [ ] Tổng kết tháng: dư/âm đúng màu
- [ ] Quên MK → OTP email → đặt MK mới → login được
- [ ] Logout → redirect `/login`, không vào được trang chủ
- [ ] Responsive trên 390px (mobile)
- [ ] Format tiền VND đúng: `1.500.000 đ`
