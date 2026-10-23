$ErrorActionPreference = "Stop"

try {
  $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
  Set-Location -LiteralPath $repoRoot

  $nodeVersion = (& node --version).Trim()
  if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch "^v24\.") {
    throw "Node.js 24 is required to package this release. Found: $nodeVersion"
  }

  $npmCommand = if ($IsWindows -or $env:OS -eq "Windows_NT") { "npm.cmd" } else { "npm" }
  & $npmCommand run build
  if ($LASTEXITCODE -ne 0) {
    throw "The production build failed; the existing release artifact was left unchanged."
  }

  $requiredBuildOutputs = @(
    "apps/api/dist",
    "apps/web/dist",
    "packages/game-core/dist"
  )
  foreach ($relativePath in $requiredBuildOutputs) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $relativePath) -PathType Container)) {
      throw "Required build output is missing: $relativePath"
    }
  }

  $artifactsPath = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "artifacts"))
  $stagingPath = [System.IO.Path]::GetFullPath((Join-Path $artifactsPath "release-staging"))
  $zipPath = [System.IO.Path]::GetFullPath((Join-Path $artifactsPath "board-card-roguelike-release.zip"))
  $temporaryZipPath = [System.IO.Path]::GetFullPath((Join-Path $artifactsPath "board-card-roguelike-release.building.zip"))
  $pathComparison = [System.StringComparison]::OrdinalIgnoreCase
  $artifactsPrefix = $artifactsPath.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar

  foreach ($candidate in @($stagingPath, $zipPath, $temporaryZipPath)) {
    if (-not $candidate.StartsWith($artifactsPrefix, $pathComparison)) {
      throw "Refusing to write outside the repository artifacts directory: $candidate"
    }
  }

  if (-not (Test-Path -LiteralPath $artifactsPath)) {
    New-Item -ItemType Directory -Path $artifactsPath | Out-Null
  } elseif ((Get-Item -LiteralPath $artifactsPath -Force).LinkType) {
    throw "Refusing to use a linked artifacts directory."
  }

  if (Test-Path -LiteralPath $stagingPath) {
    $stagingItem = Get-Item -LiteralPath $stagingPath -Force
    $resolvedStagingPath = [System.IO.Path]::GetFullPath((Resolve-Path -LiteralPath $stagingPath).Path)
    if ($stagingItem.LinkType -or $resolvedStagingPath -ne $stagingPath -or $stagingPath -eq $repoRoot) {
      throw "Refusing to remove an unexpected staging path: $resolvedStagingPath"
    }
    Remove-Item -LiteralPath $stagingPath -Recurse -Force
  }

  if (Test-Path -LiteralPath $temporaryZipPath) {
    $temporaryItem = Get-Item -LiteralPath $temporaryZipPath -Force
    if ($temporaryItem.PSIsContainer -or $temporaryItem.LinkType) {
      throw "Refusing to replace an unexpected temporary artifact path."
    }
    Remove-Item -LiteralPath $temporaryZipPath -Force
  }

  New-Item -ItemType Directory -Path $stagingPath | Out-Null

  $allowedRootFiles = @("package.json", "package-lock.json", "tsconfig.base.json")
  $allowedWorkspaceDirectories = @("apps/api", "apps/web", "packages/game-core")
  foreach ($relativePath in $allowedRootFiles) {
    $sourcePath = Join-Path $repoRoot $relativePath
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
      throw "Required release file is missing: $relativePath"
    }
    Copy-Item -LiteralPath $sourcePath -Destination (Join-Path $stagingPath $relativePath)
  }

  $excludedSegments = @(".git", ".agents", ".memory", "node_modules", "tmp", "artifacts")
  foreach ($workspacePath in $allowedWorkspaceDirectories) {
    $sourceRoot = Join-Path $repoRoot $workspacePath
    if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
      throw "Required workspace directory is missing: $workspacePath"
    }

    Get-ChildItem -LiteralPath $sourceRoot -File -Recurse -Force | ForEach-Object {
      $relativePath = $_.FullName.Substring($repoRoot.Length).TrimStart("\", "/")
      $segments = $relativePath -split "[\\/]"
      $excluded = $false
      foreach ($segment in $segments) {
        if ($excludedSegments -contains $segment -or $segment.StartsWith(".env", [System.StringComparison]::OrdinalIgnoreCase)) {
          $excluded = $true
          break
        }
      }
      if (-not $excluded) {
        $destinationPath = Join-Path $stagingPath $relativePath
        $destinationDirectory = Split-Path -Parent $destinationPath
        if (-not (Test-Path -LiteralPath $destinationDirectory)) {
          New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
        }
        Copy-Item -LiteralPath $_.FullName -Destination $destinationPath
      }
    }
  }

  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::CreateFromDirectory(
    $stagingPath,
    $temporaryZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
  )

  $archive = [System.IO.Compression.ZipFile]::OpenRead($temporaryZipPath)
  try {
    $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace("\", "/") })
    $requiredEntries = @(
      "package.json",
      "package-lock.json",
      "tsconfig.base.json",
      "apps/api/package.json",
      "apps/web/package.json",
      "packages/game-core/package.json",
      "apps/api/dist/index.js",
      "apps/web/dist/index.html",
      "packages/game-core/dist/engine.js"
    )
    foreach ($entry in $requiredEntries) {
      if ($entryNames -notcontains $entry) {
        throw "Release ZIP is missing required entry: $entry"
      }
    }

    foreach ($entryName in $entryNames) {
      $segments = $entryName -split "/"
      foreach ($segment in $segments) {
        if ($segment.StartsWith(".env", [System.StringComparison]::OrdinalIgnoreCase) -or $excludedSegments -contains $segment) {
          throw "Release ZIP contains a forbidden path: $entryName"
        }
      }
    }

    if ($entryNames -contains "project-memory-starter(KJH)/package.json") {
      throw "Release ZIP contains an unexpected wrapper directory."
    }
  } finally {
    $archive.Dispose()
  }

  if ((Test-Path -LiteralPath $zipPath) -and (Get-Item -LiteralPath $zipPath -Force).LinkType) {
    throw "Refusing to replace a linked release artifact."
  }
  Move-Item -LiteralPath $temporaryZipPath -Destination $zipPath -Force
  Write-Output "Release package created and validated: $zipPath"
} catch {
  Write-Error $_
  exit 1
}
