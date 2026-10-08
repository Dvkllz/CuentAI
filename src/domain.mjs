export const CATEGORIES = [
  "Energía",
  "Agua",
  "Gas",
  "Internet",
  "Celular",
  "Créditos",
  "Educación",
  "Vivienda",
  "Suscripciones",
  "Otros",
];
export const money = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
export const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
  );
}
export const dayNumber = (iso) =>
  Math.floor(Date.parse(`${iso}T12:00:00Z`) / 86400000);
export const daysUntil = (date, today = todayISO()) =>
  dayNumber(date) - dayNumber(today);
export function addDays(iso, n) {
  return new Date((dayNumber(iso) + n) * 86400000).toISOString().slice(0, 10);
}
export function addMonths(iso, n) {
  const [y, m, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, 1));
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
}
export const dateLabel = (iso) =>
  validDate(iso)
    ? new Intl.DateTimeFormat("es-CO", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${iso}T12:00:00Z`))
    : "Sin fecha";
export const monthLabel = (iso) =>
  new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 7)}-01T12:00:00Z`));
export const groupKey = (invoice) =>
  `${invoice.entity
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()}|${invoice.category}`;
function groupInvoices(invoices) {
  const groups = new Map();
  for (const invoice of invoices) {
    const key = groupKey(invoice);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(invoice);
  }
  return groups;
}
export function invoiceStatus(invoice, today = todayISO()) {
  if (invoice.paidDate) return { text: "Pagada", tone: "success" };
  const days = daysUntil(invoice.dueDate, today);
  if (days < 0) return { text: "Vencida", tone: "danger" };
  if (days === 0) return { text: "Vence hoy", tone: "warning" };
  if (days === 1) return { text: "Vence mañana", tone: "warning" };
  if (days <= 3) return { text: `En ${days} días`, tone: "warning" };
  return { text: dateLabel(invoice.dueDate), tone: "neutral" };
}
export function overview(invoices, month, today = todayISO()) {
  const inMonth = invoices.filter((i) => i.dueDate.startsWith(month));
  return {
    pending: inMonth
      .filter((i) => !i.paidDate)
      .reduce((s, i) => s + i.amount, 0),
    paid: invoices
      .filter((i) => i.paidDate?.startsWith(month))
      .reduce((s, i) => s + (i.paidAmount ?? i.amount), 0),
    overdue: invoices
      .filter((i) => !i.paidDate && i.dueDate < today)
      .reduce((s, i) => s + i.amount, 0),
    pendingCount: inMonth.filter((i) => !i.paidDate).length,
    next: invoices
      .filter((i) => !i.paidDate)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
  };
}
export function variations(invoices) {
  const groups = groupInvoices(invoices);
  return [...groups.values()].flatMap((group) => {
    const sorted = [...group].sort((a, b) =>
      b.dueDate.localeCompare(a.dueDate),
    );
    if (sorted.length < 2 || sorted[1].amount <= 0) return [];
    const change =
      ((sorted[0].amount - sorted[1].amount) / sorted[1].amount) * 100;
    return Math.abs(change) >= 10
      ? [{ current: sorted[0], previous: sorted[1], change }]
      : [];
  });
}
export function predictions(invoices, today = todayISO()) {
  const groups = groupInvoices(invoices);
  return [...groups.values()].flatMap((group) => {
    const sorted = [...group].sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate),
    );
    if (sorted.length < 3) return [];
    const recent = sorted.slice(-3);
    const gaps = [
      daysUntil(recent[1].dueDate, recent[0].dueDate),
      daysUntil(recent[2].dueDate, recent[1].dueDate),
    ];
    if (gaps.some((g) => g < 25 || g > 35)) return [];
    const last = recent[2];
    const date = addMonths(last.dueDate, 1);
    if (date < today || date > addDays(today, 30)) return [];
    const values = recent.map((i) => i.amount).sort((a, b) => a - b);
    return [
      {
        entity: last.entity,
        category: last.category,
        amount: values[1],
        date,
        from: addDays(date, -3),
        to: addDays(date, 3),
        samples: recent.length,
      },
    ];
  });
}
export function projection(invoices, today = todayISO()) {
  const end = addDays(today, 30);
  const confirmed = invoices.filter(
    (i) => !i.paidDate && i.dueDate >= today && i.dueDate <= end,
  );
  const estimated = predictions(invoices, today);
  return {
    confirmed,
    estimated,
    confirmedTotal: confirmed.reduce((s, i) => s + i.amount, 0),
    estimatedTotal: estimated.reduce((s, i) => s + i.amount, 0),
  };
}
export function calendarICS(invoices, locale = "es") {
  const english = locale === "en";
  const escape = (text) =>
    text
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//CuentAI//${english ? "Payments//EN" : "Pagos//ES"}`,
    "CALSCALE:GREGORIAN",
  ];
  for (const i of invoices.filter((i) => !i.paidDate)) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${i.id}@cuentai.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${i.dueDate.replaceAll("-", "")}`,
      `DTEND;VALUE=DATE:${addDays(i.dueDate, 1).replaceAll("-", "")}`,
      `SUMMARY:${escape(`${english ? "Pay" : "Pagar"} ${i.entity}`)}`,
      `DESCRIPTION:${escape(`${money(i.amount)} COP. ${i.category}. ${english ? "Reference" : "Referencia"}: ${i.reference || (english ? "no reference" : "sin referencia")}.`)}`,
    );
    for (const days of [7, 3, 1, 0])
      lines.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escape(`${english ? "Payment to" : "Pago de"} ${i.entity}`)}`,
        `TRIGGER:-P${days}D`,
        "END:VALARM",
      );
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines
    .map((line) => {
      const chunks = [];
      let chunk = "";
      for (const char of line) {
        if (new TextEncoder().encode(chunk + char).length > 73) {
          chunks.push(chunk);
          chunk = " " + char;
        } else chunk += char;
      }
      chunks.push(chunk);
      return chunks.join("\r\n");
    })
    .join("\r\n");
}
