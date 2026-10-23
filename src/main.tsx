import { StrictMode, Component } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Capacitor } from "@capacitor/core";
import "./styles.css";
import { tr } from "./locale";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="loading-screen">
        <h1>{tr("No pudimos abrir CuentAI", "We couldn't open CuentAI")}</h1>
        <p>{tr("Tus registros guardados siguen en este dispositivo.", "Your saved records are still on this device.")}</p>
        <button className="primary-button" onClick={() => location.reload()}>
          {tr("Volver a intentar", "Try again")}
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
if (
  import.meta.env.PROD &&
  !Capacitor.isNativePlatform() &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
