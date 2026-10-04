import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerURL from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerURL;
export default function PDFPreview({ data }: { data: string }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let stopped = false;
    setError("");
    setBusy(true);
    setPage(1);
    const bytes = Uint8Array.from(atob(data.split(",")[1]), (c) =>
      c.charCodeAt(0),
    );
    const task = getDocument({
      data: bytes,
      useSystemFonts: true,
    });
    void task.promise
      .then((document) => {
        if (!stopped) setPdf(document);
      })
      .catch(() => {
        if (!stopped) {
          setError(
            "No pudimos mostrar este PDF. Puedes descargar el documento original.",
          );
          setBusy(false);
        }
      });
    return () => {
      stopped = true;
      void task.destroy();
    };
  }, [data]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let stopped = false;
    let task: { cancel: () => void } | undefined;
    setBusy(true);
    void pdf
      .getPage(page)
      .then((p) => {
        if (stopped || !canvas.current) return;
        const natural = p.getViewport({ scale: 1 });
        const width = container.current?.clientWidth || 400;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (width - 16) / natural.width;
        const viewport = p.getViewport({ scale: scale * ratio });
        const element = canvas.current;
        element.width = viewport.width;
        element.height = viewport.height;
        element.style.width = `${viewport.width / ratio}px`;
        element.style.height = `${viewport.height / ratio}px`;
        const render = p.render({ canvas: element, viewport });
        task = render;
        return render.promise;
      })
      .then(() => {
        if (!stopped) setBusy(false);
      })
      .catch(() => {
        if (!stopped) {
          setError(
            "La vista previa no se pudo completar. El archivo original sigue disponible.",
          );
          setBusy(false);
        }
      });
    return () => {
      stopped = true;
      task?.cancel();
    };
  }, [pdf, page]);
  return (
    <div className="pdf-preview" ref={container}>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {busy ? (
        <p className="pdf-loading" role="status">
          <LoaderCircle size={16} className="spin" />
          Abriendo documento…
        </p>
      ) : null}
      <canvas ref={canvas} aria-label={`Página ${page} del documento PDF`} />
      {pdf ? (
        <div className="pdf-controls">
          <button
            className="icon-button"
            disabled={page <= 1 || busy}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            Página {page} de {pdf.numPages}
          </span>
          <button
            className="icon-button"
            disabled={page >= pdf.numPages || busy}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Página siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
