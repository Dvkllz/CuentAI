const baseUrl = (process.argv[2] || "http://127.0.0.1:5174").replace(/\/$/, "");

function createTestPdf() {
  const content = [
    "BT",
    "/F1 18 Tf",
    "22 TL",
    "72 720 Td",
    "(FACTURA DE SERVICIO) Tj",
    "T* (Empresa: Energia Demo SAS) Tj",
    "T* (Numero de factura: DEMO-2026-118) Tj",
    "T* (Fecha de emision: 2026-11-10) Tj",
    "T* (Periodo facturado: 2026-11) Tj",
    "T* (Fecha limite de pago: 2026-11-30) Tj",
    "T* (TOTAL A PAGAR: COP 184520) Tj",
    "T* (Documento sintetico para prueba tecnica de CuentAI) Tj",
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf).toString("base64");
}

const document = createTestPdf();
const credentials = {
  name: "Prueba CuentAI",
  email: `smoke-${Date.now()}@example.com`,
  password: `test-only-${crypto.randomUUID()}`,
};
const registration = await fetch(`${baseUrl}/api/auth/register`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://localhost",
  },
  body: JSON.stringify(credentials),
  signal: AbortSignal.timeout(20000),
});
const account = await registration.json();
if (!registration.ok)
  throw new Error(account.error || `Registro HTTP ${registration.status}`);

const response = await fetch(`${baseUrl}/api/extract`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: "https://localhost",
    Authorization: `Bearer ${account.token}`,
  },
  body: JSON.stringify({
    name: "factura-demo.pdf",
    mime: "application/pdf",
    data: `data:application/pdf;base64,${document}`,
    language: "es",
  }),
  signal: AbortSignal.timeout(70000),
});

const result = await response.json();
if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
if (result.amount !== 184520 || result.dueDate !== "2026-11-30") {
  throw new Error(`Extracción inesperada: ${JSON.stringify(result)}`);
}

console.log(
  JSON.stringify({
    ok: true,
    entity: result.entity,
    amount: result.amount,
    currency: result.currency,
    dueDate: result.dueDate,
    period: result.period,
  }),
);
