import test from "node:test";
import assert from "node:assert/strict";
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
  assert.equal(request.input[0].content[0].text, "Read this bill for human review.");
});
test("local API denies foreign origins, malformed uploads and invalid assistant records", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(url + "/api/health");
    assert.equal(health.status, 200);
    assert.equal((await health.json()).version, "0.1.0");
    const forbidden = await fetch(url + "/api/health", {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(forbidden.status, 403);
    const upload = await fetch(url + "/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mime: "text/html" }),
    });
    assert.equal(upload.status, 400);
    const query = await fetch(url + "/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "?", invoices: [{ amount: -10 }] }),
    });
    assert.equal(query.status, 400);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
