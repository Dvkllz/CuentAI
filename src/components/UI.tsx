import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  X,
  Zap,
  Droplets,
  Flame,
  Wifi,
  Smartphone,
  CreditCard,
  GraduationCap,
  Home,
  Play,
  Receipt,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import type { Invoice } from "../types";
import { money, invoiceStatus, dateLabel } from "../domain.mjs";
const icons: Record<string, typeof Zap> = {
  Energía: Zap,
  Agua: Droplets,
  Gas: Flame,
  Internet: Wifi,
  Celular: Smartphone,
  Créditos: CreditCard,
  Educación: GraduationCap,
  Vivienda: Home,
  Suscripciones: Play,
};
export function CategoryIcon({
  category,
  small = false,
}: {
  category: string;
  small?: boolean;
}) {
  const Icon = icons[category] || Receipt;
  return (
    <span
      className={`category-icon cat-${category.toLowerCase()} ${small ? "small" : ""}`}
    >
      <Icon size={small ? 18 : 22} strokeWidth={1.8} />
    </span>
  );
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M20 8a10 10 0 1 0 0 16M18 16l4 4 7-8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        Cuent<span className="brand-ai">AI</span>
      </span>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = ref.current;
    root?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      }
      if (e.key === "Tab") {
        const list = [
          ...(root?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
          ) || []),
        ].filter((e) => e.getClientRects().length > 0);
        const first = list[0],
          last = list.at(-1);
        if (!first) {
          e.preventDefault();
          root?.focus();
        } else if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === root)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root?.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      root?.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function InvoiceRow({
  invoice,
  onClick,
}: {
  invoice: Invoice;
  onClick: () => void;
}) {
  const status = invoiceStatus(invoice);
  return (
    <button className="invoice-row" onClick={onClick}>
      <CategoryIcon category={invoice.category} />
      <span className="invoice-row-info">
        <strong>{invoice.entity}</strong>
        <small>
          {invoice.category} ·{" "}
          {invoice.paidDate
            ? `Pagada ${dateLabel(invoice.paidDate)}`
            : `Vence ${dateLabel(invoice.dueDate)}`}
        </small>
      </span>
      <span className="invoice-row-value">
        <strong>{money(invoice.amount)}</strong>
        <span className={`status ${status.tone}`}>{status.text}</span>
      </span>
      <ArrowUpRight size={17} className="row-arrow" />
    </button>
  );
}
export function Empty({
  title,
  text,
  action,
  onAction,
}: {
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Receipt size={30} strokeWidth={1.4} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action ? (
        <button className="primary-button" onClick={onAction}>
          <Plus size={17} />
          {action}
        </button>
      ) : null}
    </div>
  );
}
