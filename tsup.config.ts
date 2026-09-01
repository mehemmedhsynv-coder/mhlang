import { defineConfig } from "tsup";

export default defineConfig([
  {
    name: "runtime",
    entry: { "runtime/index": "src/runtime/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    outDir: "dist",
    treeshake: true,
    splitting: false,
  },
  {
    name: "cli",
    entry: { "cli/index": "src/cli/index.ts" },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "es2022",
    outDir: "dist",
    treeshake: true,
    splitting: false,
    banner: { js: "#!/usr/bin/env node" },
  },
]);
