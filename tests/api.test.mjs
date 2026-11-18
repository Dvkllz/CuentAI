import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/index.mjs";
import {
  extractInvoice,
  normalizeExtraction,
  validateUpload,
} from "../server/extraction.mjs";
test("rejects fake media and excessive file input without calling AI", () => {
  assert.throws(() =>
    validateUpload({
      name: "test.pdf",
      mime: "application/pdf",
      data:
        "data:application/pdf;base64," +
        Buffer.from("not a PDF").toString("base64"),
    }),
  );
  assert.throws(() =>
    validateUpload({ name: "test.html", mime: "text/html", data: "anything" }),
  );
});
test("structured extraction never passes document text as system instructions", async () => {
  let request;
  const data =
    "data:application/pdf;base64," +
    Buffer.from("%PDF-1.4\nexample").toString("base64");
  const result = await extractInvoice(
    { name: "test.pdf", mime: "application/pdf", data },
    async (body) => {
      request = body;
      return JSON.stringify({
        documentKind: "invoice",
        entity: "CEDENAR",
        category: "Energía",
        amount: 184520,
        currency: "COP",
        dueDate: "2026-10-12",
        issueDate: "2026-09-30",
        period: "2026-09",
        reference: "4829",
        minimumPayment: null,
        warnings: [],
      });
    },
  );
  assert.equal(result.amount, 184520);
  assert.equal(request.input[0].content[1].file_data, data);
  assert.equal(request.text.format.strict, true);
  assert.match(request.instructions, /Nunca inventes/);
});
test("normalizes dates and warns about foreign currency", () => {
  const result = normalizeExtraction({
    warnings: [],
    amount: 100,
    currency: "USD",
    dueDate: "2026-02-30",
    issueDate: null,
    documentKind: "invoice",
  });
  assert.equal(result.dueDate, null);
  assert.equal(result.warnings.length, 2);
});

test("extraction requests warnings in the selected language", async () => {
  const data =
    "data:application/pdf;base64," +
    Buffer.from("%PDF-1.4\nexample").toString("base64");
  let request;
  await extractInvoice(
    { name: "bill.pdf", mime: "application/pdf", data, language: "en" },
    async (body) => {
      request = body;
      return JSON.stringify({
        documentKind: "invoice",
        entity: "Power Co.",
        category: "Energía",
        amount: 100,
        currency: "COP",
        dueDate: "2026-10-12",
        issueDate: null,
        period: "2026-10",
        reference: null,
        minimumPayment: null,
        warnings: [],
      });
    },
  );
  assert.match(request.instructions, /advertencias breves en inglés/);
  assert.equal(
    request.input[0].content[0].text,
    "Read this bill for human review.",
  );
});
test("local API protects accounts, AI endpoints and credentials", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cuentai-auth-"));
  const authFile = join(directory, "auth.json");
  const server = createApp({ authFile }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(url + "/api/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).version, "0.2.2");
    const forbidden = await fetch(url + "/api/health", {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(forbidden.status, 403);
    const android = await fetch(url + "/api/health", {
      headers: { Origin: "http://localhost" },
    });
    assert.equal(android.status, 200);
    const unauthorized = await fetch(url + "/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mime: "text/html" }),
    });
    assert.equal(unauthorized.status, 401);
    const registration = await fetch(url + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Cuenta Demo",
        email: "demo@example.com",
        password: "correct-horse-123",
      }),
    });
    assert.equal(registration.status, 201);
    const registered = await registration.json();
    assert.equal(registered.user.email, "demo@example.com");
    assert.ok(registered.token);
    const duplicate = await fetch(url + "/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Otra cuenta",
        email: "DEMO@example.com",
        password: "another-password",
      }),
    });
    assert.equal(duplicate.status, 409);
    const wrongLogin = await fetch(url + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@example.com",
        password: "wrong-password",
      }),
    });
    assert.equal(wrongLogin.status, 401);
    const login = await fetch(url + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "demo@example.com",
        password: "correct-horse-123",
      }),
    });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const authorizedHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
    const me = await fetch(url + "/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(me.status, 200);
    const upload = await fetch(url + "/api/extract", {
      method: "POST",
      headers: authorizedHeaders,
      body: JSON.stringify({ mime: "text/html" }),
    });
    assert.equal(upload.status, 400);
    const query = await fetch(url + "/api/assistant", {
      method: "POST",
      headers: authorizedHeaders,
      body: JSON.stringify({ question: "?", invoices: [{ amount: -10 }] }),
    });
    assert.equal(query.status, 400);
    const stored = await readFile(authFile, "utf8");
    assert.doesNotMatch(stored, /correct-horse-123/);
    assert.match(stored, /passwordHash/);
    const logout = await fetch(url + "/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 204);
    const expired = await fetch(url + "/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(expired.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  }
});
