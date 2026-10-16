# Data model tổng quát

Schema Drizzle của ví dụ gốc có 20 bảng. Tổng quát hoá dưới đây dùng được cho mọi app kiểu "task + custom field" (ClickUp, Notion database, HubSpot pipeline, Trello).

## Bảng

| Nhóm | Bảng | Cột chính | Vì sao |
|---|---|---|---|
| Người | `users` | email, name, color, password_hash, role (owner/member), session_version, disabled_at | Tăng `session_version` là đăng xuất mọi phiên của user |
| | `api_tokens` | user_id, name, token_hash, prefix, last_used_at, revoked_at | Token chỉ hiện 1 lần, DB chỉ giữ hash + prefix để nhận diện |
| Cấu trúc | `spaces` | key, name, color, position, restricted | `restricted = true`: chỉ owner và thành viên được thêm mới thấy |
| | `space_members` | space_id, user_id | Cấp quyền từng người vào space bị khoá |
| | `lists` | space_id, key, name, position | Mỗi list có status và field riêng |
| | `statuses` | list_id, key, name, color, group, position | `group` = not_started / active / done / closed |
| | `fields` | list_id, key, name, type, config (jsonb), position, hidden | Định nghĩa custom field. `config.options` cho dropdown, `config.targetList` cho relationship |
| Task | `tasks` | number (identity), list_id, parent_id, title, description, status_id, priority, start_at, due_at, completed_at, archived_at, fields (jsonb), position (double) | Giá trị custom field nằm trong 1 cột jsonb, có index GIN |
| | `task_assignees` | task_id, user_id | Nhiều người 1 task |
| | `task_links` | from_task, to_task, kind | Relationship. `kind` = key của field (vd `client`, `source_deal`) |
| | `comments` | task_id, user_id, author_label, body | `author_label` để comment của API, automation vẫn có tên |
| | `attachments` | task_id, filename, mime, size, storage_path, sha256, uploaded_by | File lưu trên đĩa, DB giữ đường dẫn + checksum |
| Mẫu | `task_templates` | key, list_id, payload (title, status, fields, subtasks) | Tạo dự án kèm subtask mẫu |
| Engine | `events` | type, task_id, list_id, actor_kind, actor_id, actor_label, payload, depth, caused_by_run_id, suppressed, processed_at, locked_until, attempts | Activity log + outbox. Index riêng cho dòng chưa xử lý |
| | `automations` | list_id, name, enabled, trigger, conditions, actions (jsonb) | Rule dạng dữ liệu, sửa được bằng form |
| | `automation_runs` | automation_id, event_id, task_id, dedupe_key (unique), status, steps, error | Log từng lần chạy, `dedupe_key` chống chạy trùng |
| Webhook | `webhook_subscriptions` | name, url, secret, events[], list_id, enabled | URL ngoài đăng ký nhận event |
| | `webhook_deliveries` | subscription_id, event_id, status, attempts, next_attempt_at, last_code, last_error | Unique (subscription_id, event_id), retry có lịch |
| Inbound | `inbound_log` | source, external_id, status, payload, error | Log mọi request vào từ form, chatbot |
| | bảng dữ liệu đồng bộ (vd `chat_contacts`) | uid, task_id, các cột thô từ nguồn | Dữ liệu sync định kỳ để bảng riêng, không bắn event mỗi lần sync |

## Quy ước

- **Mã task dễ đọc:** cột `number` identity, hiện ra là `CW-12`. API nhận cả uuid lẫn `CW-12` hay `12`.
- **Status group quyết định "xong":** sang status nhóm done hoặc closed thì set `completed_at`. Dashboard, trễ hạn, rollup đều đọc theo group, không đọc theo tên status.
- **Field jsonb:** `tasks.fields` lưu `{ key: value }`. Lớp domain validate theo bảng `fields`: field lạ, option dropdown lạ, status lạ đều trả 400 kèm danh sách giá trị hợp lệ.
- **Tiền lưu số nguyên** (đồng). Giá dạng khoảng dùng 2 field `value` + `value_max`.
- **SĐT và UID lưu text.** SĐT giữ số 0 đầu, UID 19 số không bị làm tròn.
- **Thứ tự kéo thả:** `position` kiểu double, chèn giữa 2 card thì lấy trung bình.

## Relationship + Rollup

- Field type `relationship` có `config.targetList`. Ghi link thì lớp domain kiểm task đích nằm đúng list đó, sai trả 400.
- Link lưu ở `task_links` với `kind` = key field. Trang Khách đọc ngược: mọi task có link `to_task` = khách.
- Rollup tính lúc đọc, không lưu: số deal, số dự án, tổng đã chốt (deal nhóm done), tổng đang mở.
- Member thấy link tới task trong space bị khoá thì chỉ nhận `restricted: true`, không có tên hay giá.

## Quyền

- Owner và actor hệ thống (automation, import, inbound) thấy hết.
- Member thấy space không khoá + space được thêm vào `space_members`.
- Task trong space không được thấy trả 404, không trả 403, để không lộ là task có tồn tại.

## Tìm không dấu (Postgres)

```sql
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- unaccent() không IMMUTABLE nên bọc lại mới đánh index được
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
CREATE INDEX IF NOT EXISTS tasks_search_idx
  ON tasks USING gin (f_unaccent(lower(title)) gin_trgm_ops);
```

Query: `f_unaccent(lower(title)) like f_unaccent(:q)`, sắp theo `similarity(...)`. Nhớ escape `%`, `_`, `\` trong chuỗi người dùng gõ.

## Ghi dữ liệu

```ts
// lib/domain/events.ts
export type WriteCtx = {
  actor: Actor;            // kind: user | api | automation | import | inbound | system
  depth?: number;          // automation gây ra thay đổi thì +1, chặn ở 3
  causedByRunId?: string;
  suppressed?: boolean;    // import: có activity, không chạy automation/webhook
};

export async function emit(tx: Tx, ctx: WriteCtx, e: { type: EventType; taskId: string; listId: string; payload: Record<string, unknown> }) {
  await tx.insert(schema.events).values({ ...e, actorKind: ctx.actor.kind, actorId: ctx.actor.userId, actorLabel: ctx.actor.label, depth: ctx.depth ?? 0, causedByRunId: ctx.causedByRunId ?? null, suppressed: ctx.suppressed ?? false });
}
```

Event type của ví dụ: `task.created`, `task.updated`, `task.status_changed`, `task.archived`, `comment.created`, `attachment.added`. Payload kèm bản gọn của task để automation và webhook đọc khỏi query lại.
