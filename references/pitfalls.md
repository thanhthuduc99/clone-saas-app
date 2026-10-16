# Bẫy đã gặp

Gom từ lần làm ví dụ gốc. Đọc trước M2 và trước deploy.

## Hỏi user

- [ ] Ngôn ngữ giao diện hỏi trước mockup. Ví dụ gốc phải sửa lại toàn bộ chữ sang tiếng Anh sau khi xem mockup, chỉ dữ liệu khách giữ tiếng Việt.
- [ ] Hỏi cột nào thu gọn mặc định, field nào ẩn. Ví dụ gốc: cột Lost bị thu gọn sẵn, user muốn hiện ra, bấm mới thu gọn.
- [ ] Người trùng tên giữa các nguồn (khách đồng thời là cộng tác viên) phải hỏi, không tự gộp hay tách.
- [ ] Bỏ 1 field khỏi giao diện chưa chắc là bỏ luôn logic phía sau. Hỏi lại: user bỏ hiện điểm chấm lead nhưng vẫn muốn chấm ngầm để ra mức Hot/Warm/Cold.

## Mockup

- [ ] Ngày hiện `dd/mm`, không phải `mm-dd`.
- [ ] Ghi chú "số tự điền" không được đè lên nội dung. Chụp 2 kích thước rồi mở ảnh ra xem.

## Next 16

- [ ] Middleware đổi tên thành `proxy.ts`, chạy trên Node nên dùng `node:crypto` được. Đọc `node_modules/next/dist/docs/` trước khi viết.
- [ ] `matcher` của proxy phải chừa `api/`, trang login, file tĩnh. Regex lọc đuôi file tĩnh dễ sai, test lại sau khi sửa.
- [ ] `useEffect` không được trả Promise (gọi hàm async bên trong). Trả Promise làm panel kẹt "Loading..." trên Chrome mới.
- [ ] dnd-kit báo hydration mismatch ở `aria-describedby`: đặt `id` cố định cho `DndContext` (vd `board-${list.key}`).
- [ ] pnpm không cho import package bắc cầu chưa khai báo (vd `@dnd-kit/utilities`). Viết tay vài dòng thay vì cài thêm package.
- [ ] Đổi `.env` thì phải khởi động lại dev server.

## UI

- [ ] Ô tìm kiếm hiện "No results" khi request còn đang chạy. Thêm trạng thái "Searching...".
- [ ] Hàm viết thường tự động làm hỏng chữ viết tắt ("Add ai summary"). Kiểm placeholder sinh tự động.

## Playwright

- [ ] `dragTo` mặc định chỉ bắn 1 lần mouse move, dnd-kit không tính là kéo. Kéo theo nhiều bước (`mouse.move` có `steps`).
- [ ] Panel chưa load xong thì nút upload chưa có. Chờ nút xuất hiện rồi set file thẳng vào input.
- [ ] Trình duyệt tự động tắt trình quản lý mật khẩu, nên "lưu mật khẩu" và tự đăng nhập bằng Credential Management API không test được. Báo user tự thử trên Chrome thật. API này chỉ chạy trên Chrome và Edge, TypeScript không có sẵn type `PasswordCredential`.
- [ ] Member mở trang bị khoá vẫn có thể trả 200 (trang not-found). Kiểm nội dung trang có lộ dữ liệu không.

## Import

- [ ] SĐT: bỏ ký tự lạ, 9 số thì thêm 0 đầu, `84xxxxxxxxx` đổi về `0xxxxxxxxx`, ít hơn 9 số là rác. Lưu text.
- [ ] UID dài (19 số) lưu text. Đọc qua JSON number là bị làm tròn.
- [ ] Ngày `dd/mm/yyyy hh:mm` theo giờ địa phương, đổi sang ISO có múi giờ (`+07:00`).
- [ ] So trùng tên: bỏ dấu, `đ` thành `d`, bỏ danh xưng đầu tên (anh, chị, em...), gộp khoảng trắng.
- [ ] Dòng test: tên chứa "test", email nội bộ, số điện thoại của chính user, dòng trống. Mỗi dòng bỏ phải có lý do trong plan.
- [ ] Import đi qua API ở chế độ import (`suppressed`), không ghi thẳng DB, không chạy automation, không nhắn Telegram.
- [ ] Script đọc file mật khẩu ban đầu trước khi seed tạo ra file đó: chạy seed trước.
- [ ] Token Google OAuth ở chế độ Testing hết hạn sau 7 ngày. Hết thì authorize lại hoặc tải CSV tay.
- [ ] File seed có tên khách thật: commit local được, push public thì bỏ ra hoặc để repo private.

## Ghi file từ shell

- [ ] Heredoc bash, `sed` làm hỏng backslash và regex (từng chèn newline thật vào regex của script import). File có regex hay đường dẫn Windows thì dùng tool Edit.
- [ ] Trước khi append vào `.env` dùng chung: kiểm encoding (UTF-16 hay UTF-8) và byte NUL, chỉ in số đếm, không in giá trị.
- [ ] Đường dẫn file tạm lệch giữa bash và Python trên Windows. Dùng thư mục scratchpad.

## Docker, deploy

- [ ] `pnpm install` trong Docker hay fail khi mạng yếu: `--network-concurrency=4 --fetch-retries=5`.
- [ ] Build ở máy dev, `docker save | ssh docker load`. VPS ít disk thì không build trên đó.
- [ ] Chạy image ở local với DB rỗng trước khi đẩy, chắc migration tự chạy lúc khởi động.
- [ ] Vòng chờ health trong script có `set -e` thoát sớm khi `curl` lỗi lúc app còn đang khởi động. Thêm `|| true`.
- [ ] `.gitattributes` ép LF cho `*.sh` và `Dockerfile`. Git trên Windows đổi sang CRLF là bash báo `$'\r'`.
- [ ] Kiểm disk VPS trước khi đẩy image. Không xoá gì trên VPS khi chưa hỏi.
- [ ] Đóng SSH tunnel đã mở cho lệnh admin: tìm đúng process có `-L <port>` rồi mới kill.

## Cổng `auth_basic`

- [ ] User tưởng popup basic auth là màn đăng nhập app nên gõ email app vào. Khi gửi link phải nói rõ popup là lớp ngoài, user/pass riêng.
- [ ] Pass cổng phải lưu vào `.env` (vd `BASIC_AUTH_PASS__<APP>`). Ví dụ gốc từng bảo user "dùng pass giống site khác" trong khi pass đó không lưu ở đâu.
- [ ] IP nhà đổi thì popup quay lại. Thêm dòng `allow` mới hoặc dùng user/pass cổng.
- [ ] Đọc log nginx để biết user có chạm popup không, trước khi đoán nguyên nhân.
- [ ] Domain chính bị Google Safe Browsing gắn cờ thì subdomain cũng có thể hiện cảnh báo đỏ. Kiểm Safe Browsing sau deploy, báo user nếu có cờ.
