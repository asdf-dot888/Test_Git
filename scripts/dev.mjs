import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import process, { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { resolveDevelopmentMode } from "./dev-mode.mjs";

for (const fileName of [".env.local", ".env"]) {
  const envPath = resolve(process.cwd(), fileName);
  if (existsSync(envPath)) loadEnvFile(envPath);
}

if (process.env.NODE_ENV === "production") {
  process.stderr.write("The development launcher cannot run with NODE_ENV=production.\n");
  process.exitCode = 1;
} else {
  const selection = resolveDevelopmentMode(process.env);
  if (selection.mode === "invalid") {
    process.stderr.write(`Azure development configuration is incomplete. Missing: ${selection.missing.join(", ")}\n`);
    process.exitCode = 1;
  } else {
    const command = process.platform === "win32" ? "npm.cmd" : "npm";
    const args = ["run", "dev:azure"];

    process.stdout.write("Azure settings are complete. Starting the authenticated API and web app.\n");

    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    const signalHandlers = new Map();
    for (const signal of ["SIGINT", "SIGTERM"]) {
      const handler = () => {
        if (!child.killed) child.kill(signal);
      };
      signalHandlers.set(signal, handler);
      process.on(signal, handler);
    }

    child.on("error", (error) => {
      process.stderr.write(`Could not start the development server: ${error.message}\n`);
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      for (const [handledSignal, handler] of signalHandlers) process.off(handledSignal, handler);
      process.exitCode = code ?? (signal ? 1 : 0);
    });
  }
}
