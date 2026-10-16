---
name: clone-saas-app
description: Làm bản thu nhỏ của một phần mềm SaaS (ClickUp, Notion, HubSpot, Trello...) cho riêng công ty mình. Quy trình 3 phase - nghiên cứu app gốc để hiểu vì sao có từng tính năng, đề xuất scope + data model + mockup cho user duyệt, rồi build app thật (Next.js + Postgres + Drizzle) có lớp domain ghi bảng events, REST API + MCP cho AI agent, import dữ liệu thật qua bước dry-run, smoke test và deploy VPS. Dùng khi user nói "clone app", "reverse engineer ClickUp", "reverse engineer Notion/HubSpot", "làm bản nhỏ của phần mềm X cho công ty mình", "CRM riêng", "app quản lý dự án riêng", "ClickUp mini".
---

# Clone SaaS App

Biến 1 phần mềm SaaS lớn thành app nhỏ chạy riêng cho công ty: giữ các tính năng công ty thật sự cần, bỏ phần còn lại, nạp dữ liệu thật và mở API cho AI agent đọc/ghi.

Ví dụ gốc: Contentta Work, bản ClickUp thu nhỏ cho 1 agency (CRM bán hàng + quản lý dự án). App nội bộ có mật khẩu nên không có demo public, chỉ có ảnh chụp đã làm mờ tên khách. Mốc trong ngày làm (14/10/2026): 9:28 gửi prompt, 10:43 có mockup, 15:21 xong UI thật, 15:31 import xong dữ liệu thật, 16:35 chạy trên VPS.

Trạng thái thật của ví dụ lúc đóng gói skill: đã xong M0-M4 + deploy (REST API, UI, import). Automation engine, webhook ra, inbound và MCP mới ở mức thiết kế trong plan, bảng DB đã tạo sẵn, chưa có code. Phần đó trong skill là thiết kế đã được duyệt, chưa qua chạy thật.

## Nguyên tắc

- **2 điểm dừng chờ user duyệt:** sau mockup (M1) và sau bản import dry-run (M4). Không tự đi qua điểm dừng. User đổi thứ tự (vd "push lên vps đi" trước khi xong automation) thì làm theo user.
- **Hỏi trước khi cài package.** Danh sách package nằm trong plan để duyệt 1 lần.
- **Học lý do, làm logo và tên riêng.** Chỉ học phong cách app gốc (bố cục, màu gradient, mật độ chữ). Dùng logo gốc thì không quay content khoe app được.
- **Mọi thay đổi dữ liệu đi qua `lib/domain/*`**, ghi thêm 1 dòng `events` trong cùng transaction.
- **Verify bằng chạy thật:** curl, Playwright, psql. Không có test framework. Cái gì chưa kiểm được thì báo "chưa verify".
- **Key đọc từ `.env`.** Script ghi key thẳng vào file, không in ra chat hay log. Secret production sinh ngay trên server.
- Ảnh chụp vào `screenshots/<milestone>/`, không rải ra gốc project.
- Hỏi sớm ngôn ngữ giao diện. Ví dụ gốc: UI tiếng Anh hết, dữ liệu khách và dự án giữ tiếng Việt.

## Phase 1. Nghiên cứu

Chạy 3 subagent Explore song song:

1. **App gốc trên web.** Đọc help docs (cấu trúc dữ liệu, views, automation, AI), developer/API docs (resource, cách auth, danh sách webhook event, MCP server nếu có), brand page (mã màu, logo, font). Bắt trả về chi tiết cụ thể: mã hex, đường dẫn endpoint, tên event, kèm URL nguồn. Chỗ nào không chắc thì đánh dấu.
2. **Dữ liệu thật của user.** Sheet, file báo giá, CRM cũ, ghi chú quy trình bán hàng và làm dự án. Rút ra: các bộ stage đang dùng (thường lệch nhau ở nhiều chỗ), field của 1 báo giá, danh sách deal gần đây, các luồng đang ghi dữ liệu vào đâu (form, chatbot, relay).
3. **Code và hạ tầng có sẵn.** Stack user hay dùng, pattern auth cookie, webhook có dedupe, Postgres trên VPS, runtime đã cài (node, pnpm, docker, python).

