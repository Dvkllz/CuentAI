param([string]$SdkRoot, [string]$JavaHome)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
if (-not $SdkRoot) {
  $SdkRoot = if (Test-Path "$taskRoot\.tools\android-sdk") { "$taskRoot\.tools\android-sdk" } else { $env:ANDROID_HOME }
}
if (-not $JavaHome) {
  $taskJava = Get-ChildItem "$taskRoot\.tools\java" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
  $JavaHome = if ($taskJava) { $taskJava.FullName } else { $env:JAVA_HOME }
}
if (-not $SdkRoot -or -not (Test-Path -LiteralPath $SdkRoot)) { throw 'Configura Android SDK 36 con -SdkRoot o ANDROID_HOME.' }
if (-not $JavaHome -or -not (Test-Path "$JavaHome\bin\java.exe")) { throw 'Configura Java 21 con -JavaHome o JAVA_HOME.' }
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $SdkRoot
$env:GRADLE_USER_HOME = "$taskRoot\.gradle-user"
$env:ANDROID_USER_HOME = "$taskRoot\.tools\android-user"
$taskNodeCommand = Get-Command node -ErrorAction SilentlyContinue
$taskBundled = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node'
$taskNode = if ($taskNodeCommand) { $taskNodeCommand.Source } else { "$taskBundled\bin\node.exe" }
if (-not (Test-Path $taskNode)) { throw 'Instala Node.js 24.' }
$env:PATH = (Split-Path -Parent $taskNode) + ';' + $JavaHome + '\bin;' + $env:PATH
$taskPnpmCommand = Get-Command pnpm -ErrorAction SilentlyContinue
if ($taskPnpmCommand) { & $taskPnpmCommand.Source build }
else { & $taskNode "$taskBundled\node_modules\pnpm\bin\pnpm.cjs" build }
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación web.' }
& $taskNode node_modules/@capacitor/cli/bin/capacitor sync android
if ($LASTEXITCODE -ne 0) { throw 'Falló la sincronización Android.' }
& $taskNode scripts/check-client-secrets.mjs
if ($LASTEXITCODE -ne 0) { throw 'Falló la revisión de secretos.' }
('sdk.dir=' + $SdkRoot.Replace('\', '/')) | Set-Content android/local.properties -Encoding ascii
Push-Location android
try {
  & .\gradlew.bat --no-daemon --console=plain --max-workers=2 assembleDebug
  if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación del APK.' }
} finally { Pop-Location }
New-Item -ItemType Directory -Path releases -Force | Out-Null
$taskApk = Join-Path $taskRoot 'releases\CuentAI-0.1.0-test.apk'
Copy-Item -LiteralPath android/app/build/outputs/apk/debug/app-debug.apk -Destination $taskApk -Force
& "$SdkRoot\build-tools\36.0.0\apksigner.bat" verify --verbose $taskApk
if ($LASTEXITCODE -ne 0) { throw 'La firma del APK no es válida.' }
$taskHash = (Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLower()
"$taskHash  CuentAI-0.1.0-test.apk" | Set-Content releases/SHA256SUMS.txt -Encoding ascii
Write-Host "APK de prueba listo: $taskApk"
