# CuentAI 0.1.1 · Prueba Android con IA

Instala **CuentAI-0.1.1-test.apk** en Android 7 o posterior. Es una compilación de depuración firmada para pruebas.

## Cambios

- Dirección del servidor de IA preconfigurada para la red Wi-Fi de prueba.
- Migración automática para instalaciones que aún no tengan servidor configurado.
- Servidor Android dedicado en el puerto 5174 sin publicar la interfaz web.
- Compatibilidad con los orígenes locales usados por Capacitor.
- Versión Android `versionCode 2` y `versionName 0.1.1`.

## Verificación

- 15 pruebas automatizadas aprobadas.
- Compilación Android SDK 36 correcta.
- Firma APK v2 verificada.
- Clave de OpenAI ausente de los archivos distribuidos.
- Lectura real con IA aprobada usando una factura sintética: empresa, importe, moneda, vencimiento y periodo extraídos correctamente.

La IA necesita que el computador y el teléfono estén en la misma red Wi-Fi y que **Servidor para Android.cmd** permanezca ejecutándose.
