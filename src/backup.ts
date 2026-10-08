import { z } from "zod";
import { CATEGORIES, validDate } from "./domain.mjs";
import type { AppState, Attachment } from "./types";
const date = z.string().refine(validDate);
const invoice = z.object({
  id: z.string().min(1).max(100),
  entity: z.string().trim().min(1).max(160),
  category: z.enum(CATEGORIES),
  amount: z.number().positive().max(1e12),
  dueDate: date,
  period: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .refine((value) => validDate(`${value}-01`)),
  issueDate: z.union([date, z.literal("")]),
  reference: z.string().max(160),
  notes: z.string().max(1000),
  createdAt: z.string().max(40),
  paidDate: date.optional(),
  paidAmount: z.number().nonnegative().max(1e12).optional(),
  documentId: z.string().max(100).optional(),
  documentHash: z.string().max(64).optional(),
  receiptId: z.string().max(100).optional(),
  minimumPayment: z.number().nonnegative().optional(),
  warnings: z.array(z.string().max(1000)).max(30),
  source: z.enum(["manual", "ai"]),
});
const attachment = z
  .object({
    id: z.string().min(1).max(100),
    name: z.string().max(512),
    mime: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
    hash: z.string().max(64),
    data: z.string().max(17_000_000),
  })
  .refine(
    (a) =>
      a.data.startsWith(`data:${a.mime};base64,`) &&
      /^[A-Za-z0-9+/]+={0,2}$/.test(a.data.split(",")[1] || ""),
  );
const schema = z.object({
  version: z.literal(1),
  invoices: z.array(invoice).max(500),
  settings: z.object({
    income: z.number().nonnegative().max(1e12).nullable(),
    apiUrl: z.string().max(250),
    notifications: z.boolean(),
    language: z.enum(["es", "en"]).optional().default("es"),
    theme: z.enum(["light", "dark"]).optional().default("light"),
  }),
  attachments: z.array(attachment).max(1000),
});
export function parseBackup(input: unknown): {
  state: AppState;
  attachments: Attachment[];
} {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new Error("El archivo no es un respaldo válido de CuentAI.");
  const value = parsed.data;
  if (
    new Set(value.invoices.map((i) => i.id)).size !== value.invoices.length ||
    new Set(value.attachments.map((a) => a.id)).size !==
      value.attachments.length
  )
    throw new Error("El respaldo contiene registros duplicados.");
  const ids = new Set(value.attachments.map((a) => a.id));
  if (
    value.invoices.some(
      (i) =>
        (i.documentId && !ids.has(i.documentId)) ||
        (i.receiptId && !ids.has(i.receiptId)),
    )
  )
    throw new Error("Faltan documentos en el respaldo.");
  return {
    state: {
      version: 1,
      invoices: value.invoices,
      settings: { ...value.settings, apiUrl: "", notifications: false },
    },
    attachments: value.attachments,
  };
}
