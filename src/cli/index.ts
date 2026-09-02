import cac from "cac";
import pc from "picocolors";
import { init } from "./commands/init.js";
import { readPackageVersion } from "./utils/version.js";

const cli = cac("mhlang");

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
