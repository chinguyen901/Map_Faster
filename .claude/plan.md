# Plan tổng thể — Thu Chi Tiết Kiệm

> Tài liệu này là roadmap sản phẩm dài hạn, cập nhật khi có thay đổi chiến lược.
> Dựa trên: audit app hiện tại + research thị trường 15 nguồn (tháng 6/2026).

---

## Vision

**"App thu chi cho người Việt thực sự hiểu Việt Nam — nhanh nhất, privacy-first, debt-aware"**

- Không cần kết nối ngân hàng (tâm lý người VN không muốn cho app thứ 3 truy cập)
- Nhập giao dịch < 20 giây
- Hiểu hành vi tài chính VN: tiền mặt, vay cá nhân, MoMo/ZaloPay, mua vàng, BNPL
- Loan tracking là USP cốt lõi — không app VN nào làm tốt bằng

---

## Positioning trên thị trường

| Đối thủ | Điểm yếu để khai thác |
|---|---|
| Money Lover | Giới hạn free từ 2023, sync chậm, thiếu loan tracking |
| MISA MoneyKeeper | Quá phức tạp, UX cồng kềnh, nhiều quảng cáo |
| YNAB | $109/năm, chỉ tiếng Anh, quá advanced cho user VN |
| Mint | Đã đóng cửa 1/2024 — hàng triệu user đang tìm alternative |

**Cơ hội:** Money Lover giới hạn free + Mint đóng cửa = thị trường đang cần app mới.

---

## Monetization

- **Free forever:** thu chi cơ bản + 1 khoản vay + export 3 tháng gần nhất
- **One-time purchase ~49K–79K VND:** unlock tất cả tính năng
- **Không subscription** — subscription fatigue ở VN rất cao

---

## Hiện trạng (tháng 6/2026)

### Đã có
- CRUD thu/chi + 13 danh mục cố định
- Biểu đồ tháng (pie + bar) + trend 6 tháng
- Loan tracking: tính lãi suất Newton's method, progress bar, confirm trả tháng
- JWT auth + OTP email + quên mật khẩu
- PWA mobile-first 430px, bottom nav + FAB
- LoanSummaryWidget trang chủ (donut chart + còn phải trả)

### Bug cần fix trước khi tiếp tục
- [ ] `proxy.ts` chưa được Next.js nhận diện là middleware → route protection không hoạt động
  - Fix: đổi tên `proxy.ts` → `middleware.ts` và thêm `export { proxy as middleware }`

---

## TIER 1 — Quick Wins (1–4 tuần)

> Implement trực tiếp trên stack hiện có, không cần thay đổi kiến trúc.

### ✅ T1-1 · Fix middleware (P0 — bảo mật)
- Next.js 16 dùng `proxy.ts` (không phải `middleware.ts`) — convention mới
- Đã cập nhật matcher để bao gồm PWA icons (apple-touch-icon.png, icon-192.png, v.v.)
- Build output: `ƒ Proxy (Middleware)` = hoạt động đúng

### ✅ T1-2 · Budget hàng tháng per category
- User đặt ngân sách cho từng danh mục chi (ví dụ: Ăn uống 3tr/tháng)
- Hiển thị progress bar đã dùng / còn lại trên trang chủ hoặc `/charts`
- Cảnh báo khi đạt 80% và khi vượt ngân sách
- **DB:** thêm bảng `budgets(id, user_id, category, amount, month)`
- **API:** `GET/POST/PATCH /api/budgets`
- **UI:** BudgetCard component, tích hợp vào `/charts`

### ✅ T1-3 · Spending insights có context
- Sau khi tính `calcExpenseByCategory`, so sánh với trung bình 3 tháng trước
- Hiển thị: "Ăn uống tháng này nhiều hơn bình thường **+35%**" (badge cam/đỏ)
- Nếu tiết kiệm hơn: "Di chuyển tháng này ít hơn bình thường **-18%**" (badge xanh)
- **File:** `lib/calculations.ts` — thêm `calcCategoryInsights(transactions, month)`
- **UI:** InsightBadge component trong `/charts`

### ✅ T1-4 · Loan what-if calculator
- `calcEarlyPayoff(loan, extraPayment)` trong `lib/calculations.ts`
- WhatIf panel collapsible trong mỗi LoanItem: input "trả thêm X đ/tháng" → hiện hết nợ sớm N tháng + tiết kiệm Z đ lãi

