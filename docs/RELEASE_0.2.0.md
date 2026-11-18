# CuentAI 0.2.0 · Cuentas y acceso protegido

Instala **CuentAI-0.2.0-test.apk** en Android 7 o posterior. Es una compilación de depuración firmada para pruebas.

## Cambios

- Pantalla bilingüe para registrarse e iniciar sesión.
- Contraseñas derivadas mediante scrypt; nunca se almacenan en texto plano.
- Sesiones opacas revocables de 30 días y opción para cerrar sesión.
- Lectura con IA y asistente bloqueados sin una sesión válida.
- Facturas y documentos locales separados por cuenta.
- Migración de los datos locales anteriores hacia la primera cuenta usada.
- Versión Android `versionCode 3` y `versionName 0.2.0`.

## Límites de esta prueba

- El servidor local conserva las cuentas en `.data/auth.json` y no incluye recuperación de contraseña ni verificación por correo.
- La conexión Wi-Fi de prueba usa HTTP. Usa una contraseña exclusiva para probar; una publicación real debe usar HTTPS y almacenamiento administrado.
- La IA necesita que el computador y el teléfono estén en la misma red Wi-Fi y que el servidor permanezca ejecutándose.

## Verificación

- 15 pruebas automatizadas aprobadas, incluido el ciclo registro → sesión → cierre.
- Compilación web y Android SDK 36 correctas.
- Firma APK v2 verificada.
- Clave de OpenAI ausente de los archivos distribuidos.
- Extracción real con IA validada después de autenticar una cuenta temporal.
