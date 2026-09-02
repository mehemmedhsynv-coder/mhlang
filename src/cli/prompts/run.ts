import * as p from "@clack/prompts";
import pc from "picocolors";
import { CUSTOM_LANGUAGE_VALUE, PREDEFINED_LANGUAGES, normalizeLanguageCode } from "../data/languages.js";
import { CUSTOM_PATH_VALUE, PRESET_PATHS, PROJECT_TYPE_LABELS } from "../types.js";
import type { InitAnswers, ProjectType } from "../types.js";
import { buildLanguageList, resolveDefaultLocale, validateCustomLanguageCode, validateTargetPath } from "./logic.js";

class SetupCancelledError extends Error {}

function check<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    throw new SetupCancelledError();
  }
  return value;
}

async function collectCustomLanguages(alreadySelected: readonly string[]): Promise<string[]> {
  const customCodes: string[] = [];
  let addMore = true;

  while (addMore) {
    const known = [...alreadySelected, ...customCodes];
    const code = check(
      await p.text({
        message: "Enter language code:",
        placeholder: "e.g. ka",
        validate: (value) => validateCustomLanguageCode(value, known),
      })
    );
    customCodes.push(normalizeLanguageCode(code));

    addMore = check(
      await p.confirm({
        message: "Add another custom language?",
        initialValue: false,
      })
    );
  }

  return customCodes;
}

/**
 * Runs the interactive `init` question flow and returns the collected answers,
 * or `null` if the user cancelled (e.g. Ctrl+C) at any point.
 */
export async function runInitPrompts(): Promise<InitAnswers | null> {
  p.intro(pc.bgCyan(pc.black(" i18n setup ")));

  try {
    const projectType = check(
      await p.select<ProjectType>({
        message: "What type of project are you using?",
        options: [
          { value: "nextjs", label: PROJECT_TYPE_LABELS.nextjs },
          { value: "react", label: PROJECT_TYPE_LABELS.react },
        ],
      })
    );

    const pathChoice = check(
      await p.select<string>({
        message: "Where should the i18n files be created?",
        options: [
          ...PRESET_PATHS.map((preset) => ({ value: preset as string, label: preset })),
          { value: CUSTOM_PATH_VALUE, label: "Custom path" },
        ],
      })
    );

    let targetPath = pathChoice;
    if (pathChoice === CUSTOM_PATH_VALUE) {
      targetPath = check(
        await p.text({
          message: "Enter a custom path (relative to your project root):",
          placeholder: "src/lib/i18n",
          validate: validateTargetPath,
        })
      ).trim();
    }

    const selectedLanguages = check(
      await p.multiselect<string>({
        message: "Select languages:",
        options: [
          ...PREDEFINED_LANGUAGES.map((lang) => ({
            value: lang.code,
            label: `${lang.name} (${lang.code})`,
          })),
          { value: CUSTOM_LANGUAGE_VALUE, label: "Custom..." },
        ],
        initialValues: ["az", "en"],
        required: true,
      })
    );

    const predefinedOnly = selectedLanguages.filter((value) => value !== CUSTOM_LANGUAGE_VALUE);
    const wantsCustom = selectedLanguages.includes(CUSTOM_LANGUAGE_VALUE);
    const customCodes = wantsCustom ? await collectCustomLanguages(predefinedOnly) : [];

    const locales = buildLanguageList(predefinedOnly, customCodes);

    const defaultLocaleChoice = check(
      await p.select<string>({
        message: "What is your default language?",
        options: locales.map((code) => ({ value: code, label: code })),
      })
    );
    const defaultLocale = resolveDefaultLocale(defaultLocaleChoice, locales);

    const includeExamples = check(
      await p.confirm({
        message: "Create example translations?",
        initialValue: true,
      })
    );

    const persist = check(
      await p.confirm({
        message: "Use localStorage for language persistence?",
        initialValue: true,
      })
    );

    const urlRouting =
      projectType === "nextjs"
        ? check(
            await p.confirm({
              message: "Enable locale-based URL routing? (e.g. /az/..., /en/...)",
              initialValue: false,
            })
          )
        : false;

    return { projectType, targetPath, locales, defaultLocale, includeExamples, persist, urlRouting };
  } catch (error) {
    if (error instanceof SetupCancelledError) {
      p.cancel("Setup cancelled.");
      return null;
    }
    throw error;
  }
}
