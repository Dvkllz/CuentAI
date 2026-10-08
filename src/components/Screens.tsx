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
  daysUntil,
  overview,
  projection,
  variations,
  todayISO,
  groupKey,
} from "../domain.mjs";
import type { Invoice } from "../types";
import { CategoryIcon, Empty, InvoiceRow } from "./UI";
import {
  categoryLabel,
  dateLabel,
  language,
  money,
  monthLabel,
  tr,
} from "../locale";
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
          <p className="eyebrow">{tr("TU TRANQUILIDAD, EN NÚMEROS", "YOUR PEACE OF MIND, IN NUMBERS")}</p>
          <h1>
            {tr("Tus cuentas,", "Your bills,")}
            <br className="mobile-only" /> {tr("en calma", "under control")}
            <span className="blue-dot">.</span>
          </h1>
          <p>{tr("Un lugar para tenerlo todo bajo control.", "One place to keep everything under control.")}</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          {tr("Nueva factura", "New bill")}
        </button>
      </div>
      {summary.overdue > 0 ? (
        <p className="overdue-note">
          {tr(
            `Hay ${money(summary.overdue)} en facturas vencidas. Revisa los pendientes.`,
            `You have ${money(summary.overdue)} in overdue bills. Review them.`,
          )}
        </p>
      ) : null}
      <div className="home-grid">
        <section className="summary-card">
          <div className="summary-top">
            <span>{monthLabel(today)}</span>
            <span className="summary-tag">
              <span className="live-dot" /> {tr("Tu resumen", "Your summary")}
            </span>
          </div>
          <p className="summary-label">{tr("Por pagar este mes", "Due this month")}</p>
          <div className="hero-amount">{money(summary.pending)}</div>
          <div className="summary-bottom">
            <span>
              <span className="check-circle">
                <Check size={13} />
              </span>{" "}
              {tr("Pagado", "Paid")} <strong>{money(summary.paid)}</strong>
            </span>
            <span>
              {summary.pendingCount}{" "}
              {summary.pendingCount === 1
                ? tr("pendiente", "pending")
                : tr("pendientes", "pending")}
            </span>
          </div>
          <div className="hero-orb orb-one" />
          <div className="hero-orb orb-two" />
        </section>
        <section className="next-card">
          <div className="section-title">
            <h2>{tr("Lo próximo", "Up next")}</h2>
            <CalendarDays size={19} />
          </div>
          {next ? (
            <>
              <div className="next-info">
                <CategoryIcon category={next.category} />
                <div>
                  <strong>{next.entity}</strong>
                  <small>{categoryLabel(next.category)}</small>
                </div>
                <span
                  className={`due-pill ${daysUntil(next.dueDate, today) < 0 ? "overdue" : ""}`}
                >
                  {daysUntil(next.dueDate, today) < 0
                    ? tr("Vencida", "Overdue")
                    : daysUntil(next.dueDate, today) === 0
                      ? tr("Hoy", "Today")
                      : tr(
                          `En ${daysUntil(next.dueDate, today)} días`,
                          `In ${daysUntil(next.dueDate, today)} days`,
                        )}
                </span>
              </div>
              <div className="next-amount">{money(next.amount)}</div>
              <div className="next-footer">
                <span>{tr("Fecha límite", "Due date")} · {dateLabel(next.dueDate)}</span>
                <button
                  onClick={() => onSelect(next.id)}
                  aria-label={tr(`Ver factura de ${next.entity}`, `View bill from ${next.entity}`)}
                >
                  <ArrowUpRight size={21} />
                </button>
              </div>
            </>
          ) : (
            <div className="all-clear">
              <ShieldCheck size={36} />
              <h3>{invoices.length ? tr("Todo al día", "All caught up") : tr("Vamos a empezar", "Let's get started")}</h3>
              <p>
                {invoices.length
                  ? tr("No tienes pagos pendientes.", "You have no pending payments.")
                  : tr("Añade una factura para ver tu próximo pago.", "Add a bill to see your next payment.")}
              </p>
            </div>
          )}
        </section>
        <section className="card upcoming-card">
          <div className="section-title">
            <h2>
              {tr("Próximos pagos", "Upcoming payments")}{" "}
              <span className="count-badge">{summary.next.length}</span>
            </h2>
            <button className="text-button" onClick={onArchive}>
              {tr("Ver todo", "View all")} <ArrowRight size={15} />
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
              title={tr("Tu siguiente paso", "Your next step")}
              text={tr("Fotografía una factura o ingresa sus datos. Nosotros ponemos orden.", "Photograph a bill or enter its details. We'll organize it.")}
              action={tr("Añadir factura", "Add bill")}
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
                {tr("Una foto.", "One photo.")}
                <br />
                {tr("Una cuenta menos en tu cabeza.", "One less bill on your mind.")}
              </h3>
              <p>{tr("Digitaliza tu próxima factura.", "Digitize your next bill.")}</p>
              <span>
                {tr("Añadir documento", "Add document")} <ArrowRight size={15} />
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
                <span className="eyebrow">{tr("UNA MIRADA A TUS GASTOS", "A LOOK AT YOUR SPENDING")}</span>
                <h3>
                  {change.current.category}{" "}
                  {change.change > 0 ? tr("subió", "rose") : tr("bajó", "fell")}{" "}
                  {Math.abs(change.change).toFixed(0)} %
                </h3>
                <p>{tr("Frente al periodo anterior de", "Compared with the previous period for")} {change.current.entity}.</p>
                <span>
                  {tr("Ver comparación", "View comparison")} <ArrowRight size={14} />
                </span>
              </div>
            </button>
          ) : (
            <button className="insight-card" onClick={onAssistant}>
              <span className="insight-icon">
                <Sparkles size={20} />
              </span>
              <div>
                <span className="eyebrow">{tr("UN POCO DE CLARIDAD", "A LITTLE CLARITY")}</span>
                <h3>{tr("Pregúntale a CuentAI", "Ask CuentAI")}</h3>
                <p>{tr("Consulta tus pagos sin buscar entre papeles.", "Check your payments without searching through paperwork.")}</p>
              </div>
            </button>
          )}
        </div>
      </div>
      <p className="local-note">
        <ShieldCheck size={14} /> {tr("Tus documentos se guardan en este dispositivo.", "Your documents are stored on this device.")}
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
          <p className="eyebrow">{tr("CADA PAGO, A SU TIEMPO", "EVERY PAYMENT, ON TIME")}</p>
          <h1>
            {tr("Calendario", "Calendar")}<span className="blue-dot">.</span>
          </h1>
          <p>{tr("Tus fechas importantes, a simple vista.", "Your important dates at a glance.")}</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          {tr("Nueva factura", "New bill")}
        </button>
      </div>
      <div className="calendar-layout">
        <section className="card calendar-card">
          <div className="calendar-month">
            <button
              className="icon-button"
              onClick={() => move(-1)}
              aria-label={tr("Mes anterior", "Previous month")}
            >
              <ChevronLeft />
            </button>
            <h2>{monthLabel(`${month}-01`)}</h2>
            <button
              className="icon-button"
              onClick={() => move(1)}
              aria-label={tr("Mes siguiente", "Next month")}
            >
              <ChevronRight />
            </button>
          </div>
          <div className="calendar-week">
            {(language() === "en"
              ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              : ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
            ).map((d) => (
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
                  aria-label={tr(`${dateLabel(date)}, ${events.length} facturas`, `${dateLabel(date)}, ${events.length} bills`)}
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
              <i /> {tr("Pendiente", "Pending")}
            </span>
            <span>
              <i className="paid" /> {tr("Pagada", "Paid")}
            </span>
            <span>
              <i className="late" /> {tr("Vencida", "Overdue")}
            </span>
          </div>
        </section>
        <section className="card calendar-list">
          <div className="section-title">
            <h2>{selected ? dateLabel(selected) : tr("Este mes", "This month")}</h2>
            {selected ? (
              <button className="text-button" onClick={() => setSelected("")}>
                {tr("Ver mes", "View month")}
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
              title={tr("Sin vencimientos", "No due dates")}
              text={tr("Las facturas con esta fecha aparecerán aquí.", "Bills due on this date will appear here.")}
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
  const q = query.toLocaleLowerCase(language());
  const categories = [...new Set(invoices.map((i) => i.category))].sort();
  const visible = invoices
    .filter(
      (i) =>
        (!q ||
          [i.entity, i.category, i.reference, i.period].some((v) =>
            v.toLocaleLowerCase(language()).includes(q),
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
          <p className="eyebrow">{tr("TODO TIENE SU LUGAR", "EVERYTHING HAS ITS PLACE")}</p>
          <h1>
            {tr("Tu archivo", "Your archive")}<span className="blue-dot">.</span>
          </h1>
          <p>{tr("Facturas, comprobantes y un poco más de orden.", "Bills, receipts, and a little more order.")}</p>
        </div>
        <button className="primary-button heading-add" onClick={onAdd}>
          <Plus size={18} />
          {tr("Nueva factura", "New bill")}
        </button>
      </div>
      <div className="archive-tools">
        <label className="search-input">
          <Search size={19} />
          <input
            aria-label={tr("Buscar facturas", "Search bills")}
            placeholder={tr("Buscar entidad, categoría o periodo…", "Search entity, category, or period…")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="category-filter">
          <SlidersHorizontal size={17} />
          <select
            aria-label={tr("Filtrar por categoría", "Filter by category")}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Todas">{tr("Todas las categorías", "All categories")}</option>
            {categories.map((c) => (
              <option key={c} value={c}>{categoryLabel(c)}</option>
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
            {f === "Todas" ? tr("Todas", "All") : f === "Pendientes" ? tr("Pendientes", "Pending") : tr("Pagadas", "Paid")}
          </button>
        ))}
      </div>
      <section className="card archive-list">
        <div className="section-title">
          <h2>
            {visible.length} {visible.length === 1 ? tr("factura", "bill") : tr("facturas", "bills")}
          </h2>
          <span className="muted">{tr("Ordenadas por vencimiento", "Sorted by due date")}</span>
        </div>
        {visible.length ? (
          visible.map((i) => (
            <InvoiceRow key={i.id} invoice={i} onClick={() => onSelect(i.id)} />
          ))
        ) : (
          <Empty
            title={
              invoices.length
                ? tr("No encontramos coincidencias", "No matches found")
                : tr("Empieza tu archivo", "Start your archive")
            }
            text={
              invoices.length
                ? tr("Prueba con otra búsqueda o categoría.", "Try another search or category.")
                : tr("Guarda tu primera factura y encuentra sus datos cuando los necesites.", "Save your first bill and find its details whenever you need them.")
            }
            action={invoices.length ? undefined : tr("Añadir factura", "Add bill")}
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
          <p className="eyebrow">{tr("ENTENDER TAMBIÉN ES AHORRAR CALMA", "UNDERSTANDING BRINGS PEACE OF MIND")}</p>
          <h1>
            {tr("Una mirada clara", "A clear view")}<span className="blue-dot">.</span>
          </h1>
          <p>{tr("Lo que sabes hoy. Lo que puedes anticipar.", "What you know today. What you can anticipate.")}</p>
        </div>
      </div>
      <div className="analysis-grid">
        <section className="card projection-card">
          <div className="section-title">
            <h2>{tr("Próximos 30 días", "Next 30 days")}</h2>
            <span className="soft-tag">
              {dateLabel(today)} — {dateLabel(addDays(today, 30))}
            </span>
          </div>
          <div className="projection-total">
            {money(proj.confirmedTotal + proj.estimatedTotal)}
          </div>
          <p className="muted">{tr("Obligaciones registradas y estimadas", "Recorded and estimated obligations")}</p>
          <div className="projection-rows">
            <div>
              <span>{tr("Confirmado", "Confirmed")}</span>
              <strong>{money(proj.confirmedTotal)}</strong>
            </div>
            <div>
              <span>
                {tr("Estimado", "Estimated")} <span className="tiny-tag">{tr("Orientativo", "Guidance")}</span>
              </span>
              <strong>{money(proj.estimatedTotal)}</strong>
            </div>
            <div>
              <span>{tr("Ingreso registrado", "Recorded income")}</span>
              <button className="text-button" onClick={onSettings}>
                {income === null ? tr("Añadir ingreso", "Add income") : money(income)}{" "}
                <Wallet size={14} />
              </button>
            </div>
          </div>
          {income !== null ? (
            <div
              className={`balance ${income - proj.confirmedTotal - proj.estimatedTotal < 0 ? "negative" : ""}`}
            >
              <span>{tr("Después de obligaciones", "After obligations")}</span>
              <strong>
                {money(income - proj.confirmedTotal - proj.estimatedTotal)}
              </strong>
            </div>
          ) : (
            <p className="small-note">
              {tr("Añade un ingreso si quieres ver cuánto quedaría después de estos pagos.", "Add your income to see how much would remain after these payments.")}
            </p>
          )}
          <p className="small-note">
            {tr("Proyección de tus registros. Los pagos vencidos se consultan en Inicio.", "Projection based on your records. See overdue payments on Home.")}
          </p>
        </section>
        <section className="card spending-card">
          <div className="section-title">
            <h2>{tr("Por categoría", "By category")}</h2>
            <span className="muted">{tr("Este mes", "This month")}</span>
          </div>
          <div className="spending-total">{money(total)}</div>
          <p className="muted">{tr("Total facturado por fecha límite", "Total billed by due date")}</p>
          {groups.length ? (
            groups.map((g) => (
              <div className="category-bar" key={g.category}>
                <div>
                  <span>
                    <CategoryIcon category={g.category} small />
                    {categoryLabel(g.category)}
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
              title={tr("Tus cifras aparecerán aquí", "Your numbers will appear here")}
              text={tr("Registra facturas para conocer su distribución.", "Record bills to see their distribution.")}
            />
          )}
        </section>
        <section className="card trend-card">
          <div className="section-title">
            <h2>{tr("Tu historial", "Your history")}</h2>
            <span className="muted">{tr("Importes facturados", "Billed amounts")}</span>
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
              title={tr("Cada mes cuenta", "Every month counts")}
              text={tr("El gráfico crece con tus facturas confirmadas.", "The chart grows with your confirmed bills.")}
            />
          )}
          <p className="small-note">
            {tr("Los meses con registros pueden estar incompletos.", "Months with records may be incomplete.")}
          </p>
        </section>
        <section className="card insights-list">
          <div className="section-title">
            <h2>{tr("Lo que cambió", "What changed")}</h2>
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
                    {dateLabel(c.previous.dueDate)} {tr("frente a", "versus")}{" "}
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
              title={tr("Aún no hay comparaciones", "No comparisons yet")}
              text={tr("Necesitas al menos dos facturas de la misma entidad y categoría.", "You need at least two bills from the same entity and category.")}
            />
          )}
          {proj.estimated.length ? (
            <div className="estimated-list">
              <h3>{tr("Fechas estimadas", "Estimated dates")}</h3>
              {proj.estimated.map((p) => (
                <div key={p.entity + p.category}>
                  <strong>{p.entity}</strong>
                  <p>
                    {dateLabel(p.from)} — {dateLabel(p.to)} · {tr("cerca de", "around")}{" "}
                    {money(p.amount)}
                  </p>
                  <small>
                    {tr(`Mediana de ${p.samples} facturas mensuales. Puede variar.`, `Median of ${p.samples} monthly bills. It may vary.`)}
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
