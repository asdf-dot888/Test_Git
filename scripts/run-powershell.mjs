// Runs a PowerShell script with whichever PowerShell is installed: PowerShell 7 (`pwsh`, the only one on macOS and
// Linux, optional on Windows) first, then Windows PowerShell (`powershell`).
// Usage: node scripts/run-powershell.mjs <script.ps1> [script arguments]
import { spawnSync } from "node:child_process";
import process from "node:process";

const [script, ...scriptArguments] = process.argv.slice(2);
if (!script) {
  process.stderr.write("Usage: node scripts/run-powershell.mjs <script.ps1> [script arguments]\n");
  process.exit(2);
}

for (const executable of ["pwsh", "powershell"]) {
  const result = spawnSync(executable, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...scriptArguments], { stdio: "inherit" });
  // ENOENT means this PowerShell is not installed; try the next one. Any other result is the script's own outcome.
  if (result.error && "code" in result.error && result.error.code === "ENOENT") continue;
  if (result.error) {
    process.stderr.write(`Could not run ${executable}: ${result.error.message}\n`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

process.stderr.write("PowerShell was not found. Install PowerShell 7 (https://aka.ms/powershell) so that `pwsh` is on your PATH, then retry.\n");
process.exit(1);
