import path from "node:path";
import { rm } from "node:fs/promises";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { runInitPrompts } from "../prompts/run.js";
import { buildFilePlan, findExistingFiles, writeFiles, LOCALE_LAYOUT_LABEL } from "../generators/index.js";
import { hasDependency, installDependency } from "../utils/dependencies.js";
import { readPackageVersion } from "../utils/version.js";
import { staleRoutingFilePath } from "../utils/routingFile.js";
import type { RoutingFileName } from "../utils/routingFile.js";
import { findMigrationCandidates, migrateRoutesIntoLocale } from "../utils/migrateRoutes.js";

const PACKAGE_NAME = "mhlang";

function summaryLines(answers: {
  projectType: string;
  targetPath: string;
  defaultLocale: string;
  locales: string[];
  includeExamples: boolean;
  persist: boolean;
  urlRouting: boolean;
}): string {
  const projectLabel = answers.projectType === "nextjs" ? "Next.js" : "React";
  const lines = [
    `Project:  ${projectLabel}`,
    `Path:     ${answers.targetPath}`,
    `Default:  ${answers.defaultLocale}`,
    `Locales:  ${answers.locales.join(", ")}`,
    `Examples: ${answers.includeExamples ? "yes" : "no"}`,
    `Persist:  ${answers.persist ? "yes" : "no"}`,
  ];
  if (answers.projectType === "nextjs") {
    lines.push(`Routing:  ${answers.urlRouting ? "URL-prefixed (proxy.ts / middleware.ts)" : "cookie/header-based"}`);
  }
  return lines.join("\n");
}

export async function init(): Promise<void> {
  const cwd = process.cwd();

  const answers = await runInitPrompts();
  if (!answers) return;

  const targetDir = path.resolve(cwd, answers.targetPath);
  const plan = buildFilePlan(answers, cwd);

  const routingFile = plan.find((f) => f.relativePath === "proxy.ts" || f.relativePath === "middleware.ts");
  if (routingFile) {
    const stalePath = staleRoutingFilePath(cwd, routingFile.relativePath as RoutingFileName);
    if (stalePath) {
      const staleName = path.basename(stalePath);
      p.log.warn(
        pc.yellow(
          `Found ${staleName} — this project will use ${routingFile.relativePath} instead (Next.js renamed the convention in v16).`
        )
      );
      const removeStale = await p.confirm({
        message: `Delete ${staleName}?`,
        initialValue: true,
      });
      if (p.isCancel(removeStale)) {
        p.outro(pc.yellow("Setup cancelled. No files were changed."));
        return;
      }
      if (removeStale) {
        await rm(stalePath);
      } else {
        p.log.warn(
          pc.yellow(
            `Leaving ${staleName} in place — Next.js ignores it silently rather than erroring, which can quietly disable auth/redirect logic. Delete it manually when ready.`
          )
        );
      }
    }
  }

  const { hasConflicts, existingFiles } = await findExistingFiles(targetDir, plan);

  if (hasConflicts) {
    p.log.warn(pc.yellow(`i18n directory already exists (${answers.targetPath}).`));
    p.log.message(
      existingFiles
        .map((relPath) => {
          const file = plan.find((f) => f.relativePath === relPath);
          const display = file?.absolutePath
            ? path.relative(cwd, file.absolutePath)
            : path.posix.join(answers.targetPath, relPath);
          return `  ${pc.dim("•")} ${display}`;
        })
        .join("\n")
    );

    const overwrite = await p.confirm({
      message: "Do you want to overwrite existing files?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.outro(pc.yellow("Setup cancelled. No files were changed."));
      return;
    }
  }

  p.note(summaryLines(answers), "Summary");

  const proceed = await p.confirm({
    message: "Ready to create i18n setup. Continue?",
    initialValue: true,
  });

  if (p.isCancel(proceed) || !proceed) {
    p.outro(pc.yellow("Setup cancelled. No files were changed."));
    return;
  }

  const spinner = p.spinner();
  spinner.start("Creating i18n setup");
  const written = await writeFiles(targetDir, plan);
  spinner.stop(`Created ${written.length} files in ${answers.targetPath}`);

  if (answers.urlRouting) {
    const localeLayout = plan.find((f) => f.relativePath === LOCALE_LAYOUT_LABEL);
    if (localeLayout) {
      p.log.success(pc.green(`Generated ${LOCALE_LAYOUT_LABEL}.`));

      const appDir = path.dirname(path.dirname(localeLayout.absolutePath!));
      const appDirLabel = path.relative(cwd, appDir).split(path.sep).join("/") || ".";
      const candidates = await findMigrationCandidates(appDir);

      if (candidates.length > 0) {
        p.log.info(
          pc.cyan(
            `Found existing routes in ${appDirLabel}/ that need to move under [locale]/ to pick up the locale-aware provider:`
          )
        );
        p.log.message(candidates.map((c) => `  ${pc.dim("•")} ${c.name}${c.isDirectory ? "/" : ""}`).join("\n"));

        const migrate = await p.confirm({
          message: `Move ${candidates.length} item(s) into ${appDirLabel}/[locale]/?`,
          initialValue: true,
        });

        if (p.isCancel(migrate)) {
          p.outro(pc.yellow("Setup cancelled after writing i18n files. Routes were not moved."));
          return;
        }

        if (migrate) {
          const { moved, skipped } = await migrateRoutesIntoLocale(appDir, candidates);
          if (moved.length > 0) {
            p.log.success(pc.green(`Moved ${moved.length} item(s) into ${appDirLabel}/[locale]/.`));
          }
          if (skipped.length > 0) {
            p.log.warn(
              pc.yellow(`Skipped (already exists under [locale]/): ${skipped.join(", ")}. Resolve these by hand.`)
            );
          }
        } else {
          p.log.warn(
            pc.yellow(
              `Left ${appDirLabel}/ routes in place — they won't get the locale-aware provider or URL prefix until moved under [locale]/.`
            )
          );
        }
      }
    } else {
      p.log.warn(
        pc.yellow(
          "Could not find an app/ or src/app/ directory, so app/[locale]/layout.tsx wasn't generated. " +
            "Create it by hand: read the [locale] route param, validate it against `locales` from config.ts, " +
            "and wrap children in <I18nProvider locale={locale}> from provider.tsx."
        )
      );
    }
  }

  if (!hasDependency(cwd, PACKAGE_NAME)) {
    const installSpinner = p.spinner();
    installSpinner.start(`Installing ${PACKAGE_NAME}`);
    try {
      await installDependency(cwd, `${PACKAGE_NAME}@${readPackageVersion()}`);
      installSpinner.stop(`Installed ${PACKAGE_NAME}`);
    } catch {
      installSpinner.stop(pc.yellow(`Could not install ${PACKAGE_NAME} automatically`));
      p.log.warn(pc.yellow(`Run \`npm install ${PACKAGE_NAME}\` (or your package manager's equivalent) to finish setup.`));
    }
  }

  p.outro(pc.green("i18n setup created successfully!"));
}
