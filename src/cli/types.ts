export type ProjectType = "nextjs" | "react";

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  nextjs: "Next.js",
  react: "React",
};

export const PRESET_PATHS = ["src/i18n", "i18n"] as const;
export const CUSTOM_PATH_VALUE = "__custom_path__";

export interface InitAnswers {
  projectType: ProjectType;
  /** Path relative to the current working directory, e.g. "src/i18n". */
  targetPath: string;
  /** Final set of locale codes (predefined + custom), in selection order. */
  locales: string[];
  defaultLocale: string;
  includeExamples: boolean;
  persist: boolean;
  /** Next.js-only: scaffold a `/{locale}/...` URL-prefixed routing middleware. */
  urlRouting: boolean;
}
