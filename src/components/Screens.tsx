import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  ScanLine,
  Sparkles,
  Search,
  CalendarDays,
  ShieldCheck,
  Wallet,
  SlidersHorizontal,
} from "lucide-react";
import {
  addDays,
  dateLabel,
  daysUntil,
  money,
  monthLabel,
  overview,
  projection,
  variations,
  todayISO,
  groupKey,
} from "../domain.mjs";
import type { Invoice } from "../types";
import { CategoryIcon, Empty, InvoiceRow } from "./UI";
type Base = {
  invoices: Invoice[];
  onSelect: (id: string) => void;
  onAdd: () => void;
};
export function HomeScreen({
  invoices,
  onSelect,
  onAdd,
  onArchive,
  onAssistant,
}: Base & { onArchive: () => void; onAssistant: () => void }) {
  const today = todayISO();
  const summary = overview(invoices, today.slice(0, 7), today);
  const next = summary.next[0];
  const changes = variations(invoices);
  const change = changes[0];
  return (
    <>
      <div className="screen-heading">
        <div>
          <p className="eyebrow">TU TRANQUILIDAD, EN NÚMEROS</p>
          <h1>
            Tus cuentas,
            <br className="mobile-only" /> en calma
            <span className="blue-dot">.</span>
          </h1>
          <p>Un lugar para tenerlo todo bajo control.</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          Nueva factura
        </button>
      </div>
      {summary.overdue > 0 ? (
        <p className="overdue-note">
          Hay {money(summary.overdue)} en facturas vencidas. Revisa los
          pendientes.
        </p>
      ) : null}
      <div className="home-grid">
        <section className="summary-card">
          <div className="summary-top">
            <span>{monthLabel(today)}</span>
            <span className="summary-tag">
              <span className="live-dot" /> Tu resumen
            </span>
          </div>
          <p className="summary-label">Por pagar este mes</p>
          <div className="hero-amount">{money(summary.pending)}</div>
          <div className="summary-bottom">
            <span>
              <span className="check-circle">
                <Check size={13} />
              </span>{" "}
              Pagado <strong>{money(summary.paid)}</strong>
            </span>
            <span>
              {summary.pendingCount}{" "}
              {summary.pendingCount === 1 ? "pendiente" : "pendientes"}
            </span>
          </div>
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
        </section>
        <section className="next-card">
          <div className="section-title">
            <h2>Lo próximo</h2>
            <CalendarDays size={19} />
          </div>
          {next ? (
            <>
              <div className="next-info">
                <CategoryIcon category={next.category} />
                <div>
                  <strong>{next.entity}</strong>
                  <small>{next.category}</small>
                </div>
                <span
                  className={`due-pill ${daysUntil(next.dueDate, today) < 0 ? "overdue" : ""}`}
                >
                  {daysUntil(next.dueDate, today) < 0
                    ? "Vencida"
                    : daysUntil(next.dueDate, today) === 0
                      ? "Hoy"
                      : `En ${daysUntil(next.dueDate, today)} días`}
                </span>
              </div>
              <div className="next-amount">{money(next.amount)}</div>
              <div className="next-footer">
                <span>Fecha límite · {dateLabel(next.dueDate)}</span>
                <button
                  onClick={() => onSelect(next.id)}
                  aria-label={`Ver factura de ${next.entity}`}
                >
                  <ArrowUpRight size={21} />
                </button>
              </div>
            </>
          ) : (
            <div className="all-clear">
              <ShieldCheck size={36} />
              <h3>{invoices.length ? "Todo al día" : "Vamos a empezar"}</h3>
              <p>
                {invoices.length
                  ? "No tienes pagos pendientes."
                  : "Añade una factura para ver tu próximo pago."}
              </p>
            </div>
          )}
        </section>
        <section className="card upcoming-card">
          <div className="section-title">
            <h2>
              Próximos pagos{" "}
              <span className="count-badge">{summary.next.length}</span>
            </h2>
            <button className="text-button" onClick={onArchive}>
              Ver todo <ArrowRight size={15} />
            </button>
          </div>
          {summary.next.length ? (
            summary.next
              .slice(0, 4)
              .map((i) => (
                <InvoiceRow
                  key={i.id}
                  invoice={i}
                  onClick={() => onSelect(i.id)}
                />
              ))
          ) : (
            <Empty
              title="Tu siguiente paso"
              text="Fotografía una factura o ingresa sus datos. Nosotros ponemos orden."
              action="Añadir factura"
              onAction={onAdd}
            />
          )}
        </section>
        <div className="home-right-stack">
          <button className="scan-card" onClick={onAdd}>
            <div className="scan-illustration">
              <div className="paper">
                <span />
                <span />
                <span />
                <i />
                <span />
              </div>
              <ScanLine size={64} strokeWidth={1.1} />
            </div>
            <div>
              <h3>
                Una foto.
                <br />
                Una cuenta menos en tu cabeza.
              </h3>
              <p>Digitaliza tu próxima factura.</p>
              <span>
                Añadir documento <ArrowRight size={15} />
              </span>
            </div>
          </button>
          {change ? (
            <button
              className="insight-card"
              onClick={() => onSelect(change.current.id)}
            >
              <span className="insight-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <span className="eyebrow">UNA MIRADA A TUS GASTOS</span>
                <h3>
                  {change.current.category}{" "}
                  {change.change > 0 ? "subió" : "bajó"}{" "}
                  {Math.abs(change.change).toFixed(0)} %
                </h3>
                <p>Frente al periodo anterior de {change.current.entity}.</p>
                <span>
                  Ver comparación <ArrowRight size={14} />
                </span>
              </div>
            </button>
          ) : (
            <button className="insight-card" onClick={onAssistant}>
              <span className="insight-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <span className="eyebrow">UN POCO DE CLARIDAD</span>
                <h3>Pregúntale a CuentAI</h3>
                <p>Consulta tus pagos sin buscar entre papeles.</p>
              </div>
            </button>
          )}
        </div>
      </div>
      <p className="local-note">
        <ShieldCheck size={14} /> Tus documentos se guardan en este dispositivo.
      </p>
    </>
  );
}
export function CalendarScreen({ invoices, onSelect, onAdd }: Base) {
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState("");
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const start = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const visible = invoices
    .filter((i) =>
      selected ? i.dueDate === selected : i.dueDate.startsWith(month),
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  function move(n: number) {
    const date = new Date(y, m - 1 + n, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
    setSelected("");
  }
  return (
    <>
      <div className="screen-heading">
        <div>
          <p className="eyebrow">CADA PAGO, A SU TIEMPO</p>
          <h1>
            Calendario<span className="blue-dot">.</span>
          </h1>
          <p>Tus fechas importantes, a simple vista.</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          Nueva factura
        </button>
      </div>
      <div className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-month">
            <button
              className="icon-button"
              onClick={() => move(-1)}
              aria-label="Mes anterior"
            >
              <ChevronLeft />
            </button>
            <h2>{monthLabel(`${month}-01`)}</h2>
            <button
              className="icon-button"
              onClick={() => move(1)}
              aria-label="Mes siguiente"
            >
              <ChevronRight />
            </button>
          </div>
          <div className="calendar-week">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="calendar-days">
            {Array.from({ length: start }, (_, i) => (
              <span key={`gap-${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const events = invoices.filter((b) => b.dueDate === date);
              return (
                <button
                  key={date}
                  onClick={() => setSelected(selected === date ? "" : date)}
                  className={`${date === today ? "today" : ""} ${selected === date ? "selected" : ""}`}
                  aria-pressed={selected === date}
                  aria-label={`${dateLabel(date)}, ${events.length} facturas`}
                >
                  <span>{i + 1}</span>
                  <div className="calendar-dots">
                    {events.slice(0, 3).map((e) => (
                      <i
                        key={e.id}
                        className={
                          e.paidDate ? "paid" : e.dueDate < today ? "late" : ""
                        }
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i /> Pendiente
            </span>
            <span>
              <i className="paid" /> Pagada
            </span>
            <span>
              <i className="late" /> Vencida
            </span>
          </div>
        </section>
        <section className="card calendar-list">
          <div className="section-title">
            <h2>{selected ? dateLabel(selected) : "Este mes"}</h2>
            {selected ? (
              <button className="text-button" onClick={() => setSelected("")}>
                Ver mes
              </button>
            ) : (
              <span className="count-badge">{visible.length}</span>
            )}
          </div>
          {visible.length ? (
            visible.map((i) => (
              <InvoiceRow
                key={i.id}
                invoice={i}
                onClick={() => onSelect(i.id)}
              />
            ))
          ) : (
            <Empty
              title="Sin vencimientos"
              text="Las facturas con esta fecha aparecerán aquí."
            />
          )}
        </section>
      </div>
    </>
  );
}
export function ArchiveScreen({ invoices, onSelect, onAdd }: Base) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [category, setCategory] = useState("Todas");
  const q = query.toLocaleLowerCase("es");
  const categories = [...new Set(invoices.map((i) => i.category))].sort();
  const visible = invoices
    .filter(
      (i) =>
        (!q ||
          [i.entity, i.category, i.reference, i.period].some((v) =>
            v.toLocaleLowerCase("es").includes(q),
          )) &&
        (filter === "Todas" ||
          (filter === "Pagadas" ? !!i.paidDate : !i.paidDate)) &&
        (category === "Todas" || i.category === category),
    )
    .sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  return (
    <>
      <div className="screen-heading">
        <div>
          <p className="eyebrow">TODO TIENE SU LUGAR</p>
          <h1>
            Tu archivo<span className="blue-dot">.</span>
          </h1>
          <p>Facturas, comprobantes y un poco más de orden.</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          Nueva factura
        </button>
      </div>
      <div className="archive-tools">
        <label className="search-input">
          <Search size={19} />
          <input
            aria-label="Buscar facturas"
            placeholder="Buscar entidad, categoría o periodo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="category-filter">
          <SlidersHorizontal size={17} />
          <select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Todas">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="segmented">
        {["Todas", "Pendientes", "Pagadas"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <section className="card archive-list">
        <div className="section-title">
          <h2>
            {visible.length} {visible.length === 1 ? "factura" : "facturas"}
          </h2>
          <span className="muted">Ordenadas por vencimiento</span>
        </div>
        {visible.length ? (
          visible.map((i) => (
            <InvoiceRow key={i.id} invoice={i} onClick={() => onSelect(i.id)} />
          ))
        ) : (
          <Empty
            title={
              invoices.length
                ? "No encontramos coincidencias"
                : "Empieza tu archivo"
            }
            text={
              invoices.length
                ? "Prueba con otra búsqueda o categoría."
                : "Guarda tu primera factura y encuentra sus datos cuando los necesites."
            }
            action={invoices.length ? undefined : "Añadir factura"}
            onAction={onAdd}
          />
        )}
      </section>
    </>
  );
}
export function AnalysisScreen({
  invoices,
  onSelect,
  onSettings,
  income,
}: Omit<Base, "onAdd"> & { income: number | null; onSettings: () => void }) {
  const today = todayISO();
  const proj = projection(invoices, today);
  const changes = variations(invoices);
  const monthInvoices = invoices.filter((i) =>
    i.dueDate.startsWith(today.slice(0, 7)),
  );
  const groups: { category: string; amount: number }[] = [];
  monthInvoices.forEach((i) => {
    const g = groups.find((g) => g.category === i.category);
    if (g) g.amount += i.amount;
    else groups.push({ category: i.category, amount: i.amount });
  });
  groups.sort((a, b) => b.amount - a.amount);
  const total = groups.reduce((s, g) => s + g.amount, 0);
  const max = Math.max(...groups.map((g) => g.amount), 1);
  const historyMonths = [...new Set(invoices.map((i) => i.dueDate.slice(0, 7)))]
    .sort()
    .slice(-6);
  const hist = historyMonths.map((m) => ({
    m,
    sum: invoices
      .filter((i) => i.dueDate.startsWith(m))
      .reduce((s, i) => s + i.amount, 0),
  }));
  const histMax = Math.max(...hist.map((m) => m.sum), 1);
  return (
    <>
      <div className="screen-heading">
        <div>
          <p className="eyebrow">ENTENDER TAMBIÉN ES AHORRAR CALMA</p>
          <h1>
            Una mirada clara<span className="blue-dot">.</span>
          </h1>
          <p>Lo que sabes hoy. Lo que puedes anticipar.</p>
        </div>
      </div>
      <div className="analysis-grid">
        <section className="card projection-card">
          <div className="section-title">
            <h2>Próximos 30 días</h2>
            <span className="soft-tag">
              {dateLabel(today)} — {dateLabel(addDays(today, 30))}
            </span>
          </div>
          <div className="projection-total">
            {money(proj.confirmedTotal + proj.estimatedTotal)}
          </div>
          <p className="muted">Obligaciones registradas y estimadas</p>
          <div className="projection-rows">
            <div>
              <span>Confirmado</span>
              <strong>{money(proj.confirmedTotal)}</strong>
            </div>
            <div>
              <span>
                Estimado <span className="tiny-tag">Orientativo</span>
              </span>
              <strong>{money(proj.estimatedTotal)}</strong>
            </div>
            <div>
              <span>Ingreso registrado</span>
              <button className="text-button" onClick={onSettings}>
                {income === null ? "Añadir ingreso" : money(income)}{" "}
                <Wallet size={14} />
              </button>
            </div>
          </div>
          {income !== null ? (
            <div
              className={`balance ${income - proj.confirmedTotal - proj.estimatedTotal < 0 ? "negative" : ""}`}
            >
              <span>Después de obligaciones</span>
              <strong>
                {money(income - proj.confirmedTotal - proj.estimatedTotal)}
              </strong>
            </div>
          ) : (
            <p className="small-note">
              Añade un ingreso si quieres ver cuánto quedaría después de estos
              pagos.
            </p>
          )}
          <p className="small-note">
            Proyección de tus registros. Los pagos vencidos se consultan en
            Inicio.
          </p>
        </section>
        <section className="card spending-card">
          <div className="section-title">
            <h2>Por categoría</h2>
            <span className="muted">Este mes</span>
          </div>
          <div className="spending-total">{money(total)}</div>
          <p className="muted">Total facturado por fecha límite</p>
          {groups.length ? (
            groups.map((g) => (
              <div className="category-bar" key={g.category}>
                <div>
                  <span>
                    <CategoryIcon category={g.category} small />
                    {g.category}
                  </span>
                  <strong>{money(g.amount)}</strong>
                </div>
                <div className="bar-track">
                  <i style={{ width: `${(g.amount / max) * 100}%` }} />
                </div>
              </div>
            ))
          ) : (
            <Empty
              title="Tus cifras aparecerán aquí"
              text="Registra facturas para conocer su distribución."
            />
          )}
        </section>
        <section className="card trend-card">
          <div className="section-title">
            <h2>Tu historial</h2>
            <span className="muted">Importes facturados</span>
          </div>
          {hist.length ? (
            <div className="history-chart">
              {hist.map((h) => (
                <div className="chart-column" key={h.m}>
                  <small>{money(h.sum)}</small>
                  <div className="chart-bar-area">
                    <div
                      style={{
                        height: `${Math.max(8, (h.sum / histMax) * 100)}%`,
                      }}
                      className={h.m === today.slice(0, 7) ? "current" : ""}
                    />
                  </div>
                  <span>
                    {monthLabel(`${h.m}-01`).split(" ")[0].slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="Cada mes cuenta"
              text="El gráfico crece con tus facturas confirmadas."
            />
          )}
          <p className="small-note">
            Los meses con registros pueden estar incompletos.
          </p>
        </section>
        <section className="card insights-list">
          <div className="section-title">
            <h2>Lo que cambió</h2>
            <Sparkles size={18} />
          </div>
          {changes.length ? (
            changes.map((c) => (
              <button
                key={groupKey(c.current)}
                className="change-row"
                onClick={() => onSelect(c.current.id)}
              >
                <span
                  className={`change-icon ${c.change < 0 ? "decrease" : ""}`}
                >
                  {c.change > 0 ? (
                    <ArrowUpRight size={21} />
                  ) : (
                    <ArrowDownRight size={21} />
                  )}
                </span>
                <div>
                  <strong>{c.current.entity}</strong>
                  <small>
                    {money(c.previous.amount)} → {money(c.current.amount)}
                  </small>
                  <small>
                    {dateLabel(c.previous.dueDate)} frente a{" "}
                    {dateLabel(c.current.dueDate)}
                  </small>
                </div>
                <span
                  className={c.change > 0 ? "increase-text" : "decrease-text"}
                >
                  {c.change > 0 ? "+" : ""}
                  {c.change.toFixed(0)} %
                </span>
              </button>
            ))
          ) : (
            <Empty
              title="Aún no hay comparaciones"
              text="Necesitas al menos dos facturas de la misma entidad y categoría."
            />
          )}
          {proj.estimated.length ? (
            <div className="estimated-list">
              <h3>Fechas estimadas</h3>
              {proj.estimated.map((p) => (
                <div key={p.entity + p.category}>
                  <strong>{p.entity}</strong>
                  <p>
                    {dateLabel(p.from)} — {dateLabel(p.to)} · cerca de{" "}
                    {money(p.amount)}
                  </p>
                  <small>
                    Mediana de {p.samples} facturas mensuales. Puede variar.
                  </small>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}
