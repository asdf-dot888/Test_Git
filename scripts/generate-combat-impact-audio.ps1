$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$audioRoot = Join-Path $repoRoot "apps/web/public/audio/sfx"
$tempRoot = Join-Path $repoRoot ".tmp/combat-impact-audio"
$outputs = @(
  "impact-light.ogg",
  "impact-medium.ogg",
  "impact-heavy.ogg",
  "impact-armor-block.ogg",
  "impact-hero-melee.ogg",
  "impact-boss-area.ogg"
)

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "FFmpeg is required. Install FFmpeg and make sure ffmpeg.exe is on PATH, then rerun this script. The script does not install software or download audio."
}
if (-not (Test-Path (Join-Path $audioRoot "attack.ogg")) -or -not (Test-Path (Join-Path $audioRoot "damage.ogg"))) {
  throw "Expected source files attack.ogg and damage.ogg under $audioRoot."
}
& $ffmpeg.Source -version *> $null
if ($LASTEXITCODE -ne 0) { throw "FFmpeg could not start successfully." }

function Invoke-FFmpeg([string[]]$Arguments) {
  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & $ffmpeg.Source @Arguments 2>&1
    return @{ Output = $output; ExitCode = $LASTEXITCODE }
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

function Normalize-Ogg([string]$Path, [uint32]$Serial) {
  $bytes = [System.IO.File]::ReadAllBytes($Path)
  $offset = 0
  while ($offset -lt $bytes.Length) {
    if ($offset + 27 -gt $bytes.Length -or [System.Text.Encoding]::ASCII.GetString($bytes, $offset, 4) -ne "OggS") {
      throw "Invalid Ogg page while normalizing $Path."
    }
    $segmentCount = [int]$bytes[$offset + 26]
    $headerLength = 27 + $segmentCount
    if ($offset + $headerLength -gt $bytes.Length) { throw "Truncated Ogg header in $Path." }
    $bodyLength = 0
    for ($index = 0; $index -lt $segmentCount; $index++) { $bodyLength += [int]$bytes[$offset + 27 + $index] }
    $pageLength = $headerLength + $bodyLength
    if ($offset + $pageLength -gt $bytes.Length) { throw "Truncated Ogg page in $Path." }

    [Array]::Copy([BitConverter]::GetBytes($Serial), 0, $bytes, $offset + 14, 4)
    [Array]::Clear($bytes, $offset + 22, 4)
    [uint64]$crc = 0
    for ($index = $offset; $index -lt $offset + $pageLength; $index++) {
      $crc = ($crc -bxor ([uint64]$bytes[$index] -shl 24)) % 4294967296
      for ($bit = 0; $bit -lt 8; $bit++) {
        if ($crc -ge 2147483648) { $crc = (($crc -shl 1) -bxor 0x04c11db7) % 4294967296 }
        else { $crc = ($crc -shl 1) % 4294967296 }
      }
    }
    [Array]::Copy([BitConverter]::GetBytes([uint32]($crc % 4294967296)), 0, $bytes, $offset + 22, 4)
    $offset += $pageLength
  }
  [System.IO.File]::WriteAllBytes($Path, $bytes)
}

New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null
Get-ChildItem -LiteralPath $tempRoot -File -ErrorAction SilentlyContinue | Remove-Item -Force
$attack = Join-Path $audioRoot "attack.ogg"
$damage = Join-Path $audioRoot "damage.ogg"
$limit = "alimiter=limit=0.891251:attack=5:release=80"
$jobs = @(
  @{ Name = "impact-light.ogg"; Input = $attack; Filter = "highpass=f=650,lowpass=f=8500,volume=0.72,afade=t=out:st=0.42:d=0.28,$limit" },
  @{ Name = "impact-medium.ogg"; Input = $damage; Filter = "highpass=f=100,volume=0.78,afade=t=out:st=0.72:d=0.42,$limit" },
  @{ Name = "impact-heavy.ogg"; Input = $damage; Filter = "highpass=f=45,bass=g=9:f=115:w=0.6,volume=0.9,aecho=0.8:0.88:45:0.22,afade=t=out:st=0.92:d=0.48,$limit" },
  @{ Name = "impact-armor-block.ogg"; Input = $attack; Filter = "highpass=f=1500,equalizer=f=2600:t=q:w=1:g=5,volume=0.72,afade=t=out:st=0.22:d=0.24,$limit" },
  @{ Name = "impact-hero-melee.ogg"; Input = $attack; Filter = "[0:a]highpass=f=500,volume=0.66[a];[1:a]highpass=f=70,bass=g=5:f=105,volume=0.52[b];[a][b]amix=inputs=2:duration=first:dropout_transition=0,afade=t=out:st=0.62:d=0.38,$limit"; SecondInput = $damage; Complex = $true },
  @{ Name = "impact-boss-area.ogg"; Input = $damage; Filter = "highpass=f=35,bass=g=12:f=95:w=0.7,lowpass=f=5200,volume=0.9,aecho=0.8:0.88:70|125:0.28|0.18,afade=t=out:st=0.98:d=0.48,$limit" }
)

foreach ($job in $jobs) {
  $outputPath = Join-Path $tempRoot $job.Name
  $arguments = @("-hide_banner", "-y", "-i", $job.Input)
  if ($job.Complex) {
    $arguments += @("-i", $job.SecondInput, "-filter_complex", "$($job.Filter)[out]", "-map", "[out]")
  } else { $arguments += @("-filter:a", $job.Filter) }
  $arguments += @("-t", "1.5", "-ar", "48000", "-ac", "2", "-c:a", "libvorbis", "-q:a", "4", $outputPath)
  $conversion = Invoke-FFmpeg $arguments
  if ($conversion.ExitCode -ne 0 -or -not (Test-Path $outputPath) -or (Get-Item $outputPath).Length -eq 0) {
    throw "FFmpeg failed to create $($job.Name): $($conversion.Output -join "`n")"
  }
  Normalize-Ogg $outputPath ([uint32]($outputs.IndexOf($job.Name) + 1))

  $probeResult = Invoke-FFmpeg @("-hide_banner", "-i", $outputPath, "-af", "volumedetect", "-f", "null", "NUL")
  $probe = $probeResult.Output
  if ($probeResult.ExitCode -ne 0) { throw "Generated file $($job.Name) could not be decoded." }
  $durationText = ($probe | Select-String -Pattern "Duration: ([0-9:.]+)" | Select-Object -First 1).Matches.Groups[1].Value
  if (-not $durationText) {
    $probeFormat = Invoke-FFmpeg @("-hide_banner", "-i", $outputPath, "-f", "null", "NUL")
    $durationText = ($probeFormat.Output | Select-String -Pattern "Duration: ([0-9:.]+)" | Select-Object -First 1).Matches.Groups[1].Value
  }
  $maxVolumeLine = $probe | Select-String -Pattern "max_volume: (-?[0-9.]+) dB" | Select-Object -Last 1
  if (-not $maxVolumeLine -or [double]$maxVolumeLine.Matches.Groups[1].Value -gt -1.0) {
    throw "Generated file $($job.Name) does not meet the -1 dBFS peak ceiling."
  }
  if ($durationText) {
    $parts = $durationText.Split(":")
    $duration = ([double]$parts[0] * 3600) + ([double]$parts[1] * 60) + [double]$parts[2]
    if ($duration -gt 1.5) { throw "Generated file $($job.Name) exceeds 1.5 seconds." }
  }
}

# Publish only after every render has passed decode, duration, and peak checks.
foreach ($name in $outputs) {
  Copy-Item -LiteralPath (Join-Path $tempRoot $name) -Destination (Join-Path $audioRoot $name) -Force
}
Write-Host "Generated and validated $($outputs.Count) combat impact sounds in $audioRoot"
