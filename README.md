# CuentAI

Versión inicial 0.1 de una aplicación para organizar facturas y obligaciones en pesos colombianos. La interfaz se adapta al teléfono y al escritorio, con tipografía de sistema, temas claro y oscuro y acentos azules.

## Probar la app

Abre `http://127.0.0.1:5173` mientras el servidor esté activo. También puedes ejecutar **Iniciar CuentAI.cmd** para iniciar la versión compilada y abrirla en el navegador.

La primera visita muestra ejemplos claramente identificados. Pulsa **Usar mis facturas** para comenzar con tu archivo vacío. Los ejemplos no se mezclan con tus registros.

## Funciones implementadas

- Cámara en Android y carga de imágenes JPG, PNG, WebP o PDF, hasta 12 MB por documento.
- Extracción real con OpenAI y revisión de entidad, importe, fechas, categoría y referencia antes de guardar.
- Registro manual cuando no se usa la IA o no hay conexión al servidor.
- Inicio con totales del mes y pagos próximos; calendario y búsqueda con filtros.
- Registro de pago total, comprobante opcional, edición y eliminación de facturas.
- Vista de imágenes y PDF con navegación por páginas.
- Distribución por categoría, comparación entre periodos y proyección de 30 días.
- Estimaciones mensuales únicamente con tres periodos regulares; importes basados en su mediana e intervalos de fecha explícitos.
- Asistente conectado a las facturas registradas y totales calculados por reglas.
- Respaldo y restauración de registros y documentos; exportación de vencimientos con avisos en formato ICS.
- Programación de notificaciones locales en Android cuando el usuario las activa.
- Interfaz completa en español e inglés, incluidas fechas, categorías, notificaciones, extracción con IA y asistente.
- Tema claro u oscuro persistente en el dispositivo y compatible con respaldos anteriores.
- Versión web compilada con caché para abrir las pantallas sin conexión. La lectura con IA requiere conexión.

## Desarrollo

Requiere Node.js 24 y pnpm 11 o posterior.

```sh
pnpm install
pnpm dev
pnpm test
pnpm build
pnpm start
```

El servidor y la aplicación comparten el puerto 5173. Para cambiarlo usa `PORT` en `.env.local`. El servidor se limita a `127.0.0.1` de forma predeterminada.

La clave se configura en `.env.local` como `OPENAI_API_KEY`. El modelo se puede cambiar con `OPENAI_MODEL`; el valor inicial es `gpt-4.1-mini`. La clave ya se configuró en este equipo y el archivo está excluido del control de versiones. La clave no se empaqueta en la aplicación ni en Android.

## Proyecto Android

El proyecto nativo está en `android/`, con identidad `com.cuentai.app`. Incluye cámara, almacenamiento para exportación, compartir archivos y notificaciones locales.

```sh
pnpm android:sync
pnpm android:open
```

El APK de prueba se distribuye en [Releases](https://github.com/Dvkllz/CuentAI/releases). Consulta [la guía de prueba Android](docs/PRUEBA_ANDROID.md) para instalarlo, conectar la IA por Wi-Fi y probar las notificaciones. Las funciones nativas todavía requieren comprobación en un teléfono o emulador.

Para compilar usa Java 21, Android SDK 36 y `scripts/build-android.ps1`. Las herramientas locales están en `.tools/` y excluidas del repositorio. El APK usa firma de depuración.

En el teléfono, configura la dirección HTTPS de tu servidor en **Ajustes → Conexión al servidor de IA**. Para pruebas en la red local se puede iniciar el servidor con `HOST=0.0.0.0` y la configuración de Android correspondiente. La versión inicial no incorpora autenticación; antes de publicar el servidor fuera del equipo hay que añadir autenticación y controles de acceso. `ALLOWED_ORIGINS` admite una lista de orígenes separados por comas.

El idioma y el tema se cambian en **Ajustes → Apariencia**. Ambas preferencias se guardan en IndexedDB. El idioma seleccionado también controla el texto generado por el asistente, las advertencias de extracción, las notificaciones y los calendarios exportados.

## Datos y límites

Los documentos se guardan en IndexedDB, dentro del almacenamiento de la app o navegador. No hay sincronización entre dispositivos ni cifrado adicional de la aplicación. Al borrar los datos del navegador o desinstalar la app se puede perder el archivo: conserva un respaldo.

El documento se envía a OpenAI únicamente al pulsar **Leer con IA**. Al preguntar al asistente se envían la pregunta y los datos de las facturas que fundamentan la respuesta. Las solicitudes usan `store: false`; esto no sustituye las condiciones de retención del proveedor.

CuentAI registra pagos realizados por el usuario; no ejecuta pagos bancarios. La versión inicial registra pagos totales, sin conciliación ni pagos parciales. Las predicciones son orientativas y las respuestas del asistente deben contrastarse con los documentos originales.

## Verificación

Las pruebas automatizadas verifican fechas, totales, recurrencia, comparación, exportación bilingüe de calendario, preferencias de idioma y tema, validación de archivos, respaldo y restricciones del servidor. La revisión en navegador comprobó lectura real de una factura de prueba, confirmación, pago con comprobante y persistencia tras recargar, además de la interfaz móvil.

Referencias de implementación: [OpenAI Responses y archivos](https://developers.openai.com/api/docs/guides/file-inputs), [salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs), [Capacitor](https://capacitorjs.com/docs), [PDF.js](https://mozilla.github.io/pdf.js/examples/).
