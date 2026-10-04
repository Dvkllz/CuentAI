export type Invoice = {
  id: string;
  entity: string;
  category: string;
  amount: number;
  dueDate: string;
  period: string;
  issueDate: string;
  reference: string;
  notes: string;
  createdAt: string;
  paidDate?: string;
  paidAmount?: number;
  documentId?: string;
  documentHash?: string;
  receiptId?: string;
  minimumPayment?: number;
  warnings: string[];
  source: "manual" | "ai";
};
export type Attachment = {
  id: string;
  name: string;
  mime: string;
  data: string;
  hash: string;
};
export type Settings = {
  income: number | null;
  apiUrl: string;
  notifications: boolean;
};
export type AppState = {
  version: 1;
  started?: boolean;
  invoices: Invoice[];
  settings: Settings;
};
export type Extraction = {
  entity: string | null;
  category: string;
  amount: number | null;
  dueDate: string | null;
  period: string | null;
  issueDate: string | null;
  reference: string | null;
  minimumPayment: number | null;
  currency: string | null;
  warnings: string[];
  documentKind: string;
};
export type Tab = "inicio" | "calendario" | "archivo" | "analisis";