### ✅ T1-5 · Search & filter giao dịch
- Thanh search + filter tabs (Tất cả / Thu / Chi) trong `app/transactions/page.tsx`
- Client-side filter trên TxContext, không cần API mới

### ✅ T1-6 · Export CSV
- Nút "Xuất dữ liệu (CSV)" trong Settings
- Client-side: tạo file CSV format `Ngày,Loại,Danh mục,Số tiền,Ghi chú` với BOM UTF-8
- Không cần API route mới (dùng transactions đã load trong TxContext)

### ✅ T1-7 · Recurring transactions (giao dịch lặp lại)
- Toggle "Lặp lại hàng tháng" + input ngày trong TransactionModal
- DB: thêm `is_recurring boolean DEFAULT false`, `recurring_day integer` vào bảng `transactions`
- ⚠️ **CẦN CHẠY SQL MIGRATION TRÊN NEON:**
  ```sql
  ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_recurring" boolean DEFAULT false NOT NULL;
  ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "recurring_day" integer;
  ```
- Auto-detect khi app mount: tìm recurring templates chưa có bản tháng này → tự tạo + toast thông báo
- Xử lý tháng ngắn (tháng 2, v.v.): dùng ngày cuối tháng nếu recurring_day > số ngày trong tháng

---

## TIER 2 — Differentiation (1–3 tháng)

> Tạo lợi thế cạnh tranh rõ ràng, khó copy nhanh.

### T2-1 · Cash flow forecast cuối tháng
- Tính: "Dự kiến còn **2.340.000 đ** vào 30/06 theo đà chi tiêu hiện tại"
- Dựa trên: thu nhập đã ghi + chi tiêu trung bình ngày đến nay × ngày còn lại
- Hiển thị ngay trên trang chủ dưới số dư hiện tại
- **File:** `lib/calculations.ts` — thêm `calcMonthEndForecast(transactions, today)`

### T2-2 · Financial Health Score (0–100)
- 1 con số tổng hợp sức khỏe tài chính — không app VN nào có
- Thành phần:
  - Tỉ lệ tiết kiệm (thu - chi) / thu — 30 điểm
  - Debt-to-income ratio — 30 điểm
  - Số tháng liên tiếp không bội chi — 20 điểm
  - Có budget và không vượt — 20 điểm
- Hiển thị trong Settings hoặc widget trang chủ
- **File:** `lib/calculations.ts` — thêm `calcHealthScore(transactions, loans, budgets)`

### T2-3 · Savings goals + progress
- User tạo mục tiêu: "Mua xe máy — cần 30 triệu — deadline 12/2026"
- Gắn giao dịch thu vào goal hoặc tự tính % dư hàng tháng
- Progress bar + dự kiến đạt mục tiêu khi nào
- **DB:** bảng `goals(id, user_id, name, target_amount, saved_amount, deadline)`
- **UI:** `/goals` page + GoalCard component

### T2-4 · Bill reminders (PWA push notifications)
- User đăng ký: "Nhắc tôi trả tiền điện ngày 15 hàng tháng"
- Push notification trước 3 ngày (Web Push API — hoạt động trên PWA)
- **DB:** bảng `reminders(id, user_id, name, day_of_month, amount_estimate)`
- **Tech:** Web Push API + VAPID keys, service worker

### T2-5 · Gamification nhẹ
- **Streak:** số ngày liên tiếp có ít nhất 1 giao dịch được nhập
- **Milestones:** "Tháng đầu tiên số dư dương 🎉", "10 ngày streak 🔥", "Trả hết khoản vay đầu tiên 🏆"
- Toast notification khi đạt milestone
- Hiển thị streak ở header trang chủ
- **File:** `lib/calculations.ts` — thêm `calcStreak(transactions)`; `components/MilestonToast.tsx`
- *Forrester 2024: giảm 35% churn*

### T2-6 · Custom categories
- User thêm danh mục chi/thu tùy chỉnh với emoji tự chọn
- **DB:** bảng `custom_categories(id, user_id, type, name, icon, color)`
- Merge với danh mục mặc định khi render

