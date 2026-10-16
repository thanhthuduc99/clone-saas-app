// Smoke test API chạy thật trên server đang mở. Chỉ in PASS/FAIL, không in mật khẩu hay token.
// Dùng: node scripts/smoke-api.mjs [base_url]   (server phải đang chạy)
// Sửa: email user, key list/status/field theo seed của app.

try {
  process.loadEnvFile(".env");
} catch {}
const BASE = process.argv[2] ?? process.env.APP_URL ?? "http://localhost:3000";
const OWNER = process.env.SMOKE_OWNER_EMAIL;
const OWNER_PASS = process.env.SMOKE_OWNER_PASS;

let failed = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !extra ? "" : `  -> ${extra}`}`);
  if (!ok) failed++;
};

async function call(method, path, { body, token, cookie, origin } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data, setCookie: res.headers.get("set-cookie") };
}

async function login(email, password) {
  const r = await call("POST", "/api/auth/login", { body: { email, password } });
  return { ...r, cookie: r.setCookie?.split(";")[0] };
}

// ---------------------------------------------------------------- auth

const health = await call("GET", "/api/health");
check("health", health.status === 200, health.status);

check("wrong password -> 401", (await login(OWNER, "wrong-password")).status === 401);
check("no auth -> 401", (await call("GET", "/api/v1/me")).status === 401);

const owner = await login(OWNER, OWNER_PASS);
check("owner login", owner.status === 200 && !!owner.cookie, owner.status);

const csrf = await call("POST", "/api/v1/tokens", { cookie: owner.cookie, origin: "https://evil.example", body: { name: "x" } });
check("cross-site cookie POST blocked", csrf.status === 403, csrf.status);

const tok = await call("POST", "/api/v1/tokens", { cookie: owner.cookie, origin: BASE, body: { name: "smoke" } });
const token = tok.data?.token;
check("create API token", tok.status === 201 && !!token, tok.status);

// ---------------------------------------------------------------- data

const client = await call("POST", "/api/v1/lists/clients/tasks", {
  token,
  body: { title: "Smoke Đạt", fields: { phone: "0901 234 567" } },
});
check("create client, phone normalized + keeps leading 0", client.status === 201 && client.data?.fields?.phone === "0901234567", JSON.stringify(client.data));

// Relationship truyền như 1 field, giá trị là ref của task đích. Tiền nhận cả chuỗi "4.200.000".
const deal = await call("POST", "/api/v1/lists/pipeline/tasks", {
  token,
  body: { title: "Smoke deal", status: "consulting", fields: { value: "4.200.000", client: client.data?.ref } },
});
check(
  "create deal with coerced money + client link",
  deal.status === 201 && deal.data?.fields?.value === 4200000 && deal.data?.links?.client?.[0]?.id === client.data?.id,
  JSON.stringify(deal.data),
);
const ref = deal.data?.ref;

const moved = await call("PATCH", `/api/v1/tasks/${ref}`, { token, body: { status: "quote-sent", fields: { value: 7000000 } } });
check("change status + value", moved.data?.status?.key === "quote-sent" && moved.data?.fields?.value === 7000000, JSON.stringify(moved.data));

const won = await call("PATCH", `/api/v1/tasks/${ref}`, { token, body: { status: "Won" } });
check("status by name, completed_at set", won.data?.status?.key === "won" && !!won.data?.completed_at, JSON.stringify(won.data));

check("add comment", (await call("POST", `/api/v1/tasks/${ref}/comments`, { token, body: { body: "smoke" } })).status === 201);

const activity = await call("GET", `/api/v1/tasks/${ref}/activity`, { token });
const types = activity.data?.activity?.map((a) => a.type) ?? [];
check("activity has created, 2 updates, comment", types.join(",") === "task.created,task.updated,task.updated,comment.created", types.join(","));

const clientView = await call("GET", `/api/v1/tasks/${client.data?.ref}`, { token });
check("client sees deal as backlink", clientView.data?.backlinks?.client?.[0]?.id === deal.data?.id, JSON.stringify(clientView.data?.backlinks));

const search = await call("GET", "/api/v1/lists/clients/tasks?q=dat", { token });
check("search 'dat' finds 'Đạt'", search.data?.tasks?.some((t) => t.id === client.data?.id), JSON.stringify(search.data));

check("unknown field -> 400", (await call("PATCH", `/api/v1/tasks/${ref}`, { token, body: { fields: { nope: 1 } } })).status === 400);
check("unknown status -> 400", (await call("PATCH", `/api/v1/tasks/${ref}`, { token, body: { status: "nope" } })).status === 400);

// Thêm ở đây: login user member, kiểm member không thấy space bị khoá (404), thấy link khách dạng restricted.

// ---------------------------------------------------------------- cleanup

for (const t of [deal.data, client.data]) {
  if (t?.ref) await call("DELETE", `/api/v1/tasks/${t.ref}`, { token });
}
const afterArchive = await call("GET", "/api/v1/lists/pipeline/tasks?q=smoke", { token });
check("archived tasks hidden from list", afterArchive.data?.tasks?.length === 0, afterArchive.data?.tasks?.length);

const tokens = await call("GET", "/api/v1/tokens", { token });
const smokeTok = tokens.data?.tokens?.find((t) => t.name === "smoke" && !t.revoked_at);
await call("DELETE", `/api/v1/tokens/${smokeTok?.id}`, { token });
check("revoked token -> 401", (await call("GET", "/api/v1/me", { token })).status === 401);

console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
