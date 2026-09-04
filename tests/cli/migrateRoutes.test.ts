import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { findMigrationCandidates, migrateRoutesIntoLocale } from "../../src/cli/utils/migrateRoutes.js";

let appDir: string;

beforeEach(async () => {
  const projectDir = await mkdtemp(path.join(tmpdir(), "mhlang-migrate-"));
  appDir = path.join(projectDir, "app");
  await mkdir(appDir, { recursive: true });
});

afterEach(async () => {
  await rm(path.dirname(appDir), { recursive: true, force: true });
});

async function touch(relPath: string, content = ""): Promise<void> {
  const full = path.join(appDir, relPath);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
}

describe("findMigrationCandidates", () => {
  it("returns an empty list when the app directory doesn't exist", async () => {
    expect(await findMigrationCandidates(path.join(appDir, "does-not-exist"))).toEqual([]);
  });

  it("includes ordinary routes: page.tsx, route folders, and route groups", async () => {
    await touch("page.tsx");
    await touch("about/page.tsx");
    await touch("(marketing)/pricing/page.tsx");

    const candidates = await findMigrationCandidates(appDir);
    const names = candidates.map((c) => c.name).sort();
    expect(names).toEqual(["(marketing)", "about", "page.tsx"]);
  });

  it("excludes root-only conventions: layout.tsx, api/, icons, manifest/sitemap/robots, globals.css, [locale]", async () => {
    await touch("layout.tsx");
    await touch("global-error.tsx");
    await touch("api/hello/route.ts");
    await touch("favicon.ico");
    await touch("icon.png");
    await touch("apple-icon.png");
    await touch("opengraph-image.png");
    await touch("manifest.ts");
    await touch("sitemap.ts");
    await touch("robots.ts");
    await touch("globals.css");
    await touch("[locale]/layout.tsx");
    // The one thing that SHOULD still show up alongside all the excluded ones:
    await touch("page.tsx");

    const candidates = await findMigrationCandidates(appDir);
    expect(candidates.map((c) => c.name)).toEqual(["page.tsx"]);
  });

  it("excludes colocated helper directories (components/, lib/, hooks/) that contain no route files", async () => {
    await touch("page.tsx");
    await touch("components/Button.tsx");
    await touch("components/forms/Input.tsx");
    await touch("lib/utils.ts");
    await touch("hooks/useThing.ts");
    await touch("styles/theme.css");

    const candidates = await findMigrationCandidates(appDir);
    expect(candidates.map((c) => c.name)).toEqual(["page.tsx"]);
  });

  it("excludes a stray non-route-convention file at the app root", async () => {
    await touch("page.tsx");
    await touch("constants.ts");
    await touch("types.ts");

    const candidates = await findMigrationCandidates(appDir);
    expect(candidates.map((c) => c.name)).toEqual(["page.tsx"]);
  });

  it("still migrates a route folder that has its own colocated non-route files", async () => {
    await touch("dashboard/page.tsx");
    await touch("dashboard/components/Chart.tsx");
    await touch("dashboard/utils.ts");

    const candidates = await findMigrationCandidates(appDir);
    expect(candidates.map((c) => c.name)).toEqual(["dashboard"]);
  });

  it("includes a route folder whose only route-segment file is a nested layout.tsx", async () => {
    await touch("dashboard/layout.tsx");
    await touch("dashboard/settings/page.tsx");

    const candidates = await findMigrationCandidates(appDir);
    expect(candidates.map((c) => c.name)).toEqual(["dashboard"]);
  });

  it("flags directories vs files correctly", async () => {
    await touch("page.tsx");
    await touch("about/page.tsx");

    const candidates = await findMigrationCandidates(appDir);
    const page = candidates.find((c) => c.name === "page.tsx")!;
    const about = candidates.find((c) => c.name === "about")!;
    expect(page.isDirectory).toBe(false);
    expect(about.isDirectory).toBe(true);
  });
});

describe("migrateRoutesIntoLocale", () => {
  it("moves files and whole directory trees into [locale]/, preserving nested structure", async () => {
    await touch("page.tsx", "export default function Home() {}");
    await touch("about/page.tsx", "export default function About() {}");
    await touch("(marketing)/pricing/page.tsx", "export default function Pricing() {}");

    const candidates = await findMigrationCandidates(appDir);
    const { moved, skipped } = await migrateRoutesIntoLocale(appDir, candidates);

    expect(moved.sort()).toEqual(["(marketing)", "about", "page.tsx"]);
    expect(skipped).toEqual([]);

    await expect(access(path.join(appDir, "page.tsx"))).rejects.toThrow();
    await expect(access(path.join(appDir, "[locale]", "page.tsx"))).resolves.toBeUndefined();
    await expect(access(path.join(appDir, "[locale]", "about", "page.tsx"))).resolves.toBeUndefined();
    await expect(
      access(path.join(appDir, "[locale]", "(marketing)", "pricing", "page.tsx"))
    ).resolves.toBeUndefined();
  });

  it("skips (rather than overwrites) a candidate that already exists under [locale]/", async () => {
    await touch("about/page.tsx", "new content");
    await touch("[locale]/about/page.tsx", "already migrated content");

    const candidates = await findMigrationCandidates(appDir);
    const { moved, skipped } = await migrateRoutesIntoLocale(appDir, candidates);

    expect(moved).toEqual([]);
    expect(skipped).toEqual(["about"]);
    // The original is left in place rather than being silently discarded.
    await expect(access(path.join(appDir, "about", "page.tsx"))).resolves.toBeUndefined();
  });

  it("leaves root-only files untouched", async () => {
    await touch("layout.tsx", "root layout");
    await touch("page.tsx");

    const candidates = await findMigrationCandidates(appDir);
    await migrateRoutesIntoLocale(appDir, candidates);

    await expect(access(path.join(appDir, "layout.tsx"))).resolves.toBeUndefined();
    await expect(access(path.join(appDir, "[locale]", "layout.tsx"))).rejects.toThrow();
  });
});
