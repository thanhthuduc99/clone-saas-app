# API cho AI: REST, webhook, inbound, MCP

Trạng thái trong ví dụ gốc: REST `/api/v1`, đăng nhập, token, admin endpoint đã chạy thật và qua smoke test. Webhook ra, inbound và MCP mới là thiết kế đã duyệt, bảng DB đã có.

## Xác thực

- **Trình duyệt:** cookie phiên ký HMAC-SHA256 (`uid`, `session_version`, `exp`), so chữ ký bằng `timingSafeEqual`. `proxy.ts` chỉ kiểm chữ ký + hạn, không đụng DB. Route API tự xác thực lại và kiểm `session_version`.
- **Ghi nhớ đăng nhập:** tick thì cookie 90 ngày, còn dưới 80 ngày thì `proxy.ts` cấp cookie mới. Không tick thì cookie phiên, token tự hết hạn sau 12 giờ.
- **Máy gọi:** `Authorization: Bearer <token>`. Mỗi user tạo token trong Settings, token hiện 1 lần, DB giữ hash + prefix, thu hồi được. Activity ghi tên dạng `Tên (API: tên token)`.
- **Chống CSRF:** request ghi dữ liệu bằng cookie mà `Origin` khác host thì trả 403.
- **Giới hạn đăng nhập sai:** 10 lần mỗi 15 phút theo IP. Lấy IP từ `X-Real-IP` do nginx gửi, không tin header người dùng tự sửa được.
- **Admin endpoint** (seed, cấp token tạm cho script import, nạp dữ liệu đồng bộ) xác thực bằng `ADMIN_TOKEN` trong `.env`.

## REST `/api/v1` (đã chạy)

| Route | Method | Việc |
|---|---|---|
| `/me` | GET | User hiện tại, role |
| `/me/password` | POST | Đổi mật khẩu, giữ loại phiên đang dùng |
| `/users` | GET | Danh sách user |
| `/spaces` | GET | Space + list mà actor được thấy |
| `/lists/{list}` | GET | Định nghĩa list: status, field |
| `/lists/{list}/tasks` | GET, POST | Lọc task (`?q=` tìm không dấu), tạo task (title, status, priority, assignees, fields) |
| `/tasks/{task}` | GET, PATCH, DELETE | Xem, sửa (đổi status, field, position), archive |
| `/tasks/{task}/subtasks` | GET, POST | Subtask |
| `/tasks/{task}/comments` | GET, POST | Comment |
| `/tasks/{task}/attachments` | GET, POST | File (tối đa 50 MB, lưu đĩa + sha256) |
| `/attachments/{id}` | GET, DELETE | Tải, xoá file |
| `/tasks/{task}/activity` | GET | Đọc bảng events của task |
| `/tasks/{task}/related` | GET | Mọi task link về task này + file của chúng (trang Khách) |
| `/search?q=` | GET | Tìm không dấu hoặc theo mã `CW-12` |
| `/dashboard` | GET | Số liệu dashboard theo quyền của actor |
| `/tokens`, `/tokens/{id}` | GET, POST, DELETE | Quản lý API token |

Ngoài v1: `/api/health` (GET), `/api/auth/login`, `/api/auth/logout`, `/api/admin/*`.

`{task}` nhận uuid, `CW-12` hoặc `12`. Status và assignee nhận key, tên hoặc email. Dropdown nhận label không phân biệt hoa thường ("Hot" lưu thành `hot`). Tiền nhận cả chuỗi `"4.200.000"`. SĐT tự bỏ khoảng trắng. Relationship truyền như 1 field, giá trị là ref task đích (`fields.client = "CW-3"`), task trả về có `links` và `backlinks`. AI gọi bằng chữ tự nhiên vẫn ra dữ liệu sạch.

## Quy ước lỗi

