import test from "node:test";
import assert from "node:assert/strict";
import {
  addMonths,
  addDays,
  validDate,
  daysUntil,
  overview,
  projection,
  variations,
  calendarICS,
} from "../src/domain.mjs";
const record = (id, date, amount, extra = {}) => ({
  id,
  entity: "Energía",
  category: "Energía",
  amount,
  dueDate: date,
  period: date.slice(0, 7),
  reference: "",
  ...extra,
});
test("dates handle invalid days, year rollover and leap years", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-12-31", 1), "2027-01-31");
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(daysUntil("2026-10-05", "2026-10-04"), 1);
});
test("totals separate payment date, due month and overdue balance", () => {
  const invoices = [
    record("a", "2026-09-20", 100),
    record("b", "2026-10-12", 200),
    record("c", "2026-09-22", 300, { paidDate: "2026-10-02", paidAmount: 280 }),
    record("d", "2026-10-15", 50, { paidDate: "2026-09-30", paidAmount: 50 }),
  ];
  const result = overview(invoices, "2026-10", "2026-10-04");
  assert.equal(result.pending, 200);
  assert.equal(result.paid, 280);
  assert.equal(result.overdue, 100);
  assert.equal(result.next.length, 2);
});
test("prediction needs three regular periods and uses median without counting an existing future bill twice", () => {
  const history = [
    record("a", "2026-07-12", 100),
    record("b", "2026-08-12", 120),
    record("c", "2026-09-12", 500),
  ].map((i) => ({ ...i, paidDate: i.dueDate }));
  assert.equal(projection(history.slice(1), "2026-10-04").estimated.length, 0);
  const first = projection(history, "2026-10-04");
  assert.equal(first.estimatedTotal, 120);
  assert.equal(first.estimated[0].from, "2026-10-09");
  const confirmed = projection(
    [...history, record("d", "2026-10-12", 145)],
    "2026-10-04",
  );
  assert.equal(confirmed.confirmedTotal, 145);
  assert.equal(confirmed.estimatedTotal, 0);
  assert.equal(
    projection(
      [
        record("a", "2026-07-02", 100),
        record("b", "2026-08-22", 100),
        record("c", "2026-09-12", 100),
      ],
      "2026-10-04",
    ).estimated.length,
    0,
  );
});
test("comparison avoids division by zero and uses prior period", () => {
  assert.equal(
    variations([record("a", "2026-09-12", 0), record("b", "2026-10-12", 100)])
      .length,
    0,
  );
  assert.equal(
    variations([
      record("a", "2026-09-12", 100),
      record("b", "2026-10-12", 125),
    ])[0].change,
    25,
  );
});
test("calendar exports unpaid obligations with escaped text and alarms", () => {
  const text = calendarICS([
    record("a", "2026-10-12", 100, { entity: "Empresa, S.A.; prueba" }),
    record("b", "2026-10-15", 50, { paidDate: "2026-10-01" }),
  ]);
  assert.match(text, /DTSTART;VALUE=DATE:20261012/);
  assert.match(text, /DTEND;VALUE=DATE:20261013/);
  assert.match(text, /Empresa\\, S.A.\\; prueba/);
  assert.equal((text.match(/BEGIN:VEVENT/g) || []).length, 1);
  assert.equal((text.match(/BEGIN:VALARM/g) || []).length, 4);
});
