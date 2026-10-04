import { addMonths, todayISO } from "./domain.mjs";
import type { Invoice } from "./types";
export function demoInvoices(): Invoice[] {
  const today = todayISO();
  const month = today.slice(0, 7);
  const invoice = (
    entity: string,
    category: string,
    amount: number,
    date: string,
    paid = false,
  ): Invoice => ({
    id: `demo-${entity}-${date}`,
    entity,
    category,
    amount,
    dueDate: date,
    period: date.slice(0, 7),
    issueDate: `${date.slice(0, 7)}-01`,
    reference: "4829 0062",
    notes: "",
    createdAt: date,
    warnings: [],
    source: "manual",
    ...(paid ? { paidDate: date, paidAmount: amount } : {}),
  });
  return [
    invoice("CEDENAR", "Energía", 184520, `${month}-12`),
    invoice("Claro hogar", "Internet", 89900, `${month}-16`),
    invoice("Bancolombia Visa", "Créditos", 420000, `${month}-22`),
    invoice("Netflix", "Suscripciones", 44900, `${month}-26`),
    invoice("Acueducto", "Agua", 68000, `${month}-02`, true),
    ...[1, 2, 3].flatMap((n) => {
      const m = addMonths(`${month}-12`, -n);
      return [
        invoice("CEDENAR", "Energía", [151000, 142000, 131000][n - 1], m, true),
        invoice("Claro hogar", "Internet", 89900, `${m.slice(0, 7)}-16`, true),
      ];
    }),
  ];
}
