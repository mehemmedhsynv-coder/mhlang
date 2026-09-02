import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectAppDir, toImportSpecifier } from "../../src/cli/utils/appDir.js";

let projectDir: string;

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(tmpdir(), "mhlang-appdir-"));
});

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true });
});

describe("detectAppDir", () => {
  it("returns null when neither app/ nor src/app/ exists", () => {
    expect(detectAppDir(projectDir)).toBeNull();
  });

  it("prefers src/app over app when both exist", async () => {
    await mkdir(path.join(projectDir, "app"), { recursive: true });
    await mkdir(path.join(projectDir, "src", "app"), { recursive: true });
    expect(detectAppDir(projectDir)).toBe("src/app");
  });

  it("finds app/ when src/app/ doesn't exist", async () => {
    await mkdir(path.join(projectDir, "app"), { recursive: true });
    expect(detectAppDir(projectDir)).toBe("app");
  });

  it("finds src/app/ when app/ doesn't exist", async () => {
    await mkdir(path.join(projectDir, "src", "app"), { recursive: true });
    expect(detectAppDir(projectDir)).toBe("src/app");
  });
});

describe("toImportSpecifier", () => {
  it("computes a relative import between sibling directory trees", () => {
    const fromDir = path.join(projectDir, "app", "[locale]");
    const toFile = path.join(projectDir, "src", "i18n", "provider");
    const specifier = toImportSpecifier(fromDir, toFile);
    expect(specifier).toBe("../../src/i18n/provider");
  });

  it("always prefixes with ./ or ../, never a bare specifier", () => {
    const fromDir = path.join(projectDir, "src", "i18n");
    const toFile = path.join(projectDir, "src", "i18n", "config");
    expect(toImportSpecifier(fromDir, toFile)).toBe("./config");
  });
});
