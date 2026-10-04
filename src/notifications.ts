import { Capacitor } from "@capacitor/core";
import type { Invoice } from "./types";
import { money } from "./domain.mjs";
export async function enableNotifications(invoices: Invoice[]) {
  if (!Capacitor.isNativePlatform())
    throw new Error(
      "En el navegador puedes exportar tus vencimientos al calendario.",
    );
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(
      "Activa el permiso de notificaciones en los ajustes del teléfono.",
    );
  await syncNotifications(invoices);
}
export async function syncNotifications(invoices: Invoice[], enabled = true) {
  if (!Capacitor.isNativePlatform()) return;
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length)
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  if (!enabled) return;
  await LocalNotifications.createChannel({
    id: "payments",
    name: "Vencimientos",
    importance: 4,
  });
  const notifications = invoices
    .filter((i) => !i.paidDate)
    .flatMap((i, index) =>
      [7, 3, 1, 0].flatMap((days, offset) => {
        const at = new Date(`${i.dueDate}T09:00:00`);
        at.setDate(at.getDate() - days);
        return at.valueOf() > Date.now()
          ? [
              {
                id: index * 4 + offset + 1,
                title: days
                  ? `Tu pago vence en ${days} ${days === 1 ? "día" : "días"}`
                  : "Tu pago vence hoy",
                body: `${i.entity} · ${money(i.amount)}`,
                schedule: { at, allowWhileIdle: true },
                isExactNotification: false,
                channelId: "payments",
              },
            ]
          : [];
      }),
    );
  if (notifications.length)
    await LocalNotifications.schedule({ notifications });
}
export async function testNotification() {
  if (!Capacitor.isNativePlatform())
    throw new Error("Prueba disponible en la app para Android.");
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(
      "Activa el permiso de notificaciones en los ajustes del teléfono.",
    );
  await LocalNotifications.createChannel({
    id: "payments",
    name: "Vencimientos",
    importance: 4,
  });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 2147483647,
        title: "CuentAI está listo para avisarte",
        body: "Este es tu recordatorio de prueba.",
        channelId: "payments",
        isExactNotification: false,
        schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true },
      },
    ],
  });
}
