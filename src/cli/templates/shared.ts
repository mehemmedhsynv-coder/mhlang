/** Converts a locale code (e.g. "pt-BR") into a valid JS identifier for import bindings. */
export function toIdentifier(code: string): string {
  const cleaned = code.replace(/[^a-zA-Z0-9_$]/g, "_");
  return /^[0-9]/.test(cleaned) ? `_${cleaned}` : cleaned;
}