Từ kết quả, lập bảng 3 cột (khung ở `templates/plan.md`, mẫu ClickUp ở `references/clickup-example.md`):

| Tính năng app gốc | Vì sao app gốc có | Mình có cần không |
|---|---|---|

Cột giữa trả lời đúng câu user hỏi: vì sao tính năng đó cần. Cột cuối luôn là quyết định cụ thể: "Có", "Có, gọn lại ở chỗ X", hoặc "Không, vì Y".

Đo vấn đề bằng số từ dữ liệu thật: bao nhiêu báo giá đang treo, tổng bao nhiêu tiền, dữ liệu nằm rải ở mấy chỗ, có mấy bộ stage khác nhau. Mấy số này mở đầu plan.

Chốt với user bằng AskUserQuestion, gom 1-2 lượt, mỗi câu có 1 phương án đánh dấu Recommended:

- Ai dùng: 1 người, team nội bộ, hay có cả khách xem tiến độ.
- Dữ liệu cũ: import 1 lần rồi app là nguồn chính (đề xuất), sync 2 chiều, hay app chỉ đọc.
- Hosting: VPS (automation hẹn giờ chạy 24/7), Vercel + DB managed, hay local trước.
- AI nào gọi vào app: Claude Code qua MCP, n8n qua webhook, agent nội bộ (vd agent làm báo giá).
- Làm app mới hay nâng cấp app cũ đang có.
- Tên app, logo.
- Quyền xem: phần nào chỉ owner thấy (giá deal, SĐT khách).
- Người trùng tên giữa các nguồn (khách đồng thời là cộng tác viên?). Hỏi, đừng đoán.

## Phase 2. Đề xuất (điểm dừng 1)

Viết plan theo `templates/plan.md`, gửi qua plan mode. Plan gồm:

1. **Cấu trúc workspace:** Space > List > Task > Subtask. Mỗi List có bộ status riêng, mỗi status thuộc 1 trong 4 nhóm `not_started / active / done / closed` để app biết task nào đã xong khi tính trễ hạn và báo cáo.
2. **Data model** (chi tiết `references/data-model.md`). Bài học chính: **Khách hàng là bản ghi trung tâm.** Deal và Dự án là bản ghi riêng, mỗi cái có field relationship nối về 1 Khách. 1 khách có n deal, n dự án. Rollup (số deal, số dự án, tổng đã chốt) tính lúc đọc. ClickUp làm việc này bằng Relationship + Rollup. Lead mới vào thì dò SĐT, UID, email trong danh sách Khách để nhận ra khách cũ.
3. **Views** làm và views bỏ.
4. **Automation:** trigger, condition, action. Các rule cài sẵn viết thành bảng "Khi nào / App làm gì".
5. **API cho AI:** REST, webhook ra, inbound, MCP tools (`references/api-mcp.md`).
6. **Không làm ở bản này:** liệt kê rõ.
7. **Stack + package** cần duyệt.
8. **Milestones M0-M8**, mỗi bước có mục Verify riêng.
9. **Rủi ro**, thứ tự cắt khi thiếu thời gian, và những thứ không được cắt.

Sau khi duyệt plan, làm M0 (khung project) và M1 (mockup):

- Mockup là trang `/mockup` trong chính project, dữ liệu cứng trong 1 file TS, chưa cần DB.
- Gồm: rail icon trái + sidebar space 240px, views bar, board pipeline (card có giá trị, chip mức độ, avatar, ngày follow-up, chip khách + badge x2 khi khách có từ 2 dự án), list view, panel chi tiết task, trang Khách hàng, 2-3 phương án logo ở `/mockup/logos` (thêm `?logo=b` để xem logo gắn trên app).
- Dùng deal thật đọc được ở phase 1. Số tự điền cho đẹp (tiến độ, hạn) phải có ghi chú ngay trên màn hình.
- Chụp Playwright 1440x900 và 1280x800, tự mở ảnh kiểm tra (định dạng ngày, chữ đè nhau).
- Dừng. Hỏi user: chọn logo nào, sửa gì trên card, panel, stage.

