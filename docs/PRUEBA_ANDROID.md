# Probar CuentAI en Android

## Instalar

1. Descarga **CuentAI-0.1.0-test.apk** desde la sección [Releases](https://github.com/Dvkllz/CuentAI/releases).
2. Abre el APK en tu teléfono y permite instalar desde el navegador o gestor de archivos que hayas usado.
3. Abre CuentAI. Requiere Android 7 o posterior. Esta compilación está firmada para pruebas y no es una publicación de Google Play.

## Conectar la IA

El APK incluye la interfaz y guarda las facturas en el teléfono. La lectura con IA y el asistente necesitan conectarse al servidor del computador; la clave nunca se incluye en el APK.

1. En el computador, ejecuta **Servidor para Android.cmd**. La clave debe estar configurada en `.env.local`.
2. Conecta computador y teléfono a la misma red Wi-Fi.
3. Copia la dirección que muestra la ventana en **Ajustes → Conexión al servidor de IA**, en Android, y guarda los ajustes.
4. Si Windows pregunta por el acceso a la red, permite el servidor únicamente en tu red privada. Si no conecta, revisa el firewall, la dirección y que la red no aísle los dispositivos.

La dirección comienza por `http://` para esta prueba local. Solo el APK de prueba permite HTTP; una distribución final debe usar un servidor HTTPS con autenticación. Mantén el computador encendido al usar las funciones de IA. La captura, los registros manuales y los recordatorios guardados funcionan sin el servidor.

## Recorrido de prueba

1. Pulsa **Usar mis facturas** para salir de los ejemplos.
2. Pulsa **Nueva factura → Tomar una foto**, fotografía una factura y pulsa **Leer con IA**. Confirma importe, entidad y vencimiento antes de guardar.
3. Usa **Cargar documento** para una captura de pantalla o PDF. También puedes completar los campos sin documento.
4. En **Ajustes**, activa los recordatorios y guarda. Permite las notificaciones cuando Android lo solicite.
5. Abre Ajustes y pulsa **Probar notificación**. Se programa para dentro de diez segundos. Android puede retrasarla; revisa el permiso, el modo No molestar y el ahorro de batería si no aparece.
6. Registra una factura con vencimiento futuro. Los avisos se programan siete, tres y un día antes, y el día límite, alrededor de las 9:00 a. m. Al registrar el pago se cancelan sus avisos pendientes.
7. Revisa calendario, archivo, pagos con comprobante, PDF, análisis y asistente. Crea un respaldo antes de desinstalar.

Los horarios son aproximados: se usan alarmas normales de Android, sin exigir el permiso especial de alarmas exactas. No se ha verificado aún el comportamiento en tu teléfono; esta versión permite hacer esa prueba.

## Compilar otra vez

Instala Node.js 24, pnpm, Java 21, Android SDK 36 y Build Tools 36.0.0. Ejecuta `pnpm install`, después:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/build-android.ps1 -SdkRoot "C:\ruta\android-sdk" -JavaHome "C:\ruta\jdk-21"
```

El resultado está en `releases/CuentAI-0.1.0-test.apk`, con su suma SHA-256. Conserva tu clave de firma de prueba para poder actualizar una instalación existente sin desinstalarla.
