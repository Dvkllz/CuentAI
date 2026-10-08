import test from "node:test";
import assert from "node:assert/strict";
import { parseBackup } from "../src/backup.ts";
const invoice = {
  id: "test",
  entity: "CEDENAR",
  category: "Energía",
  amount: 184520,
  dueDate: "2026-10-12",
  period: "2026-09",
  issueDate: "2026-09-30",
  reference: "4829",
  notes: "",
  createdAt: "2026-10-04T12:00:00Z",
  warnings: [],
  source: "manual",
};
const backup = () => ({
  version: 1,
  invoices: [invoice],
  settings: {
    income: 2500000,
    apiUrl: "https://old-server.example",
    notifications: true,
  },
  attachments: [],
});
test("restoring a valid backup resets external connection and permissions", () => {
  const result = parseBackup(backup());
  assert.equal(result.state.invoices[0].amount, 184520);
  assert.equal(result.state.settings.apiUrl, "");
  assert.equal(result.state.settings.notifications, false);
  assert.equal(result.state.settings.language, "es");
  assert.equal(result.state.settings.theme, "light");
});

test("restoring preserves supported language and theme preferences", () => {
  const source = backup();
  source.settings.language = "en";
  source.settings.theme = "dark";
  const result = parseBackup(source);
  assert.equal(result.state.settings.language, "en");
  assert.equal(result.state.settings.theme, "dark");
});
test("restoring rejects duplicate identities, impossible dates and missing documents", () => {
  assert.throws(() =>
    parseBackup({ ...backup(), invoices: [invoice, invoice] }),
  );
  assert.throws(() =>
    parseBackup({
      ...backup(),
      invoices: [{ ...invoice, dueDate: "2026-02-30" }],
    }),
  );
  assert.throws(() =>
    parseBackup({
      ...backup(),
      invoices: [{ ...invoice, documentId: "missing" }],
    }),
  );
});
test("restoring rejects unexpected media instead of opening arbitrary HTML", () => {
  assert.throws(() =>
    parseBackup({
      ...backup(),
      attachments: [
        {
          id: "a",
          name: "x.html",
          mime: "text/html",
          hash: "",
          data: "data:text/html;base64,PHNjcmlwdD4=",
        },
      ],
    }),
  );
});