Ví dụ gốc, user sửa 3 việc sau mockup: chữ giao diện và status sang tiếng Anh trừ dữ liệu khách; cột Lost hiện sẵn, bấm mới thu gọn; bỏ hiện điểm chấm lead (vẫn chấm ngầm để ra mức Hot/Warm/Cold). Hỏi trước mấy điểm này để đỡ 1 vòng sửa.

## Phase 3. Build + verify

### Stack đã chạy

Next 16 App Router + TypeScript + Tailwind 4 + Postgres 16 (Docker, cổng riêng) + Drizzle + zod + @dnd-kit/core + @dnd-kit/sortable + lucide-react + @modelcontextprotocol/sdk. pnpm. Hash mật khẩu bằng scrypt của `node:crypto`, không cần bcrypt. Chart và calendar tự vẽ, không cài thư viện.

Lý do chọn Postgres: `unaccent` + `pg_trgm` cho tìm tiếng Việt không dấu ("dat" ra "Đạt"), `FOR UPDATE SKIP LOCKED` cho hàng đợi automation không chạy trùng.

Next 16 khác bản cũ: đọc `node_modules/next/dist/docs/` trước khi viết `proxy.ts` (middleware đã đổi tên, chạy trên Node) và `instrumentation.ts`.

### Milestones

| # | Làm | Verify |
|---|---|---|
| M0 | Khung Next, Postgres local, copy key cần dùng sang `.env` bằng script | dev trả 200, `psql select 1` |
| M1 | Mockup. **Dừng chờ duyệt** | Ảnh Playwright 2 kích thước |
| M2 | Schema + migration, seed cấu trúc + user, login, `proxy.ts`, lớp domain + events, `/api/v1`, API token | Smoke test PASS hết, bảng `events` có dòng tương ứng, sai pass 401, member không thấy space bị khoá |
| M3 | UI thật: List sửa inline, Board kéo thả, panel task đủ loại field, upload file, Calendar, Dashboard, Ctrl+K, trang Khách có rollup | Playwright (xem dưới), `next build` qua |
| M4 | Export nguồn, import `--dry`. **Dừng chờ duyệt plan import** | Số dòng khớp nguồn, so 5 dòng ngẫu nhiên, tổng tiền khớp |
| M5 | Automation engine, AI action, Telegram, webhook ra, scheduler, log mỗi lần chạy | Thiết kế, chưa chạy thật trong ví dụ |
| M6 | Inbound (form, chatbot) + MCP | Thiết kế, chưa chạy thật trong ví dụ |
| M7 | Deploy VPS | Health 200, người lạ 401, đăng nhập qua domain thật |
| M8 | Chuyển các luồng đang ghi vào sheet sang gọi API app, khoá tab sheet cũ | Thiết kế, chưa chạy thật trong ví dụ |

Thêm bảng lệnh (migrate, smoke, fixture, import, deploy) vào `CLAUDE.md` của project để phiên sau biết.

### Lớp domain + bảng events

- `lib/domain/*` là chỗ duy nhất ghi DB. Route API, UI, import, automation đều gọi vào đây.
- Mỗi thay đổi ghi bảng nghiệp vụ và `emit()` 1 dòng `events` trong cùng transaction. Dòng này vừa là activity log (panel task đọc ra), vừa là outbox cho automation và webhook.
- `WriteCtx` mang `actor` (user / api / automation / import / inbound / system), `depth`, `causedByRunId`, `suppressed`. Import đặt `suppressed = true`: có activity nhưng không chạy automation, không nhắn Telegram.
- Commit xong gọi `kickEngine()` đánh thức engine. Engine chưa có thì hàm này để trống.
- Engine theo thiết kế: chạy trong process Next qua `instrumentation.ts`, poll 5 giây, scheduler theo ngày 60 giây, chặn vòng lặp bằng `depth` tối đa 3, `automation_runs.dedupe_key` unique để khởi động lại không chạy trùng.

### API cho AI

REST `/api/v1` dùng `Authorization: Bearer <token>`, mỗi user tạo token trong Settings. Danh sách route, quy ước lỗi, webhook, inbound, MCP tools ở `references/api-mcp.md`.

### Verify UI bằng Playwright

