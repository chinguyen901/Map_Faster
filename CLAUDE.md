# Thu Chi Tiết Kiệm — CLAUDE.md

## Tổng quan dự án

**Tên:** Thu Chi Tiết Kiệm  
**Loại:** Web app mobile-first (Next.js + Vercel)  
**Mục tiêu:** Quản lý thu chi cá nhân hằng ngày, tổng kết hằng tháng, biểu đồ trực quan.  
**Demo tham khảo:** `demo_app.jpg` trong thư mục gốc — đây là design gốc cần bám sát.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Storage:** localStorage (không cần backend, không cần đăng nhập)
- **Deploy:** Vercel (free tier, auto deploy từ GitHub)
- **Language:** TypeScript

---

## Tính năng cốt lõi

### 1. Nhập thu / chi nhanh
- Chỉ cần nhập: **loại (thu/chi)** + **danh mục** + **số tiền** + **ghi chú tuỳ chọn**
- Không yêu cầu đăng nhập, lưu localStorage
- Giao diện tối giản, thao tác 1-2 tap

### 2. Tổng quan tài chính (Trang chủ)
- **Số dư hiện tại** (Thu - Chi tháng này)
- **Tình trạng:** Dư / Âm / Hoà vốn — hiển thị màu xanh/đỏ/xám
- **Biểu đồ cột:** Thu vs Chi vs Tích luỹ (theo tuần trong tháng)
- **Danh sách giao dịch gần đây** (5-10 mục mới nhất)

### 3. Tổng kết tháng
- Tổng thu / tổng chi / số dư tháng
- **Biểu đồ tròn** phân bổ chi tiêu theo danh mục
- So sánh tháng này vs tháng trước
- Dòng kết luận: "Tháng này bạn **tiết kiệm được 2,500,000đ**" hoặc "Tháng này bạn **bội chi 500,000đ**"

### 4. Danh mục mặc định
**Chi:** Ăn uống, Di chuyển, Giải trí, Mua sắm, Y tế, Hoá đơn, Khác  
**Thu:** Lương, Thưởng, Phụ cấp, Đầu tư, Khác

---

## Design System (bám sát demo_app.jpg)

### Màu sắc
```
Primary Blue:    #1E90FF  (header, CTA buttons)
Background:      #F0F8FF  (light blue-white)
Income Green:    #4CAF50
Expense Red:     #F44336
Card BG:         #FFFFFF
Text Primary:    #1A1A2E
Text Secondary:  #6B7280
```

### Layout mobile-first
- Max width: 390px (iPhone 14 standard)
- Bottom navigation bar: 4 tabs (Tổng quan, Giao dịch, Biểu đồ, Cài đặt)
- FAB button (+) chính giữa bottom nav để thêm giao dịch nhanh
- Card design bo góc, shadow nhẹ

### Typography
- Font: Inter hoặc system-ui
- Số tiền lớn: font-bold text-2xl (như "35,907,005 đ" trong demo)
- Format tiền VND: `1.500.000 đ` (dấu chấm nghìn, space trước đ)

---

## Quy tắc bắt buộc khi phát triển

### R1 — Screenshot sau mỗi thay đổi lớn
Sau mỗi task lớn (tính năng mới, UI overhaul, layout change):
1. Chạy `/verify` để chụp screenshot thực tế
2. So sánh với `demo_app.jpg` — liệt kê điểm khác biệt
3. Ghi nhận: ✅ đúng design / ⚠️ lệch / ❌ sai hoàn toàn
4. Không đánh dấu task "done" cho đến khi screenshot pass

### R2 — Vòng lặp: Tinh chỉnh → Verify → Update
Mỗi task UI phải đi qua vòng lặp:
```
1. Implement → 2. Screenshot thực tế → 3. So sánh design gốc
       ↑                                          ↓
6. Done ← 5. Pass? Yes     No → 4. List điểm lệch → quay lại 1
```
- Tối đa 3 vòng lặp cho 1 component
- Nếu sau 3 vòng vẫn lệch → báo cáo chi tiết, không tự ý đổi design gốc

### R3 — Task đơn giản để hiệu chỉnh (Fine-tune Tasks)
Mọi hiệu chỉnh nhỏ phải được chia thành task nguyên tử:
- ✅ "Tăng font-size số dư lên 28px"
- ✅ "Đổi màu nền header sang #1E90FF"
- ✅ "Bo góc card từ 8px lên 16px"
- ❌ "Sửa lại toàn bộ giao diện cho đẹp hơn" — quá mơ hồ, phải chia nhỏ

Format task:
```
[ ] FINE-TUNE: <mô tả cụ thể> | File: <path> | Expected: <kết quả mong đợi>
```

### R4 — Không tự ý thay đổi design gốc
- `demo_app.jpg` là nguồn sự thật duy nhất cho visual design
- Nếu có lý do kỹ thuật phải lệch design → comment rõ lý do trong code
- Không thêm tính năng ngoài spec mà không hỏi user

### R5 — Bảo toàn dữ liệu
- Mọi thay đổi schema localStorage phải có migration script
- Không xoá dữ liệu cũ khi deploy phiên bản mới
- Test với dữ liệu mẫu 3+ tháng trước khi merge

---

## Cấu trúc thư mục

```
chitieu/
├── CLAUDE.md
├── demo_app.jpg          ← Design gốc, KHÔNG xoá
├── src/
│   ├── app/
│   │   ├── page.tsx      ← Tổng quan (trang chủ)
│   │   ├── transactions/ ← Danh sách giao dịch
│   │   ├── charts/       ← Biểu đồ phân tích
│   │   └── settings/     ← Cài đặt
│   ├── components/
│   │   ├── ui/           ← shadcn components
│   │   ├── TransactionForm.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── BarChart.tsx
│   │   ├── PieChart.tsx
│   │   └── BottomNav.tsx
│   ├── lib/
│   │   ├── storage.ts    ← localStorage helpers
│   │   ├── calculations.ts
│   │   └── formatters.ts ← format tiền VND
│   └── types/
│       └── index.ts
├── public/
│   └── screenshots/      ← Lưu screenshots so sánh
└── package.json
```

---

## Quy trình deploy lên Vercel

1. Tạo GitHub repo: `thu-chi-tiet-kiem`
2. Push code lên `main` branch
3. Vào vercel.com → Import GitHub repo
4. Framework: Next.js (auto detect)
5. Deploy → nhận domain: `thu-chi-tiet-kiem.vercel.app`
6. Mỗi push lên `main` tự động deploy

---

## Dữ liệu mẫu để test

Khi khởi tạo lần đầu, tự động seed dữ liệu tháng hiện tại:
- 5-8 giao dịch chi (Ăn uống, Di chuyển, Giải trí)
- 1-2 giao dịch thu (Lương, Thưởng)
- Đảm bảo có cả trường hợp dư và âm để test UI màu sắc

---

## Checklist trước khi deploy

- [ ] Screenshot trang chủ so với demo_app.jpg — pass
- [ ] Thêm giao dịch thu → số dư cập nhật đúng
- [ ] Thêm giao dịch chi → số dư cập nhật đúng
- [ ] Biểu đồ tròn hiển thị đúng % theo danh mục
- [ ] Tổng kết tháng: dư/âm hiển thị đúng màu
- [ ] Responsive trên 390px (mobile) và 768px (tablet)
- [ ] Reload trang: dữ liệu vẫn còn (localStorage persist)
- [ ] Format tiền VND đúng: `1.500.000 đ`
