import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootPackagePath = fileURLToPath(new URL("../../package.json", import.meta.url));
const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8")) as { version?: unknown };
const packageVersion = typeof rootPackage.version === "string" ? rootPackage.version : "";
const selectedVersion = process.env.VITE_APP_VERSION?.trim() || packageVersion;

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(selectedVersion)) {
  throw new Error("The root package version or VITE_APP_VERSION must use MAJOR.MINOR.PATCH format.");
}

export default defineConfig({
  envDir: "../..",
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(selectedVersion),
  },
});
