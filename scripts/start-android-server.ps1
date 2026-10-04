$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskAddresses = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())
$taskIP = $taskAddresses | Where-Object {
  $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
  $_.IPAddressToString -match '^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)'
} | Select-Object -First 1
if (-not $taskIP) { throw 'Conecta el computador a la misma red Wi-Fi que tu teléfono.' }
$env:HOST = $taskIP.IPAddressToString
$env:PORT = '5174'
$taskURL = 'http://' + $env:HOST + ':' + $env:PORT
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Instala Node.js 24.' }
if (-not (Test-Path -LiteralPath "$taskRoot\dist\index.html")) { throw 'Compila primero la aplicación con pnpm build.' }
$taskReady = $false
try { $taskHealth = Invoke-RestMethod ($taskURL + '/api/health') -TimeoutSec 2; $taskReady = $taskHealth.version -eq '0.1.0' } catch {}
if (-not $taskReady) {
  New-Item -ItemType Directory -Path "$taskRoot\artifacts" -Force | Out-Null
  Start-Process -FilePath $taskNode -ArgumentList @(('"' + "$taskRoot\server\index.mjs" + '"'), '--production') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$taskRoot\artifacts\servidor-android.log" -RedirectStandardError "$taskRoot\artifacts\servidor-android-error.log"
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    Start-Sleep -Milliseconds 250
    try { $taskHealth = Invoke-RestMethod ($taskURL + '/api/health') -TimeoutSec 1; if ($taskHealth.version -eq '0.1.0') { $taskReady = $true; break } } catch {}
  }
}
if (-not $taskReady) { throw 'No pudimos iniciar el servidor. Revisa artifacts/servidor-android-error.log.' }
Write-Host "En Android: Ajustes > Conexión al servidor de IA > $taskURL"
Write-Host 'Mantén este computador encendido y ambos dispositivos en la misma red Wi-Fi.'
Write-Host 'Usa esta conexión solo para pruebas en tu red local. No expongas el puerto a Internet.'
