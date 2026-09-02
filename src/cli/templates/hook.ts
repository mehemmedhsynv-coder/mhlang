import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderHookTs(answers: Pick<InitAnswers, "defaultLocale" | "urlRouting">): string {
  const identifier = toIdentifier(answers.defaultLocale);

  if (answers.urlRouting) {
    return `"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTranslation as useBaseTranslation } from "mhlang";
import type { NestedKeyOf } from "mhlang";
import type { Locale } from "../config";
import ${identifier} from "../messages/${answers.defaultLocale}.json";

type MessageKeys = NestedKeyOf<typeof ${identifier}>;

/**
 * Wraps the base hook's \`setLocale\` so switching locales also navigates: the current
 * \`[locale]\` URL segment is swapped for the new one via \`router.push\`, keeping the URL and
 * the active locale in sync (the base state update still happens for an instant UI update).
 */
export function useTranslation() {
  const base = useBaseTranslation<Locale, MessageKeys>();
  const router = useRouter();
  const pathname = usePathname();

  function setLocale(next: Locale) {
    base.setLocale(next);
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return { ...base, setLocale };
}
`;
  }

  return `"use client";

import { useTranslation as useBaseTranslation } from "mhlang";
import type { NestedKeyOf } from "mhlang";
import type { Locale } from "../config";
import ${identifier} from "../messages/${answers.defaultLocale}.json";

type MessageKeys = NestedKeyOf<typeof ${identifier}>;

export function useTranslation() {
  return useBaseTranslation<Locale, MessageKeys>();
}
`;
}
