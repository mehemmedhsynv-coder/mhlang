import cac from "cac";
import pc from "picocolors";
import { init } from "./commands/init.js";
import { addLanguage } from "./commands/add-language.js";
import { removeLanguage } from "./commands/remove-language.js";
import { check } from "./commands/check.js";
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

cli
  .command("add-language <code>", "Add a new locale, cloning the default locale's key structure with blank values")
  .option("--path <path>", "Path to the i18n directory (auto-detected by default)")
  .action(async (code: string, options: { path?: string }) => {
    try {
      await addLanguage(code, { path: options.path });
    } catch (error) {
      console.error(pc.red("\n✖ add-language failed:"), error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

cli
  .command("remove-language <code>", "Remove a locale and its messages file")
  .option("--path <path>", "Path to the i18n directory (auto-detected by default)")
  .action(async (code: string, options: { path?: string }) => {
    try {
      await removeLanguage(code, { path: options.path });
    } catch (error) {
      console.error(pc.red("\n✖ remove-language failed:"), error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

cli
  .command("check", "Report translation keys missing in any locale relative to the default locale (exits 1 if any)")
  .option("--path <path>", "Path to the i18n directory (auto-detected by default)")
  .option("--locale <code>", "Only report missing keys for this locale")
  .action(async (options: { path?: string; locale?: string }) => {
    try {
      await check({ path: options.path, locale: options.locale });
    } catch (error) {
      console.error(pc.red("\n✖ check failed:"), error instanceof Error ? error.message : error);
      process.exitCode = 1;
    }
  });

cli
  .command("missing [locale]", "Alias for `check`, optionally scoped to a single locale")
  .option("--path <path>", "Path to the i18n directory (auto-detected by default)")
  .action(async (locale: string | undefined, options: { path?: string }) => {
    try {
      await check({ path: options.path, locale });
    } catch (error) {
      console.error(pc.red("\n✖ missing failed:"), error instanceof Error ? error.message : error);
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
