import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findExistingFiles, writeFiles } from "../../src/cli/generators/files.js";
import { buildFilePlan } from "../../src/cli/generators/plan.js";
import type { InitAnswers } from "../../src/cli/types.js";

const answers: InitAnswers = {
  projectType: "react",
  targetPath: "src/i18n",
  locales: ["az", "en"],
  defaultLocale: "az",
  includeExamples: true,
  persist: true,
};

let workDir: string;

beforeEach(async () => {
  workDir = await mkdtemp(path.join(tmpdir(), "mhlang-test-"));
});

afterEach(async () => {
  await rm(workDir, { recursive: true, force: true });
});

describe("writeFiles — folder & file generation on disk", () => {
  it("creates the full directory tree and writes every planned file", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    const plan = buildFilePlan(answers);

    const written = await writeFiles(targetDir, plan);
    expect(written.length).toBe(plan.length);

    const configContent = await readFile(path.join(targetDir, "config.ts"), "utf8");
    expect(configContent).toContain('defaultLocale: "az"');

    const azMessages = await readFile(path.join(targetDir, "messages", "az.json"), "utf8");
    expect(JSON.parse(azMessages).common.hello).toBe("Salam");

    const hook = await readFile(path.join(targetDir, "hooks", "useTranslation.ts"), "utf8");
    expect(hook).toContain("useBaseTranslation");
  });
});

describe("findExistingFiles — existing folder protection", () => {
  it("reports no conflicts for a brand-new directory", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    const plan = buildFilePlan(answers);
    const result = await findExistingFiles(targetDir, plan);
    expect(result.hasConflicts).toBe(false);
    expect(result.existingFiles).toEqual([]);
  });

  it("detects pre-existing generated files and lists exactly which ones", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, "config.ts"), "// pre-existing user file\n", "utf8");
    await mkdir(path.join(targetDir, "messages"), { recursive: true });
    await writeFile(path.join(targetDir, "messages", "az.json"), "{}\n", "utf8");

    const plan = buildFilePlan(answers);
    const result = await findExistingFiles(targetDir, plan);

    expect(result.hasConflicts).toBe(true);
    expect(result.existingFiles.sort()).toEqual(["config.ts", "messages/az.json"].sort());
  });

  it("does not flag an existing but empty directory as a conflict", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    await mkdir(targetDir, { recursive: true });

    const plan = buildFilePlan(answers);
    const result = await findExistingFiles(targetDir, plan);

    expect(result.hasConflicts).toBe(false);
  });

  it("never modifies files unless writeFiles is explicitly called (safe abort path)", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, "config.ts"), "// do not touch\n", "utf8");

    const plan = buildFilePlan(answers);
    const result = await findExistingFiles(targetDir, plan);
    expect(result.hasConflicts).toBe(true);

    // Simulating the user answering "No" to overwrite: the CLI must stop here
    // without calling writeFiles. Verify the original file is untouched.
    const stillThere = await readFile(path.join(targetDir, "config.ts"), "utf8");
    expect(stillThere).toBe("// do not touch\n");
  });

  it("overwrites existing generated files when the caller proceeds with writeFiles", async () => {
    const targetDir = path.join(workDir, "src", "i18n");
    await mkdir(targetDir, { recursive: true });
    await writeFile(path.join(targetDir, "config.ts"), "// stale\n", "utf8");

    const plan = buildFilePlan(answers);
    await writeFiles(targetDir, plan);

    const updated = await readFile(path.join(targetDir, "config.ts"), "utf8");
    expect(updated).toContain('defaultLocale: "az"');
    expect(updated).not.toContain("// stale");
  });
});
