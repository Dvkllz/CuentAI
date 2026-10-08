import type { Invoice } from "./types";
export const CATEGORIES: string[];
export const money: (value: number) => string;
export const todayISO: () => string;
export const validDate: (value: unknown) => boolean;
export const dayNumber: (iso: string) => number;
export const daysUntil: (date: string, today?: string) => number;
export const addDays: (iso: string, n: number) => string;
export const addMonths: (iso: string, n: number) => string;
export const dateLabel: (iso: string) => string;
export const monthLabel: (iso: string) => string;
export const groupKey: (invoice: Invoice) => string;
export const invoiceStatus: (
  invoice: Invoice,
  today?: string,
) => { text: string; tone: string };
export const overview: (
  invoices: Invoice[],
  month: string,
  today?: string,
) => {
  pending: number;
  paid: number;
  overdue: number;
  pendingCount: number;
  next: Invoice[];
};
export type Prediction = {
  entity: string;
  category: string;
  amount: number;
  date: string;
  from: string;
  to: string;
  samples: number;
};
export const predictions: (invoices: Invoice[], today?: string) => Prediction[];
export const projection: (
  invoices: Invoice[],
  today?: string,
) => {
  confirmed: Invoice[];
  estimated: Prediction[];
  confirmedTotal: number;
  estimatedTotal: number;
};
export const variations: (
  invoices: Invoice[],
) => { current: Invoice; previous: Invoice; change: number }[];
export const calendarICS: (
  invoices: Invoice[],
  locale?: "es" | "en",
) => string;
