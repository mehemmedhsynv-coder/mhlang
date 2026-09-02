import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const LOCKFILE_BY_MANAGER: [PackageManager, string][] = [
  ["pnpm", "pnpm-lock.yaml"],
  ["yarn", "yarn.lock"],
  ["bun", "bun.lockb"],
];

/** Detects the package manager in use by looking for its lockfile in `cwd`, defaulting to npm. */
export function detectPackageManager(cwd: string): PackageManager {
  for (const [manager, lockfile] of LOCKFILE_BY_MANAGER) {
    if (existsSync(path.join(cwd, lockfile))) return manager;
  }
  return "npm";
}

/** Checks whether `pkgName` is already listed as a dependency in the project's package.json. */
export function hasDependency(cwd: string, pkgName: string): boolean {
  try {
    const raw = readFileSync(path.join(cwd, "package.json"), "utf8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return Boolean(pkg.dependencies?.[pkgName] ?? pkg.devDependencies?.[pkgName]);
  } catch {
    return false;
  }
}

function addCommand(manager: PackageManager): string[] {
  switch (manager) {
    case "pnpm":
      return ["add"];
    case "yarn":
      return ["add"];
    case "bun":
      return ["add"];
    default:
      return ["install"];
  }
}

/**
 * Installs `pkgSpec` (e.g. "mhlang@0.1.1") into the project at `cwd` using its detected package
 * manager. `pkgSpec` must be caller-controlled (never raw user input) — on Windows this runs
 * through a shell to invoke the manager's .cmd launcher, so it is interpolated into the command line.
 */
export function installDependency(cwd: string, pkgSpec: string): Promise<void> {
  const manager = detectPackageManager(cwd);
  const args = [...addCommand(manager), pkgSpec];

  return new Promise((resolve, reject) => {
    const child = spawn([manager, ...args].join(" "), {
      cwd,
      stdio: "ignore",
      shell: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${manager} ${args.join(" ")} exited with code ${code}`));
    });
  });
}
