# CuentAI 0.1.0 · Prueba Android

Instala **CuentAI-0.1.0-test.apk** en Android 7 o posterior. Es una compilación firmada para pruebas, no una publicación de Google Play.

Incluye cámara, carga de capturas y PDF, lectura con IA, registro manual, calendario, archivo, pagos con comprobantes, análisis, asistente y recordatorios locales.

## IA desde el teléfono

Ejecuta **Servidor para Android.cmd** en el computador, conecta ambos dispositivos a la misma red Wi-Fi y copia la dirección mostrada en **Ajustes → Conexión al servidor de IA**. Mantén el computador encendido. La clave permanece en `.env.local` del servidor y no se incluye en el APK ni en el repositorio.

## Probar avisos

Activa los recordatorios en Ajustes, concede el permiso y guarda. Después abre Ajustes y pulsa **Probar notificación**. Los avisos de facturas se programan 7, 3 y 1 día antes, y el día límite, alrededor de las 9:00 a. m. Android puede retrasarlos por ahorro de batería.

El APK permite HTTP para probar el servidor en la red local. Una distribución final necesita HTTPS y autenticación.

Consulta la [guía completa de Android](https://github.com/Dvkllz/CuentAI/blob/main/docs/PRUEBA_ANDROID.md).

Verificación: 12 pruebas automatizadas, compilación Android, revisión de la firma y comprobación de que la clave no está empaquetada. La cámara y la entrega de avisos aún requieren prueba en un teléfono real.
