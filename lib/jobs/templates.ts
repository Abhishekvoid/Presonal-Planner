import { Company } from "./types";

/** Placeholders a template body may contain. Order matters only for display. */
export const PLACEHOLDERS = ["{company}", "{name}", "{role}"] as const;

/** Map each placeholder token to the company field it resolves from. */
function valueFor(token: string, company: Pick<Company, "name" | "contactName" | "role">): string {
  switch (token) {
    case "{company}":
      return company.name ?? "";
    case "{name}":
      return company.contactName ?? "";
    case "{role}":
      return company.role ?? "";
    default:
      return token; // unknown token: leave it untouched
  }
}

/**
 * Resolve a template body against a company.
 * - Known tokens ({company}, {name}, {role}) are substituted.
 * - Empty company fields become "" (never the literal "undefined").
 * - Unknown {tokens} are left in place so a typo is visible, not silently blanked.
 */
export function fillTemplate(
  body: string,
  company: Pick<Company, "name" | "contactName" | "role">,
): string {
  return body.replace(/\{[a-zA-Z]+\}/g, (token) => valueFor(token, company));
}
