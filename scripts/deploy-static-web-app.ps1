param(
  [switch]$DryRun,
  [ValidateSet("production", "preview")]
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot

function Get-PublicBuildSetting([string]$Name) {
  $fromProcess = [Environment]::GetEnvironmentVariable($Name)
  if (-not [string]::IsNullOrWhiteSpace($fromProcess)) { return $fromProcess.Trim() }

  $envFile = Join-Path $repoRoot ".env"
  if (-not (Test-Path -LiteralPath $envFile)) { return "" }
  foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match "^\s*$([Regex]::Escape($Name))\s*=\s*(.*)$") {
      return $Matches[1].Trim().Trim('"').Trim("'")
    }
  }
  return ""
}

try {
  $missing = @()
  foreach ($name in @("VITE_ENTRA_TENANT_ID", "VITE_ENTRA_CLIENT_ID")) {
    if ([string]::IsNullOrWhiteSpace((Get-PublicBuildSetting $name))) { $missing += $name }
  }
  if ($missing.Count -gt 0) {
    throw "Set the public SPA build settings in .env or the process environment: $($missing -join ', '). Values are not printed by this script."
  }

  Write-Host "Building the game and leaderboard API..."
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE." }

  $webOutput = Join-Path $repoRoot "apps/web/dist"
  $apiOutput = Join-Path $repoRoot "apps/leaderboard-api"
  foreach ($path in @(
    (Join-Path $webOutput "index.html"),
    (Join-Path $webOutput "staticwebapp.config.json"),
    (Join-Path $apiOutput "host.json"),
    (Join-Path $apiOutput "package.json"),
    (Join-Path $apiOutput "dist/index.js")
  )) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Required deployment file is missing: $path" }
  }

  $stagingRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot ".swa"))
  $stagedApi = [System.IO.Path]::GetFullPath((Join-Path $stagingRoot "leaderboard-api"))
  New-Item -ItemType Directory -Path $stagingRoot -Force | Out-Null
  if (-not $stagedApi.StartsWith($stagingRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to stage outside the expected .swa directory."
  }
  if (Test-Path -LiteralPath $stagedApi) {
    $resolvedStage = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stagedApi).Path)
    if (-not $resolvedStage.StartsWith($stagingRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Refusing to remove a staging path outside the expected .swa directory."
    }
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }

  New-Item -ItemType Directory -Path $stagedApi -Force | Out-Null
  $stagedLibrary = Join-Path $stagedApi "lib"
  New-Item -ItemType Directory -Path $stagedLibrary -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $apiOutput "host.json") -Destination $stagedApi
  $apiPackage = Get-Content -Raw -LiteralPath (Join-Path $apiOutput "package.json") | ConvertFrom-Json
  $apiPackage.main = "lib/index.js"
  $apiPackageJson = $apiPackage | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText((Join-Path $stagedApi "package.json"), $apiPackageJson, [System.Text.UTF8Encoding]::new($false))

  $compiledOutput = Join-Path $apiOutput "dist"
  foreach ($compiledFile in Get-ChildItem -LiteralPath $compiledOutput -Recurse -File -Filter "*.js" | Where-Object { $_.Name -notlike "*.test.js" }) {
    $relativePath = $compiledFile.FullName.Substring($compiledOutput.Length).TrimStart([char[]]@("\", "/"))
    $destination = Join-Path $stagedLibrary $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $compiledFile.FullName -Destination $destination
  }

  $stagedEntryPoint = Join-Path $stagedLibrary "index.js"
  if (-not (Test-Path -LiteralPath $stagedEntryPoint)) { throw "The staged Functions entry point is missing: $stagedEntryPoint" }

  Write-Host "Installing standalone production dependencies for the Functions API..."
  & npm.cmd install --omit=dev --prefix $stagedApi --workspaces=false --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "Could not install production dependencies into the staged API package." }
  foreach ($dependency in @("@azure/functions", "@azure/cosmos", "jose", "zod")) {
    $dependencyManifest = Join-Path $stagedApi "node_modules/$dependency/package.json"
    if (-not (Test-Path -LiteralPath $dependencyManifest)) { throw "Required staged API runtime dependency is missing: $dependency" }
  }
  if (Test-Path -LiteralPath (Join-Path $stagedApi "local.settings.json")) {
    throw "Local settings must never be copied into the staged API artifact."
  }

  if ($DryRun) {
    Write-Host "Dry run complete. The standalone Functions API package is ready; no Azure upload was started."
    return
  }

  Write-Host "Deploying the SPA and managed Functions API to the $Environment environment..."
  & npx.cmd swa deploy $webOutput --api-location $stagedApi --api-language node --api-version 22 --env $Environment
  if ($LASTEXITCODE -ne 0) {
    throw "SWA deployment failed with exit code $LASTEXITCODE. Sign in with 'npx swa login' or set SWA_CLI_DEPLOYMENT_TOKEN, then retry."
  }
} finally {
  Pop-Location
}
