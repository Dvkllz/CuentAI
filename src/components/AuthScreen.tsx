import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, Server, UserRound } from "lucide-react";
import { authRequest, saveAuthSession } from "../auth";
import type { AuthResult } from "../auth";
import type { AuthUser } from "../types";
import { tr } from "../locale";
import { Brand } from "./UI";

export function AuthScreen({
  apiUrl,
  onServerChange,
  onAuthenticated,
}: {
  apiUrl: string;
  onServerChange: (url: string) => Promise<void>;
  onAuthenticated: (user: AuthUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [server, setServer] = useState(apiUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError(tr("Las contraseñas no coinciden.", "Passwords do not match."));
      return;
    }
    if (password.length < 8) {
      setError(
        tr(
          "La contraseña debe tener al menos 8 caracteres.",
          "The password must be at least 8 characters.",
        ),
      );
      return;
    }
    const cleanServer = server.trim().replace(/\/$/, "");
    if (cleanServer && !/^https?:\/\/[^\s]+$/.test(cleanServer)) {
      setError(
        tr("Revisa la dirección del servidor.", "Review the server address."),
      );
      return;
    }
    setBusy(true);
    try {
      await onServerChange(cleanServer);
      const result = await authRequest<AuthResult>(mode, cleanServer, {
        ...(mode === "register" ? { name: name.trim() } : {}),
        email: email.trim(),
        password,
      });
      saveAuthSession(result);
      onAuthenticated(result.user);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : tr("No pudimos continuar.", "We couldn't continue."),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />
      <section className="auth-card">
        <Brand />
        <div className="auth-copy">
          <span className="eyebrow">
            {tr("TUS CUENTAS, SOLO TUYAS", "YOUR BILLS, YOUR SPACE")}
          </span>
          <h1>
            {mode === "login"
              ? tr("Qué bueno verte.", "Good to see you.")
              : tr("Crea tu espacio.", "Create your space.")}
          </h1>
          <p>
            {mode === "login"
              ? tr(
                  "Entra para organizar tus facturas con CuentAI.",
                  "Sign in to organize your bills with CuentAI.",
                )
              : tr(
                  "Un acceso sencillo para proteger tu experiencia y la IA.",
                  "A simple account to protect your experience and AI access.",
                )}
          </p>
        </div>
        <div className="auth-tabs" role="tablist">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {tr("Iniciar sesión", "Sign in")}
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {tr("Registrarme", "Create account")}
          </button>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" ? (
            <label>
              <span>{tr("Nombre", "Name")}</span>
              <div className="auth-input">
                <UserRound size={18} />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  maxLength={80}
                  autoComplete="name"
                  required
                  placeholder={tr("Tu nombre", "Your name")}
                />
              </div>
            </label>
          ) : null}
          <label>
            <span>{tr("Correo", "Email")}</span>
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                autoComplete="email"
                required
                placeholder="nombre@correo.com"
              />
            </div>
          </label>
          <label>
            <span>{tr("Contraseña", "Password")}</span>
            <div className="auth-input">
              <LockKeyhole size={18} />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
                placeholder={tr("Mínimo 8 caracteres", "At least 8 characters")}
              />
            </div>
          </label>
          {mode === "register" ? (
            <label>
              <span>{tr("Confirmar contraseña", "Confirm password")}</span>
              <div className="auth-input">
                <LockKeyhole size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  placeholder={tr("Repítela", "Repeat it")}
                />
              </div>
            </label>
          ) : null}
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button className="auth-submit" disabled={busy}>
            {busy
              ? tr("Un momento…", "One moment…")
              : mode === "login"
                ? tr("Entrar a CuentAI", "Sign in to CuentAI")
                : tr("Crear mi cuenta", "Create my account")}
            {!busy ? <ArrowRight size={18} /> : null}
          </button>
        </form>
        <details className="auth-server">
          <summary>
            <Server size={15} />{" "}
            {tr("Conexión al servidor", "Server connection")}
          </summary>
          <label>
            <span>{tr("Dirección", "Address")}</span>
            <input
              value={server}
              onChange={(event) => setServer(event.target.value)}
              inputMode="url"
              placeholder="http://192.168.0.116:5174"
            />
          </label>
        </details>
        <p className="auth-note">
          {tr(
            "Para esta prueba local usa una contraseña que no reutilices en otros servicios.",
            "For this local test, use a password you do not reuse elsewhere.",
          )}
        </p>
      </section>
    </main>
  );
}