- 400 kèm danh sách giá trị hợp lệ: status lạ trả danh sách key status, user lạ trả danh sách user, option dropdown lạ cũng vậy. AI đọc lỗi là tự sửa được.
- 401 khi thiếu hoặc sai xác thực. 404 khi task nằm trong space actor không được thấy. 429 khi đăng nhập sai quá nhiều.
- Header chế độ import (`x-cw-import: 1`), chỉ owner dùng được: ghi activity với actor `import` và `suppressed = true`.

## Webhook ra (thiết kế)

- URL đăng ký trong `webhook_subscriptions`, lọc theo loại event và list.
- Body là event + bản gọn của task. Header chữ ký HMAC-SHA256 bằng `secret` của subscription (ví dụ gốc đặt tên `X-CW-Signature`).
- Retry 6 lần theo lịch `next_attempt_at`, quá thì trạng thái `dead`. Unique (subscription, event) chống gửi trùng.

## Inbound (thiết kế)

- `/api/inbound/<nguồn>` nhận đúng format payload luồng cũ đang gửi (vd relay chatbot đang POST vào Apps Script), để bên gửi chỉ đổi URL và token. Response giữ đúng các field bên gửi đang đọc.
- Mọi request ghi `inbound_log`. Dedupe theo id ngoài: gửi lại cùng payload 2 lần không tạo thêm task.
- Lead vào thì dò SĐT, UID, email trong list Khách để nhận khách cũ.

## MCP (thiết kế)

- Route `/api/mcp`, transport Streamable HTTP, stateless (`WebStandardStreamableHTTPServerTransport` của `@modelcontextprotocol/sdk` 1.3x), cùng Bearer token với REST.
- Gắn vào Claude Code:

  ```bash
  claude mcp add --transport http my-work https://<domain>/api/mcp --header "Authorization: Bearer <token>"
  ```

  Project khác dùng `.mcp.json` đọc token từ biến môi trường (`${MY_WORK_TOKEN}`), không ghi token vào file.

| Tool | Việc |
|---|---|
| `get_schema` | Space, list, status, field. AI gọi đầu tiên để biết key hợp lệ |
| `search_tasks` | Tìm theo tên không dấu, mã task, bộ lọc |
| `get_task` | Chi tiết task + link + comment gần đây |
| `create_task` | Tạo lead, deal, dự án |
| `update_task` | Sửa field, người phụ trách, hạn |
| `set_status` | Đổi stage theo key hoặc tên |
| `add_comment` | Ghi comment |
| `attach_quote` | Gắn báo giá vào deal (xem dưới) |
| `get_pipeline` | Tổng tiền theo stage, deal đang treo |
| `get_dashboard` | Số liệu như trang Dashboard |

`attach_quote` cho agent làm báo giá:

- Tìm deal theo tên hoặc SĐT, set giá trị, chuyển sang Quote sent, comment các hạng mục.
- Trả link upload sống 15 phút để agent `curl` file .docx lên.
- Trùng nhiều deal thì trả danh sách để hỏi user. Không tự tạo deal mới.

## Smoke test của ví dụ gốc (30 check)

health; seed chạy lại vẫn 200; seed sai admin token bị 401; sai mật khẩu 401; không xác thực 401; owner đăng nhập; `/me` là owner; POST cookie khác origin bị 403; tạo API token; owner thấy đủ space; tạo khách (SĐT giữ số 0); tạo deal có relationship; chuyển Quote sent + đổi giá trị; đổi status bằng tên, `completed_at` được set; thêm comment; tạo subtask; activity có event; khách thấy deal qua backlink; tìm "dat" ra "Đạt"; field lạ 400; status lạ 400; option dropdown lạ 400; member đăng nhập; member chỉ thấy space mở; member không list được pipeline (404); member không mở được deal (404); member tạo dự án link tới khách; member thấy link khách ở dạng restricted; task archive bị ẩn; token đã thu hồi bị 401.

Kiểm thêm bằng psql: bảng `events` có dòng tương ứng mỗi bước.
