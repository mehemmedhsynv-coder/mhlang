import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveRoutingFileName, staleRoutingFilePath } from "../../src/cli/utils/routingFile.js";

let projectDir: string;

beforeEach(async () => {
  projectDir = await mkdtemp(path.join(tmpdir(), "mhlang-routing-"));
});

afterEach(async () => {
  await rm(projectDir, { recursive: true, force: true });
});

async function installFakeNext(version: string): Promise<void> {
  const nextDir = path.join(projectDir, "node_modules", "next");
  await mkdir(nextDir, { recursive: true });
  await writeFile(path.join(nextDir, "package.json"), JSON.stringify({ version }), "utf8");
}

describe("resolveRoutingFileName", () => {
  it("defaults to proxy.ts when Next.js isn't installed", () => {
    expect(resolveRoutingFileName(projectDir)).toBe("proxy.ts");
  });

  it("uses proxy.ts for Next.js 16+", async () => {
    await installFakeNext("16.0.0");
    expect(resolveRoutingFileName(projectDir)).toBe("proxy.ts");
  });

  it("uses middleware.ts for Next.js <16", async () => {
    await installFakeNext("15.5.0");
    expect(resolveRoutingFileName(projectDir)).toBe("middleware.ts");
  });
});

describe("staleRoutingFilePath", () => {
  it("returns null when no legacy file exists", () => {
    expect(staleRoutingFilePath(projectDir, "proxy.ts")).toBeNull();
  });

  it("finds a leftover middleware.ts when the chosen convention is proxy.ts", async () => {
    await writeFile(path.join(projectDir, "middleware.ts"), "export function middleware() {}", "utf8");
    expect(staleRoutingFilePath(projectDir, "proxy.ts")).toBe(path.join(projectDir, "middleware.ts"));
  });

  it("finds a leftover proxy.ts when the chosen convention is middleware.ts", async () => {
    await writeFile(path.join(projectDir, "proxy.ts"), "export function proxy() {}", "utf8");
    expect(staleRoutingFilePath(projectDir, "middleware.ts")).toBe(path.join(projectDir, "proxy.ts"));
  });
});
