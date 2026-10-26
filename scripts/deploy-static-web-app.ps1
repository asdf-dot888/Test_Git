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

  if ($DryRun) {
    Write-Host "Dry run complete. The SPA and Functions API build outputs are present; no Azure upload was started."
    return
  }

  Write-Host "Deploying the SPA and managed Functions API to the $Environment environment..."
  & npx.cmd swa deploy $webOutput --api-location $apiOutput --env $Environment
  if ($LASTEXITCODE -ne 0) {
    throw "SWA deployment failed with exit code $LASTEXITCODE. Sign in with 'npx swa login' or set SWA_CLI_DEPLOYMENT_TOKEN, then retry."
  }
} finally {
  Pop-Location
}
