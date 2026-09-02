import type { InitAnswers } from "../types.js";
import { toIdentifier } from "./shared.js";

export function renderHookTs(answers: Pick<InitAnswers, "defaultLocale">): string {
  const identifier = toIdentifier(answers.defaultLocale);

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
