export function renderHookTs(): string {
  return `"use client";

import { useTranslation as useBaseTranslation } from "mhlang";
import type { Locale } from "../config";

export function useTranslation() {
  return useBaseTranslation<Locale>();
}
`;
}