### T2-7 · Dark mode
- Toggle trong Settings
- Dùng Tailwind `dark:` variants + `localStorage` preference
- **File:** `app/globals.css` + `app/layout.tsx` + `components/AppShell.tsx`

---

## TIER 3 — Moat dài hạn (3–12 tháng)

> Khó build nhưng tạo hào sâu không thể copy nhanh.

### T3-1 · OCR receipt scanning
- Chụp ảnh hóa đơn → AI đọc số tiền + merchant → tự điền form
- **Tech:** GPT-4o Vision API hoặc Google Cloud Vision
- **Accuracy target:** >95% (ExpenseEasy đạt 99.2%)

### T3-2 · Voice input tiếng Việt
- "Ăn phở sáng năm mươi nghìn" → tự nhập giao dịch
- **Tech:** Web Speech API (free, built-in browser) + NLP parse số tiền + danh mục
- MISA đang làm nhưng còn hạn chế → cơ hội vượt

### T3-3 · MoMo/ZaloPay notification parsing
- Đọc notification từ MoMo/ZaloPay → tự tạo giao dịch
- **Workaround:** Share intent (Android) hoặc SMS forwarding
- Không app VN nào có — differentiation mạnh nhất Tier 3

### T3-4 · BNPL tracking (Mua trước trả sau)
- Theo dõi các khoản Atome/Home Credit/Klarna
- Extend loan model hiện có để hỗ trợ BNPL: 3-6 kỳ, lãi suất 0%
- Atome/Home Credit đang bùng nổ ở VN

### T3-5 · Shared expense (Couples / Gia đình)
- 2 user cùng quản lý 1 budget chung
- Xem giao dịch của nhau, comment, split bill
- **Tech:** cần thêm concept `household_id`, real-time sync (Supabase hoặc Pusher)
- Monarch Money thành công nhờ mảng này ($14.99/tháng, highest rated)

---

## Thứ tự implement đề xuất

```
Tuần 1:  T1-1 (fix middleware) + T1-5 (search/filter)
Tuần 2:  T1-2 (budget)
Tuần 3:  T1-3 (spending insights) + T1-4 (loan what-if)
Tuần 4:  T1-6 (export CSV) + T1-7 (recurring)
Tháng 2: T2-1 (forecast) + T2-5 (gamification) + T2-7 (dark mode)
Tháng 3: T2-2 (health score) + T2-3 (savings goals) + T2-4 (bill reminders)
Tháng 4+: T2-6 (custom categories) → T3-x theo priority
```

---

## Schema DB cần thêm (Tier 1 & 2)

```sql
-- T1-2: Budget
CREATE TABLE "budgets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category" varchar(50) NOT NULL,
  "amount" bigint NOT NULL,
  "month" varchar(7) NOT NULL, -- YYYY-MM
  "created_at" timestamp DEFAULT now(),
  UNIQUE("user_id", "category", "month")
);

-- T1-7: Recurring transactions
ALTER TABLE "transactions"
  ADD COLUMN "is_recurring" boolean DEFAULT false,
  ADD COLUMN "recurring_day" integer; -- ngày trong tháng

-- T2-3: Savings goals
CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "target_amount" bigint NOT NULL,
  "saved_amount" bigint DEFAULT 0,
  "deadline" varchar(7), -- YYYY-MM
  "note" text DEFAULT '',
  "created_at" timestamp DEFAULT now()
);

-- T2-4: Bill reminders
CREATE TABLE "reminders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(100) NOT NULL,
  "day_of_month" integer NOT NULL,
  "amount_estimate" bigint,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);

-- T2-6: Custom categories
CREATE TABLE "custom_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(10) NOT NULL, -- 'income' | 'expense'
  "name" varchar(50) NOT NULL,
  "icon" varchar(10) NOT NULL, -- emoji
  "color" varchar(7) NOT NULL, -- hex
  "created_at" timestamp DEFAULT now()
);
```

---

## Nguồn research

- NerdWallet Best Expense Tracker Apps 2024–2025
- CNBC Select Best Expense Trackers 2026
- Reddit r/personalfinance — Best Personal Finance Software
- Vietcetera — Money Lover Going Global
- MISA MoneyKeeper Google Play reviews
- Forrester 2024 — Gamification in Consumer Apps
- Market Clarity — Top Indie Apps Revenue 2024
- Bountisphere — State of Personal Finance Apps 2025
