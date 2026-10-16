# <Tên app>: bản <App gốc> thu nhỏ cho <công ty> (<module 1> + <module 2>)

## Context

Dữ liệu hiện nằm ở đâu (liệt kê từng chỗ, số dòng mỗi chỗ):
-
-

Hậu quả đo được bằng số (báo giá treo bao nhiêu, tổng tiền, việc không ai theo dõi):
-

Mục tiêu: 1 app riêng tên **<Tên app>** (<domain>).
- Giao diện kiểu <App gốc>, có <module>.
- Automation và AI giống <App gốc>.
- REST API, webhook và MCP để AI agent đọc/ghi: <các việc cụ thể>.

## Đã chốt với user

| Mục | Chốt |
|---|---|
| App | App mới tại `<thư mục>` / nâng cấp app cũ |
| Tên, logo | <tên>, logo riêng theo phong cách <App gốc> |
| Người dùng | <ai>. Space nào chỉ owner thấy |
| Data | Import 1 lần, sau đó app là nguồn chính |
| Hosting | <VPS / Vercel>, <Docker, nginx, certbot> |
| AI kết nối | <Claude Code qua MCP, n8n qua webhook...> |
| Ngôn ngữ | UI <...>, dữ liệu <...> |

---

## Phase 1: Nghiên cứu

### <App gốc>: tính năng nào, vì sao có, mình có cần không

| Tính năng <App gốc> | Vì sao <App gốc> có | Mình cần? |
|---|---|---|
| Cấu trúc dữ liệu (cấp bậc) | | |
| Status / stage | | |
| Custom fields | | |
| Liên kết giữa bản ghi + tổng hợp | | |
| Views | | |
| Views cho dự án lớn | | |
| Automation | | |
| Forms | | |
| AI | | |
| API, webhook, MCP | | |

Nguồn: <help docs URL>, <developer docs URL>, <brand page URL>.

### Data của user

- Nguồn 1: cột, số dòng, script nào đang ghi vào.
- Báo giá: mỗi file có những field gì.
- Bộ stage đang dùng ở từng chỗ. Chọn bộ nào làm chuẩn.
- Deal gần đây: số lượng, bao nhiêu đang chạy.

---

## Phase 2: Đề xuất tính năng (cần user duyệt)

### Cấu trúc workspace

**Space <A>** (ai thấy)
- **List <...>**
  - Stage: <...> (ghi nhóm: not_started / active / done / closed)
  - Field: <tên (loại)>, ...
- **List Khách hàng**: mỗi người 1 record. Rollup: số deal, số dự án, tổng đã chốt.

**Space <B>** (ai thấy)
- **List Dự án**: stage, field, subtask mẫu.

### 1 khách nhiều deal / dự án

- Khách hàng là trung tâm. Deal và Dự án là record riêng, link về 1 Khách.
- Tự nhận diện khách cũ khi lead mới vào: dò <SĐT, UID, email>.
- Trên card: chip tên khách, badge khi khách có từ 2 dự án.
- Trang Khách: gom deal, dự án, file, tổng tiền.

### Views

- List:
- Board:
- Calendar:
- Dashboard:
- Tìm kiếm Ctrl+K:
- Panel chi tiết task:

### Automation

Trigger:
Action:

| # | Khi nào | App làm gì |
|---|---|---|
| 1 | | |

### API cho AI

- REST `/api/v1`, Bearer token theo user.
- Webhook ra: chữ ký HMAC, retry.
- Inbound: giữ đúng format bên gửi đang dùng.
- MCP `/api/mcp`, tool:

### Không làm ở bản này

---

## Kỹ thuật

**Stack:** <...>. Lý do chọn:
-

**Package cần duyệt:**

| Loại | Package |
|---|---|
| Runtime | |
| Dev | |
| Không dùng | |

**DB chính:** (xem references/data-model.md)

**Engine:** ghi events cùng transaction, poll <n> giây, scheduler <n> giây, chặn loop bằng depth.

**Code mượn lại:**

| Cần gì | Lấy từ |
|---|---|

---

## Các bước build

Mỗi bước có verify riêng. 2 điểm dừng chờ duyệt: M1 và M4.

**M0. Khung project**
- Làm:
- Verify:

**M1. Mockup giao diện. DỪNG CHỜ DUYỆT**
- Làm: trang `/mockup` dùng data thật, <các màn>, 2-3 logo.
- Verify: Playwright chụp 1440x900 và 1280x800 vào `screenshots/m1-mockup/`.

**M2. Data core**
- Làm: schema, migration, seed, login, `proxy.ts`, lớp domain + events, `/api/v1`, token.
- Verify: smoke test, bảng `events`, sai pass 401, member không thấy space khoá.

**M3. UI thật**
- Làm:
- Verify (Playwright):

**M4. Import. DỪNG CHỜ DUYỆT bản dry-run**
- Làm: export nguồn, `import --dry` ra plan, dedupe, map stage mặc định.
- Verify: số dòng khớp nguồn, so 5 dòng ngẫu nhiên, tổng tiền khớp.

**M5. Automation engine**
- Làm:
- Verify:

**M6. Inbound + MCP**
- Làm:
- Verify:

**M7. Deploy**
- Trước khi deploy: kiểm disk, không xoá gì khi chưa hỏi.
- Các bước:
- Verify: health 200, người lạ 401.

**M8. Chuyển nguồn**
1. Sao lưu nguồn cũ.
2. Import lần cuối trên prod.
3. Đổi từng luồng đang ghi vào nguồn cũ sang API app. Có cách rollback.
4. Khoá nguồn cũ (chế độ cảnh báo).

---

## Phase 3: Verify và chỉnh sửa

Chạy thật end-to-end trên prod, chụp vào `screenshots/phase3/`:
1.
2.

Sau đó user dùng thật 1 tuần. Gom lỗi, sửa theo thứ tự ảnh hưởng tới tiền trước, giao diện sau. Cái nào chưa verify được ghi rõ.

## Rủi ro

| Rủi ro | Cách xử lý |
|---|---|

Thiếu thời gian thì cắt theo thứ tự: <...>. Không cắt: <...>.
