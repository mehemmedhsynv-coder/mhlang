import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import cac from "cac";
import pc from "picocolors";
import { init } from "./commands/init.js";

function readPackageVersion(): string {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(here, "..", "..", "package.json");
    const raw = readFileSync(pkgPath, "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const cli = cac("i18n");

cli
  .command("init", "Interactively scaffold an i18n setup for a React or Next.js project")
  .action(async () => {
    try {
      await init();
    } catch (error) {
      console.error(pc.red("\n✖ i18n init failed:"), error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

cli.help();
cli.version(readPackageVersion());

if (process.argv.slice(2).length === 0) {
  cli.outputHelp();
} else {
  cli.parse();
}
