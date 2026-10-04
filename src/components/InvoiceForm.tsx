import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Camera,
  FileUp,
  Sparkles,
  LoaderCircle,
  FileText,
  TriangleAlert,
  Check,
  PencilLine,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { CATEGORIES, todayISO, validDate } from "../domain.mjs";
import { readFile } from "../storage";
import { request } from "../api";
import { Modal } from "./UI";
import type { Attachment, Extraction, Invoice } from "../types";
type Props = {
  invoice?: Invoice;
  apiUrl: string;
  onClose: () => void;
  onSave: (invoice: Invoice, attachment?: Attachment) => Promise<void>;
  hashes: string[];
};
export function InvoiceForm({
  invoice,
  apiUrl,
  onClose,
  onSave,
  hashes,
}: Props) {
  const [entity, setEntity] = useState(invoice?.entity || "");
  const [category, setCategory] = useState(invoice?.category || "Otros");
  const [amount, setAmount] = useState(invoice ? String(invoice.amount) : "");
  const [dueDate, setDueDate] = useState(invoice?.dueDate || "");
  const [period, setPeriod] = useState(
    invoice?.period || todayISO().slice(0, 7),
  );
  const [issueDate, setIssueDate] = useState(invoice?.issueDate || "");
  const [reference, setReference] = useState(invoice?.reference || "");
  const [notes, setNotes] = useState(invoice?.notes || "");
  const [attachment, setAttachment] = useState<Attachment>();
  const [warnings, setWarnings] = useState<string[]>(invoice?.warnings || []);
  const [source, setSource] = useState<"ai" | "manual">(
    invoice?.source || "manual",
  );
  const [minimumPayment, setMinimum] = useState(invoice?.minimumPayment);
  const [busy, setBusy] = useState<"file" | "ai" | "save" | null>(null);
  const [error, setError] = useState("");
  const [currency, setCurrency] = useState("COP");
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const close = () => {
    if (busy !== "save") {
      controller.current?.abort();
      onClose();
    }
  };
  async function pick(file?: File) {
    if (!file) return;
    setError("");
    setBusy("file");
    try {
      const doc = await readFile(file);
      if (hashes.includes(doc.hash) && doc.hash !== invoice?.documentHash)
        throw new Error(
          "Esta factura ya está en tu archivo. Abre el registro existente.",
        );
      setAttachment(doc);
      if (source === "ai") {
        setEntity("");
        setAmount("");
        setDueDate("");
        setIssueDate("");
        setReference("");
        setMinimum(undefined);
        setCurrency("COP");
      }
      setWarnings([]);
      setSource("manual");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos abrir el archivo.");
    } finally {
      setBusy(null);
    }
  }
  async function takePhoto() {
    if (!Capacitor.isNativePlatform()) {
      camera.current?.click();
      return;
    }
    setError("");
    try {
      const {
        Camera: NativeCamera,
        CameraResultType,
        CameraSource,
      } = await import("@capacitor/camera");
      const photo = await NativeCamera.getPhoto({
        quality: 85,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      const blob = await fetch(
        `data:image/${photo.format};base64,${photo.base64String}`,
      ).then((r) => r.blob());
      await pick(
        new File([blob], `factura-${Date.now()}.${photo.format}`, {
          type: `image/${photo.format}`,
        }),
      );
    } catch {
      setError(
        "La cámara se cerró o no tiene permiso. Puedes cargar un archivo.",
      );
    }
  }
  async function extract() {
    if (!attachment) return;
    setError("");
    setBusy("ai");
    controller.current = new AbortController();
    const timeout = setTimeout(() => controller.current?.abort(), 70000);
    try {
      const data = await request<Extraction>(
        "extract",
        apiUrl,
        { name: attachment.name, mime: attachment.mime, data: attachment.data },
        controller.current.signal,
      );
      setEntity(data.entity || "");
      setCategory(data.category);
      setAmount(data.amount === null ? "" : String(data.amount));
      setDueDate(data.dueDate || "");
      setPeriod(
        data.period && /^\d{4}-\d{2}$/.test(data.period) ? data.period : "",
      );
      setIssueDate(data.issueDate || "");
      setReference(data.reference || "");
      setMinimum(data.minimumPayment ?? undefined);
      setWarnings(data.warnings);
      setCurrency(data.currency || "");
      setSource("ai");
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "La lectura se interrumpió. Puedes intentarlo otra vez o completar los datos."
          : e instanceof Error
            ? e.message
            : "No pudimos leer la factura.",
      );
    } finally {
      clearTimeout(timeout);
      setBusy(null);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const value = Number(amount);
    if (
      !entity.trim() ||
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 1e12 ||
      !validDate(dueDate) ||
      (issueDate && !validDate(issueDate))
    ) {
      setError("Revisa la entidad, el importe y las fechas.");
      return;
    }
    if (currency !== "COP") {
      setError("Confirma que el importe está expresado en pesos colombianos.");
      return;
    }
    setBusy("save");
    try {
      await onSave(
        {
          id: invoice?.id || crypto.randomUUID(),
          entity: entity.trim(),
          category,
          amount: value,
          dueDate,
          issueDate,
          period,
          reference: reference.trim(),
          notes: notes.trim(),
          createdAt: invoice?.createdAt || new Date().toISOString(),
          warnings,
          source,
          ...(minimumPayment ? { minimumPayment } : {}),
          ...(invoice?.paidDate
            ? {
                paidDate: invoice.paidDate,
                paidAmount: invoice.paidAmount,
                receiptId: invoice.receiptId,
              }
            : {}),
          ...(attachment
            ? { documentId: attachment.id, documentHash: attachment.hash }
            : invoice?.documentId
              ? {
                  documentId: invoice.documentId,
                  documentHash: invoice.documentHash,
                }
              : {}),
        },
        attachment,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Modal
      title={invoice ? "Editar factura" : "Nueva factura"}
      subtitle="Tú confirmas. CuentAI organiza el resto."
      onClose={close}
      wide
    >
      <form onSubmit={submit} className="invoice-form">
        {!invoice ? (
          <>
            <div className="upload-actions">
              <button
                type="button"
                className="upload-choice"
                onClick={takePhoto}
                disabled={!!busy}
              >
                <Camera />
                <span>
                  <strong>Tomar una foto</strong>
                  <small>Captura tu factura</small>
                </span>
              </button>
              <button
                type="button"
                className="upload-choice"
                onClick={() => input.current?.click()}
                disabled={!!busy}
              >
                <FileUp />
                <span>
                  <strong>Cargar documento</strong>
                  <small>PDF o imagen · hasta 12 MB</small>
                </span>
              </button>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              hidden
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={camera}
              type="file"
              accept="image/jpeg,image/png"
              capture="environment"
              hidden
              onChange={(e) => {
                void pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </>
        ) : null}
        {attachment ? (
          <div className="document-card">
            {attachment.mime.startsWith("image/") ? (
              <img src={attachment.data} alt="Vista previa de tu factura" />
            ) : (
              <FileText size={34} />
            )}
            <div>
              <strong>{attachment.name}</strong>
              <small>
                {source === "ai"
                  ? "Lectura completada · revisa los campos"
                  : "Documento listo para revisar"}
              </small>
            </div>
            <button
              type="button"
              className="ai-button"
              onClick={extract}
              disabled={!!busy}
            >
              {busy === "ai" ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Sparkles size={16} />
              )}{" "}
              {busy === "ai" ? "Leyendo…" : "Leer con IA"}
            </button>
          </div>
        ) : null}
        {attachment && source !== "ai" ? (
          <p className="privacy-note">
            Al pulsar “Leer con IA”, este documento se envía a OpenAI para
            extraer los datos. También puedes completarlos manualmente.
          </p>
        ) : null}
        {source === "ai" ? (
          <div className="review-message">
            <Check size={17} /> Revisa el importe y la fecha antes de guardar.
          </div>
        ) : !attachment ? (
          <p className="manual-hint">
            <PencilLine size={16} /> También puedes registrar los datos sin
            documento.
          </p>
        ) : null}
        {warnings.length ? (
          <div className="notice warning">
            <TriangleAlert size={18} />
            <div>
              {warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          </div>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="form-grid">
          <label className="span-2">
            Empresa o entidad
            <input
              required
              maxLength={160}
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              placeholder="Ej. CEDENAR"
              disabled={!!busy}
            />
          </label>
          <label>
            Valor total en COP
            <input
              required
              inputMode="decimal"
              type="number"
              min="1"
              max="1000000000000"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="184520"
              disabled={!!busy}
            />
          </label>
          <label>
            Fecha límite de pago
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={!!busy}
            />
          </label>
          <label>
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={!!busy}
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Periodo facturado
            <input
              type="month"
              required
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              disabled={!!busy}
            />
          </label>
        </div>
        {currency !== "COP" ? (
          <label className="check-label">
            <input
              type="checkbox"
              checked={false}
              onChange={() => setCurrency("COP")}
            />
            Confirmo que el importe ingresado está en COP
          </label>
        ) : null}
        <details className="extra-fields">
          <summary>Referencia y otros detalles</summary>
          <div className="form-grid">
            <label>
              Referencia de pago
              <input
                maxLength={160}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={!!busy}
              />
            </label>
            <label>
              Fecha de emisión
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                disabled={!!busy}
              />
            </label>
            <label className="span-2">
              Nota opcional
              <textarea
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                disabled={!!busy}
              />
            </label>
          </div>
        </details>
        <div className="modal-footer">
          <span>Se guarda en este dispositivo</span>
          <button className="primary-button" disabled={!!busy}>
            {busy === "save" ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <Check size={17} />
            )}{" "}
            {busy === "save" ? "Guardando…" : "Confirmar y guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
