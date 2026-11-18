const debugUrl = (process.argv[2] || "http://127.0.0.1:9222").replace(
  /\/$/,
  "",
);
const targets = await fetch(`${debugUrl}/json`, {
  signal: AbortSignal.timeout(5000),
}).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target?.webSocketDebuggerUrl)
  throw new Error("No se encontró el WebView de CuentAI.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(
    () => reject(new Error("El WebView no respondió a tiempo.")),
    10000,
  );
  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        id: 1,
        method: "Runtime.evaluate",
        params: {
          expression: `fetch("http://127.0.0.1:5174/api/health")
            .then(async (response) => ({ status: response.status, body: await response.json() }))`,
          awaitPromise: true,
          returnByValue: true,
        },
      }),
    );
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id !== 1) return;
    clearTimeout(timeout);
    if (message.result?.exceptionDetails)
      reject(new Error(message.result.exceptionDetails.text));
    else resolve(message.result?.result?.value);
  });
  socket.addEventListener("error", () => {
    clearTimeout(timeout);
    reject(new Error("No se pudo abrir el depurador del WebView."));
  });
});

socket.close();
if (result?.status !== 200 || !result?.body?.ready)
  throw new Error(`Respuesta inesperada: ${JSON.stringify(result)}`);
console.log(JSON.stringify({ ok: true, ...result }));
