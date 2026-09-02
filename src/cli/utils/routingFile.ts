import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type RoutingFileName = "proxy.ts" | "middleware.ts";

function detectNextMajorVersion(cwd: string): number | null {
  try {
    const pkgPath = path.join(cwd, "node_modules", "next", "package.json");
    if (!existsSync(pkgPath)) return null;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version?: string };
    const major = pkg.version?.split(".")[0];
    return major ? Number.parseInt(major, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Next.js 16 deprecated `middleware.ts` in favor of `proxy.ts` (the exported function is
 * renamed `middleware` -> `proxy` too; everything else — NextRequest/NextResponse, config.matcher
 * — is unchanged). Defaults to the modern "proxy.ts" convention when Next.js isn't installed yet
 * or its version can't be read, since that's the forward-looking choice for a fresh project.
 */
export function resolveRoutingFileName(cwd: string): RoutingFileName {
  const major = detectNextMajorVersion(cwd);
  return major !== null && major < 16 ? "middleware.ts" : "proxy.ts";
}

/**
 * Path to the *other* (legacy) routing file convention, if it exists at the project root.
 * Next.js silently ignores a leftover file from the old convention rather than erroring on
 * it — which can quietly disable auth/redirect logic — so callers should surface and offer
 * to remove it whenever they regenerate the routing file under the new name.
 */
export function staleRoutingFilePath(cwd: string, chosen: RoutingFileName): string | null {
  const other: RoutingFileName = chosen === "proxy.ts" ? "middleware.ts" : "proxy.ts";
  const otherPath = path.join(cwd, other);
  return existsSync(otherPath) ? otherPath : null;
}
