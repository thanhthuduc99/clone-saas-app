# Ví dụ đã làm: ClickUp thu nhỏ cho 1 agency

Bối cảnh: agency nhỏ, dữ liệu bán hàng và dự án nằm rải ở 5 chỗ (sheet lead nhiều tab, file báo giá .docx rời không có trạng thái, stage ghi trong daily log, 1 dashboard cũ đã dừng, 4 bộ stage pipeline khác nhau). Báo giá đã gửi không chỗ nào nhắc follow-up. Dự án đang chạy không có board theo dõi.

Mục tiêu: 1 app riêng có CRM + quản lý dự án, giao diện kiểu ClickUp, có automation và AI, có REST API, webhook và MCP để Claude Code đọc/ghi (thêm lead, gắn báo giá, đổi stage).

## Bảng tính năng

Nguồn: help.clickup.com, developer.clickup.com, clickup.com/brand.

| Tính năng ClickUp | Vì sao ClickUp có | Bản nhỏ cần? |
|---|---|---|
| Space > Folder > List > Task > Subtask | Tách phòng ban, dự án. Task không sống ngoài List | Có, bỏ Folder (2 space là đủ) |
| Status riêng từng List, 4 nhóm (not started / active / done / closed) | Mỗi quy trình có stage riêng. Nhóm giúp app biết task nào "xong" để tính overdue, báo cáo | Có. Pipeline và Dự án có bộ stage khác nhau |
| Custom Fields (money, date, dropdown, phone, people...) | Biến task thành record CRM mà không cần bảng riêng | Có, cốt lõi |
| Relationship + Rollup | Nối Contact, Deal, Account; cộng giá trị deal lên khách | Có. Đây là cách nhận biết 1 khách nhiều dự án |
| List, Board, Calendar, Table, Dashboard | Board kéo thả cho pipeline, List sửa nhanh, Calendar cho follow-up, Dashboard xem tiền | List, Board, Calendar, Dashboard. Table gộp vào List |
| Gantt, Workload, Mind map, Whiteboard | Dự án lớn nhiều phụ thuộc | Không. Dự án 7-14 ngày không cần |
| Automation: trigger, condition, action | Bỏ việc tay lặp lại: form vào là tạo lead, chốt deal là tạo dự án, tới hạn là nhắc | Có, cốt lõi |
| Forms | Lead vào thẳng List | Không làm form builder. Website và chatbot đẩy qua API |
| AI Fields, Autopilot Agents | AI đọc task, tự điền field, tóm tắt, chấm điểm khi có sự kiện | Có. Dùng lại prompt tóm tắt và chấm điểm lead đang chạy ở Apps Script |
| API v2, webhook 28 event, MCP server 48 tool | Cho tool ngoài và AI đọc/ghi | Có. REST v1, webhook ký HMAC, MCP khoảng 10 tool |

