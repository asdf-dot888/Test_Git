param(
  [switch]$DryRun,
  [ValidateSet("production", "preview")]
  [string]$Environment = "production"
)

$ErrorActionPreference = "Stop"
# npm and npx are .cmd shims on Windows only, so use the plain commands elsewhere (same check as package-release.ps1).
$onWindows = $IsWindows -or $env:OS -eq "Windows_NT"
$npmCommand = if ($onWindows) { "npm.cmd" } else { "npm" }
$npxCommand = if ($onWindows) { "npx.cmd" } else { "npx" }
$repoRoot = Split-Path -Parent $PSScriptRoot
$staticWebAppName = "board-card-roguelike-demo"
$staticWebAppResourceGroup = "grill-me-edu"
Push-Location $repoRoot

function Invoke-GitText([string[]]$Arguments, [string]$FailureMessage) {
  $output = & git @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage $($output -join ' ')"
  }
  return ($output -join [Environment]::NewLine).Trim()
}

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
  $packagePath = Join-Path $repoRoot "package.json"
  $historyPath = Join-Path $repoRoot "deployments.json"
  $package = Get-Content -Raw -LiteralPath $packagePath | ConvertFrom-Json
  $currentVersion = [string]$package.version
  $versionMatch = [regex]::Match($currentVersion, "^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
  if (-not $versionMatch.Success) {
    throw "The root package.json version must use non-negative MAJOR.MINOR.PATCH format."
  }
  try {
    $major = [long]::Parse($versionMatch.Groups[1].Value, [Globalization.CultureInfo]::InvariantCulture)
    $minor = [long]::Parse($versionMatch.Groups[2].Value, [Globalization.CultureInfo]::InvariantCulture)
    $patch = [long]::Parse($versionMatch.Groups[3].Value, [Globalization.CultureInfo]::InvariantCulture)
    if ($Environment -eq "production") {
      if ($patch -eq [long]::MaxValue) { throw "PATCH version cannot be incremented further." }
      $patch++
    }
  } catch {
    throw "The root package.json version components are outside the supported integer range."
  }
  $candidateVersion = "$major.$minor.$patch"
  if ($Environment -eq "preview") { $candidateVersion = $currentVersion }

  $sourceCommit = $null
  if (-not $DryRun) {
    $gitStatus = Invoke-GitText -Arguments @("status", "--porcelain", "--untracked-files=normal") -FailureMessage "Could not inspect the Git working tree."
    if (-not [string]::IsNullOrWhiteSpace($gitStatus)) {
      throw "Deployment stopped because the Git working tree has uncommitted changes. Commit or remove them, then retry."
    }
    $branchName = Invoke-GitText -Arguments @("branch", "--show-current") -FailureMessage "Could not determine the current Git branch."
    if ([string]::IsNullOrWhiteSpace($branchName)) {
      throw "Deployment stopped because Git is in a detached HEAD state."
    }
    $upstreamRemote = Invoke-GitText -Arguments @("config", "--get", "branch.$branchName.remote") -FailureMessage "Deployment stopped because the current Git branch has no configured upstream remote."
    $upstreamMerge = Invoke-GitText -Arguments @("config", "--get", "branch.$branchName.merge") -FailureMessage "Deployment stopped because the current Git branch has no configured upstream branch."
    if ([string]::IsNullOrWhiteSpace($upstreamRemote) -or $upstreamRemote -eq "." -or $upstreamMerge -notmatch "^refs/heads/.+") {
      throw "Deployment stopped because the current Git branch has no configured upstream."
    }
    $sourceCommit = Invoke-GitText -Arguments @("rev-parse", "HEAD") -FailureMessage "Could not capture the deployed source commit."
  }

  $missing = @()
  foreach ($name in @("VITE_ENTRA_TENANT_ID", "VITE_ENTRA_CLIENT_ID")) {
    if ([string]::IsNullOrWhiteSpace((Get-PublicBuildSetting $name))) { $missing += $name }
  }
  if ($missing.Count -gt 0) {
    throw "Set the public SPA build settings in .env or the process environment: $($missing -join ', '). Values are not printed by this script."
  }

  Write-Host "Building Mango Stone v$candidateVersion and the leaderboard API..."
  $previousVersionOverride = [Environment]::GetEnvironmentVariable("VITE_APP_VERSION", "Process")
  try {
    [Environment]::SetEnvironmentVariable("VITE_APP_VERSION", $candidateVersion, "Process")
    & $npmCommand run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE." }
  } finally {
    [Environment]::SetEnvironmentVariable("VITE_APP_VERSION", $previousVersionOverride, "Process")
  }

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
  & $npmCommand install --omit=dev --prefix $stagedApi --workspaces=false --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "Could not install production dependencies into the staged API package." }
  foreach ($dependency in @("@azure/functions", "@azure/cosmos", "jose", "zod")) {
    $dependencyManifest = Join-Path $stagedApi "node_modules/$dependency/package.json"
    if (-not (Test-Path -LiteralPath $dependencyManifest)) { throw "Required staged API runtime dependency is missing: $dependency" }
  }
  if (Test-Path -LiteralPath (Join-Path $stagedApi "local.settings.json")) {
    throw "Local settings must never be copied into the staged API artifact."
  }

  if ($DryRun) {
    Write-Host "Dry run complete for v$candidateVersion. Build and API package checks passed; no Azure upload or release record was created."
    return
  }

  Write-Host "Deploying the SPA and managed Functions API to the $Environment environment..."
  # The SWA CLI can exit with code 0 after an authentication failure (for example a failed device-code login),
  # so success is decided from its output and from the live site, never from the exit code alone.
  $swaLines = New-Object System.Collections.Generic.List[string]
  $previousErrorPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    & $npxCommand swa deploy $webOutput --api-location $stagedApi --api-language node --api-version 22 --env $Environment --app-name $staticWebAppName --resource-group $staticWebAppResourceGroup 2>&1 | ForEach-Object {
      $line = "$_"
      $swaLines.Add($line)
      Write-Host $line
    }
    $swaExitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorPreference
  }
  if ($swaExitCode -ne 0) {
    throw "SWA deployment failed with exit code $swaExitCode. Set SWA_CLI_DEPLOYMENT_TOKEN (Azure portal, Static Web App, Manage deployment token) in .env or the environment, then retry."
  }
  $swaOutput = ($swaLines -join [Environment]::NewLine) -replace "\x1b\[[0-9;]*m", ""
  $deployedMatch = [regex]::Match($swaOutput, "Project deployed to\s+(https://\S+)")
  if (-not $deployedMatch.Success) {
    throw "The SWA CLI did not report a completed upload (no 'Project deployed to' message), so nothing was deployed. No version or release record was changed. Set SWA_CLI_DEPLOYMENT_TOKEN (Azure portal, Static Web App, Manage deployment token) in .env or the environment instead of signing in with the device code, then retry."
  }
  $deployedUrl = $deployedMatch.Groups[1].Value.TrimEnd(".", ",", ")")

  Write-Host "Verifying that $deployedUrl serves the new build..."
  $localIndexHtml = Get-Content -Raw -LiteralPath (Join-Path $webOutput "index.html")
  $expectedAsset = [regex]::Match($localIndexHtml, "assets/index-[A-Za-z0-9_-]+\.js").Value
  if ([string]::IsNullOrWhiteSpace($expectedAsset)) { throw "Could not find the main bundle name in the built index.html." }
  $serving = $false
  for ($attempt = 1; $attempt -le 12; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "$deployedUrl/?verify=$attempt" -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 20
      if ($response.Content.Contains($expectedAsset)) { $serving = $true; break }
    } catch {
      # The site may be briefly unavailable while the new version rolls out; retry.
    }
    Start-Sleep -Seconds 10
  }
  if (-not $serving) {
    throw "The upload was reported as complete, but $deployedUrl does not serve $expectedAsset yet. No version or release record was changed. Check the site, then retry."
  }
  Write-Host "Verified: $deployedUrl serves $expectedAsset."

  if ($Environment -eq "preview") {
    Write-Host "Preview deployment of v$candidateVersion succeeded. Production version and release history were not changed."
    return
  }

  $deployedAtUtc = [DateTimeOffset]::UtcNow.ToString("o")
  try {
    & $npmCommand version $candidateVersion --no-git-tag-version --ignore-scripts --workspaces=false
    if ($LASTEXITCODE -ne 0) { throw "npm could not update package version metadata." }

    $history = [ordered]@{ releases = @() }
    if (Test-Path -LiteralPath $historyPath) {
      $history = Get-Content -Raw -LiteralPath $historyPath | ConvertFrom-Json
      if ($null -eq $history -or $null -eq $history.releases -or $history.releases -isnot [array]) {
        throw "deployments.json must contain an object with a releases array."
      }
    }
    $history.releases += [ordered]@{
      version = $candidateVersion
      deployedAtUtc = $deployedAtUtc
      sourceCommit = $sourceCommit
    }
    $historyJson = ($history | ConvertTo-Json -Depth 10) + [Environment]::NewLine
    [System.IO.File]::WriteAllText($historyPath, $historyJson, [System.Text.UTF8Encoding]::new($false))

    & git add -- package.json package-lock.json deployments.json
    if ($LASTEXITCODE -ne 0) { throw "Git could not stage release metadata." }
    & git commit -m "chore(release): v$candidateVersion"
    if ($LASTEXITCODE -ne 0) { throw "Git could not create the release metadata commit." }
  } catch {
    throw "Azure production deployment v$candidateVersion succeeded, but release metadata could not be committed. Inspect package.json, package-lock.json, and deployments.json before retrying. $($_.Exception.Message)"
  }

  $releaseCommit = Invoke-GitText -Arguments @("rev-parse", "HEAD") -FailureMessage "Azure deployment and release commit succeeded, but the release commit SHA could not be read."
  & git push $upstreamRemote "HEAD:$upstreamMerge"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Azure deployment v$candidateVersion succeeded and release commit $releaseCommit is local, but Git push failed. Retry with 'git push $upstreamRemote HEAD:$upstreamMerge'."
    $LASTEXITCODE = 0
    return
  }
  Write-Host "Production deployment v$candidateVersion succeeded; release commit $releaseCommit was pushed."
} finally {
  Pop-Location
}
