$taskRoot = Split-Path -Parent $PSScriptRoot
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) { Write-Host 'Instala Node.js 24 para iniciar CuentAI.'; exit 1 }
if (-not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist\index.html'))) { Write-Host 'Compila primero la aplicación con pnpm build.'; exit 1 }
$taskURL = 'http://127.0.0.1:5173'
$taskReady = $false
try { $taskHealth = Invoke-RestMethod -Uri ($taskURL + '/api/health') -TimeoutSec 2; $taskReady = $taskHealth.version -eq '0.1.0' } catch {}
if (-not $taskReady) {
  $taskLogs = Join-Path $taskRoot 'artifacts'
  New-Item -ItemType Directory -Path $taskLogs -Force | Out-Null
  Start-Process -FilePath $taskNode -ArgumentList @(('"' + (Join-Path $taskRoot 'server\index.mjs') + '"'), '--production') -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $taskLogs 'servidor.log') -RedirectStandardError (Join-Path $taskLogs 'servidor-error.log')
  for ($taskAttempt = 0; $taskAttempt -lt 20; $taskAttempt++) {
    Start-Sleep -Milliseconds 250
    try { $taskHealth = Invoke-RestMethod -Uri ($taskURL + '/api/health') -TimeoutSec 1; if ($taskHealth.version -eq '0.1.0') { $taskReady = $true; break } } catch {}
  }
}
if ($taskReady) { Start-Process $taskURL } else { Write-Host 'No pudimos iniciar CuentAI. Revisa si el puerto 5173 está ocupado.' }
