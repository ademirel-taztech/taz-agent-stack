// Minimal login app the runner's self-test drives with the shipped example scenario set
// (templates/taa/test-scenarios/example). It implements exactly the contract those scenarios
// describe: /login form, POST /api/auth/login (200 / 400 / 401), /panel after login.
// Credentials come from TEST_USER_EMAIL / TEST_USER_PASSWORD, which selftest/run.mjs generates
// per run — nothing is hard-coded. SELFTEST_BUG injects one known defect so the self-test can
// prove the runner catches it: message (wrong 401 copy), leak (token in the 401 body),
// a11y (password field loses its label).
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("TEST_USER_EMAIL / TEST_USER_PASSWORD must be set");
const BUG = process.env.SELFTEST_BUG ?? "";
const WRONG_CREDENTIALS_COPY =
  BUG === "message" ? "Bir sorun oluştu." : "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
const sessions = new Set();

const page = (title, body) => `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} | Taz Muhasebe</title>
<style>
  :root { --bg: Canvas; --fg: CanvasText; --accent: LinkText; --danger: Mark; --space: 1rem; }
  body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--fg); margin: 0; }
  main { max-width: 28rem; margin: 4rem auto; padding: var(--space); }
  label { display: block; margin-top: var(--space); font-weight: 600; }
  input { display: block; width: 100%; padding: .5rem; font-size: 1rem; box-sizing: border-box; }
  input:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  button { margin-top: calc(var(--space) * 1.5); padding: .6rem 1.2rem; font-size: 1rem; }
  [role="alert"]:not(:empty) { margin-top: var(--space); padding: .75rem; border: 2px solid currentColor; background: var(--danger); }
</style></head>
<body>${body}</body></html>`;

const loginPage = page("Giriş", `
<main>
  <h1>Hesabınıza giriş yapın</h1>
  <form id="f" novalidate>
    <label for="email">E-posta</label>
    <input id="email" name="email" type="email" autocomplete="username" required>
    ${BUG === "a11y" ? "<span>Şifre</span>" : '<label for="password">Şifre</label>'}
    <input id="password" name="password" type="password" autocomplete="current-password" required>
    <button type="submit">Giriş yap</button>
    <div id="err" role="alert"></div>
  </form>
</main>
<script>
  document.getElementById("f").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err");
    err.textContent = "";
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: e.target.email.value, password: e.target.password.value }),
    });
    if (res.ok) { location.href = "/panel"; return; }
    err.textContent = res.status === 401
      ? ${JSON.stringify(WRONG_CREDENTIALS_COPY)}
      : "Lütfen e-posta ve şifre alanlarını doldurun.";
  });
</script>`);

const panelPage = page("Genel Bakış", `
<main>
  <h1>Genel Bakış</h1>
  <p>Hoş geldiniz. Bu ay 14 fatura kesildi, 3 tahsilat bekliyor.</p>
  <nav aria-label="Ana menü"><a href="/login">Çıkış yap</a></nav>
</main>`);

const send = (res, status, type, body, headers = {}) => {
  res.writeHead(status, { "content-type": type, ...headers });
  res.end(body);
};
const json = (res, status, obj, headers) => send(res, status, "application/json; charset=utf-8", JSON.stringify(obj), headers);

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/favicon.ico") return send(res, 204, "image/x-icon", "");
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/login"))
    return send(res, 200, "text/html; charset=utf-8", loginPage);
  if (req.method === "GET" && url.pathname === "/panel") {
    const sid = /(?:^|; )sid=([a-f0-9]+)/.exec(req.headers.cookie ?? "")?.[1];
    if (!sid || !sessions.has(sid)) return send(res, 302, "text/plain", "", { location: "/login" });
    return send(res, 200, "text/html; charset=utf-8", panelPage);
  }
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch { return json(res, 400, { errors: { body: ["Geçersiz JSON"] } }); }
      const errors = {};
      if (!body.email) errors.email = ["E-posta zorunludur."];
      if (!body.password) errors.password = ["Şifre zorunludur."];
      if (Object.keys(errors).length) return json(res, 400, { title: "Doğrulama hatası", errors });
      if (body.email !== EMAIL || body.password !== PASSWORD)
        return json(res, 401, BUG === "leak"
          ? { title: "E-posta veya şifre hatalı", accessToken: randomBytes(12).toString("hex") }
          : { title: "E-posta veya şifre hatalı" });
      const sid = randomBytes(16).toString("hex");
      sessions.add(sid);
      return json(res, 200, { user: { displayName: "Elif Kaya", role: "Muhasebe Uzmanı" } },
        { "set-cookie": `sid=${sid}; HttpOnly; SameSite=Lax; Path=/` });
    });
    return;
  }
  send(res, 404, "text/plain; charset=utf-8", "Bulunamadı");
});

server.listen(Number(process.env.PORT ?? 0), "127.0.0.1", () => {
  process.stdout.write(`listening ${server.address().port}\n`);
});
