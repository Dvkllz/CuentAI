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
  dateLabel,
  groupKey,
  invoiceStatus,
  money,
  monthLabel,
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
import { applyTheme, setActiveLanguage, tr } from "./locale";
const PDFPreview = lazy(() => import("./components/PDFPreview"));
const tabs = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "calendario", label: "Calendario", icon: CalendarDays },
  { id: "archivo", label: "Archivo", icon: FolderClosed },
  { id: "analisis", label: "Análisis", icon: ChartNoAxesCombined },
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
      setError("Revisa el valor de tu ingreso.");
      return;
    }
    if (url && !/^https?:\/\/[^\s]+$/.test(url)) {
      setError("Usa una dirección válida que empiece por https:// o http://.");
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
      setError(e instanceof Error ? e.message : "No pudimos guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="A tu manera"
      subtitle="Tu información. Tus preferencias."
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
          Ingreso mensual opcional
          <input
            inputMode="decimal"
            type="number"
            min="0"
            max="1000000000000"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            placeholder="Ej. 2500000"
          />
          <small>Solo se usa para tu proyección. Puedes dejarlo vacío.</small>
        </label>
        <section className="settings-section">
          <h3>
            <Bell size={18} /> Recordatorios
          </h3>
          {Capacitor.isNativePlatform() ? (
            <label className="toggle-row">
              <span>Avisos 7, 3 y 1 día antes, y el día límite</span>
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
              />
            </label>
          ) : (
            <p>
              Exporta tus vencimientos con avisos a la aplicación de calendario
              que uses.
            </p>
          )}
          {Capacitor.isNativePlatform() ? (
            <>
              <small>
                Los avisos se programan para las 9:00 a. m. Android puede
                retrasarlos según el ahorro de batería.
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
                      "Prueba programada. Espera unos segundos; Android puede retrasar el aviso.",
                    );
                  } catch (e) {
                    setError(
                      e instanceof Error
                        ? e.message
                        : "No pudimos programar la prueba.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Bell size={17} /> Probar notificación
              </button>
              {notificationMessage ? (
                <p role="status">{notificationMessage}</p>
              ) : null}
            </>
          ) : null}
          <button className="secondary-button" onClick={onCalendar}>
            <CalendarDays size={17} />
            Exportar al calendario
          </button>
        </section>
        <section className="settings-section">
          <h3>
            <ShieldCheck size={18} /> Tus datos
          </h3>
          <p>
            Los registros y archivos se guardan en este dispositivo. Crea un
            respaldo para conservarlos si cambias de teléfono.
          </p>
          <div className="settings-actions">
            <button className="secondary-button" onClick={onExport}>
              <Download size={16} />
              Crear respaldo
            </button>
            <button
              className="secondary-button"
              onClick={() => importInput.current?.click()}
              disabled={busy}
            >
              <Upload size={16} />
              Restaurar
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
                    : "No pudimos restaurar el respaldo.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </section>
        <details className="extra-fields">
          <summary>Conexión al servidor de IA</summary>
          <label>
            Dirección del servidor
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://tu-servidor.com"
            />
            <small>
              En este navegador puedes dejarla vacía. En Android usa la
              dirección de tu servidor. La clave permanece en el servidor.
            </small>
          </label>
        </details>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="modal-footer">
          <span>CuentAI · versión 0.1</span>
          <button className="primary-button" onClick={save} disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}
            Guardar ajustes
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
      setError("Elige una fecha de pago válida, hasta hoy.");
      return;
    }
    setBusy(true);
    try {
      await onSave(date, receipt);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos registrar el pago.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Un pendiente menos"
      subtitle={`Registra el pago total de ${invoice.entity}.`}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <div className="payment-summary">
        <CategoryIcon category={invoice.category} />
        <strong>{money(invoice.amount)}</strong>
        <span>Pago total de esta factura</span>
      </div>
      <label>
        Fecha de pago
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
          {receipt ? receipt.name : "Añadir comprobante"}
          <small>Opcional · PDF o imagen</small>
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
            setError(err instanceof Error ? err.message : "No se pudo abrir.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <p className="small-note">
        CuentAI guarda tu registro de pago. El pago se realiza por el medio
        habitual de la entidad.
      </p>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-footer">
        <span>Factura y comprobante juntos</span>
        <button className="primary-button" disabled={busy} onClick={submit}>
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Check size={17} />
          )}
          Confirmar pago
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
      setError(e instanceof Error ? e.message : "No pudimos responder.");
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Una pregunta, más claridad"
      subtitle="Respuestas basadas en las facturas que tienes aquí."
      onClose={onClose}
    >
      <div className="assistant-chat" ref={list}>
        {!messages.length ? (
          <div className="assistant-welcome">
            <span className="assistant-orb">
              <Sparkles size={28} />
            </span>
            <h3>¿Qué quieres entender?</h3>
            <p>Puedo ayudarte a consultar pagos y resumir tus obligaciones.</p>
            <div className="question-chips">
              {[
                "¿Qué tengo por pagar este mes?",
                "¿Cuánto tengo vencido?",
                "¿Qué pagos vienen en 30 días?",
              ].map((q) => (
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
            Consultando tus registros…
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
          placeholder="Escribe tu pregunta…"
          aria-label="Tu pregunta"
          disabled={busy}
        />
        <button
          className="primary-button"
          disabled={busy || !question.trim()}
          aria-label="Enviar pregunta"
        >
          <Send size={18} />
        </button>
      </form>
      <p className="privacy-note">
        Tu consulta y los datos de tus facturas se envían a OpenAI al preguntar.
        Verifica las respuestas con tus documentos.
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
          "No pudimos abrir el almacenamiento. Activa el almacenamiento del navegador y recarga para guardar datos.",
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
          "Guardado. No se pudieron actualizar los recordatorios; revísalos en Ajustes.",
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
    setToast("Factura guardada. Un poco más de orden.");
  }
  function add() {
    setSelected(null);
    setForm("new");
  }
  async function viewAttachment(id: string) {
    try {
      const doc = await getAttachment(id);
      if (!doc)
        throw new Error("No encontramos el documento en este dispositivo.");
      setSelected(null);
      setDocument(doc);
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "No pudimos abrir el documento.",
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
    setToast("Pago registrado. Ya puedes soltar ese pendiente.");
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
      setToast("La factura vuelve a estar pendiente.");
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "No pudimos cambiar el estado.",
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
      setToast("Factura eliminada de este dispositivo.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No pudimos eliminarla.");
    } finally {
      setMutating(false);
    }
  }
  async function exportCalendar() {
    if (!state.invoices.some((i) => !i.paidDate)) {
      setToast("Añade una factura pendiente antes de exportar el calendario.");
      return;
    }
    try {
      await download(
        "CuentAI-vencimientos.ics",
        new Blob([calendarICS(state.invoices)], {
          type: "text/calendar;charset=utf-8",
        }),
      );
      setToast("Calendario preparado con avisos de vencimiento.");
    } catch {
      setToast("No pudimos exportar el calendario.");
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
      setToast("Respaldo descargado. Guárdalo en un lugar privado.");
    } catch {
      setToast("No pudimos crear el respaldo.");
    }
  }
  async function restore(file: File) {
    if (file.size > 60 * 1024 * 1024)
      throw new Error("El respaldo supera 60 MB.");
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
    setToast("Respaldo restaurado. Conservamos tus registros existentes.");
  }
  async function saveSettings(settings: Settings) {
    if (settings.notifications && !state.settings.notifications)
      await enableNotifications(state.invoices);
    if (!settings.notifications && state.settings.notifications)
      await syncNotifications(state.invoices, false);
    await commit({ ...state, settings });
    setActiveLanguage(settings.language);
    applyTheme(settings.theme);
    setToast("Preferencias guardadas.");
  }
  if (!loaded)
    return (
      <div className="loading-screen">
        <Brand />
        <LoaderCircle className="spin" />
        <p>Estamos poniendo todo en su lugar.</p>
      </div>
    );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-caption">UN POCO MÁS DE CALMA</div>
        <nav aria-label="Navegación principal">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <t.icon size={20} />
              {t.label}
              {tab === t.id ? <span className="nav-dot" /> : null}
            </button>
          ))}
        </nav>
        <button className="sidebar-add" onClick={add}>
          <Plus size={18} />
          Añadir factura
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-assistant">
            <span>
              <Sparkles size={19} />
            </span>
            <h3>¿Una mano con tus cuentas?</h3>
            <p>Pregúntale a CuentAI.</p>
            <button onClick={() => setModal("assistant")}>
              Abrir asistente <ArrowRight size={16} />
            </button>
          </div>
          <button
            className="settings-link"
            onClick={() => setModal("settings")}
          >
            <SettingsIcon size={18} />
            Ajustes<span>0.1</span>
          </button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="topbar-date">
            {new Intl.DateTimeFormat("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "America/Bogota",
            }).format(new Date())}
          </span>
          <div className="topbar-actions">
            <button
              className="assistant-button"
              aria-label="Abrir asistente"
              onClick={() => setModal("assistant")}
            >
              <Sparkles size={17} />
              <span>Tu asistente</span>
            </button>
            <button
              className="icon-button"
              onClick={() => setModal("reminders")}
              aria-label="Ver recordatorios"
            >
              <Bell size={20} />
              {invoices.some((i) => !i.paidDate && i.dueDate <= today) ? (
                <i className="notification-dot" />
              ) : null}
            </button>
            <button
              className="avatar-button"
              onClick={() => setModal("settings")}
              aria-label="Abrir ajustes"
            >
              C
            </button>
          </div>
        </header>
        <main>
          <div className="demo-banner" hidden={!demo}>
            <span>
              <Sparkles size={15} /> Estás viendo datos de ejemplo
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
              Usar mis facturas <ArrowRight size={14} />
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
      <nav className="bottom-nav" aria-label="Navegación móvil">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <t.icon size={21} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <button className="mobile-add" onClick={add} aria-label="Añadir factura">
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
          subtitle={`${active.category} · ${monthLabel(`${active.period}-01`)}`}
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
              <dt>Fecha límite</dt>
              <dd>{dateLabel(active.dueDate)}</dd>
            </div>
            {active.issueDate ? (
              <div>
                <dt>Emitida</dt>
                <dd>{dateLabel(active.issueDate)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Referencia</dt>
              <dd>{active.reference || "Sin referencia"}</dd>
            </div>
            {active.minimumPayment ? (
              <div>
                <dt>Pago mínimo del extracto</dt>
                <dd>{money(active.minimumPayment)}</dd>
              </div>
            ) : null}
            {active.paidDate ? (
              <div>
                <dt>Pago registrado</dt>
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
                Ver factura
              </button>
            ) : null}
            {active.receiptId ? (
              <button
                className="secondary-button"
                onClick={() => void viewAttachment(active.receiptId!)}
              >
                <Check size={16} />
                Ver comprobante
              </button>
            ) : null}
          </div>
          <h3 className="detail-history-heading">Historial de esta cuenta</h3>
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
              Esta factura es un ejemplo. Añade la tuya para registrar pagos y
              documentos.
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
                  Deshacer registro de pago
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
                  Marcar como pagada
                </button>
              )}
              <div>
                <button
                  className="icon-button"
                  onClick={() => {
                    setForm(active);
                    setSelected(null);
                  }}
                  aria-label="Editar factura"
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button danger-text"
                  onClick={() => {
                    setDeleteTarget(active);
                    setSelected(null);
                  }}
                  aria-label="Eliminar factura"
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
          title="Eliminar esta factura"
          subtitle="También se eliminarán los documentos vinculados de este dispositivo."
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
              Conservar
            </button>
            <button
              className="danger-button"
              onClick={() => void removeInvoice()}
              disabled={mutating}
            >
              Eliminar factura
            </button>
          </div>
        </Modal>
      ) : null}
      {document ? (
        <Modal title={document.name} onClose={() => setDocument(null)} wide>
          {document.mime === "application/pdf" ? (
            <Suspense fallback={<p className="small-note">Abriendo PDF…</p>}>
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
                  "No pudimos preparar el documento para descargar o compartir.",
                );
              }
            }}
          >
            <Download size={17} />
            Descargar documento
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
          title="Tus recordatorios"
          subtitle="Pagos que esperan tu atención."
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
            <p className="muted">No tienes pagos pendientes.</p>
          ) : null}
          <div className="modal-footer">
            <span>Configura tus avisos</span>
            <button
              className="secondary-button"
              onClick={() => setModal("settings")}
            >
              <SettingsIcon size={16} />
              Ajustes
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
