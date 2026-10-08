import { Capacitor } from "@capacitor/core";
import type { Invoice } from "./types";
import { money, tr } from "./locale";
export async function enableNotifications(invoices: Invoice[]) {
  if (!Capacitor.isNativePlatform())
    throw new Error(tr("En el navegador puedes exportar tus vencimientos al calendario.", "In the browser, you can export due dates to your calendar."));
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(tr("Activa el permiso de notificaciones en los ajustes del teléfono.", "Enable notification permission in your phone settings."));
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
    name: tr("Vencimientos", "Due dates"),
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
                  ? tr(
                      `Tu pago vence en ${days} ${days === 1 ? "día" : "días"}`,
                      `Your payment is due in ${days} ${days === 1 ? "day" : "days"}`,
                    )
                  : tr("Tu pago vence hoy", "Your payment is due today"),
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
    throw new Error(tr("Prueba disponible en la app para Android.", "This test is available in the Android app."));
  const { LocalNotifications } = await import("@capacitor/local-notifications");
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted")
    throw new Error(tr("Activa el permiso de notificaciones en los ajustes del teléfono.", "Enable notification permission in your phone settings."));
  await LocalNotifications.createChannel({
    id: "payments",
    name: tr("Vencimientos", "Due dates"),
    importance: 4,
  });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 2147483647,
        title: tr("CuentAI está listo para avisarte", "CuentAI is ready to remind you"),
        body: tr("Este es tu recordatorio de prueba.", "This is your test reminder."),
        channelId: "payments",
        isExactNotification: false,
        schedule: { at: new Date(Date.now() + 10000), allowWhileIdle: true },
      },
    ],
  });
}