Phong cách học từ ClickUp: rail icon trái + sidebar cây space khoảng 240px, views bar dạng tab, chữ 13-14px, bo góc 6-8px, gradient 4 màu (#FF02F0 #FC6D2D #6647F0 #0091FF). Logo tự vẽ theo gradient đó, không dùng logo ClickUp.

## Cấu trúc workspace đã chốt

**Space Sales** (chỉ owner thấy)

- List **Pipeline**. Status: New, Consulting, Call booked, Quote sent (active), Won (done), Lost (closed).
  Field: Deal value (money), Max value (money, cho báo giá dạng khoảng), Follow-up date, Tier (Hot/Warm/Cold), Source, Product fit, Client (relationship tới Clients), Need, Budget, Timeline, Phone, Email, Chat UID, AI summary, Lost reason.
- List **Clients**, mỗi người 1 record. Status: Active, Past client.
  Field: Company, Phone, Email, Chat UID, Source, Also on team (people, cho khách đồng thời là cộng tác viên).
  Rollup tính lúc đọc: số deal, số dự án, tổng đã chốt, tổng đang mở.

**Space Delivery** (cả team)

- List **Projects**. Status: Onboarding, Design, Building, Testing, Handover, Warranty, Done.
  Field: Value, Client (relationship), Source deal (relationship tới Pipeline), người phụ trách, hạn bàn giao.
  Mẫu 6 subtask: kickoff, sơ đồ kiến trúc, dev, test, nghiệm thu, bảo hành.

## 1 khách nhiều dự án

- Khách hàng là trung tâm. Deal và Dự án là record riêng, mỗi cái link về 1 Khách.
- Lead mới vào thì dò SĐT, UID chat, email trong Clients. Trùng thì tự link và gắn chip "Returning client". Không trùng là lead mới, chốt deal thì tạo Client.
- Card deal/dự án có chip tên khách, kèm badge "x2" khi khách có từ 2 dự án.
- Trang Khách gom mọi deal, dự án, file báo giá và tổng tiền đã chốt (LTV).

## Views

- List: cột field, sửa inline, gom theo stage.
- Board: kéo thả, mỗi cột có tổng tiền, cột nào cũng thu gọn được khi bấm.
- Calendar: theo hạn hoặc ngày follow-up.
- Dashboard: tiền theo stage, đã chốt tháng này, báo giá đang treo, follow-up tới hạn, dự án trễ hạn, việc theo từng người.
- Ctrl+K: tìm không dấu, tìm theo mã task (vd `CW-12`).
- Panel chi tiết task bên phải, mở qua `?task=CW-n` ở mọi trang: field, subtask, comment, activity, file.

## Automation cài sẵn (thiết kế, chưa chạy thật)

Trigger: task tạo mới, đổi stage (từ/tới), đổi field, tới ngày, webhook vào.
Action: đổi stage, giao người, set field, tạo task từ mẫu, comment, gọi webhook, nhắn Telegram, AI prompt (ghi kết quả vào field hoặc comment).

| # | Khi nào | App làm gì |
|---|---|---|
| 1 | Có lead mới | AI tóm tắt và chấm điểm, Hot thì nhắn Telegram. Chỉ chạy lúc tạo và khi bấm nút, không chạy lại mỗi tin nhắn mới |
| 2 | Deal sang Quote sent | Follow-up date = hôm nay + 3 |
| 3 | Tới ngày follow-up | Telegram nhắc người phụ trách, ghi comment |
| 4 | Deal sang Won | Tạo hoặc link Client, tạo Project từ mẫu, nối Deal, Client, Project |
| 5 | Mọi sự kiện | Bắn webhook tới các URL đã đăng ký (n8n...) |

## Không làm ở bản này

Folder, tag, checklist (subtask là đủ), saved views, Gantt, form builder, portal cho khách, app mobile, time tracking.

Nếu thiếu thời gian, cắt theo thứ tự: Calendar, AI prompt tuỳ biến, builder automation (thay bằng JSON), chart dashboard (giữ con số). Không cắt: format payload của luồng đang gửi dữ liệu, import, cổng nginx, backup, log automation, tool gắn báo giá.

## User sửa gì sau mockup

1. Chữ giao diện, tên cột, status sang tiếng Anh hết. Tên khách, thông tin khách, tên và mô tả dự án, comment giữ tiếng Việt. Tiền rút gọn đổi từ "tr" sang "M" (4,2M), tiền đầy đủ giữ `4.200.000 ₫`.
2. Cột Lost hiện sẵn như mọi cột, bấm mới thu gọn, bấm dải màu để mở lại.
3. Bỏ hiện điểm chấm lead trên card, List và panel. Vẫn chấm ngầm để ra mức Hot/Warm/Cold.
4. Chọn logo phương án A.

Sau deploy, user xin thêm: ô "Keep me signed in" (phiên 90 ngày, tự gia hạn) và trình duyệt nhớ email + mật khẩu để mở lên là vào.
