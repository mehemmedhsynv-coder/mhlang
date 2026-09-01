import path from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import { runInitPrompts } from "../prompts/run.js";
import { buildFilePlan, findExistingFiles, writeFiles } from "../generators/index.js";

function summaryLines(answers: {
  projectType: string;
  targetPath: string;
  defaultLocale: string;
  locales: string[];
  includeExamples: boolean;
  persist: boolean;
}): string {
  const projectLabel = answers.projectType === "nextjs" ? "Next.js" : "React";
  return [
    `Project:  ${projectLabel}`,
    `Path:     ${answers.targetPath}`,
    `Default:  ${answers.defaultLocale}`,
    `Locales:  ${answers.locales.join(", ")}`,
    `Examples: ${answers.includeExamples ? "yes" : "no"}`,
    `Persist:  ${answers.persist ? "yes" : "no"}`,
  ].join("\n");
}

export async function init(): Promise<void> {
  const cwd = process.cwd();

  const answers = await runInitPrompts();
  if (!answers) return;

  const targetDir = path.resolve(cwd, answers.targetPath);
  const plan = buildFilePlan(answers);

  const { hasConflicts, existingFiles } = await findExistingFiles(targetDir, plan);

  if (hasConflicts) {
    p.log.warn(pc.yellow(`i18n directory already exists (${answers.targetPath}).`));
    p.log.message(
      existingFiles.map((file) => `  ${pc.dim("•")} ${path.posix.join(answers.targetPath, file)}`).join("\n")
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

  p.outro(pc.green("i18n setup created successfully!"));
}
