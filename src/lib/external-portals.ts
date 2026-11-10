/**
 * Program numbers that leave /trip for a separate guest portal.
 * The guest page only receives the address in the /api/trip response,
 * so this map stays out of the client bundle. Add a code only after
 * confirming it is not already a program code or alias.
 * Owner access is checked first, so the owner code still opens /team.
 */
const EXTERNAL_PORTALS: Readonly<Record<string, string>> = {
  "1219": "https://horizon.venturedirectors.com",
};

export function externalPortalHref(code: string): string | null {
  const href = EXTERNAL_PORTALS[code.trim().toUpperCase()];
  if (!href) return null;
  try {
    if (new URL(href).protocol !== "https:") return null;
  } catch {
    return null;
  }
  return href;
}
