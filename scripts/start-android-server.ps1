$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskIP = Get-NetIPConfiguration | Where-Object {
  $_.NetAdapter.Status -eq 'Up' -and $_.IPv4DefaultGateway -and $_.IPv4Address
} | ForEach-Object { $_.IPv4Address } | Select-Object -First 1
if (-not $taskIP) { throw 'Conecta el computador a la misma red Wi-Fi que tu teléfono.' }
$taskURL = 'http://' + $taskIP.IPAddress + ':5174'
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { throw 'Instala Node.js 24.' }
$taskReady = $false
try { $taskHealth = Invoke-RestMethod ($taskURL + '/api/health') -TimeoutSec 2; $taskReady = $taskHealth.version -eq '0.2.3' -and $taskHealth.ready } catch {}
if (-not $taskReady) {
  New-Item -ItemType Directory -Path "$taskRoot\artifacts" -Force | Out-Null
  Start-Process -FilePath $taskNode -ArgumentList @(('"' + "$taskRoot\server\index.mjs" + '"'), '--android') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput "$taskRoot\artifacts\servidor-android.log" -RedirectStandardError "$taskRoot\artifacts\servidor-android-error.log"
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    Start-Sleep -Milliseconds 250
    try { $taskHealth = Invoke-RestMethod ($taskURL + '/api/health') -TimeoutSec 1; if ($taskHealth.version -eq '0.2.3' -and $taskHealth.ready) { $taskReady = $true; break } } catch {}
  }
}
if (-not $taskReady) { throw 'No pudimos iniciar el servidor. Revisa artifacts/servidor-android-error.log.' }
Write-Host "La APK debe haberse compilado con esta dirección: $taskURL"
Write-Host 'Mantén este computador encendido y ambos dispositivos en la misma red Wi-Fi.'
Write-Host 'Usa esta conexión solo para pruebas en tu red local. No expongas el puerto a Internet.'