- Kéo card sang cột khác, reload vẫn giữ, DB có event đổi status.
- Nhập tiền ở List, lưu là số, hiện đúng định dạng (vd `4,2M` rút gọn, `4.200.000 ₫` đầy đủ).
- Upload file rồi tải về, so đủ số byte.
- Ctrl+K gõ không dấu ra tên có dấu.
- Đăng nhập bằng user member: không thấy space bị khoá. Trang trả 200 chưa đủ, phải xem trang có lộ dữ liệu không.
- Console trình duyệt không có lỗi.

### Import dữ liệu thật (điểm dừng 2)

1. Script export nguồn ra JSON trong `data/import/` (thư mục gitignore).
2. `node scripts/import.mjs --dry` chỉ lập plan, ghi `data/import/plan.md` + `plan.json`:
   - bảng tổng: số khách, deal, dự án, lead, số dòng gộp, số dòng bỏ;
   - từng deal và dự án với stage map mặc định;
   - dòng gộp kèm lý do (cùng SĐT, cùng email, cùng tên);
   - dòng bỏ kèm lý do (dòng trống, tên "test", email nội bộ, số điện thoại của chính user);
   - danh sách câu hỏi cho user.
3. Gửi user duyệt. User sửa map stage trên bản dry-run.
4. Import thật đi qua API, không ghi thẳng DB, kèm header chế độ import của owner. Dữ liệu qua đúng validate của lớp domain và có activity.
5. Verify: số dòng khớp nguồn trừ dòng bỏ, so 5 dòng ngẫu nhiên, SĐT giữ số 0 đầu, UID dài không bị làm tròn, tổng tiền khớp, mọi event của import có `suppressed`.

Script `scripts/dev-fixture.mjs` tạo data thử + user QA cục bộ, có `--wipe` để xoá sạch task trước khi import thật. User QA chỉ tồn tại ở DB local.

### Smoke test

Khung ở `templates/smoke-api.mjs`. Gọi HTTP thật vào server đang chạy, chỉ in PASS/FAIL, không in mật khẩu hay token. Ví dụ gốc có 30 check, danh sách ở `references/api-mcp.md`.

### Deploy VPS

- Build image ở máy dev (`--platform linux/amd64`), đẩy bằng `docker save | gzip | ssh 'gunzip | docker load'`. Không build trên VPS ít disk.
- Trước khi đẩy: chạy image ở local với DB rỗng, chắc migration tự chạy lúc khởi động.
- Compose 2 service: DB (giới hạn RAM) + app bind `127.0.0.1:<port>`. `.env` chmod 600.
- nginx + certbot. Trang giao diện chặn bằng `auth_basic` + allow IP nhà. Chừa `/api/v1`, `/api/mcp`, `/api/inbound`, `/api/upload`, `/api/health` cho máy gọi. Thêm `X-Robots-Tag: noindex` và `robots.txt` chặn hết.
- Backup: thêm `pg_dump` + tar thư mục upload vào script backup đang có (đọc file trước, giữ bản `.bak`). Test restore vào DB tạm 1 lần.
- `scripts/deploy.sh`: build, đẩy, đổi tag image trong compose, giữ `docker-compose.yml.prev` để rollback, chờ health 200.
- Hỏi trước mọi thao tác xoá trên VPS. Kiểm disk trước khi đẩy image.

Báo user sau deploy: link, file chứa mật khẩu (đường dẫn, không dán mật khẩu), những gì đã kiểm, những gì đã đổi trên server, những gì chưa có. Có cổng `auth_basic` thì nói rõ popup trình duyệt là lớp ngoài, khác màn đăng nhập app.

## Bẫy đã gặp

Đọc `references/pitfalls.md` trước M2 và trước deploy.

## File trong skill

```
SKILL.md                     quy trình 3 phase
references/
  clickup-example.md         bảng tính năng ClickUp đã làm + cấu trúc workspace đã chốt
  data-model.md              schema tổng quát: bảng, cột chính, lý do
  api-mcp.md                 REST route, quy ước lỗi, webhook, inbound, MCP tools, danh sách smoke check
  pitfalls.md                checklist bẫy theo từng giai đoạn
templates/
  plan.md                    khung plan (bảng tính năng, scope, milestones, rủi ro)
  smoke-api.mjs              khung smoke test API
```
