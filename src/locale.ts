import { daysUntil, validDate } from "./domain.mjs";

export type Language = "es" | "en";
export type Theme = "light" | "dark";

let activeLanguage: Language = "es";

export function setActiveLanguage(language: Language) {
  activeLanguage = language;
  document.documentElement.lang = language;
}

export function language() {
  return activeLanguage;
}

export function tr(spanish: string, english: string) {
  return activeLanguage === "en" ? english : spanish;
}

export function money(value: number) {
  return new Intl.NumberFormat(activeLanguage === "en" ? "en-US" : "es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function dateLabel(iso: string) {
  return validDate(iso)
    ? new Intl.DateTimeFormat(activeLanguage === "en" ? "en-US" : "es-CO", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(new Date(`${iso}T12:00:00Z`))
    : tr("Sin fecha", "No date");
}

export function monthLabel(iso: string) {
  return new Intl.DateTimeFormat(activeLanguage === "en" ? "en-US" : "es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso.slice(0, 7)}-01T12:00:00Z`));
}

export function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    Energía: "Energy",
    Agua: "Water",
    Gas: "Gas",
    Internet: "Internet",
    Celular: "Mobile",
    Créditos: "Loans",
    Educación: "Education",
    Vivienda: "Housing",
    Suscripciones: "Subscriptions",
    Otros: "Other",
  };
  return activeLanguage === "en" ? labels[category] || category : category;
}

export function invoiceStatus(invoice: { paidDate?: string; dueDate: string }) {
  if (invoice.paidDate) return { text: tr("Pagada", "Paid"), tone: "success" };
  const days = daysUntil(invoice.dueDate);
  if (days < 0) return { text: tr("Vencida", "Overdue"), tone: "danger" };
  if (days === 0)
    return { text: tr("Vence hoy", "Due today"), tone: "warning" };
  if (days === 1)
    return { text: tr("Vence mañana", "Due tomorrow"), tone: "warning" };
  if (days <= 3)
    return {
      text: tr(`En ${days} días`, `In ${days} days`),
      tone: "warning",
    };
  return { text: dateLabel(invoice.dueDate), tone: "neutral" };
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );
  meta?.setAttribute("content", theme === "dark" ? "#0b1020" : "#f5f6f8");
}
