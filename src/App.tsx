import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Home,
  CalendarDays,
  FolderClosed,
  ChartNoAxesCombined,
  Sparkles,
  Settings as SettingsIcon,
  Plus,
  Bell,
  Check,
  FileText,
  Pencil,
  Trash2,
  Download,
  Upload,
  ArrowRight,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  Send,
  ArrowUpRight,
  Languages,
  Moon,
  Sun,
} from "lucide-react";
import { Brand, CategoryIcon, Modal, InvoiceRow } from "./components/UI";
import { InvoiceForm } from "./components/InvoiceForm";
import {
  HomeScreen,
  CalendarScreen,
  ArchiveScreen,
  AnalysisScreen,
} from "./components/Screens";
import {
  loadState,
  saveState,
  emptyState,
  getAttachment,
  readFile,
  download,
  allAttachments,
} from "./storage";
import { demoInvoices } from "./demo";
import {
  calendarICS,
  groupKey,
  todayISO,
  validDate,
} from "./domain.mjs";
import {
  enableNotifications,
  syncNotifications,
  testNotification,
} from "./notifications";
import { request } from "./api";
import { parseBackup } from "./backup";
import type { AppState, Attachment, Invoice, Settings, Tab } from "./types";
import {
  applyTheme,
  categoryLabel,
  dateLabel,
  invoiceStatus,
  language as activeLanguage,
  money,
  monthLabel,
  setActiveLanguage,
  tr,
} from "./locale";
const PDFPreview = lazy(() => import("./components/PDFPreview"));
const tabs = [
  { id: "inicio", label: ["Inicio", "Home"], icon: Home },
  { id: "calendario", label: ["Calendario", "Calendar"], icon: CalendarDays },
  { id: "archivo", label: ["Archivo", "Archive"], icon: FolderClosed },
  { id: "analisis", label: ["Análisis", "Analysis"], icon: ChartNoAxesCombined },
] as const;
function SettingsModal({
  settings,
  onClose,
  onSave,
  onExport,
  onRestore,
  onCalendar,
}: {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void>;
  onExport: () => void;
  onRestore: (f: File) => Promise<void>;
  onCalendar: () => void;
}) {
  const [income, setIncome] = useState(
    settings.income === null ? "" : String(settings.income),
  );
  const [url, setUrl] = useState(settings.apiUrl);
  const [notifications, setNotifications] = useState(settings.notifications);
  const [language, setLanguage] = useState(settings.language);
  const [theme, setTheme] = useState(settings.theme);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  async function save() {
    setError("");
    const value = income === "" ? null : Number(income);
    if (
      value !== null &&
      (!Number.isFinite(value) || value < 0 || value > 1e12)
    ) {
      setError(tr("Revisa el valor de tu ingreso.", "Review your income amount."));
      return;
    }
    if (url && !/^https?:\/\/[^\s]+$/.test(url)) {
      setError(tr("Usa una dirección válida que empiece por https:// o http://.", "Use a valid address beginning with https:// or http://."));
      return;
    }
    setBusy(true);
    try {
      await onSave({
        income: value,
        apiUrl: url.trim(),
        notifications,
        language,
        theme,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("No pudimos guardar.", "We couldn't save."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={tr("A tu manera", "Your way")}
      subtitle={tr("Tu información. Tus preferencias.", "Your information. Your preferences.")}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="settings-content">
        <section className="settings-section appearance-section">
          <h3>
            <Sun size={18} /> {tr("Apariencia", "Appearance")}
          </h3>
          <div className="preference-grid">
            <label>
              <span><Languages size={16} /> {tr("Idioma", "Language")}</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "es" | "en")}
              >
                <option value="es">Español</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              <span>{theme === "dark" ? <Moon size={16} /> : <Sun size={16} />} {tr("Tema", "Theme")}</span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              >
                <option value="light">{tr("Claro", "Light")}</option>
                <option value="dark">{tr("Oscuro", "Dark")}</option>
              </select>
            </label>
          </div>
          <small>{tr("El cambio se aplicará al guardar.", "Changes apply when you save.")}</small>
        </section>
        <label>
          {tr("Ingreso mensual opcional", "Optional monthly income")}
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="1000000000000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Ej. 2500000"
          />
          <small>{tr("Solo se usa para tu proyección. Puedes dejarlo vacío.", "Only used for your projection. You can leave it blank.")}</small>
        </label>
        <section className="settings-section">
          <h3>
            <Bell size={18} /> {tr("Recordatorios", "Reminders")}
          </h3>
          {Capacitor.isNativePlatform() ? (
            <label className="toggle-row">
              <span>{tr("Avisos 7, 3 y 1 día antes, y el día límite", "Alerts 7, 3, and 1 day before, and on the due date")}</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            </label>
          ) : (
            <p>
              {tr("Exporta tus vencimientos con avisos a la aplicación de calendario que uses.", "Export due dates with alerts to your calendar app.")}
            </p>
          )}
          {Capacitor.isNativePlatform() ? (
            <>
              <small>
                {tr("Los avisos se programan para las 9:00 a. m. Android puede retrasarlos según el ahorro de batería.", "Alerts are scheduled for 9:00 a.m. Android may delay them to save battery.")}
              </small>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={async () => {
                  setError("");
                  setNotificationMessage("");
                  setBusy(true);
                  try {
                    await testNotification();
                    setNotificationMessage(
                      tr("Prueba programada. Espera unos segundos; Android puede retrasar el aviso.", "Test scheduled. Wait a few seconds; Android may delay the alert."),
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : tr("No pudimos programar la prueba.", "We couldn't schedule the test."),
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Bell size={17} /> {tr("Probar notificación", "Test notification")}
              </button>
              {notificationMessage ? (
                <p role="status">{notificationMessage}</p>
              ) : null}
            </>
          ) : null}
          <button className="secondary-button" onClick={onCalendar}>
            <CalendarDays size={17} />
            {tr("Exportar al calendario", "Export to calendar")}
          </button>
        </section>
        <section className="settings-section">
          <h3>
            <ShieldCheck size={18} /> {tr("Tus datos", "Your data")}
          </h3>
          <p>
            {tr("Los registros y archivos se guardan en este dispositivo. Crea un respaldo para conservarlos si cambias de teléfono.", "Records and files are stored on this device. Create a backup to keep them if you change phones.")}
          </p>
          <div className="settings-actions">
            <button className="secondary-button" onClick={onExport}>
              <Download size={16} />
              {tr("Crear respaldo", "Create backup")}
            </button>
            <button
              className="secondary-button"
              onClick={() => importInput.current?.click()}
              disabled={busy}
            >
              <Upload size={16} />
              {tr("Restaurar", "Restore")}
            </button>
          </div>
          <input
            hidden
            ref={importInput}
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                await onRestore(file);
                onClose();
              } catch (err) {
                setError(
                  err instanceof Error
                    ? err.message
                    : tr("No pudimos restaurar el respaldo.", "We couldn't restore the backup."),
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </section>
        <details className="extra-fields">
          <summary>{tr("Conexión al servidor de IA", "AI server connection")}</summary>
          <label>
            {tr("Dirección del servidor", "Server address")}
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tu-servidor.com"
            />
            <small>
              {tr("En este navegador puedes dejarla vacía. En Android usa la dirección de tu servidor. La clave permanece en el servidor.", "You can leave this blank in the browser. On Android, enter your server address. The key stays on the server.")}
            </small>
          </label>
        </details>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-footer">
          <span>CuentAI · {tr("versión", "version")} 0.1</span>
          <button className="primary-button" onClick={save} disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            {tr("Guardar ajustes", "Save settings")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
function PaymentModal({
  invoice,
  onClose,
  onSave,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSave: (date: string, attachment?: Attachment) => Promise<void>;
}) {
  const [date, setDate] = useState(todayISO());
  const [receipt, setReceipt] = useState<Attachment>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  async function submit() {
    if (!validDate(date) || date > todayISO()) {
      setError(tr("Elige una fecha de pago válida, hasta hoy.", "Choose a valid payment date up to today."));
      return;
    }
    setBusy(true);
    try {
      await onSave(date, receipt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : tr("No pudimos registrar el pago.", "We couldn't record the payment."),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={tr("Un pendiente menos", "One less pending bill")}
      subtitle={tr(`Registra el pago total de ${invoice.entity}.`, `Record the full payment to ${invoice.entity}.`)}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="payment-summary">
        <CategoryIcon category={invoice.category} />
        <strong>{money(invoice.amount)}</strong>
        <span>{tr("Pago total de esta factura", "Full payment for this bill")}</span>
      </div>
      <label>
        {tr("Fecha de pago", "Payment date")}
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <button
        className="attachment-button"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload size={20} />
        <span>
          {receipt ? receipt.name : tr("Añadir comprobante", "Add receipt")}
          <small>{tr("Opcional · PDF o imagen", "Optional · PDF or image")}</small>
        </span>
        {receipt ? <Check size={18} /> : <Plus size={18} />}
      </button>
      <input
        hidden
        type="file"
        ref={input}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            setReceipt(await readFile(file));
          } catch (err) {
            setError(err instanceof Error ? err.message : tr("No se pudo abrir.", "Could not open."));
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="small-note">
        {tr("CuentAI guarda tu registro de pago. El pago se realiza por el medio habitual de la entidad.", "CuentAI saves your payment record. Pay through the entity's usual channel.")}
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-footer">
        <span>{tr("Factura y comprobante juntos", "Bill and receipt together")}</span>
        <button className="primary-button" disabled={busy} onClick={submit}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={17} />
          )}
          {tr("Confirmar pago", "Confirm payment")}
        </button>
      </div>
    </Modal>
  );
}
function AssistantModal({
  invoices,
  apiUrl,
  onClose,
}: {
  invoices: Invoice[];
  apiUrl: string;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    list.current?.scrollTo({
      top: list.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);
  async function ask(text: string) {
    if (!text.trim() || busy) return;
    setError("");
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 70000);
    try {
      const result = await request<{ answer: string }>(
        "assistant",
        apiUrl,
        {
          question: text,
          language: activeLanguage(),
          invoices: invoices
            .slice(-300)
            .map(
              ({
                id,
                entity,
                category,
                amount,
                dueDate,
                period,
                paidDate,
                paidAmount,
              }) => ({
                id,
                entity,
                category,
                amount,
                dueDate,
                period,
                paidDate,
                paidAmount,
              }),
            ),
        },
        controller.current.signal,
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.answer },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr("No pudimos responder.", "We couldn't answer."));
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={tr("Una pregunta, más claridad", "One question, more clarity")}
      subtitle={tr("Respuestas basadas en las facturas que tienes aquí.", "Answers based on the bills stored here.")}
      onClose={onClose}
    >
      <div className="assistant-chat" ref={list}>
        {!messages.length ? (
          <div className="assistant-welcome">
            <span className="assistant-orb">
              <Sparkles size={28} />
            </span>
            <h3>{tr("¿Qué quieres entender?", "What would you like to understand?")}</h3>
            <p>{tr("Puedo ayudarte a consultar pagos y resumir tus obligaciones.", "I can help you review payments and summarize your obligations.")}</p>
            <div className="question-chips">
              {(activeLanguage() === "en"
                ? [
                    "What do I need to pay this month?",
                    "How much is overdue?",
                    "What payments are due in 30 days?",
                  ]
                : [
                    "¿Qué tengo por pagar este mes?",
                    "¿Cuánto tengo vencido?",
                    "¿Qué pagos vienen en 30 días?",
                  ]
              ).map((q) => (
                <button key={q} onClick={() => void ask(q)} disabled={busy}>
                  {q}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={`chat-message ${m.role}`} key={i}>
              {m.role === "assistant" ? (
                <span>
                  <Sparkles size={15} /> CuentAI
                </span>
              ) : null}
              <p>{m.text}</p>
            </div>
          ))
        )}
        {busy ? (
          <div className="chat-loading" role="status">
            <LoaderCircle className="spin" size={17} />
            {tr("Consultando tus registros…", "Checking your records…")}
          </div>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={1000}
          placeholder={tr("Escribe tu pregunta…", "Type your question…")}
          aria-label={tr("Tu pregunta", "Your question")}
          disabled={busy}
        />
        <button
          className="primary-button"
          disabled={busy || !question.trim()}
          aria-label={tr("Enviar pregunta", "Send question")}
        >
          <Send size={18} />
        </button>
      </form>
      <p className="privacy-note">
        {tr("Tu consulta y los datos de tus facturas se envían a OpenAI al preguntar. Verifica las respuestas con tus documentos.", "Your question and bill data are sent to OpenAI when you ask. Verify answers against your documents.")}
      </p>
    </Modal>
  );
}
export default function App() {
  const [state, setState] = useState<AppState>(emptyState);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [tab, setTab] = useState<Tab>("inicio");
  const [demo, setDemo] = useState(false);
  const [samples] = useState(demoInvoices);
  const [modal, setModal] = useState<
    "settings" | "assistant" | "reminders" | null
  >(null);
  const [form, setForm] = useState<Invoice | "new" | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [payment, setPayment] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [document, setDocument] = useState<Attachment | null>(null);
  const [toast, setToast] = useState("");
  const [mutating, setMutating] = useState(false);
  useEffect(() => {
    loadState()
      .then((s) => {
        setActiveLanguage(s.settings.language);
        applyTheme(s.settings.theme);
        setState(s);
        setDemo(!s.started && s.invoices.length === 0);
        setLoaded(true);
      })
      .catch(() => {
        setStorageError(
          tr("No pudimos abrir el almacenamiento. Activa el almacenamiento del navegador y recarga para guardar datos.", "We couldn't open storage. Enable browser storage and reload to save data."),
        );
        setLoaded(true);
      });
  }, []);
  setActiveLanguage(state.settings.language);
  applyTheme(state.settings.theme);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);
  const invoices = demo ? samples : state.invoices;
  const active = invoices.find((i) => i.id === selected);
  const today = todayISO();
  async function commit(
    next: AppState,
    attachments: Attachment[] = [],
    removeIds: string[] = [],
  ) {
    if (storageError) throw new Error(storageError);
    await saveState(next, attachments, removeIds);
    setState(next);
    if (next.settings.notifications) {
      try {
        await syncNotifications(next.invoices);
      } catch {
        setToast(
          tr("Guardado. No se pudieron actualizar los recordatorios; revísalos en Ajustes.", "Saved. Reminders could not be updated; review them in Settings."),
        );
      }
    }
  }
  async function saveInvoice(invoice: Invoice, attachment?: Attachment) {
    const exists = state.invoices.some((i) => i.id === invoice.id);
    const old = state.invoices.find((i) => i.id === invoice.id);
    const next = {
      ...state,
      started: true,
      invoices: exists
        ? state.invoices.map((i) => (i.id === invoice.id ? invoice : i))
        : [...state.invoices, invoice],
    };
    await commit(
      next,
      attachment ? [attachment] : [],
      old?.documentId && old.documentId !== invoice.documentId
        ? [old.documentId]
        : [],
    );
    setForm(null);
    setDemo(false);
    setSelected(invoice.id);
    setToast(tr("Factura guardada. Un poco más de orden.", "Bill saved. A little more order."));
  }
  function add() {
    setSelected(null);
    setForm("new");
  }
  async function viewAttachment(id: string) {
    try {
      const doc = await getAttachment(id);
      if (!doc)
        throw new Error(tr("No encontramos el documento en este dispositivo.", "We couldn't find the document on this device."));
      setSelected(null);
      setDocument(doc);
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : tr("No pudimos abrir el documento.", "We couldn't open the document."),
      );
    }
  }
  async function pay(date: string, attachment?: Attachment) {
    if (!payment) return;
    await commit(
      {
        ...state,
        invoices: state.invoices.map((i) =>
          i.id === payment.id
            ? {
                ...i,
                paidDate: date,
                paidAmount: i.amount,
                ...(attachment ? { receiptId: attachment.id } : {}),
              }
            : i,
        ),
      },
      attachment ? [attachment] : [],
    );
    setPayment(null);
    setSelected(payment.id);
    setToast(tr("Pago registrado. Ya puedes soltar ese pendiente.", "Payment recorded. One less thing to worry about."));
  }
  async function undoPayment(invoice: Invoice) {
    setMutating(true);
    try {
      const {
        paidDate: _date,
        paidAmount: _amount,
        receiptId: _receipt,
        ...rest
      } = invoice;
      await commit(
        {
          ...state,
          invoices: state.invoices.map((i) => (i.id === invoice.id ? rest : i)),
        },
        [],
        invoice.receiptId ? [invoice.receiptId] : [],
      );
      setToast(tr("La factura vuelve a estar pendiente.", "The bill is pending again."));
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : tr("No pudimos cambiar el estado.", "We couldn't change the status."),
      );
    } finally {
      setMutating(false);
    }
  }
  async function removeInvoice() {
    if (!deleteTarget) return;
    setMutating(true);
    try {
      await commit(
        {
          ...state,
          invoices: state.invoices.filter((i) => i.id !== deleteTarget.id),
        },
        [],
        [deleteTarget.documentId, deleteTarget.receiptId].filter(
          (id): id is string => !!id,
        ),
      );
      setDeleteTarget(null);
      setToast(tr("Factura eliminada de este dispositivo.", "Bill deleted from this device."));
    } catch (e) {
      setToast(e instanceof Error ? e.message : tr("No pudimos eliminarla.", "We couldn't delete it."));
    } finally {
      setMutating(false);
    }
  }
  async function exportCalendar() {
    if (!state.invoices.some((i) => !i.paidDate)) {
      setToast(tr("Añade una factura pendiente antes de exportar el calendario.", "Add a pending bill before exporting the calendar."));
      return;
    }
    try {
      await download(
        "CuentAI-vencimientos.ics",
        new Blob([calendarICS(state.invoices)], {
          type: "text/calendar;charset=utf-8",
        }),
      );
      setToast(tr("Calendario preparado con avisos de vencimiento.", "Calendar prepared with due date alerts."));
    } catch {
      setToast(tr("No pudimos exportar el calendario.", "We couldn't export the calendar."));
    }
  }
  async function exportBackup() {
    try {
      const attachments = await allAttachments();
      const used = new Set(
        state.invoices
          .flatMap((i) => [i.documentId, i.receiptId])
          .filter(Boolean),
      );
      await download(
        `CuentAI-respaldo-${today}.json`,
        new Blob(
          [
            JSON.stringify({
              ...state,
              settings: { ...state.settings, apiUrl: "", notifications: false },
              attachments: attachments.filter((a) => used.has(a.id)),
            }),
          ],
          { type: "application/json" },
        ),
      );
      setToast(tr("Respaldo descargado. Guárdalo en un lugar privado.", "Backup downloaded. Keep it in a private place."));
    } catch {
      setToast(tr("No pudimos crear el respaldo.", "We couldn't create the backup."));
    }
  }
  async function restore(file: File) {
    if (file.size > 60 * 1024 * 1024)
      throw new Error(tr("El respaldo supera 60 MB.", "The backup exceeds 60 MB."));
    const backup = parseBackup(JSON.parse(await file.text()));
    const merged = new Map(state.invoices.map((i) => [i.id, i]));
    backup.state.invoices.forEach((i) => {
      if (!merged.has(i.id)) merged.set(i.id, i);
    });
    const existingAttachments = new Set(
      (await allAttachments()).map((a) => a.id),
    );
    await commit(
      {
        ...state,
        started: true,
        invoices: [...merged.values()],
        settings: {
          ...state.settings,
          income: state.settings.income ?? backup.state.settings.income,
        },
      },
      backup.attachments.filter((a) => !existingAttachments.has(a.id)),
    );
    setDemo(false);
    setToast(tr("Respaldo restaurado. Conservamos tus registros existentes.", "Backup restored. Your existing records were kept."));
  }
  async function saveSettings(settings: Settings) {
    if (settings.notifications && !state.settings.notifications)
      await enableNotifications(state.invoices);
    if (!settings.notifications && state.settings.notifications)
      await syncNotifications(state.invoices, false);
    await commit({ ...state, settings });
    setActiveLanguage(settings.language);
    applyTheme(settings.theme);
    setToast(tr("Preferencias guardadas.", "Preferences saved."));
  }
  if (!loaded)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle className="spin" />
        <p>{tr("Estamos poniendo todo en su lugar.", "Putting everything in place.")}</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">{tr("UN POCO MÁS DE CALMA", "A LITTLE MORE PEACE")}</div>
        <nav aria-label={tr("Navegación principal", "Main navigation")}>
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon size={20} />
              {tr(t.label[0], t.label[1])}
              {tab === t.id ? <span className="nav-dot" /> : null}
            </button>
          ))}
        </nav>
        <button className="sidebar-add" onClick={add}>
          <Plus size={18} />
          {tr("Añadir factura", "Add bill")}
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-assistant">
            <span>
              <Sparkles size={19} />
            </span>
            <h3>{tr("¿Una mano con tus cuentas?", "Need a hand with your bills?")}</h3>
            <p>{tr("Pregúntale a CuentAI.", "Ask CuentAI.")}</p>
            <button onClick={() => setModal("assistant")}>
              {tr("Abrir asistente", "Open assistant")} <ArrowRight size={16} />
            </button>
          </div>
          <button
            className="settings-link"
            onClick={() => setModal("settings")}
          >
            <SettingsIcon size={18} />
            {tr("Ajustes", "Settings")}<span>0.1</span>
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="topbar-date">
            {new Intl.DateTimeFormat(activeLanguage() === "en" ? "en-US" : "es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "America/Bogota",
            }).format(new Date())}
          </span>
          <div className="topbar-actions">
            <button
              className="assistant-button"
              aria-label={tr("Abrir asistente", "Open assistant")}
              onClick={() => setModal("assistant")}
            >
              <Sparkles size={17} />
              <span>{tr("Tu asistente", "Your assistant")}</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setModal("reminders")}
              aria-label={tr("Ver recordatorios", "View reminders")}
            >
              <Bell size={20} />
              {invoices.some((i) => !i.paidDate && i.dueDate <= today) ? (
                <i className="notification-dot" />
              ) : null}
            </button>
            <button
              className="avatar-button"
              onClick={() => setModal("settings")}
              aria-label={tr("Abrir ajustes", "Open settings")}
            >
              C
            </button>
          </div>
        </header>
        <main>
          <div className="demo-banner" hidden={!demo}>
            <span>
              <Sparkles size={15} /> {tr("Estás viendo datos de ejemplo", "You are viewing sample data")}
            </span>
            <button
              onClick={() => {
                void commit({ ...state, started: true })
                  .then(() => {
                    setDemo(false);
                    setTab("inicio");
                  })
                  .catch((e) => setToast(e.message));
              }}
            >
              {tr("Usar mis facturas", "Use my bills")} <ArrowRight size={14} />
            </button>
          </div>
          {storageError ? (
            <p className="form-error" role="alert">
              {storageError}
            </p>
          ) : null}
          {tab === "inicio" ? (
            <HomeScreen
              invoices={invoices}
              onSelect={setSelected}
              onAdd={add}
              onArchive={() => setTab("archivo")}
              onAssistant={() => setModal("assistant")}
            />
          ) : tab === "calendario" ? (
            <CalendarScreen
              invoices={invoices}
              onSelect={setSelected}
              onAdd={add}
            />
          ) : tab === "archivo" ? (
            <ArchiveScreen
              invoices={invoices}
              onSelect={setSelected}
              onAdd={add}
            />
          ) : (
            <AnalysisScreen
              invoices={invoices}
              income={demo ? 2500000 : state.settings.income}
              onSelect={setSelected}
              onSettings={() => setModal("settings")}
            />
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label={tr("Navegación móvil", "Mobile navigation")}>
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.icon size={21} />
            <span>{tr(t.label[0], t.label[1])}</span>
          </button>
        ))}
      </nav>
      <button className="mobile-add" onClick={add} aria-label={tr("Añadir factura", "Add bill")}>
        <Plus size={25} />
      </button>
      {form ? (
        <InvoiceForm
          invoice={form === "new" ? undefined : form}
          apiUrl={state.settings.apiUrl}
          onClose={() => setForm(null)}
          onSave={saveInvoice}
          hashes={state.invoices
            .map((i) => i.documentHash)
            .filter((h): h is string => !!h)}
        />
      ) : null}
      {active ? (
        <Modal
          title={active.entity}
          subtitle={`${categoryLabel(active.category)} · ${monthLabel(`${active.period}-01`)}`}
          onClose={() => setSelected(null)}
        >
          <div className="detail-hero">
            <CategoryIcon category={active.category} />
            <strong>{money(active.amount)}</strong>
            <span className={`status ${invoiceStatus(active).tone}`}>
              {invoiceStatus(active).text}
            </span>
          </div>
          <dl className="detail-data">
            <div>
              <dt>{tr("Fecha límite", "Due date")}</dt>
              <dd>{dateLabel(active.dueDate)}</dd>
            </div>
            {active.issueDate ? (
              <div>
                <dt>{tr("Emitida", "Issued")}</dt>
                <dd>{dateLabel(active.issueDate)}</dd>
              </div>
            ) : null}
            <div>
              <dt>{tr("Referencia", "Reference")}</dt>
              <dd>{active.reference || tr("Sin referencia", "No reference")}</dd>
            </div>
            {active.minimumPayment ? (
              <div>
                <dt>{tr("Pago mínimo del extracto", "Statement minimum payment")}</dt>
                <dd>{money(active.minimumPayment)}</dd>
              </div>
            ) : null}
            {active.paidDate ? (
              <div>
                <dt>{tr("Pago registrado", "Payment recorded")}</dt>
                <dd>
                  {dateLabel(active.paidDate)} ·{" "}
                  {money(active.paidAmount ?? active.amount)}
                </dd>
              </div>
            ) : null}
          </dl>
          {active.notes ? <p className="detail-note">{active.notes}</p> : null}
          <div className="document-links">
            {active.documentId ? (
              <button
                className="secondary-button"
                onClick={() => void viewAttachment(active.documentId!)}
              >
                <FileText size={16} />
                {tr("Ver factura", "View bill")}
              </button>
            ) : null}
            {active.receiptId ? (
              <button
                className="secondary-button"
                onClick={() => void viewAttachment(active.receiptId!)}
              >
                <Check size={16} />
                {tr("Ver comprobante", "View receipt")}
              </button>
            ) : null}
          </div>
          <h3 className="detail-history-heading">{tr("Historial de esta cuenta", "Account history")}</h3>
          <div className="detail-history">
            {invoices
              .filter((i) => groupKey(i) === groupKey(active))
              .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
              .slice(0, 6)
              .map((i) => (
                <div key={i.id}>
                  <span>{monthLabel(`${i.period}-01`)}</span>
                  <strong>{money(i.amount)}</strong>
                  <span className="history-state">
                    {i.paidDate ? <Check size={14} /> : <span>•</span>}
                  </span>
                </div>
              ))}
          </div>
          {demo ? (
            <div className="notice demo-notice">
              {tr("Esta factura es un ejemplo. Añade la tuya para registrar pagos y documentos.", "This is a sample bill. Add yours to record payments and documents.")}
            </div>
          ) : (
            <div className="detail-actions">
              {active.paidDate ? (
                <button
                  className="secondary-button"
                  disabled={mutating}
                  onClick={() => void undoPayment(active)}
                >
                  <RotateCcw size={16} />
                  {tr("Deshacer registro de pago", "Undo payment record")}
                </button>
              ) : (
                <button
                  className="primary-button"
                  onClick={() => {
                    setPayment(active);
                    setSelected(null);
                  }}
                >
                  <Check size={17} />
                  {tr("Marcar como pagada", "Mark as paid")}
                </button>
              )}
              <div>
                <button
                  className="icon-button"
                  onClick={() => {
                    setForm(active);
                    setSelected(null);
                  }}
                  aria-label={tr("Editar factura", "Edit bill")}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button danger-text"
                  onClick={() => {
                    setDeleteTarget(active);
                    setSelected(null);
                  }}
                  aria-label={tr("Eliminar factura", "Delete bill")}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}
      {payment ? (
        <PaymentModal
          invoice={payment}
          onClose={() => setPayment(null)}
          onSave={pay}
        />
      ) : null}
      {deleteTarget ? (
        <Modal
          title={tr("Eliminar esta factura", "Delete this bill")}
          subtitle={tr("También se eliminarán los documentos vinculados de este dispositivo.", "Linked documents will also be deleted from this device.")}
          onClose={() => {
            if (!mutating) setDeleteTarget(null);
          }}
        >
          <p>
            {deleteTarget.entity} · {money(deleteTarget.amount)} ·{" "}
            {dateLabel(deleteTarget.dueDate)}
          </p>
          <div className="modal-footer">
            <button
              className="secondary-button"
              onClick={() => setDeleteTarget(null)}
              disabled={mutating}
            >
              {tr("Conservar", "Keep")}
            </button>
            <button
              className="danger-button"
              onClick={() => void removeInvoice()}
              disabled={mutating}
            >
              {tr("Eliminar factura", "Delete bill")}
            </button>
          </div>
        </Modal>
      ) : null}
      {document ? (
        <Modal title={document.name} onClose={() => setDocument(null)} wide>
          {document.mime === "application/pdf" ? (
            <Suspense fallback={<p className="small-note">{tr("Abriendo PDF…", "Opening PDF…")}</p>}>
              <PDFPreview data={document.data} />
            </Suspense>
          ) : (
            <img
              className="document-preview"
              src={document.data}
              alt={document.name}
            />
          )}
          <button
            className="secondary-button"
            onClick={async () => {
              try {
                const blob = await fetch(document.data).then((r) => r.blob());
                await download(document.name, blob);
              } catch {
                setToast(
                  tr("No pudimos preparar el documento para descargar o compartir.", "We couldn't prepare the document for download or sharing."),
                );
              }
            }}
          >
            <Download size={17} />
            {tr("Descargar documento", "Download document")}
          </button>
        </Modal>
      ) : null}
      {modal === "settings" ? (
        <SettingsModal
          settings={state.settings}
          onClose={() => setModal(null)}
          onSave={saveSettings}
          onExport={() => void exportBackup()}
          onRestore={restore}
          onCalendar={exportCalendar}
        />
      ) : modal === "assistant" ? (
        <AssistantModal
          invoices={invoices}
          apiUrl={state.settings.apiUrl}
          onClose={() => setModal(null)}
        />
      ) : modal === "reminders" ? (
        <Modal
          title={tr("Tus recordatorios", "Your reminders")}
          subtitle={tr("Pagos que esperan tu atención.", "Payments that need your attention.")}
          onClose={() => setModal(null)}
        >
          {invoices
            .filter((i) => !i.paidDate)
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
            .map((i) => (
              <InvoiceRow
                key={i.id}
                invoice={i}
                onClick={() => {
                  setModal(null);
                  setSelected(i.id);
                }}
              />
            ))}
          {!invoices.some((i) => !i.paidDate) ? (
            <p className="muted">{tr("No tienes pagos pendientes.", "You have no pending payments.")}</p>
          ) : null}
          <div className="modal-footer">
            <span>{tr("Configura tus avisos", "Set up your alerts")}</span>
            <button
              className="secondary-button"
              onClick={() => setModal("settings")}
            >
              <SettingsIcon size={16} />
              {tr("Ajustes", "Settings")}
            </button>
          </div>
        </Modal>
      ) : null}
      {toast ? (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}
